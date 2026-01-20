// src/pages/AdminSubscription.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, DollarSign } from "lucide-react";

// Firestore doc: app_config/subscription
// field: enabled (boolean) — default true

function resolveRole(userDoc) {
  const d = userDoc || {};
  const r = String(d.user_type || d.selected_role || d.role || "").toLowerCase().trim();
  if (r) return r;
  if (d.is_admin === true || d.admin === true) return "admin";
  return "student";
}

export default function AdminSubscription() {
  const [me, setMe] = useState(null);
  const [meDoc, setMeDoc] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [enabled, setEnabled] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);

  const cfgRef = useMemo(() => doc(db, "app_config", "subscription"), []);

  // Auth + my user doc
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setMe(u || null);
      if (!u) {
        setMeDoc(null);
        setPageLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setMeDoc(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error("AdminSubscription get user doc error:", e);
        setMeDoc(null);
      } finally {
        setPageLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Live config
  useEffect(() => {
    const unsub = onSnapshot(
      cfgRef,
      (snap) => {
        const v = snap.exists() ? snap.data()?.enabled : undefined;
        setEnabled(v !== false);
        setConfigLoading(false);
      },
      (err) => {
        console.error("AdminSubscription config listen error:", err);
        setEnabled(true);
        setConfigLoading(false);
      }
    );
    return () => unsub();
  }, [cfgRef]);

  const myRole = useMemo(() => resolveRole(meDoc), [meDoc]);
  const isAdmin = myRole === "admin";

  const setMode = useCallback(
    async (nextEnabled) => {
      if (!me?.uid) {
        setErrorText("You must be logged in.");
        return;
      }
      if (!isAdmin) {
        setErrorText("Only Admin can change subscription mode.");
        return;
      }

      try {
        setErrorText("");
        setSaving(true);

        await setDoc(
          cfgRef,
          {
            enabled: !!nextEnabled,
            updatedAt: serverTimestamp(),
            updatedBy: me.uid,
          },
          { merge: true }
        );
      } catch (e) {
        console.error("AdminSubscription save error:", e);
        setErrorText(e?.message || "Failed to update subscription mode.");
      } finally {
        setSaving(false);
      }
    },
    [cfgRef, isAdmin, me?.uid]
  );

  const loading = pageLoading || configLoading;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Mode</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700">
            Please sign in as Admin to access this page.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Subscription Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700">
            You don’t have permission to change subscription mode.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Subscription Mode
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-gray-900">Enforce subscription gating</div>
              <div className="text-sm text-gray-600">
                When ON, the app will block messaging and paid features for non-subscribed roles.
                When OFF, the UI will allow access (useful for testing).
              </div>
            </div>

            <div className="flex items-center gap-2">
              {enabled ? (
                <Badge className="bg-green-600 text-white">ON</Badge>
              ) : (
                <Badge variant="secondary">OFF</Badge>
              )}
            </div>
          </div>

          {errorText ? <div className="text-sm text-red-600">{errorText}</div> : null}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setMode(true)}
              disabled={saving || enabled === true}
              className="h-11"
            >
              {saving && enabled !== true ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Turn ON
            </Button>

            <Button
              variant="outline"
              onClick={() => setMode(false)}
              disabled={saving || enabled === false}
              className="h-11"
            >
              {saving && enabled !== false ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Turn OFF
            </Button>
          </div>

          <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700">
            <div className="font-semibold mb-1">Firestore doc</div>
            <div>
              <code className="text-xs">app_config/subscription</code>
              <span className="mx-2">•</span>
              <code className="text-xs">enabled: true|false</code>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Tip: If messaging is still blocked while mode is OFF, you also need to update your backend
              checks (cloud functions / api/messaging) to honor this flag.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
