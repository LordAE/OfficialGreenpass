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

export default function CommunityGuidelines() {
  return (
    <PolicyLayout title="GreenPass Community Guidelines" updated="March 21, 2026">
      <Section title="1. Be honest about who you are">
        <p>
          Do not impersonate a student, tutor, agent, school, organization member, vendor,
          admin, or any other person or entity. Do not misrepresent your authority,
          credentials, affiliation, experience, or service capability.
        </p>
      </Section>

      <Section title="2. No fake promises or misleading guarantees">
        <p>
          You must not advertise or communicate guaranteed admission, guaranteed visa approval,
          guaranteed PR, guaranteed employment, guaranteed tutoring success, guaranteed sales,
          or any other guaranteed outcome that is outside your direct and lawful control.
        </p>
      </Section>

      <Section title="3. No fraud or fake evidence">
        <p>
          Fake IDs, fake receipts, edited payment proof, fake enrollment records, fake offer
          letters, fake agency or school documents, fake verification uploads, and manipulated
          business records are strictly prohibited.
        </p>
      </Section>

      <Section title="4. Respect communication boundaries">
        <p>
          Do not spam, harass, pressure, repeatedly contact unwilling users, or attempt to
          bypass GreenPass routing rules, role limitations, assigned relationships, admin-led
          support processes, or protected school-facing workflows.
        </p>
      </Section>

      <Section title="5. Respect referrals, invites, and leads">
        <p>
          Do not create duplicate accounts, fake leads, self-referrals, recycled signups,
          manipulated onboarding flows, or unauthorized organization invites.
        </p>
      </Section>

      <Section title="6. Keep the platform safe and professional">
        <p>
          Users should communicate respectfully and professionally. Threats, abusive language,
          scams, coercion, or attempts to exploit other users are not allowed.
        </p>
      </Section>

      <Section title="7. Enforcement">
        <p>
          GreenPass may warn, restrict, hide, suspend, investigate, or remove accounts,
          listings, trust signals, messaging access, referrals, organization invites,
          subscription-linked access, or other features when community or safety violations occur.
        </p>
      </Section>
    </PolicyLayout>
  );
}