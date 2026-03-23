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

export default function TermsOfService() {
  return (
    <PolicyLayout title="GreenPass Terms of Service" updated="March 21, 2026">
      <Section title="1. About GreenPass">
        <p>
          GreenPass is a role-based digital platform that connects students, agents, tutors,
          schools, organizations, administrators, and selected business users through profile
          creation, directory discovery, messaging, referral relationships, tutoring tools,
          event participation, subscriptions, and other workflow support features.
        </p>
        <p>
          GreenPass is a platform for connection, communication, workflow management, and
          operational support. Except where expressly stated, GreenPass is not itself the direct
          provider of third-party education, immigration, tutoring, travel, housing, banking,
          or employment services.
        </p>
      </Section>

      <Section title="2. Eligibility and account responsibility">
        <p>
          You are responsible for maintaining accurate account information and for all activity
          that occurs through your account. You must not share access in a way that defeats role
          restrictions, trust controls, organization rules, or platform security measures.
        </p>
        <p>
          If you are using GreenPass on behalf of a business, school, agency, tutoring brand,
          organization, or team, you confirm that you have authority to act for that entity.
        </p>
      </Section>

      <Section title="3. Role-based access and platform restrictions">
        <p>
          Access to GreenPass features may depend on account role, onboarding completion,
          subscription status, trust status, verification state, admin approval, and current
          platform configuration.
        </p>
        <p>
          Some routes and actions are intentionally limited to specific roles. This may include
          student-agent flows, tutor planner access, tutor student management, school lead
          visibility, organization management, admin-only tools, payment review actions,
          and verification workflows.
        </p>
      </Section>

      <Section title="4. Truthful information and lawful use">
        <p>
          You must provide truthful, current, and non-misleading information in your profile,
          onboarding responses, organization details, service listings, verification submissions,
          communications, and payment-related records.
        </p>
        <p>
          False identity claims, fake school or agency claims, fake tutor credentials, misleading
          service descriptions, edited payment evidence, manipulated referrals, or altered
          verification documents are prohibited.
        </p>
      </Section>

      <Section title="5. Communications and routing rules">
        <p>
          GreenPass may enforce communication routing rules to protect workflow integrity and
          platform safety. Certain users may only contact others through approved flows,
          assigned relationships, role-based permissions, or admin-led support paths.
        </p>
        <p>
          Users must not attempt to bypass platform messaging restrictions, school-facing rules,
          lead ownership boundaries, or internal support and moderation processes.
        </p>
      </Section>

      <Section title="6. Subscriptions, paid access, and feature gating">
        <p>
          Some GreenPass features may require an active subscription, approved payment status,
          or additional platform approval. Feature access may change if a subscription expires,
          a payment fails, a dispute is opened, or trust or compliance concerns are found.
        </p>
        <p>
          GreenPass may expand, limit, pause, revise, or retire platform features, pricing,
          or access conditions at any time, including by role.
        </p>
      </Section>

      <Section title="7. Referrals, invites, and organization access">
        <p>
          Users must not manipulate referral relationships, agent assignment records,
          organization invites, onboarding source data, or ownership records in order to gain
          unfair visibility, access, conversion credit, commissions, or administrative advantage.
        </p>
        <p>
          Self-referrals, fake leads, duplicate signups, stolen invite links, or unauthorized
          organization access attempts are not allowed.
        </p>
      </Section>

      <Section title="8. Messaging, records, and internal review">
        <p>
          GreenPass may maintain platform records relevant to support, moderation, fraud review,
          payment review, trust checks, dispute handling, and internal investigations. These may
          include messages, attachments, timestamps, profile changes, workflow logs, and related
          system records.
        </p>
        <p>
          Authorized internal access to those records is limited to legitimate review purposes,
          including fraud checks, support escalation, abuse prevention, verification review,
          and lawful internal operations.
        </p>
      </Section>

      <Section title="9. Prohibited conduct">
        <p>
          You may not use GreenPass to spam, harass, impersonate others, mislead users, upload
          deceptive evidence, manipulate trust signals, bypass role restrictions, scrape data
          without authorization, exploit workflows, or engage in unlawful, abusive, or fraudulent conduct.
        </p>
        <p>
          You also may not promise guaranteed admissions, guaranteed visas, guaranteed jobs,
          guaranteed PR, guaranteed tutoring success, or guaranteed business outcomes through
          the platform.
        </p>
      </Section>

      <Section title="10. No guaranteed outcomes">
        <p>
          GreenPass does not guarantee school admission, visa or permit approval, employment,
          scholarship approval, tutoring results, lead conversion, revenue, or immigration outcomes.
        </p>
        <p>
          Final decisions are made by schools, agencies, employers, government authorities,
          payment providers, or other third parties, not by GreenPass.
        </p>
      </Section>

      <Section title="11. Suspension, limits, and termination">
        <p>
          GreenPass may restrict, suspend, hide, investigate, reject, or terminate accounts,
          profiles, messages, listings, verification status, trust badges, invitations,
          subscription-linked access, or other features if policy violations, fraud risks,
          abuse patterns, or operational concerns are identified.
        </p>
        <p>
          GreenPass may also preserve records reasonably necessary to investigate abuse,
          handle disputes, comply with business obligations, or protect the platform and its users.
        </p>
      </Section>

      <Section title="12. Changes to these terms">
        <p>
          GreenPass may update these Terms of Service as the platform evolves. Continued use of
          the platform after a policy update may require renewed acceptance of the current version.
        </p>
      </Section>
    </PolicyLayout>
  );
}