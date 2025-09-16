import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LevelSelector from '../LevelSelector';
import ProvinceSelector from '../ProvinceSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRIES = [
  { value: 'Canada', label: 'Canada' },
  { value: 'USA', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'Australia', label: 'Australia' },
  { value: 'New Zealand', label: 'New Zealand' },
];

export default function SchoolProfileForm({ formData, handleInputChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">School Information</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="school_name">School Name *</Label>
          <Input
            id="school_name"
            placeholder="e.g., University of Toronto"
            value={formData?.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="school_level">School Level *</Label>
          <LevelSelector
            value={formData?.school_level || "bachelor"}
            onValueChange={(value) => handleInputChange("school_level", value)}
            placeholder="Select school level"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="country">Country *</Label>
            <Select
              value={formData?.country || ""}
              onValueChange={(value) => handleInputChange("country", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="province">Province/State *</Label>
            <ProvinceSelector
              value={formData?.province || ""}
              onValueChange={(value) => handleInputChange("province", value)}
              placeholder="Select province"
              includeInternational={formData?.country !== 'Canada'}
            />
          </div>
          
          <div>
            <Label htmlFor="location">City *</Label>
            <Input
              id="location"
              placeholder="e.g., Toronto"
              value={formData?.location || ""}
              onChange={(e) => handleInputChange("location", e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="tuition_fees">Annual Tuition (USD) *</Label>
            <Input
              id="tuition_fees"
              type="number"
              placeholder="25000"
              value={formData?.tuition_fees || ""}
              onChange={(e) => handleInputChange("tuition_fees", Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="website">Website *</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://www.university.edu"
              value={formData?.website || ""}
              onChange={(e) => handleInputChange("website", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="about">About the School</Label>
          <Textarea
            id="about"
            placeholder="A brief description of your institution..."
            value={formData?.about || ""}
            onChange={(e) => handleInputChange("about", e.target.value)}
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}