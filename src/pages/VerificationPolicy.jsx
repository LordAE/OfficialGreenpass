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

export default function VerificationPolicy() {
  return (
    <PolicyLayout title="GreenPass Verification Policy" updated="March 21, 2026">
      <Section title="1. Purpose of verification">
        <p>
          Verification helps GreenPass improve trust across students, tutors, agents,
          schools, organizations, vendors, and other account types by reviewing whether
          submitted information appears legitimate and consistent with the claimed role.
        </p>
      </Section>

      <Section title="2. What GreenPass may review">
        <p>
          GreenPass may review personal identity records, organization documents, school
          or agency proof, tutor credentials, payment-related evidence, public profile
          consistency, referral history, account behavior, and other supporting records
          relevant to trust and platform integrity.
        </p>
      </Section>

      <Section title="3. Outcomes of verification review">
        <p>
          Verification may affect account visibility, trust badges, eligibility for certain
          features, access to messaging or subscription-linked tools, and participation in
          selected workflows. GreenPass may approve, deny, pause, suspend, revoke, or require
          resubmission of verification materials.
        </p>
      </Section>

      <Section title="4. Ongoing review is allowed">
        <p>
          Verification is not necessarily permanent. GreenPass may recheck, pause, or revoke
          a verification status if information changes, documents expire, complaints arise,
          fraud indicators appear, or risk concerns are identified.
        </p>
      </Section>

      <Section title="5. No government or legal guarantee">
        <p>
          GreenPass verification is only a platform trust signal. It is not a government
          license, legal certification, immigration approval, business accreditation,
          or guarantee of service quality or results.
        </p>
      </Section>
    </PolicyLayout>
  );
}