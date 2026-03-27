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

  const referralLink =
    user?.collaborator_referral_link ||
    user?.ambassador_referral_link ||
    (referralCode
      ? `${APP_BASE.replace(/\/+$/, "")}/?ref=${encodeURIComponent(referralCode)}`
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
    tier === "gold" ? 100 : Math.min(100, Math.round((stats.verified / target) * 100));
  const remaining = tier === "gold" ? 0 : Math.max(0, target - stats.verified);

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
    a.download = "greenpass-collaborator-referral-qr.png";
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
                Invite users using your collaborator referral link or QR code. When they sign up,
                complete their profile, and get verified, your progress updates automatically.
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
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Copy Referral Link
                </Button>

                <Button
                  variant="secondary"
                  className="rounded-xl bg-white/10 text-white hover:bg-white/15"
                  onClick={handleNativeShare}
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
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy code
                </Button>

                <Button
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => copyText(referralLink)}
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
          hint="Users who joined from your code or link"
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
              <span>Verified users: <strong>{stats.verified}</strong></span>
              <span>Target: <strong>{target}</strong></span>
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
              Referral Link and QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {referralQr ? (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <img
                    src={referralQr}
                    alt="Collaborator referral QR"
                    className="h-56 w-56 rounded-lg object-contain"
                  />
                </div>

                <div className="w-full">
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    Referral Link
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 break-all">
                    {referralLink}
                  </div>
                </div>

                <div className="flex w-full flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => copyText(referralLink)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={handleDownloadQr}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download QR
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => window.open(referralLink, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Link
                  </Button>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 w-full">
                  Share this QR or referral link with users. When they create an account through it,
                  then complete profile and get verified, your collaborator progress updates.
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