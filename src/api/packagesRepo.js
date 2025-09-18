// src/api/packagesRepo.js
import { db } from "@/firebase";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  orderBy, query, serverTimestamp
} from "firebase/firestore";

/** Factory that returns { list, create, update, delete } for a collection */
export function makePackageRepo(collectionName) {
  const coll = collection(db, collectionName);

  async function list() {
    // Order newest first; adjust to your needs or add filters later.
    const q = query(coll, orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function create(payload) {
    const ref = await addDoc(coll, {
      ...payload,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return { id: ref.id, ...payload };
  }

  async function update(id, patch) {
    await updateDoc(doc(db, collectionName, id), {
      ...patch,
      updated_at: serverTimestamp(),
    });
    return true;
  }

  async function _delete(id) {
    await deleteDoc(doc(db, collectionName, id));
    return true;
  }

  // keep the same method names your PackageEditor expects
  return { list, create, update, delete: _delete };
}

// (Optional) ready-made repos if you prefer named imports
export const VisaPackageRepo = makePackageRepo("visaPackages");
export const TutorPackageRepo = makePackageRepo("tutorPackages");
export const AgentPackageRepo = makePackageRepo("agentPackages");
export const StudentTutorPackageRepo = makePackageRepo("studentTutorPackages");
