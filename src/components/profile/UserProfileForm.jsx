import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function UserProfileForm({ formData, handleInputChange }) {
  const lang = formData?.settings?.language || "en";

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={formData?.full_name || ""}
            onChange={(e) => handleInputChange("full_name", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={formData?.email || ""} disabled className="bg-gray-100" />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData?.phone || ""}
            onChange={(e) => handleInputChange("phone", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData?.country || ""}
            onChange={(e) => handleInputChange("country", e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="bio">Biography</Label>
          <Textarea
            id="bio"
            value={formData?.bio || ""}
            onChange={(e) => handleInputChange("bio", e.target.value)}
            placeholder="Tell us about yourself..."
            className="min-h-[120px]"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label>Account Type</Label>
          <div className="mt-2">
            <Badge variant="outline" className="capitalize">
              {formData?.user_type || "student"}
            </Badge>
          </div>
        </div>

        <div>
          <Label htmlFor="language">Preferred Language</Label>
          <Select
            value={lang}
            onValueChange={(value) =>
              handleInputChange("settings", { ...(formData?.settings || {}), language: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">🇺🇸 English</SelectItem>
              <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
