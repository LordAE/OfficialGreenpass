import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function VendorProfileForm({ formData, handleInputChange }) {
  // Hardcoded for now, can be moved to a config file
  const serviceCategories = ["Transport", "SIM Card", "Banking", "Accommodation", "Delivery", "Tours"];

  const handleCategoryChange = (category) => {
    const currentCategories = formData?.service_categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    handleInputChange("service_categories", newCategories);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Vendor Information</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="business_name">Business/Service Name *</Label>
            <Input
              id="business_name"
              placeholder="e.g., Toronto Airport Limo"
              value={formData?.business_name || ""}
              onChange={(e) => handleInputChange("business_name", e.target.value)}
            />
          </div>

          <div>
            <Label>Service Categories *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {serviceCategories.map(category => (
                <div key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`category-${category}`}
                    checked={formData?.service_categories?.includes(category) || false}
                    onChange={() => handleCategoryChange(category)}
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor={`category-${category}`} className="ml-2 block text-sm text-gray-900">
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </div>
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
            <p className="text-xs text-gray-500 mt-1">Enter your PayPal email to receive payouts. This is required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}