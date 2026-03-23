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

export default function RefundPolicy() {
  return (
    <PolicyLayout
      title="GreenPass Refund and Payment Review Policy"
      updated="March 21, 2026"
    >
      <Section title="1. Policy scope">
        <p>
          This policy applies to the payment-related workflows currently supported in
          GreenPass, including subscriptions, manual payment review, event-related payment
          verification, and approved checkout or payment status flows.
        </p>
      </Section>

      <Section title="2. Subscription-linked access">
        <p>
          Some features may only remain available while an account has valid subscription
          status or an approved payment state. Loss of access due to expiration, cancellation,
          failed payment, or risk review does not automatically create a refund right.
        </p>
      </Section>

      <Section title="3. Manual payment review">
        <p>
          GreenPass may review receipts, proof of payment, payer details, registration records,
          timestamps, and related supporting information before approving event access,
          subscription access, or other manually reviewed payment-related workflows.
        </p>
      </Section>

      <Section title="4. Fraud, disputes, and suspicious activity">
        <p>
          Fake receipts, duplicate payment claims, chargeback abuse, identity mismatches,
          unusual transaction patterns, or suspicious proof of payment may lead to delay,
          rejection, investigation, restricted access, or account enforcement.
        </p>
      </Section>

      <Section title="5. Refund decisions">
        <p>
          Refunds are not guaranteed for all payment types or situations. GreenPass may assess
          refund requests case by case based on the workflow involved, the timing of the request,
          whether platform benefits were already used, whether fraud or abuse indicators exist,
          and whether the user complied with applicable platform policies.
        </p>
      </Section>

      <Section title="6. Final review rights">
        <p>
          GreenPass may request further information before making a refund or payment review
          decision and may preserve relevant records for fraud prevention, dispute handling,
          accounting, and operational audit purposes.
        </p>
      </Section>
    </PolicyLayout>
  );
}