// src/api/messaging.js

import { db } from "@/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export const MESSAGE_CATEGORIES = {
  AGENT_TUTOR: "agent_tutor",
  VENDOR: "vendor",
  SUPPORT: "support",
};

export const MESSAGING_LIMITS = {
  // Student free-tier: Agents+Tutors conversation starts per month (configurable 3–5)
  FREE_AGENT_TUTOR_CONV_PER_MONTH: 5,

  // Student free-tier: Vendors conversation starts per month
  FREE_VENDOR_CONV_PER_MONTH: 5,

  // ✅ Student free-tier: max messages per conversation (THIS FIXES YOUR ISSUE)
  FREE_STUDENT_MAX_MESSAGES_PER_CONVO: 3,

  // Agent/Tutor/School: max outbound messages until other party replies
  PRO_MAX_OUTBOUND_UNTIL_REPLY: 3,
};

export function normalizeRole(r) {
  const v = String(r || "").toLowerCase().trim();
  if (v === "student" || v === "users") return "student"; // keep student as student
  if (v === "tutors") return "tutor";
  if (v === "agents") return "agent";
  if (v === "schools") return "school";
  return v || "user";
}

/**
 * ✅ Role resolution based on your real user doc fields:
 * selected_role, role, signup_entry_role, user_type, userType
 */
export function resolveUserRole(userDoc) {
  return normalizeRole(
    userDoc?.selected_role ||
      userDoc?.role ||
      userDoc?.signup_entry_role ||
      userDoc?.user_type ||
      userDoc?.userType ||
      "user"
  );
}

/**
 * ✅ Subscription active based on your doc:
 * subscription_active (boolean)
 * subscription_status (string)
 */
export function isSubscriptionActive(userDoc) {
  if (userDoc?.subscription_active === true) return true;

  const s = String(userDoc?.subscription_status || "")
    .toLowerCase()
    .trim();

  return s === "active" || s === "trialing";
}

export function isSubscriptionInactive(userDoc) {
  return !isSubscriptionActive(userDoc);
}

/**
 * ✅ Free student = student/user AND not subscription active
 */
function isFreeStudent(userDoc) {
  const r = resolveUserRole(userDoc);
  if (!(r === "student" || r === "user")) return false;
  return !isSubscriptionActive(userDoc);
}

export async function getUserDoc(uid) {
  if (!uid) return null;
  if (uid === "support") return { id: "support", full_name: "Support", role: "support" };

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { id: uid };
  return { id: snap.id, ...snap.data() };
}

function pairKey(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  return [x, y].sort().join("__");
}

function ymKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getCategoryForTargetRole(targetRole) {
  const r = normalizeRole(targetRole);
  if (r === "vendor") return MESSAGE_CATEGORIES.VENDOR;
  if (r === "agent" || r === "tutor") return MESSAGE_CATEGORIES.AGENT_TUTOR;
  return MESSAGE_CATEGORIES.SUPPORT;
}

/**
 * ✅ REALTIME: listen to my conversations
 */
export function listenToMyConversations(myUid, callback) {
  if (!myUid) return () => {};

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", myUid),
    orderBy("last_message_at", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })), null),
    (err) => {
      console.error("listenToMyConversations error:", err);
      callback([], err);
    }
  );
}

/**
 * ✅ REALTIME: listen to messages in a conversation
 */
export function listenToMessages(conversationId, callback) {
  if (!conversationId) return () => {};

  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("created_at", "asc"),
    limit(300)
  );

  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })), null),
    (err) => {
      console.error("listenToMessages error:", err);
      callback([], err);
    }
  );
}

