import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-gray-700">{children}</div>
    </section>
  );
}

function PolicyLayout({ title, updated, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(createPageUrl("PolicyCenter"));
  };

  const policyCenterPath = createPageUrl("PolicyCenter").toLowerCase();
  const currentPath = location.pathname.toLowerCase();
  const isPolicyCenter = currentPath === policyCenterPath;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {!isPolicyCenter && (
        <div className="mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      )}

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-bold">{title}</CardTitle>
          <p className="text-sm text-gray-500">Last updated: {updated}</p>
        </CardHeader>
        <CardContent className="space-y-8">{children}</CardContent>
      </Card>
    </div>
  );
}

export default function ReferralPolicy() {
  return (
    <PolicyLayout title="GreenPass Referral and Invitation Policy" updated="March 21, 2026">
      <Section title="1. Current platform scope">
        <p>
          This policy applies to referral, assignment, invite, and onboarding behaviors
          currently relevant in GreenPass, including agent-linked student relationships,
          organization invites, and related lead or ownership integrity flows.
        </p>
      </Section>

      <Section title="2. Valid referral behavior">
        <p>
          Referrals and invites must involve real users, truthful onboarding, authorized access,
          and legitimate relationship building. Fake signups, self-referrals, duplicate accounts,
          misleading recruitment practices, and artificially generated conversions are not allowed.
        </p>
      </Section>

      <Section title="3. Assigned-agent and ownership integrity">
        <p>
          Users must not manipulate referral identifiers, onboarding source fields, lead ownership,
          student assignment records, or conversion history in order to gain unfair visibility,
          ownership, commissions, performance credit, or administrative advantage.
        </p>
      </Section>

      <Section title="4. Organization invites">
        <p>
          Organization invites must be created and sent only by users who are authorized to
          invite others into that organization or workspace context. Invite misuse, unauthorized
          access attempts, or role escalation through shared or stolen invite links is prohibited.
        </p>
      </Section>

      <Section title="5. Enforcement">
        <p>
          GreenPass may reject, reverse, investigate, hide, suspend, or remove referrals,
          invites, ownership claims, access privileges, or related trust signals if manipulation,
          fraud, duplication, or policy abuse is detected.
        </p>
      </Section>
    </PolicyLayout>
  );
}