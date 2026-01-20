// src/hooks/useSubscriptionMode.js
import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

// Firestore doc: app_config/subscription
// field: enabled (boolean) — defaults to true when missing.
export function useSubscriptionMode() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const ref = useMemo(() => doc(db, "app_config", "subscription"), []);

  useEffect(() => {
    let unsub = null;

    // Fast first read (so UI doesn't wait for snapshot round-trip)
    (async () => {
      try {
        const snap = await getDoc(ref);
        const v = snap.exists() ? snap.data()?.enabled : undefined;
        setEnabled(v !== false);
      } catch {
        // fail-safe: keep enabled
        setEnabled(true);
      } finally {
        setLoading(false);
      }
    })();

    // Live updates
    unsub = onSnapshot(
      ref,
      (snap) => {
        const v = snap.exists() ? snap.data()?.enabled : undefined;
        setEnabled(v !== false);
        setLoading(false);
      },
      () => {
        // fail-safe: keep enabled
        setEnabled(true);
        setLoading(false);
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [ref]);

  return { subscriptionModeEnabled: enabled, loading };
}
