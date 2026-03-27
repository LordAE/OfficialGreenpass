import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { createPageUrl } from "@/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ArrowLeft,
  Loader2,
  Search,
  Users,
  UserCheck,
  ShieldCheck,
  Gift,
  ExternalLink,
} from "lucide-react";

function formatDate(value) {
  try {
    if (!value) return "—";

    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleDateString();
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

function getStatusBadge(status, completed, verified) {
  const normalized = String(status || "").toLowerCase();

  if (verified || normalized === "verified") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        Verified
      </Badge>
    );
  }

  if (completed || normalized === "completed_profile") {
    return (
      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
        Completed Profile
      </Badge>
    );
  }

  if (normalized === "joined") {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
        Joined
      </Badge>
    );
  }

  return <Badge variant="secondary">{status || "Pending"}</Badge>;
}

function getTierThreshold(tier) {
  const normalized = String(tier || "bronze").toLowerCase();
  if (normalized === "gold") return 100;
  if (normalized === "silver") return 100;
  return 20;
}

function getTierNextLabel(tier) {
  const normalized = String(tier || "bronze").toLowerCase();
  if (normalized === "gold") return "Top tier reached";
  if (normalized === "silver") return "Gold";
  return "Silver";
}

export default function CollaboratorReferrals() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const currentUser = auth.currentUser;
        if (!currentUser?.uid) {
          throw new Error("You must be signed in to view collaborator referrals.");
        }

        const collaboratorUid = currentUser.uid;

        const userQuery = query(collection(db, "users"), where("uid", "==", collaboratorUid));
        const userSnap = await getDocs(userQuery);

        let currentUserDoc = null;
        if (!userSnap.empty) {
          currentUserDoc = userSnap.docs[0].data();
        } else {
          const fallbackQuery = query(
            collection(db, "users"),
            where("email", "==", currentUser.email || "")
          );
          const fallbackSnap = await getDocs(fallbackQuery);
          if (!fallbackSnap.empty) currentUserDoc = fallbackSnap.docs[0].data();
        }

        const referralQuery = query(
          collection(db, "collaborator_referrals"),
          where("collaborator_uid", "==", collaboratorUid)
        );

        const referralSnap = await getDocs(referralQuery);

        const data = referralSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        data.sort((a, b) => {
          const aTime =
            a?.updated_at?.toDate?.()?.getTime?.() ||
            a?.verified_at?.toDate?.()?.getTime?.() ||
            a?.completed_at?.toDate?.()?.getTime?.() ||
            a?.referred_at?.toDate?.()?.getTime?.() ||
            a?.referred_user_created_at?.toDate?.()?.getTime?.() ||
            0;

          const bTime =
            b?.updated_at?.toDate?.()?.getTime?.() ||
            b?.verified_at?.toDate?.()?.getTime?.() ||
            b?.completed_at?.toDate?.()?.getTime?.() ||
            b?.referred_at?.toDate?.()?.getTime?.() ||
            b?.referred_user_created_at?.toDate?.()?.getTime?.() ||
            0;

          return bTime - aTime;
        });

        if (!mounted) return;

        setRows(data);
        setUserStats(currentUserDoc || null);
      } catch (err) {
        console.error("Collaborator referrals load error:", err);
        if (!mounted) return;
        setError(err?.message || "Failed to load collaborator referrals.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const invited =
      Number(userStats?.collaborator_invited_total ?? 0) || rows.length;

    const completed =
      Number(userStats?.collaborator_completed_profiles ?? 0) ||
      rows.filter(
        (row) =>
          row?.completed_profile === true ||
          String(row?.status || "").toLowerCase() === "completed_profile" ||
          String(row?.status || "").toLowerCase() === "verified"
      ).length;

    const verified =
      Number(userStats?.collaborator_verified_users ?? 0) ||
      rows.filter(
        (row) =>
          row?.verified === true ||
          String(row?.status || "").toLowerCase() === "verified"
      ).length;

    const rewards = Number(userStats?.collaborator_estimated_rewards ?? 0) || 0;
    const tier = String(userStats?.collaborator_tier || "bronze").toLowerCase();

    const threshold = getTierThreshold(tier);
    const progressValue =
      tier === "gold"
        ? 100
        : Math.min(100, Math.round((verified / threshold) * 100));

    const nextLabel = getTierNextLabel(tier);
    const remaining = tier === "gold" ? 0 : Math.max(0, threshold - verified);

    return {
      invited,
      completed,
      verified,
      rewards,
      tier,
      threshold,
      progressValue,
      nextLabel,
      remaining,
    };
  }, [rows, userStats]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const haystack = [
        row?.referred_user_email,
        row?.referred_user_role,
        row?.status,
        row?.collaborator_code,
        row?.referred_user_uid,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, search]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-3">
            <Link to={createPageUrl("Dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Collaborator Referrals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track joined users, profile completion, verification, and your current tier progress.
          </p>
        </div>

        <Button asChild className="rounded-xl">
          <Link to={createPageUrl("Dashboard")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Dashboard
          </Link>
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200">
          <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">Total Invited</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{stats.invited}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">Completed Profiles</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{stats.completed}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">Verified Users</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{stats.verified}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">Estimated Rewards</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">${stats.rewards}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <Gift className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Tier Progress</span>
            <Badge className="uppercase">{stats.tier}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={stats.progressValue} />
          <div className="flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Verified users: <strong>{stats.verified}</strong>
            </span>
            <span>
              Next tier: <strong>{stats.nextLabel}</strong>
            </span>
            <span>
              Remaining: <strong>{stats.remaining}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Referral Ledger</CardTitle>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, role, status..."
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          {filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No referral records found yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {row?.referred_user_email || "No email"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row?.referred_user_uid || "—"}
                      </div>
                    </TableCell>

                    <TableCell className="capitalize">
                      {row?.referred_user_role || "user"}
                    </TableCell>

                    <TableCell>
                      {formatDate(row?.referred_user_created_at || row?.referred_at)}
                    </TableCell>

                    <TableCell>
                      {row?.completed_profile === true ? (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {row?.verified === true ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(row?.status, row?.completed_profile, row?.verified)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}