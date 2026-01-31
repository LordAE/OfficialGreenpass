// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

import { auth, db, storage } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useTr } from "@/i18n/useTr";
import { useSubscriptionMode } from "@/hooks/useSubscriptionMode";

/* ---------------- helpers ---------------- */
const VALID_ROLES = ["user", "agent", "tutor", "school", "vendor"];
const normalizeRole = (r) => {
  const v = String(r || "").trim().toLowerCase();
  return VALID_ROLES.includes(v) ? v : "user";
};

const csvToArray = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const arrayToCSV = (v) => (Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "");


// 📎 Verification doc helpers (aligned with Onboarding.jsx)
const safeExt = (name = "") => {
  const m = String(name).toLowerCase().match(/\.(pdf|png|jpg|jpeg|webp)$/);
  return m ? m[1] : "bin";
};

const isAllowedVerificationFile = (file) => {
  const okTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
  if (!file) return false;
  if (okTypes.includes(file.type)) return true;
  return /\.(pdf|png|jpg|jpeg|webp)$/i.test(file.name || "");
};

const buildVerificationFieldsForRole = (role, tr) => {
  const r = normalizeRole(role);
  if (r === "agent") {
    return [
      { key: "agent_id_front", label: tr("verification.agent_id_front", "Valid ID (Front)"), required: true },
      { key: "agent_id_back", label: tr("verification.agent_id_back", "Valid ID (Back)"), required: true },
      { key: "agent_business_permit", label: tr("verification.agent_business_permit", "Business Permit / Registration"), required: true },
    ];
  }
  if (r === "tutor") {
    return [
      { key: "tutor_id_front", label: tr("verification.tutor_id_front", "Valid ID (Front)"), required: true },
      { key: "tutor_id_back", label: tr("verification.tutor_id_back", "Valid ID (Back)"), required: true },
      { key: "tutor_proof", label: tr("verification.tutor_proof", "Proof of Qualification (optional)"), required: false },
    ];
  }
  if (r === "school") {
    return [
      { key: "school_dli_or_permit", label: tr("verification.school_dli_or_permit", "DLI / School Permit / Accreditation Proof"), required: true },
    ];
  }
  // user/student
  if (r === "user") {
    return [
      { key: "student_id_front", label: tr("verification.student_id_front", "Valid ID (Front)"), required: true },
      { key: "student_id_back", label: tr("verification.student_id_back", "Valid ID (Back)"), required: true },
    ];
  }
  // vendor: none required in your onboarding
  return [];
};

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
  
// Inline document viewer (no new tab)
const [viewerOpen, setViewerOpen] = useState(false);
const [viewerUrl, setViewerUrl] = useState("");
const [viewerName, setViewerName] = useState("");

const detectType = useCallback((url = "") => {
  const u = String(url || "").toLowerCase();
  if (u.includes(".pdf") || u.includes("application%2fpdf")) return "pdf";
  if (u.match(/\.(png|jpg|jpeg|webp)(\?|$)/) || u.includes("image%2f")) return "image";
  return "file";
}, []);
const { tr } = useTr("profile");

  
  const { subscriptionModeEnabled, loading: subscriptionModeLoading } = useSubscriptionMode();
