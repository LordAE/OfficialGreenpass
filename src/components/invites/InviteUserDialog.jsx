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

/**
 * Fixes:
 * 1) Dialog warning: Missing Description / aria-describedby
 *    - Adds DialogDescription + aria-describedby id.
 * 2) Functions base URL error even when env is flaky
 *    - Falls back to Firebase app options projectId: getAuth().app.options.projectId
 *
 * Still supports env:
 *  - VITE_FUNCTIONS_HTTP_BASE (preferred)
 *  - VITE_FIREBASE_PROJECT_ID (fallback)
 */

const ROLE_LABELS = { student: "Student", agent: "Agent", school: "School" };

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
  // Optional override to bypass env entirely:
  functionsHttpBase,
}) {
  const roles = useMemo(() => Array.from(new Set(allowedRoles)).filter(Boolean), [allowedRoles]);
  const safeDefaultRole = roles.includes(defaultRole) ? defaultRole : roles[0] || "agent";

  const [role, setRole] = useState(safeDefaultRole);
  const [method, setMethod] = useState("link"); // "link" | "email"
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

    // 1) env / prop base
    let base = (functionsHttpBase || inferFunctionsBaseFromEnv() || "").replace(/\/$/, "");

    // 2) fallback to Firebase app options projectId (works even if Vite env is not loaded)
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
          message: `Invalid email(s): ${invalidEmails.slice(0, 5).join(", ")}${invalidEmails.length > 5 ? "…" : ""}`,
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
        // Email mode: send up to 10 in one action
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

  const primaryLabel = method === "link" ? "Generate Invite Link" : `Send Invite Email${emailList.length ? ` (${Math.min(emailList.length, 10)})` : ""}`;
  const descId = "invite-user-dialog-desc";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" aria-describedby={descId}>
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription id={descId} className="text-sm text-muted-foreground">
              Invite someone by generating a secure link or sending an email invitation.
            </DialogDescription>
          </DialogHeader>

          {roles.length === 0 ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>No allowed roles configured for this dialog.</div>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {/* Role */}
              <div className="rounded-2xl border bg-background p-4 space-y-2">
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

              {/* Method segmented */}
              <div className="rounded-2xl border bg-background p-4 space-y-2">
                <Label>Invite method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("link")}
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition",
                      method === "link"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background hover:bg-muted/60",
                    ].join(" ")}
                  >
                    <Link2 className="h-4 w-4" />
                    Link
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod("email")}
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition",
                      method === "email"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background hover:bg-muted/60",
                    ].join(" ")}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                </div>

                {method === "link" ? (
                  <div className="text-xs text-muted-foreground">
                    Best for sharing in chat or social media. Link will be copied automatically.
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Best for formal invites. The recipient will receive a join button via email.
                  </div>
                )}
              </div>

              {/* Email */}
              {method === "email" && (
                <div className="rounded-2xl border bg-background p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Email addresses</Label>
                    <div className="text-xs text-muted-foreground">
                      {emailList.length}/10
                    </div>
                  </div>
                  <Textarea
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={"name@example.com\nname2@example.com\n(You can also separate by commas)"}
                    autoComplete="email"
                    className="min-h-[92px] rounded-xl"
                  />
                  <div className="text-xs text-muted-foreground">
                    Tip: paste multiple emails (one per line). Max 10 invites per action.
                  </div>
                </div>
              )}

              {/* Primary action */}
              <Button onClick={onPrimaryAction} disabled={status.loading} className="w-full h-11 rounded-xl gap-2">
                {status.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : method === "link" ? (
                  <Link2 className="h-4 w-4" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {primaryLabel}
              </Button>

              {/* Status */}
              {status.message && (
                <div
                  className={[
                    "rounded-2xl border p-3 text-sm flex items-start gap-2",
                    status.ok
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-red-50 border-red-200 text-red-800",
                  ].join(" ")}
                >
                  {status.ok ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                  )}
                  <div className="flex-1">{status.message}</div>
                </div>
              )}

              {/* Link */}
              {inviteLink && (
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Invite Link</div>
                  <div className="text-sm break-all">{inviteLink}</div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-xl gap-2"
                      onClick={() => copyToClipboard(inviteLink)}
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t bg-muted/30 px-6 py-3 flex justify-end">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
