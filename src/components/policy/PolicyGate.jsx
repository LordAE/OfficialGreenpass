import React from "react";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import usePolicyAcceptance from "@/hooks/usePolicyAcceptance";
import { createPageUrl } from "@/utils";

export default function PolicyGate({ children, title = "Policy acceptance required" }) {
  const { loading, needsAcceptance } = usePolicyAcceptance();

  if (loading) return children;
  if (!needsAcceptance) return children;

  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <ShieldAlert className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-amber-900">
        <p>
          Before using this feature, the account needs to accept the current platform policies.
        </p>
        <Link to={createPageUrl("PolicyCenter")}>
          <Button className="gap-2">
            Review and accept policies
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
