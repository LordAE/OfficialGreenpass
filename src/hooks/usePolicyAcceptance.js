import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

export const POLICY_VERSION = "2026-03-21";

export const REQUIRED_POLICIES = [
  "terms",
  "privacy",
  "community",
  "refund",
  "verification",
  "referral",
];

const EMPTY_STATE = {
  version: null,
  accepted: {},
  completed: false,
};

function normalizePolicyAcceptance(data = {}) {
  const accepted = data.accepted && typeof data.accepted === "object" ? data.accepted : {};
  const version = typeof data.version === "string" ? data.version : null;
  const completed = REQUIRED_POLICIES.every((key) => accepted[key]?.accepted === true) && version === POLICY_VERSION;
  return { version, accepted, completed };
}

export default function usePolicyAcceptance() {
  const [state, setState] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid || null;

  const load = useCallback(async () => {
    if (!uid) {
      setState(EMPTY_STATE);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      setState(normalizePolicyAcceptance(data.policy_acceptance || {}));
    } catch (error) {
      console.error("Failed to load policy acceptance", error);
      setState(EMPTY_STATE);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const acceptPolicies = useCallback(async (keys = REQUIRED_POLICIES) => {
    if (!uid) throw new Error("User must be signed in.");

    const ref = doc(db, "users", uid);
    const acceptedPatch = {};
    for (const key of keys) {
      acceptedPatch[`policy_acceptance.accepted.${key}`] = {
        accepted: true,
        acceptedAt: serverTimestamp(),
        version: POLICY_VERSION,
      };
    }

    await setDoc(
      ref,
      {
        policy_acceptance: {
          version: POLICY_VERSION,
          accepted: {},
          completed: false,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );

    await updateDoc(ref, {
      ...acceptedPatch,
      "policy_acceptance.version": POLICY_VERSION,
      "policy_acceptance.completed": true,
      "policy_acceptance.updatedAt": serverTimestamp(),
    });

    await load();
  }, [load, uid]);

  const needsAcceptance = useMemo(() => !loading && !state.completed, [loading, state.completed]);

  return {
    loading,
    state,
    needsAcceptance,
    acceptPolicies,
    reloadPolicyAcceptance: load,
  };
}
