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

export default function MessagingPolicy() {
  return (
    <PolicyLayout
      title="GreenPass Messaging and Investigation Policy"
      updated="March 21, 2026"
    >
      <Section title="1. Purpose of in-platform messaging">
        <p>
          GreenPass messaging is intended to support professional communication,
          workflow traceability, dispute review, and user safety. Important instructions,
          service expectations, payment terms, and commitments should remain inside the
          platform whenever possible.
        </p>
      </Section>

      <Section title="2. Reporting and evidence">
        <p>
          When a report involves another user, GreenPass may review in-platform chat records,
          attachments, timestamps, related profile records, payment review records, and other
          traceable platform evidence in order to assess the complaint.
        </p>
        <p>
          If the relevant arrangement happened entirely outside GreenPass and no reliable
          in-platform record exists, GreenPass may have limited ability to verify facts or act.
        </p>
      </Section>

      <Section title="3. Message retention and deletion">
        <p>
          GreenPass may retain message history and related records for support, abuse prevention,
          fraud review, moderation, dispute handling, and trust or safety investigations.
          Messages that are hidden, archived, or no longer visible in the interface may still
          remain in system records for legitimate operational purposes.
        </p>
      </Section>

      <Section title="4. Investigation access">
        <p>
          Access to messaging records for investigation purposes is limited to authorized admin
          or superadmin review where there is a valid operational basis, such as rule enforcement,
          support escalation, fraud review, abuse investigation, or lawful internal handling.
        </p>
      </Section>

      <Section title="5. Off-platform payment warning">
        <p>
          GreenPass is not responsible for side arrangements, untraceable external payments,
          or promises made entirely outside the platform. Users are strongly encouraged to keep
          important terms and evidence inside GreenPass for better transparency and traceability.
        </p>
      </Section>
    </PolicyLayout>
  );
}