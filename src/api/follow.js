// src/api/follow.js

import { db } from "@/firebase";
import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

/**
 * Send a follow request (Instagram-style)
 * Writes to: users/{followeeId}/follow_requests/{followerId}
 * Backend function will create notifications + mirror sent-request doc.
 */
export async function sendFollowRequest({ followerId, followeeId }) {
  if (!followerId || !followeeId || followerId === followeeId) return;
  // Write a local "sent" mirror doc immediately so the UI updates instantly.
  // (Previously this relied on a backend mirror/trigger, which can feel delayed.)
  await setDoc(
    doc(db, "users", followerId, "follow_requests_sent", followeeId),
    {
      follower_id: followerId,
      followee_id: followeeId,
      status: "pending",
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  await setDoc(
    doc(db, "users", followeeId, "follow_requests", followerId),
    {
      follower_id: followerId,
      followee_id: followeeId,
      status: "pending",
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Cancel a follow request you sent.
 */
export async function cancelFollowRequest({ followerId, followeeId }) {
  if (!followerId || !followeeId || followerId === followeeId) return;
  // Remove the local "sent" mirror doc so the UI updates immediately.
  await deleteDoc(doc(db, "users", followerId, "follow_requests_sent", followeeId));
  await deleteDoc(doc(db, "users", followeeId, "follow_requests", followerId));
}

/**
 * Unfollow: delete your own following doc.
 * Backend cleanup trigger removes the mirror follower doc.
 */
export async function unfollowUser({ followerId, followeeId }) {
  if (!followerId || !followeeId || followerId === followeeId) return;
  await deleteDoc(doc(db, "users", followerId, "following", followeeId));
}

/**
 * Followee responds to a request by setting status.
 * Backend function will create followers/following + notifications.
 */
export async function respondToFollowRequest({ followeeId, followerId, decision }) {
  if (!followeeId || !followerId || followeeId === followerId) return;
  const d = String(decision || "").toLowerCase();
  if (d !== "accepted" && d !== "declined") return;
  await setDoc(
    doc(db, "users", followeeId, "follow_requests", followerId),
    { status: d, respondedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Live state listener for a relationship:
 * - following: users/{me}/following/{target}
 * - requested: users/{me}/follow_requests_sent/{target}
 */
export function listenFollowState({ meId, targetId }, cb) {
  if (!meId || !targetId || meId === targetId) {
    cb({ following: false, requested: false });
    return () => {};
  }

  let following = false;
  let requested = false;

  const emit = () => cb({ following, requested });

  const unsub1 = onSnapshot(doc(db, "users", meId, "following", targetId), (snap) => {
    following = snap.exists();
    emit();
  });

  const unsub2 = onSnapshot(doc(db, "users", meId, "follow_requests_sent", targetId), (snap) => {
    requested = snap.exists();
    emit();
  });

  return () => {
    unsub1();
    unsub2();
  };
}
