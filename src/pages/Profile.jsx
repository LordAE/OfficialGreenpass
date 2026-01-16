// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { UploadFile } from "@/api/integrations";

import {
  Loader2,
  Save,
  Upload,
  User as UserIcon,
  Briefcase,
  BookOpen,
  Building,
  Store,
} from "lucide-react";

import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

/* ---------------- helpers ---------------- */
const VALID_ROLES = ["user", "agent", "tutor", "school", "vendor"];
const normalizeRole = (r) => {
  const v = String(r || "").trim().toLowerCase();
  return VALID_ROLES.includes(v) ? v : "user";
};

const csvToArray = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const arrayToCSV = (v) => (Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "");

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

function roleMeta(role) {
  if (role === "agent") return { label: "Agent", icon: <Briefcase className="w-5 h-5" /> };
  if (role === "tutor") return { label: "Tutor", icon: <BookOpen className="w-5 h-5" /> };
  if (role === "school") return { label: "School", icon: <Building className="w-5 h-5" /> };
  if (role === "vendor") return { label: "Vendor", icon: <Store className="w-5 h-5" /> };
  return { label: "Student", icon: <UserIcon className="w-5 h-5" /> };
}

/**
 * School merge helper:
 * - keeps redundancy low by syncing only the overlapping fields to institutions + school_profiles
 * - DOES NOT remove your SchoolProfile page
 */
async function syncSchoolCollections({ uid, payload }) {
  const name = (payload.school_name || "").trim();
  if (!name) return "";

  let institutionId = (payload.institution_id || "").trim();
  if (!institutionId) {
    institutionId = `${slugify(name)}-${uid.substring(0, 6)}`;
  }

  const instRef = doc(db, "institutions", institutionId);
  const spRef = doc(db, "school_profiles", uid);

  const institutionData = {
    name,
    short_name: name,
    website: payload.website || "",
    city: payload.location || "",
    description: payload.about || "",
    updated_at: serverTimestamp(),
  };

  const schoolProfileData = {
    institution_id: institutionId,
    user_id: uid,

    name,
    school_name: name,
    type: payload.type || "",
    school_level: payload.type || "",

    location: payload.location || "",
    website: payload.website || "",
    about: payload.about || "",
    bio: payload.bio || "",

    updated_at: serverTimestamp(),
  };

  await Promise.all([
    setDoc(instRef, institutionData, { merge: true }),
    setDoc(spRef, schoolProfileData, { merge: true }),
  ]);

  return institutionId;
}

