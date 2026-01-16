// src/api/messaging.js
// Firebase-first messaging helpers (NO AI BOT)

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
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export const MESSAGE_CATEGORIES = {
  AGENT_TUTOR: "agent_tutor",
  VENDOR: "vendor",
  SUPPORT: "support",
};

export function normalizeRole(r) {
  const v = String(r || "").toLowerCase().trim();
  if (v === "student" || v === "users") return "user";
  if (v === "tutors") return "tutor";
  if (v === "agents") return "agent";
  if (v === "schools") return "school";
  return v || "user";
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
 * ✅ REALTIME: listen to my conversations (inbox list)
 * Returns: unsubscribe()
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
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(list, null);
    },
    (err) => {
      console.error("listenToMyConversations error:", err);
      callback([], err);
    }
  );
}

/**
 * ✅ REALTIME: listen to messages within a conversation
 * Returns: unsubscribe()
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
    (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(msgs, null);
    },
    (err) => {
      console.error("listenToMessages error:", err);
      callback([], err);
    }
  );
}

/**
 * ✅ Creates a conversation if it doesn't exist yet.
 */
export async function ensureConversation({
  meId,
  meRole,
  targetId,
  targetRole,
  source = "app",
}) {
  if (!meId) throw new Error("Missing meId");
  if (!targetId) throw new Error("Missing targetId");

  const meR = normalizeRole(meRole);
  const toR = normalizeRole(targetRole || "support");

  if ((meR === "user" || meR === "student") && toR === "school") {
    targetId = "support";
    targetRole = "support";
  }

  const pkey = pairKey(meId, targetId);

  const q = query(collection(db, "conversations"), where("pair_key", "==", pkey), limit(1));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }

  const docData = {
    pair_key: pkey,
    participants: [meId, targetId],
    participants_map: { [meId]: true, [targetId]: true },
    roles: { [meId]: meR, [targetId]: toR },
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

export async function sendMessage({ conversationId, conversationDoc, senderId, text }) {
  if (!conversationId) throw new Error("Missing conversationId");
  if (!senderId) throw new Error("Missing senderId");
  const t = String(text || "").trim();
  if (!t) return;

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
