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

export default function ImmigrationDisclaimer() {
  return (
    <PolicyLayout
      title="GreenPass Immigration and Outcome Disclaimer"
      updated="March 21, 2026"
    >
      <Section title="1. No guaranteed immigration or education outcome">
        <p>
          GreenPass does not guarantee school admission, visa approval, study permit approval,
          work permit approval, scholarship approval, permanent residency approval, job placement,
          or any other government, institutional, or third-party outcome.
        </p>
      </Section>

      <Section title="2. Platform role only">
        <p>
          GreenPass is a platform that helps users connect, organize information, and manage
          workflows. Final decisions are made by schools, government bodies, employers,
          immigration authorities, or other third parties, not by GreenPass.
        </p>
      </Section>

      <Section title="3. User responsibility">
        <p>
          Users remain responsible for reviewing official requirements, confirming eligibility,
          providing truthful documents, meeting deadlines, and obtaining professional advice
          where appropriate.
        </p>
      </Section>

      <Section title="4. Verification does not equal legal approval">
        <p>
          A GreenPass verification badge or platform approval does not mean government approval,
          legal certification, immigration authorization, or a guaranteed result.
        </p>
      </Section>
    </PolicyLayout>
  );
}