import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function TutorProfileForm({ formData, handleInputChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Tutor Information</h3>
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="experience_years">Years of Experience *</Label>
            <Input
              id="experience_years"
              type="number"
              min="0"
              placeholder="5"
              value={formData?.experience_years || ""}
              onChange={(e) => handleInputChange("experience_years", parseInt(e.target.value) || "")}
              required
            />
          </div>

          <div>
            <Label htmlFor="hourly_rate">Hourly Rate (USD) *</Label>
            <Input
              id="hourly_rate"
              type="number"
              min="0"
              step="0.01"
              placeholder="25.00"
              value={formData?.hourly_rate || ""}
              onChange={(e) => handleInputChange("hourly_rate", parseFloat(e.target.value) || "")}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="specializations">Specializations *</Label>
          <Input
            id="specializations"
            placeholder="IELTS, TOEFL, General English (comma separated)"
            value={formData?.specializations?.join(', ') || ""}
            onChange={(e) => handleInputChange("specializations", e.target.value.split(',').map(s => s.trim()).filter(s => s))}
            required
          />
        </div>

        <div>
          <Label htmlFor="qualifications">Qualifications</Label>
          <Input
            id="qualifications"
            placeholder="TESOL, CELTA, Masters in Education (comma separated)"
            value={formData?.qualifications?.join(', ') || ""}
            onChange={(e) => handleInputChange("qualifications", e.target.value.split(',').map(q => q.trim()).filter(q => q))}
          />
        </div>
        
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us about your teaching experience and approach..."
            value={formData?.bio || ""}
            onChange={(e) => handleInputChange("bio", e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Payout Information</h3>
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
            <p className="text-xs text-gray-500 mt-1">Enter your PayPal email to receive session payouts. This is required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}