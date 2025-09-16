// src/components/profile/AgentProfileForm.jsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AgentProfileForm({ formData, handleInputChange }) {
  return (
    <div className="space-y-8">
      {/* Agent core */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Agent Information
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              placeholder="Your education consultancy name"
              value={formData?.company_name || ""}
              onChange={(e) => handleInputChange("company_name", e.target.value)}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="business_license_mst">Business License (MST) *</Label>
              <Input
                id="business_license_mst"
                placeholder="Mã số thuế"
                value={formData?.business_license_mst || ""}
                onChange={(e) => handleInputChange("business_license_mst", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="year_established">Year Established</Label>
              <Input
                id="year_established"
                type="number"
                placeholder="2020"
                value={formData?.year_established || ""}
                onChange={(e) =>
                  handleInputChange("year_established", parseInt(e.target.value, 10) || "")
                }
              />
            </div>
          </div>

          {/* Optional fields commonly gathered during onboarding */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://your-agency.com"
                value={formData?.website || ""}
                onChange={(e) => handleInputChange("website", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Business Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+84 912 345 678"
                value={formData?.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Business Address</Label>
            <Textarea
              id="address"
              placeholder="Street, district/ward, city, country"
              value={formData?.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              className="min-h-[90px]"
            />
          </div>

          {/* Show referral code if it exists (read-only) */}
          {formData?.referral_code && (
            <div>
              <Label htmlFor="referral_code">Referral Code</Label>
              <Input id="referral_code" value={formData.referral_code} readOnly className="bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">
                This is your unique referral code for tracking student referrals.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payout */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Payout Information
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="paypal_email">PayPal Email *</Label>
            <Input
              id="paypal_email"
              type="email"
              placeholder="payouts@example.com"
              value={formData?.paypal_email || ""}
              onChange={(e) => handleInputChange("paypal_email", e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your PayPal email to receive commission payouts. This is required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
