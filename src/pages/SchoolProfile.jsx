// src/pages/SchoolProfile.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadFile } from '@/api/integrations';
import { Building, Save, Upload, Loader2 } from 'lucide-react';

/* ---------- Firebase ---------- */
import { db, auth } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/* ---------- Helpers ---------- */
const toNum = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
const toBool = (v) => (typeof v === 'boolean' ? v : v === 'true' || v === true);
const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export default function SchoolProfile() { 
  const [formData, setFormData] = useState({
    /* Profile (marketing) */
    institution_id: '',           // link to institutions/{id}
    name: '',
    school_level: 'University',
    location: '',                 // city (display)
    province: '',
    country: '',
    founded_year: new Date().getFullYear(),
    address: '',
    about: '',
    website: '',
    image_url: '',                // a general image/cover
    logo_url: '',                 // NEW – for both profile + institution
    banner_url: '',               // NEW – for both profile + institution
    rating: 0,
    acceptance_rate: 0,           // percentage (0-100)
    tuition_fees: 0,              // number (scalar for now)
    application_fee: 0,
    cost_of_living: 0,

    /* Institution (canonical) */
    school_type: 'university',    // maps from school_level; user-editable
    is_public: 'public',          // 'public' | 'private'
    email: '',
    phone: '',
    pgwp_available: 'false',      // 'true' | 'false'
    has_coop: 'false',
    is_dli: 'false',
    dli_number: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadSchoolData = useCallback(async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) { setLoading(false); return; }

      const ref = doc(db, "school_profiles", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        setFormData(prev => ({
          ...prev,
          institution_id: d.institution_id || '',
          name: d.name || '',
          school_level: d.school_level || 'University',
          location: d.location || '',
          province: d.province || '',
          country: d.country || '',
          founded_year: d.founded_year || new Date().getFullYear(),
          address: d.address || '',
          about: d.about || '',
          website: d.website || '',
          image_url: d.image_url || '',
          logo_url: d.logo_url || '',
          banner_url: d.banner_url || '',
          rating: d.rating || 0,
          acceptance_rate: d.acceptance_rate || 0,
          tuition_fees: d.tuition_fees || 0,
          application_fee: d.application_fee || 0,
          cost_of_living: d.cost_of_living || 0,

          // institution-ish fields if you saved them before into profile (fallbacks)
          school_type: d.school_type || (d.school_level === 'College' ? 'college'
                        : d.school_level === 'Language School' ? 'language_school'
                        : d.school_level === 'High School' ? 'high_school' : 'university'),
          is_public: d.is_public || 'public',
          email: d.email || '',
          phone: d.phone || '',
          pgwp_available: String(d.pgwp_available ?? 'false'),
          has_coop: String(d.has_coop ?? 'false'),
          is_dli: String(d.is_dli ?? 'false'),
          dli_number: d.dli_number || ''
        }));
      }
    } catch (error) {
      console.error("Error loading school profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchoolData(); }, [loadSchoolData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (e, field, setUploading) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    if (!formData.name.trim()) return "School name is required.";
    if (!formData.country.trim()) return "Country is required.";
    if (!formData.school_level) return "School level is required.";
    return null;
    // Add more checks if you want to make fields mandatory.
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { alert(err); return; }

    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not signed in");

      // 1) Determine institutionId (reuse if present)
      let institutionId = formData.institution_id?.trim();
      if (!institutionId) {
        const slug = slugify(formData.name);
        const shortUid = uid.substring(0, 6);
        institutionId = `${slug}-${shortUid}`;
      }

      // 2) Build institution data (canonical / factual)
      const institutionData = {
        name: formData.name,
        short_name: formData.name, // adjust if you later add a separate input
        type: formData.school_type, // 'university' | 'college' | 'language_school' | 'high_school'
        public_private: formData.is_public, // 'public' | 'private'
        isPublic: formData.is_public === 'public',

        year_established: toNum(formData.founded_year),

        country: formData.country,
        province: formData.province,
        city: formData.location,
        address: formData.address,

        website: formData.website,
        email: formData.email,
        phone: formData.phone,

        logoUrl: formData.logo_url || formData.image_url || '',
        bannerUrl: formData.banner_url || '',

        pgwp_available: toBool(formData.pgwp_available),
        hasCoop: toBool(formData.has_coop),
        isDLI: toBool(formData.is_dli),
        dliNumber: formData.dli_number,

        // keep numbers scalar for now (matches your current data)
        application_fee: toNum(formData.application_fee),
        avgTuition: toNum(formData.tuition_fees),
        cost_of_living: toNum(formData.cost_of_living),

        status: "active",
        updated_at: serverTimestamp()
      };

      // If this is a new institution doc, add created_at
      const instRef = doc(db, "institutions", institutionId);
      const instSnap = await getDoc(instRef);
      if (!instSnap.exists()) {
        institutionData.created_at = serverTimestamp();
      }

      // 3) Build profile data (marketing / UI layer)
      const profileRef = doc(db, "school_profiles", uid);
      const profileSnap = await getDoc(profileRef);

      const profileData = {
        institution_id: institutionId, // link
        user_id: uid,

        name: formData.name,
        school_level: formData.school_level,
        location: formData.location,
        province: formData.province,
        country: formData.country,
        founded_year: toNum(formData.founded_year),
        address: formData.address,

        about: formData.about,
        website: formData.website,

        image_url: formData.image_url,
        logo_url: formData.logo_url,
        banner_url: formData.banner_url,

        rating: toNum(formData.rating),
        acceptance_rate: toNum(formData.acceptance_rate), // keep as percentage (0-100)
        tuition_fees: toNum(formData.tuition_fees),
        application_fee: toNum(formData.application_fee),
        cost_of_living: toNum(formData.cost_of_living),

        // mirror some institution fields for convenience in UI
        school_type: formData.school_type,
        is_public: formData.is_public,
        email: formData.email,
        phone: formData.phone,
        pgwp_available: toBool(formData.pgwp_available),
        has_coop: toBool(formData.has_coop),
        is_dli: toBool(formData.is_dli),
        dli_number: formData.dli_number,

        updated_at: serverTimestamp(),
        ...(profileSnap.exists() ? {} : { created_at: serverTimestamp() })
      };

      // 4) Write both docs
      await Promise.all([
        setDoc(instRef, institutionData, { merge: true }),
        setDoc(profileRef, profileData, { merge: true })
      ]);

      // 5) Reload and notify
      await loadSchoolData();
      alert("Profile saved to both collections successfully!");
    } catch (error) {
      console.error("Error saving school profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Building className="w-8 h-8 text-blue-700" />
          <h1 className="text-4xl font-bold text-gray-800">School Profile</h1>
        </div>

        <div className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="school_level">School Level</Label>
                  <Select
                    value={formData.school_level}
                    onValueChange={(value) => {
                      handleInputChange('school_level', value);
                      // Keep school_type aligned by default
                      const map = {
                        'University': 'university',
                        'College': 'college',
                        'Language School': 'language_school',
                        'High School': 'high_school'
                      };
                      handleInputChange('school_type', map[value] || 'university');
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="University">University</SelectItem>
                      <SelectItem value="College">College</SelectItem>
                      <SelectItem value="High School">High School</SelectItem>
                      <SelectItem value="Language School">Language School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="location">City</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="province">Province/State</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => handleInputChange('province', e.target.value)}
                  />
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
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="founded_year">Founded Year</Label>
                  <Input
                    id="founded_year"
                    type="number"
                    value={formData.founded_year}
                    onChange={(e) => handleInputChange('founded_year', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="is_public">Public / Private</Label>
                  <Select
                    value={formData.is_public}
                    onValueChange={(v) => handleInputChange('is_public', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="admissions@school.edu"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 ..."
                  />
                </div>
                <div>
                  <Label htmlFor="school_type">Institution Type</Label>
                  <Select
                    value={formData.school_type}
                    onValueChange={(v) => handleInputChange('school_type', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="language_school">Language School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="pgwp_available">PGWP Available</Label>
                  <Select
                    value={String(formData.pgwp_available)}
                    onValueChange={(v) => handleInputChange('pgwp_available', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="has_coop">Co-op Offered</Label>
                  <Select
                    value={String(formData.has_coop)}
                    onValueChange={(v) => handleInputChange('has_coop', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="is_dli">DLI</Label>
                  <Select
                    value={String(formData.is_dli)}
                    onValueChange={(v) => handleInputChange('is_dli', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dli_number">DLI Number</Label>
                  <Input
                    id="dli_number"
                    value={formData.dli_number}
                    onChange={(e) => handleInputChange('dli_number', e.target.value)}
                    placeholder="O123456789012"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="logo">Logo</Label>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={(e) => handleUpload(e, 'logo_url', setUploadingLogo)}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo').click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Logo
                  </Button>
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="Logo" className="w-16 h-16 object-cover rounded" />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="banner">Banner / Hero</Label>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="file"
                    id="banner"
                    accept="image/*"
                    onChange={(e) => handleUpload(e, 'banner_url', setUploadingBanner)}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('banner').click()}
                    disabled={uploadingBanner}
                  >
                    {uploadingBanner ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Banner
                  </Button>
                  {formData.banner_url && (
                    <img src={formData.banner_url} alt="Banner" className="w-28 h-16 object-cover rounded" />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="image">Additional Image</Label>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={(e) => handleUpload(e, 'image_url', setUploadingImage)}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image').click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Image
                  </Button>
                  {formData.image_url && (
                    <img src={formData.image_url} alt="School" className="w-20 h-20 object-cover rounded" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About the School</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="about">Description</Label>
              <Textarea
                id="about"
                value={formData.about}
                onChange={(e) => handleInputChange('about', e.target.value)}
                rows={6}
                placeholder="Tell prospective students about your institution..."
              />
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tuition_fees">Tuition Fees (per year)</Label>
                  <Input
                    id="tuition_fees"
                    type="number"
                    value={formData.tuition_fees}
                    onChange={(e) => handleInputChange('tuition_fees', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="application_fee">Application Fee</Label>
                  <Input
                    id="application_fee"
                    type="number"
                    value={formData.application_fee}
                    onChange={(e) => handleInputChange('application_fee', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cost_of_living">Cost of Living (per year)</Label>
                  <Input
                    id="cost_of_living"
                    type="number"
                    value={formData.cost_of_living}
                    onChange={(e) => handleInputChange('cost_of_living', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>School Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rating">Overall Rating (out of 5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => handleInputChange('rating', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="acceptance_rate">Acceptance Rate (%)</Label>
                  <Input
                    id="acceptance_rate"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.acceptance_rate}
                    onChange={(e) => handleInputChange('acceptance_rate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hidden link display (readonly) */}
          {formData.institution_id ? (
            <p className="text-sm text-gray-500">
              Linked institution: <span className="font-mono">{formData.institution_id}</span>
            </p>
          ) : null}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
