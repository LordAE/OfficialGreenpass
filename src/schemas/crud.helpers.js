import { db } from "@/firebase"; // or "@/api/firebaseClient"
import {
  collection as fsCollection,
  doc as fsDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit as qLimit,
} from "firebase/firestore";

function assertCollectionName(collectionName) {
  if (!collectionName || typeof collectionName !== "string") {
    throw new Error(`collectionName must be a non-empty string. Got: ${String(collectionName)}`);
  }
}
function assertDocId(docId) {
  if (docId === undefined || docId === null || docId === "") {
    throw new Error(`docId is required. Got: ${String(docId)}`);
  }
}

export async function getById(collectionName, docId) {
  assertCollectionName(collectionName);
  assertDocId(docId);
  const ref = fsDoc(db, collectionName, String(docId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id };
}

export async function filterEq(collectionName, filters = {}, lim) {
  assertCollectionName(collectionName);
  let qRef = fsCollection(db, collectionName);
  for (const [k, v] of Object.entries(filters || {})) {
    if (v !== undefined && v !== null) qRef = query(qRef, where(k, "==", v));
  }
  if (lim) qRef = query(qRef, qLimit(lim));
  const s = await getDocs(qRef);
  return s.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function createIn(collectionName, payload) {
  assertCollectionName(collectionName);
  const ref = await addDoc(fsCollection(db, collectionName), payload);
  const snap = await getDoc(ref);
  return { ...snap.data(), id: snap.id };
}

export async function updateIn(collectionName, docId, patch) {
  assertCollectionName(collectionName);
  assertDocId(docId);
  const ref = fsDoc(db, collectionName, String(docId));
  await updateDoc(ref, patch);
  const snap = await getDoc(ref);
  return { ...snap.data(), id: snap.id };
}

export async function removeIn(collectionName, docId) {
  assertCollectionName(collectionName);
  assertDocId(docId);
  await deleteDoc(fsDoc(db, collectionName, String(docId)));
  return { id: String(docId) };
}
