import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
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

function pickFallbackValue(primary, fallback) {
  return primary || fallback || "";
}

function mergeReferralWithUserDoc(row, userDoc) {
  if (!userDoc) return row;

  return {
    ...row,

    referred_user_full_name: pickFallbackValue(
      row?.referred_user_full_name,
      userDoc?.full_name ||
        userDoc?.displayName ||
        userDoc?.display_name ||
        userDoc?.name
    ),

    referred_user_email: pickFallbackValue(
      row?.referred_user_email,
      userDoc?.email
    ),

    referred_user_phone: pickFallbackValue(
      row?.referred_user_phone,
      userDoc?.phone || userDoc?.phone_number || userDoc?.mobile
    ),

    referred_user_country: pickFallbackValue(
      row?.referred_user_country,
      userDoc?.country
    ),

    referred_user_country_code: pickFallbackValue(
      row?.referred_user_country_code,
      userDoc?.country_code
    ),

    referred_user_city: pickFallbackValue(
      row?.referred_user_city,
      userDoc?.city
    ),

    referred_user_school_id: pickFallbackValue(
      row?.referred_user_school_id,
      userDoc?.schoolId || userDoc?.school_id
    ),

    referred_user_program_id: pickFallbackValue(
      row?.referred_user_program_id,
      userDoc?.programId || userDoc?.program_id
    ),

    referred_user_role: pickFallbackValue(
      row?.referred_user_role,
      userDoc?.role ||
        userDoc?.user_type ||
        userDoc?.selected_role ||
        userDoc?.userType
    ),

    completed_profile:
      row?.completed_profile === true ||
      userDoc?.onboarding_completed === true ||
      userDoc?.profile_completed === true,

    verified:
      row?.verified === true ||
      userDoc?.is_verified === true ||
      userDoc?.verified === true,
  };
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

        const currentUserRef = doc(db, "users", collaboratorUid);
        const currentUserSnap = await getDoc(currentUserRef);

        let currentUserDoc = null;

        if (currentUserSnap.exists()) {
          currentUserDoc = currentUserSnap.data();
        } else {
          const fallbackQuery = query(
            collection(db, "users"),
            where("email", "==", currentUser.email || "")
          );

          const fallbackSnap = await getDocs(fallbackQuery);

          if (!fallbackSnap.empty) {
            currentUserDoc = fallbackSnap.docs[0].data();
          }
        }

        const referralQuery = query(
          collection(db, "collaborator_referrals"),
          where("collaborator_uid", "==", collaboratorUid)
        );

        const referralSnap = await getDocs(referralQuery);

        const data = await Promise.all(
          referralSnap.docs.map(async (docSnap) => {
            const row = {
              id: docSnap.id,
              ...docSnap.data(),
            };

            const referredUid = row?.referred_user_uid || docSnap.id;

            if (!referredUid) return row;

            try {
              const referredUserSnap = await getDoc(doc(db, "users", referredUid));

              if (!referredUserSnap.exists()) return row;

              return mergeReferralWithUserDoc(row, referredUserSnap.data());
            } catch (err) {
              console.warn("Unable to load referred user profile:", referredUid, err);
              return row;
            }
          })
        );

        data.sort((a, b) => {
          const aTime =
            a?.updated_at?.toDate?.()?.getTime?.() ||
            a?.updatedAt?.toDate?.()?.getTime?.() ||
            a?.verified_at?.toDate?.()?.getTime?.() ||
            a?.completed_at?.toDate?.()?.getTime?.() ||
            a?.referred_at?.toDate?.()?.getTime?.() ||
            a?.referred_user_created_at?.toDate?.()?.getTime?.() ||
            0;

          const bTime =
            b?.updated_at?.toDate?.()?.getTime?.() ||
            b?.updatedAt?.toDate?.()?.getTime?.() ||
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
        row?.referred_user_full_name,
        row?.referred_user_email,
        row?.referred_user_phone,
        row?.referred_user_country,
        row?.referred_user_country_code,
        row?.referred_user_city,
        row?.referred_user_school_id,
        row?.referred_user_program_id,
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
            Track invited students, agents, tutors, schools, collaborators, profile
            completion, verification, and your current tier progress.
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
          <CardContent className="p-4 text-sm text-red-600">
            {error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">Total Invited</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.invited}
                </div>
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
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.completed}
                </div>
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
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.verified}
                </div>
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
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  ${stats.rewards}
                </div>
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
              placeholder="Search name, email, phone, role..."
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
                        {row?.referred_user_full_name ||
                          row?.referred_user_email ||
                          "Unnamed user"}
                      </div>

                      <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                        <div>{row?.referred_user_email || "No email"}</div>
                        <div>{row?.referred_user_phone || "No phone"}</div>

                        <div>
                          {[row?.referred_user_city, row?.referred_user_country]
                            .filter(Boolean)
                            .join(", ") || "No location"}
                        </div>

                        <div className="break-all">
                          UID: {row?.referred_user_uid || "—"}
                        </div>
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
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {row?.verified === true ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(
                        row?.status,
                        row?.completed_profile,
                        row?.verified
                      )}
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