import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EDUCATION_LEVELS } from '../utils/EducationLevels';
import { CANADIAN_PROVINCES as PROVINCES } from '../utils/CanadianProvinces';
import { UploadFile } from '@/api/integrations';
import { Upload, Loader2 } from 'lucide-react';

export default function SchoolForm({ school, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    institution_name: '',
    institution_type: 'University',
    institution_logo_url: '',
    is_dli: true,

    school_name: '',
    school_image_url: '',
    school_country: 'Canada',
    school_province: '',
    school_city: '',

    program_title: '',
    program_level: 'bachelor',
    field_of_study: '',
    duration_display: '',
    tuition_fee_cad: 0,
    application_fee: 0,
    intake_dates: '', // comma-delimited in the form UI
    program_overview: '',
    is_featured: false,
    ...(school || {}),
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Refs for hidden file inputs (avoid document.getElementById)
  const logoInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Keep form in sync when `school` prop changes, without wiping defaults
  useEffect(() => {
    if (school) {
      setFormData(prev => ({
        ...prev,
        ...school,
        intake_dates: school.intake_dates?.join(', ') ?? '',
      }));
    }
  }, [school]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e, field, setUploading) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleInputChange(field, file_url);
    } catch (error) {
      console.error(`Error uploading ${field}:`, error);
      alert(`Failed to upload ${field}. Please try again.`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      tuition_fee_cad: Number(formData.tuition_fee_cad) || 0,
      application_fee: Number(formData.application_fee) || 0,
      intake_dates: formData.intake_dates
        ? formData.intake_dates.split(',').map(d => d.trim()).filter(Boolean)
        : [],
    };

    onSave?.(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-2">
      {/* Institution Details */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Institution Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="institution_name">Institution Name *</Label>
            <Input
              id="institution_name"
              value={formData.institution_name}
              onChange={(e) => handleInputChange('institution_name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="institution_type">Institution Type</Label>
            <Select
              value={formData.institution_type}
              onValueChange={(value) => handleInputChange('institution_type', value)}
            >
              <SelectTrigger id="institution_type">
                <SelectValue placeholder="Select institution type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="University">University</SelectItem>
                <SelectItem value="College">College</SelectItem>
                <SelectItem value="Institute">Institute</SelectItem>
                <SelectItem value="Language School">Language School</SelectItem>
                <SelectItem value="High School">High School</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="logo-upload">Institution Logo</Label>
            <div className="flex items-center gap-4 mt-1">
              <Input
                ref={logoInputRef}
                type="file"
                id="logo-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'institution_logo_url', setUploadingLogo)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Upload className="w-4 h-4 mr-2" />}
                Upload
              </Button>
              {formData.institution_logo_url && (
                <img
                  src={formData.institution_logo_url}
                  alt="Institution logo"
                  className="w-16 h-16 object-contain rounded border"
                />
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="is_dli"
              checked={formData.is_dli}
              onCheckedChange={(checked) => handleInputChange('is_dli', checked === true)}
            />
            <Label htmlFor="is_dli">Designated Learning Institution (DLI)</Label>
          </div>
        </div>
      </div>

      {/* School/Campus Details */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">School / Campus Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="school_name">School/Campus Name *</Label>
            <Input
              id="school_name"
              value={formData.school_name}
              onChange={(e) => handleInputChange('school_name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="image-upload">School Image</Label>
            <div className="flex items-center gap-4 mt-1">
              <Input
                ref={imageInputRef}
                type="file"
                id="image-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'school_image_url', setUploadingImage)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Upload className="w-4 h-4 mr-2" />}
                Upload
              </Button>
              {formData.school_image_url && (
                <img
                  src={formData.school_image_url}
                  alt="School"
                  className="w-16 h-16 object-contain rounded border"
                />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="school_city">City *</Label>
            <Input
              id="school_city"
              value={formData.school_city}
              onChange={(e) => handleInputChange('school_city', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="school_province">Province</Label>
            <Select
              value={formData.school_province}
              onValueChange={(value) => handleInputChange('school_province', value)}
            >
              <SelectTrigger id="school_province">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Program Details */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Program Details</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="program_title">Program Title *</Label>
            <Input
              id="program_title"
              value={formData.program_title}
              onChange={(e) => handleInputChange('program_title', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="program_level">Program Level</Label>
              <Select
                value={formData.program_level}
                onValueChange={(value) => handleInputChange('program_level', value)}
              >
                <SelectTrigger id="program_level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="field_of_study">Field of Study</Label>
              <Input
                id="field_of_study"
                value={formData.field_of_study}
                onChange={(e) => handleInputChange('field_of_study', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="program_overview">Program Overview</Label>
            <Textarea
              id="program_overview"
              rows={4}
              value={formData.program_overview}
              onChange={(e) => handleInputChange('program_overview', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration_display">Duration (e.g., 2 years)</Label>
              <Input
                id="duration_display"
                value={formData.duration_display}
                onChange={(e) => handleInputChange('duration_display', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="intake_dates">Intake Dates (comma-separated)</Label>
              <Input
                id="intake_dates"
                placeholder="Fall 2026, Winter 2027"
                value={formData.intake_dates}
                onChange={(e) => handleInputChange('intake_dates', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tuition_fee_cad">Tuition Fee (CAD/year)</Label>
              <Input
                id="tuition_fee_cad"
                type="number"
                value={formData.tuition_fee_cad}
                onChange={(e) => handleInputChange('tuition_fee_cad', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="application_fee">Application Fee (CAD)</Label>
              <Input
                id="application_fee"
                type="number"
                value={formData.application_fee}
                onChange={(e) => handleInputChange('application_fee', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => handleInputChange('is_featured', checked === true)}
            />
            <Label htmlFor="is_featured">Feature this Program</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Program</Button>
      </div>
    </form>
  );
}