export default function Profile() {
  const [uid, setUid] = useState(null);
  const [role, setRole] = useState("user");
  const meta = useMemo(() => roleMeta(role), [role]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);

  // ✅ ONE unified state = personal + role-specific
  const [form, setForm] = useState({
    // Personal Information
    full_name: "",
    email: "",
    phone: "",
    country: "",
    country_code: "",
    profile_picture: "",
    bio: "",

    // Agent
    company_name: "",
    business_license_mst: "",
    year_established: "",
    paypal_email: "",

    // Tutor
    specializations: "",
    experience_years: "",
    hourly_rate: "",

    // School (from onboarding)
    institution_id: "",
    school_name: "",
    type: "",
    location: "",
    website: "",
    about: "",

    // Vendor
    business_name: "",
    service_categories: [],
  });

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const isUserStudent = role === "user";
  const showAgent = role === "agent";
  const showTutor = role === "tutor";
  const showSchool = role === "school";
  const showVendor = role === "vendor";

  const loadProfile = useCallback(async (userId) => {
    setLoading(true);
    try {
      // users doc
      const uref = doc(db, "users", userId);
      const usnap = await getDoc(uref);

      // If missing, create minimal defaults so page doesn't break
      if (!usnap.exists()) {
        await setDoc(uref, {
          role: "user",
          user_type: "user",
          userType: "user",
          selected_role: "user",
          email: auth.currentUser?.email || "",
          full_name: auth.currentUser?.displayName || "",
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }

      const u2 = await getDoc(uref);
      const u = u2.data() || {};

      const resolvedRole = normalizeRole(
        u.selected_role || u.user_type || u.userType || u.role || "user"
      );
      setRole(resolvedRole);

      const resolvedBio =
        u.bio ||
        u.agent_profile?.bio ||
        u.tutor_profile?.bio ||
        u.school_profile?.bio ||
        u.vendor_profile?.bio ||
        "";

      // Optional: if school, pull school_profiles to merge (no redundancy)
      let schoolProfileDoc = null;
      if (resolvedRole === "school") {
        const spRef = doc(db, "school_profiles", userId);
        const spSnap = await getDoc(spRef);
        if (spSnap.exists()) schoolProfileDoc = spSnap.data();
      }

      setForm((p) => ({
        ...p,

        // Personal
        full_name: u.full_name || "",
        email: u.email || auth.currentUser?.email || "",
        phone: u.phone || "",
        country: u.country || "",
        country_code: u.country_code || "",
        profile_picture: u.profile_picture || "",
        bio: resolvedBio || "",

        // Agent
        company_name: u.agent_profile?.company_name || "",
        business_license_mst: u.agent_profile?.business_license_mst || "",
        year_established: u.agent_profile?.year_established || "",
        paypal_email:
          u.agent_profile?.paypal_email ||
          u.tutor_profile?.paypal_email ||
          u.vendor_profile?.paypal_email ||
          "",

        // Tutor
        specializations: arrayToCSV(u.tutor_profile?.specializations),
        experience_years: u.tutor_profile?.experience_years || "",
        hourly_rate: u.tutor_profile?.hourly_rate || "",

        // School (prefer school_profiles if exists)
        institution_id: u.school_profile?.institution_id || schoolProfileDoc?.institution_id || "",
        school_name:
          u.school_profile?.school_name ||
          schoolProfileDoc?.school_name ||
          schoolProfileDoc?.name ||
          "",
        type: u.school_profile?.type || schoolProfileDoc?.type || schoolProfileDoc?.school_level || "",
        location: u.school_profile?.location || schoolProfileDoc?.location || "",
        website: u.school_profile?.website || schoolProfileDoc?.website || "",
        about: u.school_profile?.about || schoolProfileDoc?.about || "",

        // Vendor
        business_name: u.vendor_profile?.business_name || "",
        service_categories: u.vendor_profile?.service_categories || [],
      }));
    } catch (e) {
      console.error("Profile load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUid(null);
        setLoading(false);
        return;
      }
      setUid(u.uid);
      await loadProfile(u.uid);
    });
    return () => unsub();
  }, [loadProfile]);

  // ✅ Profile picture upload (kept)
  const handleUploadProfilePicture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfilePic(true);
    try {
      const { file_url } = await UploadFile({ file });
      setField("profile_picture", file_url);

      // save immediately to users doc so avatar updates everywhere
      if (uid) {
        await updateDoc(doc(db, "users", uid), {
          profile_picture: file_url,
          updated_at: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Profile picture upload failed:", err);
      alert("Failed to upload profile picture. Please try again.");
    } finally {
      setUploadingProfilePic(false);
      e.target.value = "";
    }
  };

  // ✅ Single Save button saves EVERYTHING
  const handleSaveAll = async () => {
    if (!uid) return;

    // Align with onboarding basic requirements
    if (!form.full_name?.trim()) return alert("Full name is required.");
    if (!form.phone?.trim()) return alert("Phone is required.");
    if (!form.country?.trim()) return alert("Country is required.");

    // Align with onboarding role-specific requirements
    if (role === "agent") {
      if (!form.company_name?.trim()) return alert("Company name is required.");
      if (!form.business_license_mst?.trim()) return alert("Business license (MST) is required.");
      if (!form.paypal_email?.trim()) return alert("PayPal email is required.");
    }

    if (role === "tutor") {
      if (csvToArray(form.specializations).length === 0) return alert("Specializations are required.");
      if (!String(form.experience_years).trim()) return alert("Years of experience is required.");
      if (!String(form.hourly_rate).trim()) return alert("Hourly rate is required.");
      if (!form.paypal_email?.trim()) return alert("PayPal email is required.");
    }

    if (role === "school") {
      if (!form.school_name?.trim()) return alert("Institution name is required.");
      if (!form.type?.trim()) return alert("School type is required.");
      if (!form.location?.trim()) return alert("City/Location is required.");
      if (!form.website?.trim()) return alert("Website is required.");
    }

    if (role === "vendor") {
      if (!form.business_name?.trim()) return alert("Business name is required.");
      if (!Array.isArray(form.service_categories) || form.service_categories.length === 0)
        return alert("Select at least 1 service category.");
      if (!form.paypal_email?.trim()) return alert("PayPal email is required.");
    }

    setSaving(true);
    try {
      const uref = doc(db, "users", uid);

      const updates = {
        // personal
        full_name: form.full_name || "",
        phone: form.phone || "",
        country: form.country || "",
        country_code: form.country_code || "",
        profile_picture: form.profile_picture || "",
        bio: form.bio || "",

        updated_at: serverTimestamp(),
      };

      // keep nested profiles consistent with onboarding
      if (role === "agent") {
        updates.agent_profile = {
          company_name: form.company_name || "",
          business_license_mst: form.business_license_mst || "",
          year_established: form.year_established || "",
          paypal_email: form.paypal_email || "",
          bio: form.bio || "",
        };
      }

      if (role === "tutor") {
        updates.tutor_profile = {
          specializations: csvToArray(form.specializations),
          experience_years: Number(form.experience_years) || 0,
          hourly_rate: Number(form.hourly_rate) || 0,
          paypal_email: form.paypal_email || "",
          bio: form.bio || "",
        };
      }

      if (role === "vendor") {
        updates.vendor_profile = {
          business_name: form.business_name || "",
          service_categories: form.service_categories || [],
          paypal_email: form.paypal_email || "",
          bio: form.bio || "",
        };
      }

      if (role === "school") {
        const institutionId = await syncSchoolCollections({
          uid,
          payload: {
            institution_id: form.institution_id || "",
            school_name: form.school_name || "",
            type: form.type || "",
            location: form.location || "",
            website: form.website || "",
            about: form.about || "",
            bio: form.bio || "",
          },
        });

        updates.school_profile = {
          institution_id: institutionId,
          school_name: form.school_name || "",
          type: form.type || "",
          location: form.location || "",
          website: form.website || "",
          about: form.about || "",
          bio: form.bio || "",
        };
      }

      await updateDoc(uref, updates);
      alert("Saved! All changes were updated.");
      await loadProfile(uid);
    } catch (e) {
      console.error("Save failed:", e);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }

  // ✅ Avatar fallback should match Layout.jsx (same gradient + initial)
  const displayName = (form.full_name || "User").trim();
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const avatarBg = "bg-gradient-to-br from-green-500 to-blue-500";
  const profilePhoto = form.profile_picture || form.photo_url || form.photoURL || "";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white border p-2">{meta.icon}</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-sm text-gray-600">
              Role: <span className="font-semibold">{meta.label}</span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Profile picture upload (kept) */}
            <div>
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="file"
                  id="profile_picture"
                  accept="image/*"
                  onChange={handleUploadProfilePicture}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("profile_picture")?.click()}
                  disabled={uploadingProfilePic}
                >
                  {uploadingProfilePic ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Picture
                </Button>

                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border border-white shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = "";
                      setField("profile_picture", "");
                    }}
                  />
                ) : (
                  <div
                    className={`w-16 h-16 rounded-full ${avatarBg} text-white border border-white shadow-sm flex items-center justify-center font-bold text-xl`}
                  >
                    {initial}
                  </div>
                )}
              </div>
            </div>

            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Email (Login)</Label>
                <Input value={form.email} disabled className="mt-1 bg-gray-100" />
              </div>

              <div>
                <Label>Phone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Country *</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setField("country", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Biography (fixed + saved) */}
            <div>
              <Label>Biography / Description</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setField("bio", e.target.value)}
                className="mt-1"
                rows={4}
                placeholder="Write a short bio/description shown on your profile..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional, but recommended for better profile visibility.
              </p>
            </div>

            {/* ✅ Hide these “requirements/verification” UI for user/student */}
            {isUserStudent ? null : (
              <div className="rounded-md border bg-white p-4 text-sm text-gray-600">
                Some roles may require verification or additional details before appearing publicly.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role-specific sections (kept) */}
        {showAgent && (
          <Card>
            <CardHeader>
              <CardTitle>Agent Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setField("company_name", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Business License (MST) *</Label>
                <Input
                  value={form.business_license_mst}
                  onChange={(e) => setField("business_license_mst", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Year Established</Label>
                <Input
                  type="number"
                  value={form.year_established}
                  onChange={(e) => setField("year_established", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>PayPal Email *</Label>
                <Input
                  type="email"
                  value={form.paypal_email}
                  onChange={(e) => setField("paypal_email", e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showTutor && (
          <Card>
            <CardHeader>
              <CardTitle>Tutor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Specializations *</Label>
                <Input
                  value={form.specializations}
                  onChange={(e) => setField("specializations", e.target.value)}
                  className="mt-1"
                  placeholder="IELTS, TOEFL..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Years of Experience *</Label>
                  <Input
                    type="number"
                    value={form.experience_years}
                    onChange={(e) => setField("experience_years", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Hourly Rate (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.hourly_rate}
                    onChange={(e) => setField("hourly_rate", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>PayPal Email *</Label>
                <Input
                  type="email"
                  value={form.paypal_email}
                  onChange={(e) => setField("paypal_email", e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showVendor && (
          <Card>
            <CardHeader>
              <CardTitle>Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Business Name *</Label>
                <Input
                  value={form.business_name}
                  onChange={(e) => setField("business_name", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Service Categories *</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["Transport", "SIM Card", "Banking", "Accommodation", "Delivery", "Tours"].map(
                    (category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`cat-${category}`}
                          checked={form.service_categories?.includes(category) || false}
                          onChange={(e) => {
                            const cur = form.service_categories || [];
                            const next = e.target.checked
                              ? [...cur, category]
                              : cur.filter((c) => c !== category);
                            setField("service_categories", next);
                          }}
                          className="h-4 w-4"
                        />
                        <label htmlFor={`cat-${category}`} className="text-sm text-gray-700">
                          {category}
                        </label>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div>
                <Label>PayPal Email *</Label>
                <Input
                  type="email"
                  value={form.paypal_email}
                  onChange={(e) => setField("paypal_email", e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showSchool && (
          <Card>
            <CardHeader>
              <CardTitle>School Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Institution Name *</Label>
                <Input
                  value={form.school_name}
                  onChange={(e) => setField("school_name", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>School Type *</Label>
                <Select value={form.type || ""} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select institution type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High School">High School</SelectItem>
                    <SelectItem value="College">College</SelectItem>
                    <SelectItem value="University">University</SelectItem>
                    <SelectItem value="Institute">Institute</SelectItem>
                    <SelectItem value="Vocational">Vocational School</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>City/Location *</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Official Website *</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  className="mt-1"
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>About Your Institution</Label>
                <Textarea
                  value={form.about}
                  onChange={(e) => setField("about", e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              {form.institution_id ? (
                <p className="text-xs text-gray-500">
                  Linked institution_id: <span className="font-mono">{form.institution_id}</span>
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* ✅ ONLY ONE BUTTON (saves ALL changes) */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
