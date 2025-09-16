import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserProfileForm({ formData, handleInputChange }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={formData?.full_name || ''}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={formData?.email || ''}
            disabled
            className="bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData?.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData?.country || ''}
            onChange={(e) => handleInputChange('country', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label>Account Type</Label>
          <div className="mt-2">
            <Badge variant="outline" className="capitalize">
              {formData?.user_type || 'Student'}
            </Badge>
          </div>
        </div>

        <div>
          <Label htmlFor="language">Preferred Language</Label>
          <Select
            value={formData?.settings?.language || 'en'}
            onValueChange={(value) => handleInputChange('settings', { 
              ...(formData?.settings || {}), 
              language: value 
            })}
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