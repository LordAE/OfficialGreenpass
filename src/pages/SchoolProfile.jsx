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

export default function SchoolProfile() { 
  const [formData, setFormData] = useState({
    name: '',
    school_level: 'University',
    location: '',
    province: '',
    country: '',
    founded_year: new Date().getFullYear(),
    address: '',
    about: '',
    website: '',
    image_url: '',
    rating: 0,
    acceptance_rate: 0,
    tuition_fees: 0,
    application_fee: 0,
    cost_of_living: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const toNum = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

  const loadSchoolData = useCallback(async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) { setLoading(false); return; }

      const ref = doc(db, "school_profiles", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        setFormData({
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
          rating: d.rating || 0,
          acceptance_rate: d.acceptance_rate || 0,
          tuition_fees: d.tuition_fees || 0,
          application_fee: d.application_fee || 0,
          cost_of_living: d.cost_of_living || 0
        });
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not signed in");

      const ref = doc(db, "school_profiles", uid);
      const existing = await getDoc(ref);

      const sanitized = {
        ...formData,
        user_id: uid,
        founded_year: toNum(formData.founded_year),
        rating: toNum(formData.rating),
        acceptance_rate: toNum(formData.acceptance_rate),
        tuition_fees: toNum(formData.tuition_fees),
        application_fee: toNum(formData.application_fee),
        cost_of_living: toNum(formData.cost_of_living),
        updated_at: serverTimestamp(),
        ...(existing.exists() ? {} : { created_at: serverTimestamp() })
      };

      // Upsert into school_profiles/{uid}
      await setDoc(ref, sanitized, { merge: true });
      await loadSchoolData();
      alert("Profile updated successfully!");
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
      <div className="max-w-4xl mx-auto">
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
                    onValueChange={(value) => handleInputChange('school_level', value)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
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

              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>School Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="image">School Image</Label>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image').click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
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
                  <Label htmlFor="tuition_fees">Tuition Fees (USD/year)</Label>
                  <Input
                    id="tuition_fees"
                    type="number"
                    value={formData.tuition_fees}
                    onChange={(e) => handleInputChange('tuition_fees', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="application_fee">Application Fee (USD)</Label>
                  <Input
                    id="application_fee"
                    type="number"
                    value={formData.application_fee}
                    onChange={(e) => handleInputChange('application_fee', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cost_of_living">Cost of Living (USD/year)</Label>
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
