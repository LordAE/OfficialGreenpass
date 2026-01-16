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
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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
  // "support" is special
  if (uid === "support") return { id: "support", full_name: "Support", role: "support" };

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { id: uid }; // don’t crash UI
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
 * ✅ Creates a conversation if it doesn't exist yet.
 * This is the “first time chat” fix.
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

  // hard block here too (frontend)
  if ((meR === "user" || meR === "student") && toR === "school") {
    targetId = "support";
    targetRole = "support";
  }

  const pkey = pairKey(meId, targetId);

  // Find existing conversation by pair_key
  const q = query(
    collection(db, "conversations"),
    where("pair_key", "==", pkey),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }

  // Create new conversation
  const docData = {
    pair_key: pkey,
    participants: [meId, targetId],
    participants_map: {
      [meId]: true,
      [targetId]: true,
    },
    roles: {
      [meId]: meR,
      [targetId]: toR,
    },
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

export async function sendMessage({
  conversationId,
  conversationDoc,
  senderId,
  text,
}) {
  if (!conversationId) throw new Error("Missing conversationId");
  if (!senderId) throw new Error("Missing senderId");
  const t = String(text || "").trim();
  if (!t) return;

  // Resolve recipient (other participant)
  const parts = conversationDoc?.participants || [];
  const toUserId = parts.find((x) => x !== senderId) || "support";

  // Write message
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    conversation_id: conversationId,
    sender_id: senderId,
    to_user_id: toUserId,
    text: t,
    created_at: serverTimestamp(),
  });

  // Update conversation metadata
  await updateDoc(doc(db, "conversations", conversationId), {
    last_message_at: serverTimestamp(),
    last_message_text: t,
    updated_at: serverTimestamp(),
  });
}
