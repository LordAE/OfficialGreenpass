
// src/components/org/OrgInviteDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getAuth } from "firebase/auth";

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

export default function OrgInviteDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
  functionsHttpBase,
  onSent,
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [status, setStatus] = useState({ loading: false, ok: false, message: "" });

  useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("member");
      setStatus({ loading: false, ok: false, message: "" });
    }
  }, [open]);

  const validEmail = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim()), [email]);

  async function callCreateOrgInvite() {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("You must be logged in.");

    let base = (functionsHttpBase || inferFunctionsBaseFromEnv() || "").replace(/\/$/, "");
    if (!base) {
      const pid = auth?.app?.options?.projectId;
      if (pid) base = `https://us-central1-${pid}.cloudfunctions.net`;
    }
    if (!base) throw new Error("Missing Functions base URL.");

    const idToken = await user.getIdToken();
    const res = await fetch(`${base}/createOrgInvite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ orgId, email: String(email).trim().toLowerCase(), role }),
    });

    const text = await res.text();
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(json?.error || json?.message || text || "Invite failed");
    return json;
  }

  async function onSend() {
    setStatus({ loading: false, ok: false, message: "" });

    if (!orgId) {
      setStatus({ loading: false, ok: false, message: "Missing orgId." });
      return;
    }
    if (!validEmail) {
      setStatus({ loading: false, ok: false, message: "Please enter a valid email." });
      return;
    }

    setStatus({ loading: true, ok: false, message: "" });
    try {
      await callCreateOrgInvite();
      setStatus({ loading: false, ok: true, message: "Invitation email sent." });
    } catch (e) {
      setStatus({ loading: false, ok: false, message: e?.message || "Failed to send invite." });
    }
  }

  const descId = "org-invite-desc";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl" aria-describedby={descId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Invite to Organization
          </DialogTitle>
          <DialogDescription id={descId}>
            Send an email invitation to join <b>{orgName || "your organization"}</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className="rounded-2xl"
              disabled={status.loading}
            />
          </div>

          <div className="space-y-1">
            <Label>Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={status.loading}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="member">Member</option>
              <option value="staff">Staff</option>
              <option value="admin">Org Admin</option>
            </select>
          </div>

          {status.message ? (
            <div
              className={`rounded-2xl border p-3 text-sm flex gap-2 ${
                status.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {status.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
              <div>{status.message}</div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)} disabled={status.loading}>
              Cancel
            </Button>
            <Button className="rounded-2xl" onClick={onSend} disabled={status.loading}>
              {status.loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Sending...</span>
              ) : (
                <span className="flex items-center gap-2"><Send className="h-4 w-4" />Send invite</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
