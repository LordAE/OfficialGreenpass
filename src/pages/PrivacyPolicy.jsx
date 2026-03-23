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

export default function PrivacyPolicy() {
  return (
    <PolicyLayout title="GreenPass Privacy Policy" updated="March 21, 2026">
      <Section title="1. Information GreenPass may collect">
        <p>
          GreenPass may collect account details, profile information, role information,
          onboarding responses, service descriptions, school or organization details,
          referral relationships, assigned-agent records, tutoring availability, planner data,
          event participation records, support submissions, verification files, payment review
          evidence, messages, attachments, system logs, and related usage data.
        </p>
      </Section>

      <Section title="2. Public and restricted information">
        <p>
          Some information may be visible to other users or visitors depending on the route,
          your role, and your profile settings. Public-facing information may include name,
          profile image, country, bio, organization name, visible services, and directory-friendly details.
        </p>
        <p>
          Sensitive or operational data, such as email, phone number, internal notes,
          verification records, documents, payment evidence, admin review data, or restricted
          workflow fields, should remain limited to authorized access paths.
        </p>
      </Section>

      <Section title="3. Why GreenPass uses your data">
        <p>
          GreenPass uses data to operate accounts, support role-based dashboards, enable
          messaging, manage tutoring workflows, track referrals and invites, maintain school
          and agent workflows, process subscriptions and payment review, support events,
          prevent abuse, and improve platform reliability and security.
        </p>
      </Section>

      <Section title="4. Messaging, evidence, and support records">
        <p>
          GreenPass may store in-platform messages, attachments, timestamps, report history,
          and related workflow records to support conversations, dispute handling, fraud review,
          moderation, support escalation, and investigation of reported conduct.
        </p>
      </Section>

      <Section title="5. Verification and trust review">
        <p>
          GreenPass may process identity records, business documents, school or agency proof,
          tutor credentials, payment evidence, and related supporting information to assess
          account legitimacy, platform trust, and eligibility for certain features.
        </p>
      </Section>

      <Section title="6. Admin and authorized internal access">
        <p>
          Authorized admins or trusted internal reviewers may access data necessary for support,
          verification, payment review, moderation, fraud prevention, risk investigation,
          referral integrity checks, organization access review, and lawful internal operations.
        </p>
        <p>
          Access is intended to be limited to users with a valid operational basis.
        </p>
      </Section>

      <Section title="7. Retention and recordkeeping">
        <p>
          GreenPass may retain data for as long as reasonably needed for account management,
          messaging history, trust and safety, abuse prevention, business recordkeeping,
          verification history, payment review, legal compliance, or dispute resolution.
        </p>
        <p>
          Some records may remain in internal archives even if they are no longer actively shown
          in the user interface.
        </p>
      </Section>

      <Section title="8. Security and platform protection">
        <p>
          GreenPass uses technical and administrative measures intended to reduce unauthorized
          access, misuse, fraud, and workflow abuse. However, no platform can guarantee perfect
          security, and users also remain responsible for safeguarding account access.
        </p>
      </Section>

      <Section title="9. Third-party services and external workflows">
        <p>
          GreenPass may rely on third-party providers for infrastructure, authentication,
          payments, communication, hosting, or analytics. Those providers may process limited
          data needed to operate their services in support of the platform.
        </p>
        <p>
          GreenPass is not responsible for the privacy practices of third-party sites or services
          that users access outside the platform.
        </p>
      </Section>

      <Section title="10. Policy updates">
        <p>
          This Privacy Policy may be updated as the platform evolves. Continued use of GreenPass
          after a policy update may require renewed acceptance of the latest version.
        </p>
      </Section>
    </PolicyLayout>
  );
}