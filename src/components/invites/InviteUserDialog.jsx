import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Mail, Link2, CheckCircle2, AlertTriangle } from "lucide-react";
import { getAuth } from "firebase/auth";

const ROLE_LABELS = {
  student: "Student",
  agent: "Agent",
  school: "School",
  tutor: "Tutor",
  collaborator: "Collaborator",
};

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

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export default function InviteUserDialog({
  open,
  onOpenChange,
  allowedRoles = [],
  defaultRole = "agent",
  title = "Invite User",
  functionsHttpBase,
}) {
  const roles = useMemo(() => Array.from(new Set(allowedRoles)).filter(Boolean), [allowedRoles]);
  const safeDefaultRole = roles.includes(defaultRole) ? defaultRole : roles[0] || "agent";

  const [role, setRole] = useState(safeDefaultRole);
  const [method, setMethod] = useState("link");
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [status, setStatus] = useState({ loading: false, ok: false, message: "" });

  useEffect(() => {
    if (!open) {
      setRole(safeDefaultRole);
      setMethod("link");
      setEmail("");
      setInviteLink("");
      setStatus({ loading: false, ok: false, message: "" });
    }
  }, [open, safeDefaultRole]);

  const emailList = useMemo(() => {
    if (method !== "email") return [];
    const parts = String(email || "")
      .split(/[\n,;]+/)
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(parts));
  }, [email, method]);

  const invalidEmails = useMemo(() => {
    if (method !== "email") return [];
    const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailList.filter((e) => !reEmail.test(e));
  }, [emailList, method]);

  async function createInvite({ invitedRole, mode, invitedEmail }) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("You must be logged in.");

    let base = (functionsHttpBase || inferFunctionsBaseFromEnv() || "").replace(/\/$/, "");

    if (!base) {
      const pid = auth?.app?.options?.projectId;
      if (pid) base = `https://us-central1-${pid}.cloudfunctions.net`;
    }

    if (!base) {
      throw new Error(
        "Missing Functions base URL. Set VITE_FUNCTIONS_HTTP_BASE or pass functionsHttpBase."
      );
    }

    const idToken = await user.getIdToken();
    const res = await fetch(`${base}/createInvite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        invitedRole,
        mode,
        ...(mode === "email" ? { invitedEmail } : {}),
      }),
    });

    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      // ignore
    }

    if (!res.ok) throw new Error(json?.error || json?.message || text || "Invite failed");
    return json;
  }

  async function onPrimaryAction() {
    setInviteLink("");
    setStatus({ loading: false, ok: false, message: "" });

    if (!roles.includes(role)) {
      setStatus({ loading: false, ok: false, message: "Invalid role selected." });
      return;
    }

    if (method === "email") {
      if (emailList.length === 0) {
        setStatus({ loading: false, ok: false, message: "Please enter at least 1 email address." });
        return;
      }
      if (emailList.length > 10) {
        setStatus({ loading: false, ok: false, message: "You can send up to 10 invites per action." });
        return;
      }
      if (invalidEmails.length > 0) {
        setStatus({
          loading: false,
          ok: false,
          message: `Invalid email(s): ${invalidEmails.slice(0, 5).join(", ")}${
            invalidEmails.length > 5 ? "…" : ""
          }`,
        });
        return;
      }
    }

    setStatus({ loading: true, ok: false, message: "" });

    try {
      if (method === "link") {
        const res = await createInvite({
          invitedRole: role,
          mode: method,
        });

        if (!res?.inviteLink) throw new Error("inviteLink missing from response.");
        setInviteLink(res.inviteLink);
        await copyToClipboard(res.inviteLink);
        setStatus({ loading: false, ok: true, message: "Invite link copied to clipboard." });
      } else {
        let okCount = 0;
        const failed = [];

        for (const addr of emailList) {
          try {
            await createInvite({ invitedRole: role, mode: "email", invitedEmail: addr });
            okCount += 1;
          } catch (err) {
            failed.push({ email: addr, error: err?.message || "Failed" });
          }
        }

        if (failed.length === 0) {
          setStatus({
            loading: false,
            ok: true,
            message: `Invite email sent to ${okCount} recipient${okCount === 1 ? "" : "s"}.`,
          });
        } else if (okCount === 0) {
          setStatus({
            loading: false,
            ok: false,
            message: `Failed to send invites. ${failed[0]?.error || ""}`.trim(),
          });
        } else {
          setStatus({
            loading: false,
            ok: true,
            message: `Sent ${okCount} invite${okCount === 1 ? "" : "s"}. Failed: ${failed
              .slice(0, 3)
              .map((f) => f.email)
              .join(", ")}${failed.length > 3 ? "…" : ""}`,
          });
        }
      }
    } catch (e) {
      setStatus({ loading: false, ok: false, message: e?.message || "Invite failed." });
    }
  }

  const primaryLabel =
    method === "link"
      ? "Generate Invite Link"
      : `Send Invite Email${emailList.length ? ` (${Math.min(emailList.length, 10)})` : ""}`;

  const descId = "invite-user-dialog-desc";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0" aria-describedby={descId}>
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription id={descId} className="text-sm text-muted-foreground">
              Invite someone by generating a secure link or sending an email invitation.
            </DialogDescription>
          </DialogHeader>

          {roles.length === 0 ? (
            <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>No allowed roles configured for this dialog.</div>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div className="space-y-2 rounded-2xl border bg-background p-4">
                <Label>Invite as</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] || r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 rounded-2xl border bg-background p-4">
                <Label>Invite method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={method === "link" ? "default" : "outline"}
                    className="justify-start rounded-xl"
                    onClick={() => setMethod("link")}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Generate link
                  </Button>
                  <Button
                    type="button"
                    variant={method === "email" ? "default" : "outline"}
                    className="justify-start rounded-xl"
                    onClick={() => setMethod("email")}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send email
                  </Button>
                </div>
              </div>

              {method === "email" && (
                <div className="space-y-2 rounded-2xl border bg-background p-4">
                  <Label>Email addresses</Label>
                  <Textarea
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter one or more emails separated by commas, semicolons, or new lines"
                    className="min-h-[110px] rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can send up to 10 invite emails at once.
                  </p>
                </div>
              )}

              <Button
                type="button"
                onClick={onPrimaryAction}
                disabled={status.loading || roles.length === 0}
                className="w-full rounded-xl"
              >
                {status.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  primaryLabel
                )}
              </Button>

              {status.message ? (
                <div
                  className={`rounded-xl border p-3 text-sm ${
                    status.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {status.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                    )}
                    <div>{status.message}</div>
                  </div>
                </div>
              ) : null}

              {inviteLink ? (
                <div className="space-y-2 rounded-2xl border bg-muted/40 p-4">
                  <Label>Invite link</Label>
                  <div className="break-all rounded-xl border bg-background px-3 py-2 text-sm">
                    {inviteLink}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => copyToClipboard(inviteLink)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy again
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}