export async function listMyConversations(myUid) {
  if (!myUid) return [];
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", myUid),
    orderBy("last_message_at", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listMessages(conversationId) {
  if (!conversationId) return [];
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("created_at", "asc"),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * ✅ Student monthly conversation-start usage:
 * users/{uid}/messaging_usage/{YYYY-MM}
 */
async function checkAndIncrementConversationStart({ uid, bucket, limitValue }) {
  const key = ymKey();
  const usageRef = doc(db, "users", uid, "messaging_usage", key);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(usageRef);
    const data = snap.exists() ? snap.data() : {};

    const agentTutorStarts = Number(data.agentTutorStarts || 0);
    const vendorStarts = Number(data.vendorStarts || 0);

    const field = bucket === "vendor" ? "vendorStarts" : "agentTutorStarts";
    const current = field === "vendorStarts" ? vendorStarts : agentTutorStarts;

    if (current >= limitValue) {
      const err = new Error("Monthly limit reached");
      err.code = "LIMIT_REACHED";
      err.details = { bucket, limit: limitValue, key };
      throw err;
    }

    tx.set(
      usageRef,
      {
        agentTutorStarts: field === "agentTutorStarts" ? current + 1 : agentTutorStarts,
        vendorStarts: field === "vendorStarts" ? current + 1 : vendorStarts,
        month: key,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

/**
 * ✅ POLICY ENFORCEMENT IN CONVO CREATION:
 *
 * Student messaging:
 * - Students can message Agents/Tutors + Support
 * - Students cannot directly contact Schools
 *
 * School click logic for Students:
 * - if assigned_agent_id exists -> route to assigned agent
 * - else -> route to support
 *
 * Student interaction limits (free tier):
 * - free student can start only X conversations per month
 */
export async function ensureConversation({
  meId,
  meDoc, // ✅ required to enforce assigned_agent_id + subscription + agreement
  targetId,
  targetRole,
  source = "app",
}) {
  if (!meId) throw new Error("Missing meId");
  if (!targetId) throw new Error("Missing targetId");

  const meRole = resolveUserRole(meDoc);

  let toId = targetId;
  let toRole = normalizeRole(targetRole || "support");

  // ✅ Student cannot directly contact schools:
  // If student clicks a school, route to assigned agent else support.
  if (meRole === "student" && toRole === "school") {
    const assignedAgentId = String(meDoc?.assigned_agent_id || "").trim();
    if (assignedAgentId) {
      toId = assignedAgentId;
      toRole = "agent";
    } else {
      toId = "support";
      toRole = "support";
    }
  }

  // Safety fallback
  if (!toId) {
    toId = "support";
    toRole = "support";
  }

  const pkey = pairKey(meId, toId);

  // Find existing conversation
  const qFind = query(collection(db, "conversations"), where("pair_key", "==", pkey), limit(1));
  const snapFind = await getDocs(qFind);
  if (!snapFind.empty) {
    const d = snapFind.docs[0];
    return { id: d.id, ...d.data() };
  }

  // ✅ Apply free-tier limits ONLY for NEW conversations
  const category = getCategoryForTargetRole(toRole);
  if (isFreeStudent(meDoc)) {
    if (category === MESSAGE_CATEGORIES.AGENT_TUTOR) {
      await checkAndIncrementConversationStart({
        uid: meId,
        bucket: "agent_tutor",
        limitValue: MESSAGING_LIMITS.FREE_AGENT_TUTOR_CONV_PER_MONTH,
      });
    } else if (category === MESSAGE_CATEGORIES.VENDOR) {
      await checkAndIncrementConversationStart({
        uid: meId,
        bucket: "vendor",
        limitValue: MESSAGING_LIMITS.FREE_VENDOR_CONV_PER_MONTH,
      });
    }
    // Support does not count
  }

  // Create new conversation
  const docData = {
    pair_key: pkey,
    participants: [meId, toId],
    participants_map: { [meId]: true, [toId]: true },
    roles: { [meId]: meRole, [toId]: toRole },
    category,
    created_by: meId,
    source,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    last_message_at: null,
    last_message_text: "",
  };

  const ref = await addDoc(collection(db, "conversations"), docData);
  return { id: ref.id, ...docData };
}

/**
 * ✅ Agent/Tutor/School gating:
 * - subscription required (inactive/pending -> locked)
 * - max 3 outbound messages until other party replies
 *
 * Implementation: fetch last 10 messages, count consecutive messages from sender (latest backwards)
 */
async function enforceOutboundUntilReplyGate({ conversationId, senderId }) {
  const qLast = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("created_at", "desc"),
    limit(10)
  );
  const snap = await getDocs(qLast);
  const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let streak = 0;
  for (const m of arr) {
    if (m.sender_id === senderId) streak += 1;
    else break; // other replied -> streak resets
  }

  if (streak >= MESSAGING_LIMITS.PRO_MAX_OUTBOUND_UNTIL_REPLY) {
    const err = new Error("Wait for the other user to reply.");
    err.code = "WAIT_FOR_REPLY";
    err.details = { max: MESSAGING_LIMITS.PRO_MAX_OUTBOUND_UNTIL_REPLY };
    throw err;
  }
}

/**
 * ✅ Student free-tier gating:
 * - if student/user and not subscribed -> max 3 messages per conversation
 *
 * NOTE: Frontend-only enforcement. Users can bypass via direct Firestore writes
 * unless you also enforce server-side (rules/functions).
 */
async function enforceFreeStudentMaxMessagesPerConvo({ conversationId, senderId }) {
  const qMine = query(
    collection(db, "conversations", conversationId, "messages"),
    where("sender_id", "==", senderId),
    limit(MESSAGING_LIMITS.FREE_STUDENT_MAX_MESSAGES_PER_CONVO)
  );

  const snap = await getDocs(qMine);

  // If we already have 3 docs (limit), user has reached the cap
  if (snap.size >= MESSAGING_LIMITS.FREE_STUDENT_MAX_MESSAGES_PER_CONVO) {
    const err = new Error(
      `Free plan limit reached (${MESSAGING_LIMITS.FREE_STUDENT_MAX_MESSAGES_PER_CONVO} messages). Please subscribe to continue.`
    );
    err.code = "FREE_STUDENT_MESSAGE_LIMIT";
    err.details = { max: MESSAGING_LIMITS.FREE_STUDENT_MAX_MESSAGES_PER_CONVO };
    throw err;
  }
}

/**
 * ✅ sendMessage (with restrictions)
 */
export async function sendMessage({
  conversationId,
  conversationDoc,
  senderId,
  senderDoc, // ✅ pass meDoc here
  text,
}) {
  if (!conversationId) throw new Error("Missing conversationId");
  if (!senderId) throw new Error("Missing senderId");
  const t = String(text || "").trim();
  if (!t) return;

  const senderRole = resolveUserRole(senderDoc);

  // ✅ FREE STUDENT LIMIT (THIS IS THE FIX)
  if (isFreeStudent(senderDoc) && (senderRole === "student" || senderRole === "user")) {
    await enforceFreeStudentMaxMessagesPerConvo({ conversationId, senderId });
  }

  // ✅ subscription required for agent/tutor/school
  if (senderRole === "agent" || senderRole === "tutor" || senderRole === "school") {
    if (isSubscriptionInactive(senderDoc)) {
      const err = new Error("Subscription required");
      err.code = "SUBSCRIPTION_REQUIRED";
      throw err;
    }
    await enforceOutboundUntilReplyGate({ conversationId, senderId });
  }

  const parts = conversationDoc?.participants || [];
  const toUserId = parts.find((x) => x !== senderId) || "support";

  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    conversation_id: conversationId,
    sender_id: senderId,
    to_user_id: toUserId,
    text: t,
    created_at: serverTimestamp(),
  });

  await updateDoc(doc(db, "conversations", conversationId), {
    last_message_at: serverTimestamp(),
    last_message_text: t,
    updated_at: serverTimestamp(),
  });
}

/**
 * ✅ Reporting:
 * Student can report Agent/Tutor/Vendor
 * reports/{autoId}
 */
export async function createReport({
  reporterId,
  reporterDoc,
  conversationId,
  reportedUserId,
  reportedRole,
  reason = "",
}) {
  if (!reporterId || !conversationId || !reportedUserId) {
    throw new Error("Missing report fields");
  }

  const reporterRole = resolveUserRole(reporterDoc);
  const targetRole = normalizeRole(reportedRole);

  const ok =
    reporterRole === "student" &&
    (targetRole === "agent" || targetRole === "tutor" || targetRole === "vendor");

  if (!ok) {
    const err = new Error("Reporting not allowed for this role pairing.");
    err.code = "REPORT_NOT_ALLOWED";
    throw err;
  }

  await addDoc(collection(db, "reports"), {
    reporter_id: reporterId,
    reporter_role: reporterRole,
    conversation_id: conversationId,
    reported_user_id: reportedUserId,
    reported_role: targetRole,
    reason: String(reason || "").slice(0, 1000),
    status: "open",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

/**
 * ✅ Agreement banner acceptance:
 * your doc uses messaging_agreement_accepted_at timestamp
 */
export async function acceptMessagingAgreement(uid) {
  if (!uid) throw new Error("Missing uid");
  await updateDoc(doc(db, "users", uid), {
    messaging_agreement_accepted_at: serverTimestamp(),
  });
}