const [uid, setUid] = useState(null);
  const [role, setRole] = useState("user");
  const [userDoc, setUserDoc] = useState(null); // raw user document for badges/status
  const meta = useMemo(() => roleMeta(role, tr), [role]);
  const verificationFields = useMemo(() => buildVerificationFieldsForRole(role, tr), [role, tr]);

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

  // ✅ Verification state (used for re-upload/resubmission directly in Profile)
  const [verification, setVerification] = useState({
    status: "unverified", // unverified | pending | verified | rejected | denied
    reason: "",
    docs: {}, // key -> url
  });
  const [docUploading, setDocUploading] = useState({}); // key -> boolean
  const [submittingVerification, setSubmittingVerification] = useState(false);


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
        u.verification?.role || u.selected_role || u.user_type || u.userType || u.role || "user"
      );
      setRole(resolvedRole);
      setUserDoc(u);

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

      // ✅ Load verification details (same keys as onboarding)
      const vStatus =
        (u.verification && u.verification.status) ||
        u.verification_status ||
        (u.is_verified ? "verified" : "unverified") ||
        "unverified";

      const vReason =
        u.verification_rejection_reason ||
        (u.verification && (u.verification.reason || u.verification.rejection_reason)) ||
        "";

      const vDocs =
        (u.verification && u.verification.docs) ||
        u.verification_docs ||
        u.documents ||
        {};

      setVerification({
        status: String(vStatus || "unverified").toLowerCase(),
        reason: vReason || "",
        docs: vDocs && typeof vDocs === "object" ? vDocs : {},
      });

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


  // ✅ Upload / replace a verification document directly from Profile
  const uploadVerificationDoc = async (docKey, file) => {
    if (!uid) return;
    if (!file) return;

    if (!isAllowedVerificationFile(file)) {
      alert(tr("alerts.verification_bad_file", "Please upload a PDF, JPG, PNG, or WEBP file."));
      return;
    }

    setDocUploading((p) => ({ ...p, [docKey]: true }));
    try {
      const submissionId = `sub_${Date.now()}`;
      const ext = safeExt(file.name);
      const path = `verification/${uid}/${submissionId}/${docKey}.${ext}`;
      const sref = storageRef(storage, path);

      await uploadBytes(sref, file);
      const url = await getDownloadURL(sref);

      // Update local state immediately
      setVerification((p) => ({
        ...p,
        docs: { ...(p.docs || {}), [docKey]: url },
      }));

      // Persist to Firestore using dot-path to avoid overwriting other docs
      const uref = doc(db, "users", uid);
      await updateDoc(uref, {
        [`verification.docs.${docKey}`]: url,
        updated_at: serverTimestamp(),
      });
    } catch (e) {
      console.error("Verification doc upload failed:", e);
      alert(tr("alerts.upload_failed", "Upload failed. Please try again."));
    } finally {
      setDocUploading((p) => ({ ...p, [docKey]: false }));
    }
  };

  const clearVerificationDoc = async (docKey) => {
    if (!uid) return;
    setVerification((p) => {
      const next = { ...(p.docs || {}) };
      delete next[docKey];
      return { ...p, docs: next };
    });

    try {
      const uref = doc(db, "users", uid);
      await updateDoc(uref, {
        [`verification.docs.${docKey}`]: null,
        updated_at: serverTimestamp(),
      });
    } catch (e) {
      console.error("Clear verification doc failed:", e);
    }
  };

  // ✅ Submit (or resubmit) documents for admin review
  const submitVerificationForReview = async () => {
    if (!uid) return;

    const fields = buildVerificationFieldsForRole(role, tr);
    const docs = verification.docs || {};

    // Required doc check
    const missingRequired = fields
      .filter((f) => f.required)
      .filter((f) => !docs?.[f.key]);

    if (missingRequired.length) {
      alert(
        tr(
          "alerts.verification_missing_required",
          "Please upload all required verification documents before submitting."
        )
      );
      return;
    }

    setSubmittingVerification(true);
    try {
      const uref = doc(db, "users", uid);

      await updateDoc(uref, {
        verification_status: "pending",
        verification_rejection_reason: "",
        "verification.status": "pending",
        "verification.reason": "",
        "verification.submittedAt": serverTimestamp(),
        updated_at: serverTimestamp(),
        is_verified: false,
      });

      setVerification((p) => ({ ...p, status: "pending", reason: "" }));
      alert(tr("alerts.verification_submitted", "Submitted for review!"));
    } catch (e) {
      console.error("Submit verification failed:", e);
      alert(tr("alerts.save_failed", "Failed to submit. Please try again."));
    } finally {
      setSubmittingVerification(false);
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

  // ✅ Status chips (verification + subscription)
  const isVerified = (verification?.status === "verified") || Boolean(userDoc?.is_verified);
  const isSubscribed = Boolean(userDoc?.subscription_active) || ["active", "subscribed"].includes(String(userDoc?.subscription_status || "").toLowerCase());
  const subscriptionLabel = isSubscribed ? tr("subscription.subscribed", "Subscribed") : tr("subscription.not_subscribed", "Not subscribed");
  const verificationLabel = isVerified ? tr("verification.verified", "Verified") : tr("verification.unverified", "Unverified");

  return (
    <>
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
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${isVerified ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                {verificationLabel}
              </span>
              {!subscriptionModeLoading && subscriptionModeEnabled && (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${isSubscribed ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                {subscriptionLabel}
              </span>
        )}
            </div>
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
        

            {/* ✅ Verification status + documents (re-upload happens here on Profile) */}
            <Card className="border-emerald-100 bg-emerald-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{tr("verification.title", "Verification")}</span>
                  <span className="text-sm font-semibold">
                    {verification.status === "verified" ? (
                      <span className="text-emerald-700">{tr("verification.verified", "Verified")}</span>
                    ) : verification.status === "pending" ? (
                      <span className="text-amber-700">{tr("verification.pending", "Pending")}</span>
                    ) : verification.status === "rejected" || verification.status === "denied" ? (
                      <span className="text-red-700">{tr("verification.denied", "Unverified")}</span>
                    ) : (
                      <span className="text-gray-700">{tr("verification.unverified", "Unverified")}</span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {(verification.status === "rejected" || verification.status === "denied") && verification.reason ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <div className="font-semibold">{tr("verification.denied_title", "Verification denied")}</div>
                    <div className="mt-1">{verification.reason}</div>
                    <div className="mt-3 text-xs text-red-700">
                      {tr("verification.resubmit_hint", "Please re-upload the correct documents below, then submit again.")}
                    </div>
                  </div>
                ) : null}

                {verificationFields.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    {tr("verification.none_required", "No verification documents required for your role.")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {verificationFields.map((f) => {
                      const url = verification.docs?.[f.key] || "";
                      const uploading = !!docUploading?.[f.key];

                      return (
                        <div key={f.key} className="rounded-xl border bg-white p-4 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900">
                                {f.label} {f.required ? "*" : ""}
                              </div>
                              {url ? (
                                <Button type="button" variant="outline" onClick={() => { setViewerUrl(url); setViewerName(f.label); setViewerOpen(true); }}>
  {tr("verification.view", "View uploaded document")}
</Button>
                              ) : (
                                <div className="text-sm text-gray-600">
                                  {tr("verification.no_file", "No file uploaded yet")}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {url ? (
                                <button
                                  type="button"
                                  onClick={() => clearVerificationDoc(f.key)}
                                  className="text-xs text-gray-500 hover:text-red-600"
                                >
                                  {tr("verification.remove", "Remove")}
                                </button>
                              ) : null}

                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  className="hidden"
                                  disabled={uploading}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    e.target.value = "";
                                    if (file) uploadVerificationDoc(f.key, file);
                                  }}
                                />
                                <span
                                  className={
                                    "inline-flex items-center rounded-md border px-3 py-2 text-sm " +
                                    (uploading
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                      : "bg-white hover:bg-gray-50 text-gray-900")
                                  }
                                >
                                  {uploading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      {tr("verification.uploading", "Uploading...")}
                                    
</>
                                  ) : url ? (
                                    tr("verification.replace", "Replace")
                                  ) : (
                                    tr("verification.upload", "Upload")
                                  )}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}


                {(() => {
                  const expected = new Set((verificationFields || []).map((f) => f.key));
                  const allDocs = verification.docs && typeof verification.docs === "object" ? verification.docs : {};
                  const extraKeys = Object.keys(allDocs).filter((k) => !expected.has(k) && allDocs[k]);
                  if (!extraKeys.length) return null;

                  return (
                    <div className="rounded-xl border bg-white p-4">
                      <div className="font-medium text-gray-900">
                        {tr("verification.other_docs", "Other uploaded documents")}
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {extraKeys.map((k) => (
                          <Button
                            key={k}
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const url = allDocs[k];
                              setViewerUrl(url);
                              setViewerName(k);
                              setViewerOpen(true);
                            }}
                            className="justify-start"
                          >
                            {k}
                          </Button>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {tr(
                          "verification.other_docs_hint",
                          "These were found in your verification record but don’t match the expected document fields for your current role."
                        )}
                      </div>
                    </div>
                  );
                })()}


                {verificationFields.length ? (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      onClick={submitVerificationForReview}
                      disabled={submittingVerification || verification.status === "verified"}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {submittingVerification ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {tr("verification.submitting", "Submitting...")}
                        </>
                      ) : verification.status === "pending" ? (
                        tr("verification.resubmit", "Submit again")
                      ) : (
                        tr("verification.submit", "Submit for review")
                      )}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

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

  {/* ✅ Document viewer modal */}
  <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>{viewerName || tr("verification.document", "Document")}</DialogTitle>
    </DialogHeader>

    <div className="w-full">
      {detectType(viewerUrl) === "image" ? (
        <img
          src={viewerUrl}
          alt={viewerName}
          className="w-full max-h-[70vh] object-contain rounded-lg"
        />
      ) : detectType(viewerUrl) === "pdf" ? (
        <iframe
          src={viewerUrl}
          title={viewerName || tr("verification.document", "Document")}
          className="w-full h-[70vh] rounded-lg border"
        />
      ) : (
        <div className="text-sm text-gray-700">
          {tr("verification.cannot_preview", "This file type can’t be previewed here.")}
          <div className="mt-3">
            <a className="underline" href={viewerUrl} target="_blank" rel="noreferrer">
              {tr("verification.open_new_tab", "Open in new tab")}
            </a>
          </div>
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>
    </>



  );
}