import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadFile } from '@/api/integrations';
import { Upload, Loader2 } from 'lucide-react';

const PROVINCES = [
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
  { value: 'QC', label: 'Quebec' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' }
];

export default function InstitutionForm({ institution, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: institution?.name || '',
    city: institution?.city || '',
    province: institution?.province || '',
    country: institution?.country || 'Canada',
    logoUrl: institution?.logoUrl || '',
    about: institution?.about || '',
    website: institution?.website || '',
    isFeatured: institution?.isFeatured || false,
    popularityScore: institution?.popularityScore || 0,
    rankScore: institution?.rankScore || 0,
    tags: institution?.tags?.join(', ') || '',
    programCount: institution?.programCount || 0,
    avgTuition: institution?.avgTuition || 0,
    isPublic: institution?.isPublic !== false,
    hasCoop: institution?.hasCoop || false,
    isDLI: institution?.isDLI !== false
  });
  
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, logoUrl: file_url }));
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Institution Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="province">Province</Label>
          <Select value={formData.province} onValueChange={(value) => handleInputChange('province', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map(province => (
                <SelectItem key={province.value} value={province.value}>
                  {province.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => handleInputChange('website', e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <Label htmlFor="about">About</Label>
        <Textarea
          id="about"
          value={formData.about}
          onChange={(e) => handleInputChange('about', e.target.value)}
          rows={4}
          placeholder="Tell us about this institution..."
        />
      </div>

      <div>
        <Label htmlFor="logo">Logo</Label>
        <div className="flex items-center gap-4 mt-2">
          <input
            type="file"
            id="logo"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          <Button 
            type="button"
            variant="outline"
            onClick={() => document.getElementById('logo').click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload Logo
          </Button>
          {formData.logoUrl && (
            <img src={formData.logoUrl} alt="Institution logo" className="w-20 h-20 object-contain rounded border" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="popularityScore">Popularity Score (0-100)</Label>
          <Input
            id="popularityScore"
            type="number"
            min="0"
            max="100"
            value={formData.popularityScore}
            onChange={(e) => handleInputChange('popularityScore', parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="rankScore">Rank Score (0-100)</Label>
          <Input
            id="rankScore"
            type="number"
            min="0"
            max="100"
            value={formData.rankScore}
            onChange={(e) => handleInputChange('rankScore', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="programCount">Program Count</Label>
          <Input
            id="programCount"
            type="number"
            min="0"
            value={formData.programCount}
            onChange={(e) => handleInputChange('programCount', parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="avgTuition">Average Tuition (USD)</Label>
          <Input
            id="avgTuition"
            type="number"
            min="0"
            value={formData.avgTuition}
            onChange={(e) => handleInputChange('avgTuition', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => handleInputChange('tags', e.target.value)}
          placeholder="e.g. research, technology, arts"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isFeatured"
            checked={formData.isFeatured}
            onCheckedChange={(checked) => handleInputChange('isFeatured', checked)}
          />
          <Label htmlFor="isFeatured">Featured Institution</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isPublic"
            checked={formData.isPublic}
            onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
          />
          <Label htmlFor="isPublic">Public Institution</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasCoop"
            checked={formData.hasCoop}
            onCheckedChange={(checked) => handleInputChange('hasCoop', checked)}
          />
          <Label htmlFor="hasCoop">Has Co-op Programs</Label>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDLI"
          checked={formData.isDLI}
          onCheckedChange={(checked) => handleInputChange('isDLI', checked)}
        />
        <Label htmlFor="isDLI">Designated Learning Institution (DLI)</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Institution</Button>
      </div>
    </form>
  );
}