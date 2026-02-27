
// src/pages/Organization.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import OrgInviteDialog from "@/components/invites/OrgInviteDialoag";

import {
  Building2,
  Users,
  Plus,
  Crown,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Sparkles,
  Check,
  Mail,
  Send,
  RefreshCcw,
  Ban,
} from "lucide-react";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}


function capWord(s) {
  const x = String(s || "").trim();
  if (!x) return "";
  return x.charAt(0).toUpperCase() + x.slice(1);
}

function ProgressBar({ value = 0 }) {
  const pct = clamp(value, 0, 100);
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || "pending").toLowerCase();
  if (s === "accepted") return <Badge className="rounded-full" variant="secondary">Accepted</Badge>;
  if (s === "revoked") return <Badge className="rounded-full" variant="destructive">Revoked</Badge>;
  if (s === "expired") return <Badge className="rounded-full" variant="outline">Expired</Badge>;
  return <Badge className="rounded-full" variant="outline">Pending</Badge>;
}

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

async function postAuthed(path, body) {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  let base = inferFunctionsBaseFromEnv();
  if (!base) {
    const pid = auth?.app?.options?.projectId;
    if (pid) base = `https://us-central1-${pid}.cloudfunctions.net`;
  }
  if (!base) throw new Error("Missing Functions base URL.");
  const idToken = await user.getIdToken();
  const res = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export default function Organization() {
  const [fbUser, setFbUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteErr, setInviteErr] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const refreshOrg = async (uid) => {
    let orgIdFromProfile = "";
    try {
      const usnap = await getDoc(doc(db, "users", uid));
      if (usnap.exists()) {
        const ud = usnap.data() || {};
        orgIdFromProfile = ud.orgId || ud.organizationId || ud.org_id || ud.organization_id || "";
      }
    } catch {}

    let orgDoc = null;

    if (orgIdFromProfile) {
      const osnap = await getDoc(doc(db, "organizations", orgIdFromProfile));
      if (osnap.exists()) orgDoc = { id: osnap.id, ...osnap.data() };
    }

    if (!orgDoc) {
      const snap = await getDocs(query(collection(db, "organizations"), where("ownerId", "==", uid), limit(1)));
      if (!snap.empty) {
        const d = snap.docs[0];
        orgDoc = { id: d.id, ...d.data() };
      }
    }

    if (!orgDoc) {
      setOrg(null);
      setMembers([]);
      setInvites([]);
      return null;
    }

    setOrg(orgDoc);

    const mSnap = await getDocs(query(collection(db, "organization_members"), where("orgId", "==", orgDoc.id)));
    setMembers(mSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    // Owner status list comes from Firestore reads (writes are server-only)
    // Invites are visible to owner/admin only (rules enforce this too)
    if (orgDoc?.ownerId === uid) {
      const iSnap = await getDocs(
        query(collection(db, "org_invites"), where("orgId", "==", orgDoc.id), orderBy("createdAt", "desc"), limit(50))
      );
      setInvites(iSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } else {
      setInvites([]);
    }
    return orgDoc;
  };

  useEffect(() => {
    const load = async () => {
      if (!authReady) return;

      if (!fbUser?.uid) {
        setOrg(null);
        setMembers([]);
        setInvites([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        await refreshOrg(fbUser.uid);
      } catch (e) {
        console.error("Organization load error:", e);
        setOrg(null);
        setMembers([]);
        setInvites([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authReady, fbUser?.uid]);

  const totalSlots = useMemo(() => (org?.baseSlots ?? 5) + (org?.extraSlots ?? 0), [org]);
  const usedSlots = useMemo(() => (typeof org?.usedSlots === "number" ? org.usedSlots : members.length), [org, members.length]);
  const remainingSlots = useMemo(() => Math.max(0, totalSlots - usedSlots), [totalSlots, usedSlots]);
  const usedPct = useMemo(() => (!totalSlots ? 0 : Math.round((usedSlots / totalSlots) * 100)), [usedSlots, totalSlots]);

  const canCreateOrg = useMemo(() => !!fbUser?.uid && !org && !loading && !creating, [fbUser?.uid, org, loading, creating]);

  const handleCreateOrg = async () => {
    if (!fbUser?.uid) return;
    const name = (orgName || "").trim();
    if (!name) {
      setError("Please enter an organization name.");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const orgRef = await addDoc(collection(db, "organizations"), {
        name,
        ownerId: fbUser.uid,
        role: "",
        plan: "basic",
        baseSlots: 5,
        extraSlots: 0,
        totalSlots: 5,
        usedSlots: 1,
        subscriptionActive: true,
        createdAt: serverTimestamp(),
      });

      // IMPORTANT: member doc id is now deterministic in accept flow, but for owner we keep original style
      await addDoc(collection(db, "organization_members"), {
        orgId: orgRef.id,
        userId: fbUser.uid,
        email: fbUser.email || "",
        role: "owner",
        status: "active",
        createdAt: serverTimestamp(),
      });

      try {
        await setDoc(doc(db, "users", fbUser.uid), { orgId: orgRef.id }, { merge: true });
      } catch {}

      await refreshOrg(fbUser.uid);
    } catch (e) {
      console.error("Create org error:", e);
      setError("Failed to create organization. Check Firestore rules.");
    } finally {
      setCreating(false);
    }
  };

  const openInvite = () => {
    setInviteEmail("");
    setInviteRole("member");
    setInviteErr("");
    setInviteOpen(true);
  };

  const sendInvite = async () => {
    if (!org?.id) return;
    const email = (inviteEmail || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setInviteErr("Please enter a valid email.");
      return;
    }
    if (remainingSlots <= 0) {
      setInviteErr("Slot limit reached. Buy more slots to invite more members.");
      return;
    }

    setInviteBusy(true);
    setInviteErr("");
    try {
      await postAuthed("createOrgInvite", { orgId: org.id, email, role: inviteRole });
      await refreshOrg(fbUser.uid);
      setInviteOpen(false);
    } catch (e) {
      console.error(e);
      setInviteErr(e.message || "Failed to send invite.");
    } finally {
      setInviteBusy(false);
    }
  };

  const revokeInvite = async (inviteId) => {
    try {
      await postAuthed("revokeOrgInvite", { inviteId });
      await refreshOrg(fbUser.uid);
    } catch (e) {
      console.error(e);
    }
  };

  const resendInvite = async (inv) => {
    // For resend, we simply issue a new invite (cleaner + safer than reusing token).
    // Owner will see a new pending row.
    try {
      await postAuthed("createOrgInvite", { orgId: inv.orgId, email: inv.email, role: inv.role || "member" });
      await refreshOrg(fbUser.uid);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading organization...
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
                <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
                <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
              </div>
              <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (authReady && !fbUser?.uid) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Please sign in to manage your organization.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-100 blur-3xl opacity-60" />
          <div className="absolute top-32 right-10 h-56 w-56 rounded-full bg-gray-100 blur-3xl opacity-70" />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
              <p className="text-sm text-gray-600">Create your organization to manage members and unlock team slots.</p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              5 free slots
            </Badge>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-3xl overflow-hidden lg:col-span-2">
              <div className="bg-gradient-to-r from-emerald-50 to-white p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="font-semibold">Set up your team in minutes</div>
                    <div className="text-xs text-gray-600">Add up to 5 members free. Buy more slots anytime.</div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <Label>Organization name</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g., ABC School Admissions Team"
                    disabled={!canCreateOrg}
                    className="rounded-2xl"
                  />
                </div>

                {error ? <div className="text-sm text-red-600">{error}</div> : null}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleCreateOrg} disabled={!canCreateOrg} className="rounded-2xl">
                    {creating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create organization
                      </span>
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border p-3">
                    <div className="text-xs text-gray-600">Included</div>
                    <div className="font-semibold">5 team slots</div>
                  </div>
                  <div className="rounded-2xl border p-3">
                    <div className="text-xs text-gray-600">Access</div>
                    <div className="font-semibold">Org settings</div>
                  </div>
                  <div className="rounded-2xl border p-3">
                    <div className="text-xs text-gray-600">Upgrade</div>
                    <div className="font-semibold">Pay per slot</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Seat pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border p-4">
                  <div className="text-xs text-gray-600">Included</div>
                  <div className="mt-1 text-sm font-semibold">5 free seats</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <Check className="h-4 w-4 text-emerald-600" /> Invite staff
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <Check className="h-4 w-4 text-emerald-600" /> Manage roles
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <Check className="h-4 w-4 text-emerald-600" /> Team settings
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="text-xs text-gray-600">Extra seats</div>
                  <div className="mt-1 text-sm font-semibold">$3 / seat / month</div>
                  <div className="mt-1 text-xs text-gray-500">Buy only when you need more members.</div>
                  <Button className="mt-3 w-full rounded-2xl" variant="outline" disabled>
                    Coming soon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const planLabel = (org.plan || "basic").toString().toUpperCase();

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {org.name || "Untitled organization"}
              </span>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center gap-1">
                <Crown className="h-4 w-4" />
                {planLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {remainingSlots === 0 ? (
              <Badge className="rounded-full" variant="destructive">
                Slot limit reached
              </Badge>
            ) : (
              <Badge className="rounded-full" variant="secondary">
                {remainingSlots} slots left
              </Badge>
            )}
            <Button className="rounded-2xl" variant="outline">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Buy more slots
              </span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-3xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team slots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  Used <span className="font-medium text-gray-900">{usedSlots}</span> of{" "}
                  <span className="font-medium text-gray-900">{totalSlots}</span>
                </div>
                <div className="text-gray-600">{usedPct}%</div>
              </div>
              <ProgressBar value={usedPct} />
              <div className="text-xs text-gray-500">You start with <b>5 free slots</b>. Add more by purchasing extra slots.</div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Quick actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full rounded-2xl" onClick={openInvite}>
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Invite by email
                </span>
              </Button>
              <div className="text-xs text-gray-500">Invites are created + emailed by Cloud Functions.</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  <div className="mx-auto mb-2 h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="font-medium">No members yet</div>
                  <div className="text-sm text-gray-600">Invite your first teammate.</div>
                </div>
              ) : (
                <div className="divide-y">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{m.email || m.userId || m.id}</div>
                        <div className="text-xs text-gray-500">{capWord(m.role ? m.role : "member")} {m.status ? `• ${capWord(m.status)}` : ""}</div>
                      </div>
                      {m.role === "owner" ? (
                        <Badge className="rounded-full" variant="secondary">Owner</Badge>
                      ) : (
                        <Badge className="rounded-full" variant="outline">Member</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invites.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  <div className="mx-auto mb-2 h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="font-medium">No invitations yet</div>
                  <div className="text-sm text-gray-600">Send an invite to add teammates.</div>
                </div>
              ) : (
                <div className="divide-y">
                  {invites.map((inv) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{inv.email}</div>
                        <div className="text-xs text-gray-500">
                          {capWord(inv.role || "member")} • {capWord(inv.status || "pending")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={capWord(inv.status)} />
                        {String(inv.status || "pending").toLowerCase() === "pending" ? (
                          <>
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => resendInvite(inv)} title="Resend (new invite)">
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => revokeInvite(inv.id)} title="Revoke">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <OrgInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        orgId={org?.id}
        orgName={org?.name}
        onSent={async () => {
          try { await refreshOrg(fbUser.uid); } catch {}
        }}
      /></div>
  );
}
