// src/api/messaging.js
// Firebase-first messaging helpers (NO AI BOT)

import { auth, db } from "@/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  setDoc,
} from "firebase/firestore";

export const MESSAGE_CATEGORIES = {
  AGENT_TUTOR: "agent_tutor",
  VENDOR: "vendor",
  SUPPORT: "support",
};

export function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function normalizeRole(r) {
  const v = String(r || "").toLowerCase().trim();
  if (v === "student") return "user";
  if (v === "users") return "user";
  if (v === "tutors") return "tutor";
  if (v === "agents") return "agent";
  return v;
}

export function isStudent(userDoc) {
  const t = normalizeRole(userDoc?.user_type || userDoc?.selected_role || userDoc?.role);
  return t === "user";
}

export function isPremiumStudent(userDoc) {
  if (!userDoc) return false;
  if (userDoc.is_student_premium === true) return true;
  if (userDoc.student_membership === "premium") return true;
  if (Array.isArray(userDoc.purchased_packages) && userDoc.purchased_packages.includes("student_premium_yearly")) return true;
  return false;
}

export function categoryForRecipientRole(role) {
  const r = normalizeRole(role);
  if (r === "agent" || r === "tutor") return MESSAGE_CATEGORIES.AGENT_TUTOR;
  if (r === "vendor") return MESSAGE_CATEGORIES.VENDOR;
  return MESSAGE_CATEGORIES.SUPPORT;
}

/**
 * Option B: GP Team = Admins
 * Pick the first admin user in `users` where user_type == "admin".
 */
export async function getSupportAdminUid() {
  const q = query(collection(db, "users"), where("user_type", "==", "admin"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/**
 * Optional settings doc: messaging_settings/SINGLETON
 * If missing, uses safe defaults.
 */
export async function getMessagingSettings() {
  const ref = doc(db, "messaging_settings", "SINGLETON");
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };

  return {
    free_student_agent_tutor_limit: 5, // configurable 3–5
    free_student_vendor_limit: 5,
    premium_student_price_usd: 19,
  };
}

export async function getMyUserDoc(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

function pairKey(a, b) {
  const ids = [String(a || ""), String(b || "")].sort();
  return `${ids[0]}_${ids[1]}`;
}

export async function findConversationBetween(uidA, uidB) {
  const pk = pairKey(uidA, uidB);
  const q = query(collection(db, "conversations"), where("pair_key", "==", pk), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function assertStudentConversationLimit({ user, recipientRole, settings }) {
  const me = user || {};
  const s = settings || (await getMessagingSettings());

  if (!isStudent(me)) return; // only students are limited
  if (isPremiumStudent(me)) return; // premium unlimited (for now)

  const mk = monthKey(new Date());
  const category = categoryForRecipientRole(recipientRole);

  const used = Number(me?.message_limits?.[mk]?.[category] || 0);

  const max =
    category === MESSAGE_CATEGORIES.AGENT_TUTOR
      ? Number(s.free_student_agent_tutor_limit || 5)
      : category === MESSAGE_CATEGORIES.VENDOR
      ? Number(s.free_student_vendor_limit || 5)
      : 999999; // support not limited by default

  if (used >= max) {
    const label =
      category === MESSAGE_CATEGORIES.AGENT_TUTOR ? "Agents/Tutors" : category === MESSAGE_CATEGORIES.VENDOR ? "Vendors" : "Support";
    throw new Error(`You reached your free monthly conversation limit for ${label}. Upgrade to continue.`);
  }
}

/**
 * Creates or returns an existing conversation.
 * IMPORTANT: Only increments the student's monthly limit when a NEW conversation is created by a student.
 */
export async function getOrCreateConversation({
  me,
  otherUser,
  otherRole,
  settings,
  forceCategory,
}) {
  const myUid = me?.id || auth.currentUser?.uid;
  const otherUid = otherUser?.id;

  if (!myUid || !otherUid) throw new Error("Missing participants.");

  // return existing if found
  const existing = await findConversationBetween(myUid, otherUid);
  if (existing) return existing;

  // enforce limits ONLY when new conversation is created
  const meDoc = me || (await getMyUserDoc(myUid));
  const s = settings || (await getMessagingSettings());

  await assertStudentConversationLimit({ user: meDoc, recipientRole: otherRole, settings: s });

  const category = forceCategory || categoryForRecipientRole(otherRole);

  const conversationDoc = {
    pair_key: pairKey(myUid, otherUid),
    participants: [myUid, otherUid],
    participant_roles: {
      [myUid]: normalizeRole(meDoc?.user_type || meDoc?.selected_role || meDoc?.role),
      [otherUid]: normalizeRole(otherRole || otherUser?.user_type || otherUser?.role),
    },
    category,
    created_at: serverTimestamp(),
    last_message_at: null,
    last_message_text: "",
    last_message_sender_id: "",
  };

  const convRef = await addDoc(collection(db, "conversations"), conversationDoc);

  // Increment monthly counter on student doc (only if student + free tier)
  if (isStudent(meDoc) && !isPremiumStudent(meDoc)) {
    const mk = monthKey(new Date());
    const path = `message_limits.${mk}.${category}`;
    const current = Number(meDoc?.message_limits?.[mk]?.[category] || 0);

    await updateDoc(doc(db, "users", myUid), {
      [path]: current + 1,
      message_limits_updated_at: serverTimestamp(),
    });
  }

  const createdSnap = await getDoc(convRef);
  return createdSnap.exists() ? { id: createdSnap.id, ...createdSnap.data() } : { id: convRef.id, ...conversationDoc };
}

export async function sendMessage({ conversationId, senderId, text }) {
  if (!conversationId || !senderId) throw new Error("Missing message info.");
  const clean = String(text || "").trim();
  if (!clean) return;

  await addDoc(collection(db, "messages"), {
    conversation_id: conversationId,
    sender_id: senderId,
    text: clean,
    created_at: serverTimestamp(),
  });

  // Update conversation summary
  await updateDoc(doc(db, "conversations", conversationId), {
    last_message_at: serverTimestamp(),
    last_message_text: clean.slice(0, 300),
    last_message_sender_id: senderId,
  });
}

/**
 * Student agreement gate
 */
export async function acceptMessagingAgreement(uid) {
  if (!uid) return;
  await updateDoc(doc(db, "users", uid), {
    messaging_agreement_accepted_at: serverTimestamp(),
  });
}

/**
 * Reports
 */
export async function submitReport({
  reporterId,
  againstUserId,
  conversationId,
  reason,
  type, // "agent" | "tutor" | "vendor"
}) {
  if (!reporterId || !againstUserId || !conversationId) throw new Error("Missing report fields.");

  await addDoc(collection(db, "reports"), {
    reporter_id: reporterId,
    against_user_id: againstUserId,
    conversation_id: conversationId,
    type: String(type || "").toLowerCase(),
    reason: String(reason || "").trim(),
    created_at: serverTimestamp(),
    status: "submitted",
    note: "Investigation uses platform chat logs only. External transactions with no chat trace may be disregarded.",
  });
}

/**
 * Helper: ensure messaging_settings exists (optional). Call from an admin panel if you want.
 */
export async function ensureMessagingSettingsSingleton() {
  const ref = doc(db, "messaging_settings", "SINGLETON");
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    free_student_agent_tutor_limit: 5,
    free_student_vendor_limit: 5,
    premium_student_price_usd: 19,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}
