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
import { useTr } from "@/i18n/useTr";

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

function roleMeta(role, tr) {
  if (role === "agent") return { label: tr("role_agent", "Agent"), icon: <Briefcase className="w-5 h-5" /> };
  if (role === "tutor") return { label: tr("role_tutor", "Tutor"), icon: <BookOpen className="w-5 h-5" /> };
  if (role === "school") return { label: tr("role_school", "School"), icon: <Building className="w-5 h-5" /> };
  if (role === "vendor") return { label: tr("role_vendor", "Vendor"), icon: <Store className="w-5 h-5" /> };
  // Default = general user / student
  return { label: tr("role_student", "Student"), icon: <UserIcon className="w-5 h-5" /> };
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
  const { tr } = useTr("profile");

  const [uid, setUid] = useState(null);
  const [role, setRole] = useState("user");
  const meta = useMemo(() => roleMeta(role, tr), [role]);

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

  const vendorCategoryOptions = useMemo(
    () => [
      { value: "Transport", label: tr("cat_transport", "Transport") },
      { value: "SIM Card", label: tr("cat_sim", "SIM Card") },
      { value: "Banking", label: tr("cat_banking", "Banking") },
      { value: "Accommodation", label: tr("cat_accommodation", "Accommodation") },
      { value: "Delivery", label: tr("cat_delivery", "Delivery") },
      { value: "Tours", label: tr("cat_tours", "Tours") },
    ],
    [tr]
  );

  const schoolTypeOptions = useMemo(
    () => [
      { value: "High School", label: tr("type_high_school", "High School") },
      { value: "College", label: tr("type_college", "College") },
      { value: "University", label: tr("type_university", "University") },
      { value: "Institute", label: tr("type_institute", "Institute") },
      { value: "Vocational", label: tr("type_vocational", "Vocational School") },
      { value: "Other", label: tr("type_other", "Other") },
    ],
    [tr]
  );

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
      alert(tr("alerts.upload_failed","Failed to upload profile picture. Please try again."));
    } finally {
      setUploadingProfilePic(false);
      e.target.value = "";
    }
  };

  // ✅ Single Save button saves EVERYTHING
  const handleSaveAll = async () => {
    if (!uid) return;

    // Align with onboarding basic requirements
    if (!form.full_name?.trim()) return alert(tr("alerts.required_full_name","Full name is required."));
    if (!form.phone?.trim()) return alert(tr("alerts.required_phone","Phone is required."));
    if (!form.country?.trim()) return alert(tr("alerts.required_country","Country is required."));

    // Align with onboarding role-specific requirements
    if (role === "agent") {
      if (!form.company_name?.trim()) return alert(tr("alerts.required_company_name","Company name is required."));
      if (!form.business_license_mst?.trim()) return alert(tr("alerts.required_business_license","Business license (MST) is required."));
      if (!form.paypal_email?.trim()) return alert(tr("alerts.required_paypal_email","PayPal email is required."));
    }

    if (role === "tutor") {
      if (csvToArray(form.specializations).length === 0) return alert(tr("alerts.required_specializations","Specializations are required."));
      if (!String(form.experience_years).trim()) return alert(tr("alerts.required_experience_years","Years of experience is required."));
      if (!String(form.hourly_rate).trim()) return alert(tr("alerts.required_hourly_rate","Hourly rate is required."));
      if (!form.paypal_email?.trim()) return alert(tr("alerts.required_paypal_email","PayPal email is required."));
    }

    if (role === "school") {
      if (!form.school_name?.trim()) return alert(tr("alerts.required_institution_name","Institution name is required."));
      if (!form.type?.trim()) return alert(tr("alerts.required_school_type","School type is required."));
      if (!form.location?.trim()) return alert(tr("alerts.required_city_location","City/Location is required."));
      if (!form.website?.trim()) return alert(tr("alerts.required_website","Website is required."));
    }

    if (role === "vendor") {
      if (!form.business_name?.trim()) return alert(tr("alerts.required_business_name","Business name is required."));
      if (!Array.isArray(form.service_categories) || form.service_categories.length === 0)
        return alert(tr("alerts.required_service_category","Select at least 1 service category."));
      if (!form.paypal_email?.trim()) return alert(tr("alerts.required_paypal_email","PayPal email is required."));
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
      alert(tr("alerts.saved","Saved! All changes were updated."));
      await loadProfile(uid);
    } catch (e) {
      console.error("Save failed:", e);
      alert(tr("alerts.save_failed","Failed to save changes. Please try again."));
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
  const displayName = (form.full_name || tr("default_user","User")).trim();
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
            <h1 className="text-2xl font-bold text-gray-900">{tr("title","Profile")}</h1>
            <p className="text-sm text-gray-600">
              {tr("role_prefix","Role:")} <span className="font-semibold">{meta.label}</span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{tr("personal_information","Personal Information")}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Profile picture upload (kept) */}
            <div>
              <Label>{tr("profile_picture","Profile Picture")}</Label>
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
                  {uploadingProfilePic ? tr("uploading","Uploading…") : tr("upload_picture","Upload Picture")}
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
                <Label>{tr("full_name","Full Name *")}</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>{tr("email_login","Email (Login)")}</Label>
                <Input value={form.email} disabled className="mt-1 bg-gray-100" />
              </div>

              <div>
                <Label>{tr("phone","Phone *")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>{tr("country","Country *")}</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setField("country", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Biography (fixed + saved) */}
            <div>
              <Label>{tr("bio_label","Biography / Description")}</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setField("bio", e.target.value)}
                className="mt-1"
                rows={4}
                placeholder={tr("bio_placeholder","Write a short bio/description shown on your profile...")}
              />
              <p className="text-xs text-gray-500 mt-1">
                {tr("bio_help","Optional, but recommended for better profile visibility.")}
              </p>
            </div>

            {/* ✅ Hide these “requirements/verification” UI for user/student */}
            {isUserStudent ? null : (
              <div className="rounded-md border bg-white p-4 text-sm text-gray-600">
                {tr("roles_require_note","Some roles may require verification or additional details before appearing publicly.")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role-specific sections (kept) */}
        {showAgent && (
          <Card>
            <CardHeader>
              <CardTitle>{tr("agent_details","Agent Details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{tr("company_name","Company Name *")}</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setField("company_name", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{tr("business_license_mst","Business License (MST) *")}</Label>
                <Input
                  value={form.business_license_mst}
                  onChange={(e) => setField("business_license_mst", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{tr("year_established","Year Established")}</Label>
                <Input
                  type="number"
                  value={form.year_established}
                  onChange={(e) => setField("year_established", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{tr("paypal_email","PayPal Email *")}</Label>
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
              <CardTitle>{tr("tutor_details","Tutor Details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{tr("specializations","Specializations *")}</Label>
                <Input
                  value={form.specializations}
                  onChange={(e) => setField("specializations", e.target.value)}
                  className="mt-1"
                  placeholder={tr("specializations_placeholder","IELTS, TOEFL...")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{tr("experience_years","Years of Experience *")}</Label>
                  <Input
                    type="number"
                    value={form.experience_years}
                    onChange={(e) => setField("experience_years", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{tr("hourly_rate_usd","Hourly Rate (USD) *")}</Label>
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
                <Label>{tr("paypal_email","PayPal Email *")}</Label>
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
              <CardTitle>{tr("vendor_details","Vendor Details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{tr("business_name","Business Name *")}</Label>
                <Input
                  value={form.business_name}
                  onChange={(e) => setField("business_name", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>{tr("service_categories","Service Categories *")}</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {vendorCategoryOptions.map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`cat-${value}`}
                        checked={form.service_categories?.includes(value) || false}
                        onChange={(e) => {
                          const cur = form.service_categories || [];
                          const next = e.target.checked
                            ? [...cur, value]
                            : cur.filter((c) => c !== value);
                          setField("service_categories", next);
                        }}
                        className="h-4 w-4"
                      />
                      <label htmlFor={`cat-${value}`} className="text-sm text-gray-700">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>{tr("paypal_email","PayPal Email *")}</Label>
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
              <CardTitle>{tr("school_details","School Details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{tr("institution_name","Institution Name *")}</Label>
                <Input
                  value={form.school_name}
                  onChange={(e) => setField("school_name", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>{tr("school_type","School Type *")}</Label>
                <Select value={form.type || ""} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={tr("select_institution_type","Select institution type")} />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{tr("city_location","City/Location *")}</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>{tr("official_website","Official Website *")}</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  className="mt-1"
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>{tr("about_institution","About Your Institution")}</Label>
                <Textarea
                  value={form.about}
                  onChange={(e) => setField("about", e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              {form.institution_id ? (
                <p className="text-xs text-gray-500">
                  {tr("linked_institution_id","Linked institution_id:")} <span className="font-mono">{form.institution_id}</span>
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
            {saving ? tr("saving","Saving…") : tr("save_changes","Save Changes")}
          </Button>
        </div>
      </div>
    </div>
  );
}