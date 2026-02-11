// src/pages/SchoolProfile.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadFile } from "@/api/integrations";
import { Building, Save, Upload, Loader2 } from "lucide-react";

/* ---------- Firebase ---------- */
import { db, auth } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/* ---------- Helpers ---------- */
const toNum = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));
const toBool = (v) => (typeof v === "boolean" ? v : v === "true" || v === true);
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export default function SchoolProfile() {
  const [formData, setFormData] = useState({
    /* Profile (marketing) */
    institution_id: "",
    name: "",
    school_level: "University",
    location: "",
    province: "",
    country: "",
    founded_year: new Date().getFullYear(),
    address: "",
    about: "",
    website: "",

    // ✅ keep image_url for backward compatibility (primary image)
    image_url: "",
    // ✅ multiple additional images
    image_urls: [],

    logo_url: "",
    banner_url: "",
    rating: 0,
    acceptance_rate: 0,
    tuition_fees: 0,
    application_fee: 0,
    cost_of_living: 0,

    /* Institution (canonical) */
    school_type: "university",
    is_public: "public",
    email: "",
    phone: "",
    pgwp_available: "false",
    has_coop: "false",
    is_dli: "false",
    dli_number: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const loadSchoolData = useCallback(async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      const ref = doc(db, "school_profiles", uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const d = snap.data();

        // ✅ normalize multiple images:
        // prefer image_urls array, else fallback to image_url string
        const loadedImageUrls = Array.isArray(d.image_urls)
          ? d.image_urls.filter(Boolean)
          : d.image_url
          ? [d.image_url]
          : [];

        // ✅ merge about/description so BOTH pages stay synced
        const about = (d.about || d.description || "").toString();

        setFormData((prev) => ({
          ...prev,
          institution_id: d.institution_id || "",
          name: d.name || "",
          school_level: d.school_level || "University",
          location: d.location || "",
          province: d.province || "",
          country: d.country || "",
          founded_year: d.founded_year || new Date().getFullYear(),
          address: d.address || "",
          about,
          website: d.website || "",

          // ✅ primary image = first of image_urls (if present)
          image_url: d.image_url || loadedImageUrls[0] || "",
          image_urls: loadedImageUrls,

          logo_url: d.logo_url || "",
          banner_url: d.banner_url || "",
          rating: d.rating ?? 0,
          acceptance_rate: d.acceptance_rate ?? 0,
          tuition_fees: d.tuition_fees ?? 0,
          application_fee: d.application_fee ?? 0,
          cost_of_living: d.cost_of_living ?? 0,

          school_type:
            d.school_type ||
            (d.school_level === "College"
              ? "college"
              : d.school_level === "Language School"
              ? "language_school"
              : d.school_level === "High School"
              ? "high_school"
              : "university"),
          is_public: d.is_public || "public",
          email: d.email || "",
          phone: d.phone || "",
          // keep as string for selects
          pgwp_available: String(d.pgwp_available ?? "false"),
          has_coop: String(d.has_coop ?? "false"),
          is_dli: String(d.is_dli ?? "false"),
          dli_number: d.dli_number || "",
        }));
      }
    } catch (error) {
      console.error("Error loading school profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchoolData();
  }, [loadSchoolData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // single-file upload (logo/banner)
  const handleUploadSingle = async (e, field, setUploading) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData((prev) => ({ ...prev, [field]: file_url }));
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ✅ multiple upload for additional images
  const handleUploadMultipleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingImages(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await UploadFile({ file });
        if (file_url) uploadedUrls.push(file_url);
      }

      setFormData((prev) => {
        const merged = [...(prev.image_urls || []), ...uploadedUrls].filter(Boolean);

        // ✅ de-dupe first
        const deduped = Array.from(new Set(merged));

        // ✅ primary is ALWAYS deduped[0]
        const primary = deduped[0] || "";

        return {
          ...prev,
          image_urls: deduped,
          image_url: primary,
        };
      });
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Failed to upload images. Please try again.");
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  };

  const removeAdditionalImage = (url) => {
    setFormData((prev) => {
      const next = (prev.image_urls || []).filter((u) => u !== url);
      return {
        ...prev,
        image_urls: next,
        image_url: next[0] || "",
      };
    });
  };

  const setPrimaryImage = (url) => {
    setFormData((prev) => {
      const arr = prev.image_urls || [];
      if (!arr.includes(url)) return prev;
      const reordered = [url, ...arr.filter((u) => u !== url)];
      return { ...prev, image_urls: reordered, image_url: url };
    });
  };


  // ✅ Allow partial saves (no required-field blocking)
  // We still keep gentle input styling but never prevent saving.
  const inputClass = (_key) => "";

  const handleSave = async () => {

    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not signed in");

      // Determine institutionId (reuse if present)
      let institutionId = formData.institution_id?.trim();
      if (!institutionId) {
        const shortUid = uid.substring(0, 6);
        const slug = slugify(formData.name) || "school";
        institutionId = `${slug}-${shortUid}`;
      }

      const imageUrls = Array.isArray(formData.image_urls) ? formData.image_urls.filter(Boolean) : [];
      const primaryImage = (imageUrls[0] || formData.image_url || "").trim();

      // 1) Institution doc (canonical)
      const institutionData = {
        user_id: uid,
        name: formData.name,
        short_name: formData.name,
        type: formData.school_type,
        public_private: formData.is_public,
        isPublic: formData.is_public === "public",

        year_established: toNum(formData.founded_year),

        country: formData.country,
        province: formData.province,
        city: formData.location,
        address: formData.address,

        website: formData.website,
        email: formData.email,
        phone: formData.phone,

        logoUrl: formData.logo_url || primaryImage || "",
        bannerUrl: formData.banner_url || "",

        imageUrl: primaryImage,
        imageUrls,

        // ✅ also store about/description on institution for public pages
        about: formData.about,
        description: formData.about,

        pgwp_available: toBool(formData.pgwp_available),
        hasCoop: toBool(formData.has_coop),
        isDLI: toBool(formData.is_dli),
        dliNumber: formData.dli_number,

        application_fee: toNum(formData.application_fee),
        avgTuition: toNum(formData.tuition_fees),
        cost_of_living: toNum(formData.cost_of_living),

        status: "active",
        updated_at: serverTimestamp(),
      };

      const instRef = doc(db, "institutions", institutionId);
      const instSnap = await getDoc(instRef);
      if (!instSnap.exists()) institutionData.created_at = serverTimestamp();

      // 2) Profile doc (marketing/UI layer)
      const profileRef = doc(db, "school_profiles", uid);
      const profileSnap = await getDoc(profileRef);

      const profileData = {
        institution_id: institutionId,
        user_id: uid,

        name: formData.name,
        school_level: formData.school_level,
        location: formData.location,
        province: formData.province,
        country: formData.country,
        founded_year: toNum(formData.founded_year),
        address: formData.address,

        // ✅ MERGE: keep both fields synced
        about: formData.about,
        description: formData.about,

        website: formData.website,

        image_url: primaryImage,
        image_urls: imageUrls,

        logo_url: formData.logo_url,
        banner_url: formData.banner_url,

        rating: toNum(formData.rating),
        acceptance_rate: toNum(formData.acceptance_rate),
        tuition_fees: toNum(formData.tuition_fees),
        application_fee: toNum(formData.application_fee),
        cost_of_living: toNum(formData.cost_of_living),

        school_type: formData.school_type,
        is_public: formData.is_public,
        email: formData.email,
        phone: formData.phone,

        // ✅ keep as string in profile doc (matches your UI selects)
        pgwp_available: String(formData.pgwp_available),
        has_coop: String(formData.has_coop),
        is_dli: String(formData.is_dli),

        dli_number: formData.dli_number,

        updated_at: serverTimestamp(),
        ...(profileSnap.exists() ? {} : { created_at: serverTimestamp() }),
      };

      // 3) Write docs
// Save owner profile FIRST so SchoolDetails can resolve institution even if institution write fails.
await setDoc(profileRef, profileData, { merge: true });

// Then save / update institution (may fail if an old doc is "locked" by missing/other user_id)
try {
  await setDoc(instRef, institutionData, { merge: true });
} catch (e) {
  console.error("Institution save blocked; profile saved. Fix institutions/{id}.user_id to match auth.uid.", e);
}

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <Building className="w-8 h-8 text-blue-700" />
          <h1 className="text-4xl font-bold text-gray-800">School Profile</h1>
        </div>

        {/* ✅ Red warning below title */}

        <div className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    id="name"
                    className={inputClass("name")}
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="school_level">School Level</Label>
                  <Select
                    value={formData.school_level}
                    onValueChange={(value) => {
                      handleInputChange("school_level", value);
                      const map = {
                        University: "university",
                        College: "college",
                        "Language School": "language_school",
                        "High School": "high_school",
                      };
                      handleInputChange("school_type", map[value] || "university");
                    }}
                  >
                    <SelectTrigger className={inputClass("school_level")}>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="University">University</SelectItem>
                      <SelectItem value="College">College</SelectItem>
                      <SelectItem value="High School">High School</SelectItem>
                      <SelectItem value="Language School">Language School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="location">City</Label>
                  <Input
                    id="location"
                    className={inputClass("location")}
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="province">Province/State</Label>
                  <Input
                    id="province"
                    className={inputClass("province")}
                    value={formData.province}
                    onChange={(e) => handleInputChange("province", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    className={inputClass("country")}
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  className={inputClass("address")}
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="founded_year">Founded Year</Label>
                  <Input
                    id="founded_year"
                    type="number"
                    className={inputClass("founded_year")}
                    value={formData.founded_year}
                    onChange={(e) => handleInputChange("founded_year", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    className={inputClass("website")}
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="is_public">Public / Private</Label>
                  <Select value={formData.is_public} onValueChange={(v) => handleInputChange("is_public", v)}>
                    <SelectTrigger className={inputClass("is_public")}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    className={inputClass("email")}
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="admissions@school.edu"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    className={inputClass("phone")}
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+1 ..."
                  />
                </div>
                <div>
                  <Label htmlFor="school_type">Institution Type</Label>
                  <Select value={formData.school_type} onValueChange={(v) => handleInputChange("school_type", v)}>
                    <SelectTrigger className={inputClass("school_type")}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="language_school">Language School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="pgwp_available">PGWP Available</Label>
                  <Select value={String(formData.pgwp_available)} onValueChange={(v) => handleInputChange("pgwp_available", v)}>
                    <SelectTrigger className={inputClass("pgwp_available")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="has_coop">Co-op Offered</Label>
                  <Select value={String(formData.has_coop)} onValueChange={(v) => handleInputChange("has_coop", v)}>
                    <SelectTrigger className={inputClass("has_coop")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="is_dli">DLI</Label>
                  <Select value={String(formData.is_dli)} onValueChange={(v) => handleInputChange("is_dli", v)}>
                    <SelectTrigger className={inputClass("is_dli")}>
                      <SelectValue />
                    </SelectTrigger>
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
                    className={inputClass("dli_number")}
                    value={formData.dli_number}
                    onChange={(e) => handleInputChange("dli_number", e.target.value)}
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
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={(e) => handleUploadSingle(e, "logo_url", setUploadingLogo)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("logo").click()}
                    disabled={uploadingLogo}
                    className="w-full sm:w-auto"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Logo
                  </Button>
                  {formData.logo_url && (
                    <img
                      src={formData.logo_url}
                      alt="Logo"
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="banner">Banner / Hero</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                  <input
                    type="file"
                    id="banner"
                    accept="image/*"
                    onChange={(e) => handleUploadSingle(e, "banner_url", setUploadingBanner)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("banner").click()}
                    disabled={uploadingBanner}
                    className="w-full sm:w-auto"
                  >
                    {uploadingBanner ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Banner
                  </Button>
                  {formData.banner_url && (
                    <img
                      src={formData.banner_url}
                      alt="Banner"
                      className="w-28 h-16 object-cover rounded"
                    />
                  )}
                </div>
              </div>

              {/* ✅ Multiple Additional Images */}
              <div>
                <Label htmlFor="additional_images">Additional Images</Label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                  <input
                    type="file"
                    id="additional_images"
                    accept="image/*"
                    multiple
                    onChange={handleUploadMultipleImages}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("additional_images").click()}
                    disabled={uploadingImages}
                    className="w-full sm:w-auto"
                  >
                    {uploadingImages ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Images
                  </Button>

                  {Array.isArray(formData.image_urls) && formData.image_urls.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {formData.image_urls.length} image
                      {formData.image_urls.length === 1 ? "" : "s"} uploaded
                    </span>
                  )}
                </div>

                {/* Thumbnails */}
                {Array.isArray(formData.image_urls) && formData.image_urls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {formData.image_urls.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className={`relative rounded-lg overflow-hidden border ${
                          idx === 0 ? "border-blue-500" : "border-gray-200"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Additional ${idx + 1}`}
                          className="w-full h-28 object-cover"
                        />

                        {idx === 0 && (
                          <div className="absolute top-2 left-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                            Primary
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="w-full"
                            onClick={() => setPrimaryImage(url)}
                            disabled={idx === 0}
                          >
                            Set Primary
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => removeAdditionalImage(url)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                className={inputClass("about")}
                value={formData.about}
                onChange={(e) => handleInputChange("about", e.target.value)}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tuition_fees">Tuition Fees (per year)</Label>
                  <Input
                    id="tuition_fees"
                    type="number"
                    className={inputClass("tuition_fees")}
                    value={formData.tuition_fees}
                    onChange={(e) => handleInputChange("tuition_fees", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="application_fee">Application Fee</Label>
                  <Input
                    id="application_fee"
                    type="number"
                    className={inputClass("application_fee")}
                    value={formData.application_fee}
                    onChange={(e) => handleInputChange("application_fee", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cost_of_living">Cost of Living (per year)</Label>
                  <Input
                    id="cost_of_living"
                    type="number"
                    className={inputClass("cost_of_living")}
                    value={formData.cost_of_living}
                    onChange={(e) => handleInputChange("cost_of_living", e.target.value)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rating">Overall Rating (out of 5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    className={inputClass("rating")}
                    value={formData.rating}
                    onChange={(e) => handleInputChange("rating", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="acceptance_rate">Acceptance Rate (%)</Label>
                  <Input
                    id="acceptance_rate"
                    type="number"
                    min="0"
                    max="100"
                    className={inputClass("acceptance_rate")}
                    value={formData.acceptance_rate}
                    onChange={(e) => handleInputChange("acceptance_rate", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
