
// src/pages/AcceptOrgInvite.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

function getEnv(key) {
  try {
    return import.meta?.env?.[key];
  } catch {
    return undefined;
  }
}

function inferFunctionsBaseFromEnv() {
  const explicit =
    getEnv("VITE_FUNCTIONS_HTTP_BASE") ||
    getEnv("VITE_FUNCTIONS_BASE_URL") ||
    getEnv("VITE_CLOUD_FUNCTIONS_BASE_URL");

  if (explicit) return String(explicit).replace(/\/$/, "");
  const projectId = getEnv("VITE_FIREBASE_PROJECT_ID");
  if (projectId) return `https://us-central1-${projectId}.cloudfunctions.net`;
  return "";
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AcceptOrgInvite() {
  const qs = useQuery();
  const inviteId = qs.get("inviteId") || "";
  const token = qs.get("token") || "";
  const nav = useNavigate();

  const [authReady, setAuthReady] = useState(false);
  const [fbUser, setFbUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState("loading"); // loading|invalid|expired|pending|accepted|mismatch|error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  async function functionsBase() {
    const auth = getAuth();
    let base = (inferFunctionsBaseFromEnv() || "").replace(/\/$/, "");
    if (!base) {
      const pid = auth?.app?.options?.projectId;
      if (pid) base = `https://us-central1-${pid}.cloudfunctions.net`;
    }
    return base;
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg("");
      try {
        if (!inviteId || !token) {
          setState("invalid");
          return;
        }
        const base = await functionsBase();
        if (!base) throw new Error("Missing Functions base URL.");
        const res = await fetch(`${base}/getOrgInvitePublic?inviteId=${encodeURIComponent(inviteId)}&token=${encodeURIComponent(token)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          const err = json?.error || "Invalid invitation";
          if (String(err).toLowerCase().includes("expired")) setState("expired");
          else setState("invalid");
          setMsg(err);
          return;
        }
        setPreview(json);
        setState("pending");
      } catch (e) {
        console.error(e);
        setState("error");
        setMsg(e?.message || "Failed to load invite.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [inviteId, token]);

  const accept = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    setMsg("");
    try {
      const base = await functionsBase();
      if (!base) throw new Error("Missing Functions base URL.");

      const idToken = await user.getIdToken();
      const res = await fetch(`${base}/acceptOrgInvite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ inviteId, token }),
      });

      const text = await res.text();
      let json = {};
      try { json = text ? JSON.parse(text) : {}; } catch {}

      if (!res.ok) {
        const err = json?.error || text || "Failed to accept invite";
        if (String(err).toLowerCase().includes("mismatch")) setState("mismatch");
        else setState("error");
        setMsg(err);
        return;
      }

      setState("accepted");
    } catch (e) {
      console.error(e);
      setState("error");
      setMsg(e?.message || "Failed to accept invite.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card className="rounded-3xl max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Accept Organization Invite
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="p-6">
        <Card className="rounded-3xl max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Invalid invitation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">{msg || "This invitation link is invalid or no longer available."}</div>
            <Button onClick={() => nav("/")} className="rounded-2xl">Go home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="p-6">
        <Card className="rounded-3xl max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-amber-600" />
              Invitation expired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">{msg || "Ask the organization owner to resend a new invite."}</div>
            <Button onClick={() => nav("/")} className="rounded-2xl">Go home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authReady || !fbUser?.uid) {
    return (
      <div className="p-6">
        <Card className="rounded-3xl max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">
              Please sign in using the same email address that received the invitation.
            </div>
            <Button onClick={() => nav("/")} className="rounded-2xl">Go to sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "accepted") {
    return (
      <div className="p-6">
        <Card className="rounded-3xl max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Invitation accepted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">You’ve joined {preview?.orgName || "the organization"}.</div>
            <Button onClick={() => nav("/organization")} className="rounded-2xl">Go to Organization</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="rounded-3xl max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            You were invited to join <b>{preview?.orgName || "an organization"}</b>.
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">{preview?.memberRole || "member"}</Badge>
            <Badge variant="outline" className="rounded-full">pending</Badge>
          </div>
          {msg ? <div className="text-sm text-red-600">{msg}</div> : null}
          <Button onClick={accept} className="rounded-2xl w-full">Accept & Join</Button>
          <div className="text-xs text-gray-500">
            You must be signed in with <b>{(preview?.invitedEmail || "").toLowerCase()}</b> to accept.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
