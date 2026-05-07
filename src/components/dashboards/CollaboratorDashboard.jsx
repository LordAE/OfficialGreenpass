import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import {
  Copy,
  Gift,
  ShieldCheck,
  Users,
  UserCheck,
  Link as LinkIcon,
  BadgeCheck,
  ArrowRight,
  Trophy,
  QrCode,
  Download,
  Share2,
  ExternalLink,
} from "lucide-react";

const APP_BASE =
  import.meta.env.VITE_APP_BASE_URL ||
  import.meta.env.VITE_PUBLIC_APP_URL ||
  import.meta.env.VITE_SITE_URL ||
  window.location.origin;

function buildQrImageUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(
    text
  )}`;
}

function StatCard({ title, value, icon: Icon, hint }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
            {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
          </div>

          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getNextTier(tier) {
  const normalized = String(tier || "bronze").toLowerCase();
  if (normalized === "gold") return null;
  if (normalized === "silver") return "gold";
  return "silver";
}

function getTierTarget(tier) {
  const normalized = String(tier || "bronze").toLowerCase();
  if (normalized === "gold") return 100;
  if (normalized === "silver") return 100;
  return 20;
}

export default function CollaboratorDashboard({ user }) {
  const referralCode =
    user?.collaborator_referral_code ||
    user?.ambassador_referral_code ||
    "";

  const buildRoleReferralLink = (role) => {
    if (!referralCode) return "";

    const existing = user?.collaborator_role_invite_links?.[role];
    if (existing) return existing;

    return `${APP_BASE.replace(/\/+$/, "")}/?role=${encodeURIComponent(
      role
    )}&ref=${encodeURIComponent(referralCode)}`;
  };

  const roleInviteLinks = {
    user: buildRoleReferralLink("user"),
    agent: buildRoleReferralLink("agent"),
    tutor: buildRoleReferralLink("tutor"),
    school: buildRoleReferralLink("school"),
    collaborator: buildRoleReferralLink("collaborator"),
  };

  const referralLink =
    roleInviteLinks.user ||
    user?.collaborator_referral_link ||
    user?.ambassador_referral_link ||
    (referralCode
      ? `${APP_BASE.replace(/\/+$/, "")}/?role=user&ref=${encodeURIComponent(
          referralCode
        )}`
      : "");

  const referralQr = referralLink ? buildQrImageUrl(referralLink) : "";

  const tier = String(
    user?.collaborator_tier ||
      user?.ambassador_tier ||
      "bronze"
  ).toLowerCase();

  const status = String(
    user?.collaborator_status ||
      user?.ambassador_status ||
      "pending"
  );

  const stats = useMemo(
    () => ({
      invited: Number(
        user?.collaborator_invited_total ??
          user?.ambassador_invited_total ??
          0
      ),
      completed: Number(
        user?.collaborator_completed_profiles ??
          user?.ambassador_completed_profiles ??
          0
      ),
      verified: Number(
        user?.collaborator_verified_users ??
          user?.ambassador_verified_users ??
          0
      ),
      estimatedRewards: Number(
        user?.collaborator_estimated_rewards ??
          user?.ambassador_estimated_rewards ??
          0
      ),
    }),
    [user]
  );

  const nextTier = getNextTier(tier);
  const target = getTierTarget(tier);
  const progressValue =
    tier === "gold"
      ? 100
      : Math.min(100, Math.round((stats.verified / target) * 100));

  const remaining =
    tier === "gold" ? 0 : Math.max(0, target - stats.verified);

  const copyText = async (value) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      alert("Copied successfully.");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      alert("Failed to copy.");
    }
  };

  const handleDownloadQr = () => {
    if (!referralQr) return;

    const a = document.createElement("a");
    a.href = referralQr;
    a.download = "greenpass-collaborator-student-referral-qr.png";
    a.click();
  };

  const handleNativeShare = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "GreenPass Referral",
          text: "Join GreenPass using my referral link.",
          url: referralLink,
        });
        return;
      } catch (err) {
        console.error("Share cancelled or failed:", err);
      }
    }

    await copyText(referralLink);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Card className="overflow-hidden rounded-[28px] border-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="bg-white/15 text-white hover:bg-white/15">
                  Collaborator
                </Badge>

                <Badge className="bg-white/15 uppercase text-white hover:bg-white/15">
                  Tier: {tier}
                </Badge>

                <Badge className="bg-white/15 capitalize text-white hover:bg-white/15">
                  Status: {status}
                </Badge>
              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Grow GreenPass with trackable referrals
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                Invite students, agents, tutors, schools, or collaborators using your
                role-specific referral links. When they sign up through your link, they
                are tracked under your collaborator account.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  asChild
                  variant="secondary"
                  className="rounded-xl bg-white text-slate-900 hover:bg-white/90"
                >
                  <Link to={createPageUrl("Referrals")}>
                    View Referral Ledger
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  variant="secondary"
                  className="rounded-xl bg-white/10 text-white hover:bg-white/15"
                  onClick={() => copyText(referralLink)}
                  disabled={!referralLink}
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Copy Student Link
                </Button>

                <Button
                  variant="secondary"
                  className="rounded-xl bg-white/10 text-white hover:bg-white/15"
                  onClick={handleNativeShare}
                  disabled={!referralLink}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-wide text-white/70">
                Referral code
              </div>

              <div className="mt-1 flex items-center gap-2 text-lg font-bold">
                <BadgeCheck className="h-5 w-5" />
                <span>{referralCode || "Not generated yet"}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => copyText(referralCode)}
                  disabled={!referralCode}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy code
                </Button>

                <Button
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => copyText(referralLink)}
                  disabled={!referralLink}
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total invited"
          value={stats.invited}
          icon={Users}
          hint="Accounts that joined from your code or link"
        />

        <StatCard
          title="Completed profiles"
          value={stats.completed}
          icon={UserCheck}
          hint="Users who finished onboarding"
        />

        <StatCard
          title="Verified users"
          value={stats.verified}
          icon={ShieldCheck}
          hint="Main signal for tier upgrades"
        />

        <StatCard
          title="Estimated rewards"
          value={`$${stats.estimatedRewards}`}
          icon={Gift}
          hint="Running commission estimate"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tier Progress
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="capitalize text-slate-700">
                Current tier: <strong>{tier}</strong>
              </div>

              <div className="text-slate-500">
                {nextTier ? (
                  <>
                    Next tier: <strong className="uppercase">{nextTier}</strong>
                  </>
                ) : (
                  <strong>Top tier reached</strong>
                )}
              </div>
            </div>

            <Progress value={progressValue} />

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <span>
                Verified users: <strong>{stats.verified}</strong>
              </span>
              <span>
                Target: <strong>{target}</strong>
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {nextTier ? (
                <>
                  You need <strong>{remaining}</strong> more verified users to reach{" "}
                  <strong className="uppercase">{nextTier}</strong>.
                </>
              ) : (
                <>You already reached the highest collaborator tier.</>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Student Referral Link and QR
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {referralQr ? (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <img
                    src={referralQr}
                    alt="Collaborator student referral QR"
                    className="h-56 w-56 rounded-lg object-contain"
                  />
                </div>

                <div className="w-full">
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    Default Student/User Link
                  </div>

                  <div className="break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {referralLink}
                  </div>
                </div>

                <div className="flex w-full flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => copyText(referralLink)}
                    disabled={!referralLink}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={handleDownloadQr}
                    disabled={!referralQr}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download QR
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() =>
                      window.open(referralLink, "_blank", "noopener,noreferrer")
                    }
                    disabled={!referralLink}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Link
                  </Button>
                </div>

                <div className="w-full rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-800">
                    Role-specific invite links
                  </div>

                  <div className="space-y-3">
                    {[
                      ["Student/User", roleInviteLinks.user],
                      ["Agent", roleInviteLinks.agent],
                      ["Tutor", roleInviteLinks.tutor],
                      ["School", roleInviteLinks.school],
                      ["Collaborator", roleInviteLinks.collaborator],
                    ].map(([label, link]) => (
                      <div
                        key={label}
                        className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {label}
                          </div>
                          <div className="break-all text-xs text-slate-500">
                            {link || "Not ready"}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => copyText(link)}
                          disabled={!link}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Use the student QR for school events or classroom signups. Use the
                  role-specific links when inviting agents, tutors, schools, or another
                  collaborator.
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Your collaborator referral link is not ready yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}