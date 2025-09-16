// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import UserProfileForm from "../components/profile/UserProfileForm";
import AgentProfileForm from "../components/profile/AgentProfileForm";
import TutorProfileForm from "../components/profile/TutorProfileForm";
import SchoolProfileForm from "../components/profile/SchoolProfileForm";
import VendorProfileForm from "../components/profile/VendorProfileForm";
import ProfilePictureUpload from "../components/profile/ProfilePictureUpload"; // ⬅️ NEW
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/* ---------- Firebase ---------- */
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

/* =========================
   Helpers: field mapping
========================= */
const pickFirst = (...vals) =>
  vals.find((v) => (Array.isArray(v) ? v.length : v || v === 0)) ?? undefined;

const mapOnboardingToAgent = (src = {}) => ({
  company_name: pickFirst(src.company_name, src.companyName, src.agency_name, src.org_name),
  business_license_mst: pickFirst(
    src.business_license_mst,
    src.business_license,
    src.mst,
    src.tax_id,
    src.taxNumber,
    src.tax_number
  ),
  paypal_email: pickFirst(src.paypal_email, src.paypal, src.payout_email),
  year_established: pickFirst(src.year_established, src.established_year, src.yearEstablished),
  website: pickFirst(src.website, src.org_website),
  phone: pickFirst(src.phone, src.business_phone),
  address: pickFirst(src.address, src.business_address),
});

const mapOnboardingToTutor = (src = {}) => ({
  experience_years: Number(pickFirst(src.experience_years, src.experience, src.years_of_experience)) || undefined,
  hourly_rate: Number(pickFirst(src.hourly_rate, src.rate, src.hourlyRate)) || undefined,
  specializations: pickFirst(src.specializations, src.subjects, src.specialties) || [],
  paypal_email: pickFirst(src.paypal_email, src.paypal, src.payout_email),
  bio: pickFirst(src.bio, src.about),
});

const mapOnboardingToSchool = (src = {}) => ({
  name: pickFirst(src.name, src.school_name, src.institution_name),
  school_level: pickFirst(src.school_level, src.level, src.tier),
  location: pickFirst(src.location, src.city_country, src.city),
  website: pickFirst(src.website),
  description: pickFirst(src.description, src.about),
});

const mapOnboardingToVendor = (src = {}) => ({
  business_name: pickFirst(src.business_name, src.company_name),
  service_categories: pickFirst(src.service_categories, src.categories, src.services) || [],
  paypal_email: pickFirst(src.paypal_email, src.paypal, src.payout_email),
  website: pickFirst(src.website),
});

/* =========================
   Role meta + lookups
========================= */
const ROLE_COLLECTIONS = {
  agent: ["agents"],
  tutor: ["tutors"],
  school: ["school_profiles", "schools"],
  vendor: ["vendors"],
};

const ROLE_USER_ID_FIELDS = ["user_id", "userId", "uid"];

async function findRoleDoc(db, uid, userType) {
  const collections = ROLE_COLLECTIONS[userType] || [];
  for (const colName of collections) {
    for (const idField of ROLE_USER_ID_FIELDS) {
      try {
        const q = query(collection(db, colName), where(idField, "==", uid), limit(1));
        const qs = await getDocs(q);
        if (!qs.empty) {
          const d = qs.docs[0];
          return { refPath: `${colName}/${d.id}`, id: d.id, colName, idField, data: d.data() };
        }
      } catch (err) {
        console.debug(`No match in ${colName}.${idField}:`, err?.code || err?.message);
      }
    }
  }
  return null;
}

async function loadOnboardingDraft(db, uid) {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    const base = snap.exists() ? snap.data() : {};

    const inline =
      base.onboarding ||
      base.onboarding_data ||
      base.onboardingDraft ||
      base.onboarding_draft ||
      base.profileDraft;

    if (inline && typeof inline === "object") return inline;

    try {
      const sub = await getDocs(query(collection(db, "users", uid, "onboarding"), limit(1)));
      if (!sub.empty) return sub.docs[0].data();
    } catch {}

    const nested =
      base.profile ||
      base.profile_data ||
      base.draft ||
      base.draft_profile ||
      base.roleDraft ||
      null;

    if (nested && typeof nested === "object") return nested;
  } catch (err) {
    console.debug("No onboarding draft found:", err?.code || err?.message);
  }
  return null;
}

/* =========================
   Component
========================= */
export default function Profile() {
  const [currentUser, setCurrentUser] = useState(null); // normalized user
  const [roleSpecificData, setRoleSpecificData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [userFormData, setUserFormData] = useState({});
  const [roleFormData, setRoleFormData] = useState({});

  const normalizeUser = (uid, data = {}, fbUser = {}) => {
    const full_name = pickFirst(data.full_name, data.displayName, fbUser.displayName, data.name) || "";
    const user_type = (pickFirst(data.user_type, data.role, "student") || "student").toLowerCase();
    return { id: uid, ...data, full_name, user_type };
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setError(null);
      try {
        if (!fbUser) {
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        const uref = doc(db, "users", fbUser.uid);
        const usnap = await getDoc(uref);
        if (!usnap.exists()) {
          const seed = {
            uid: fbUser.uid,
            full_name: fbUser.displayName || "",
            email: fbUser.email || "",
            user_type: "student",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(uref, seed, { merge: true });
        }
        const freshUser = (await getDoc(uref)).data() || {};
        const baseUser = normalizeUser(fbUser.uid, freshUser, fbUser);
        setCurrentUser(baseUser);

        const onboarding = await loadOnboardingDraft(db, fbUser.uid);
        const personalMerge = onboarding?.personal || onboarding?.user || onboarding || {};
        setUserFormData({ ...baseUser, ...personalMerge });

        const found = await findRoleDoc(db, fbUser.uid, baseUser.user_type);

        if (found) {
          const roleData = { id: found.id, ...found.data };
          setRoleSpecificData(roleData);
          setRoleFormData(roleData);
        } else {
          let mapped = {};
          const src = onboarding?.[baseUser.user_type] || onboarding || {};

          if (baseUser.user_type === "agent") mapped = mapOnboardingToAgent(src);
          if (baseUser.user_type === "tutor") mapped = mapOnboardingToTutor(src);
          if (baseUser.user_type === "school") mapped = mapOnboardingToSchool(src);
          if (baseUser.user_type === "vendor") mapped = mapOnboardingToVendor(src);

          setRoleSpecificData(null);
          setRoleFormData(mapped);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Failed to load profile data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub && unsub();
  }, []);

  const handleUserInputChange = (field, value) => {
    setUserFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleInputChange = (field, value) => {
    setRoleFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveUserProfile = async () => {
    if (!currentUser?.id) return;
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const userRef = doc(db, "users", currentUser.id);
      const { id, ...payload } = userFormData || {};
      await updateDoc(userRef, { ...payload, updatedAt: serverTimestamp() }).catch(async (err) => {
        if (err?.code === "not-found") {
          await setDoc(
            userRef,
            { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
            { merge: true }
          );
        } else {
          throw err;
        }
      });

      const fresh = await getDoc(userRef);
      const updated = normalizeUser(currentUser.id, fresh.data() || {}, {});
      setCurrentUser(updated);
      setUserFormData(updated);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving user profile:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getRoleMeta = (userType) => {
    switch (userType) {
      case "agent":
        return { col: "agents", required: ["company_name", "business_license_mst", "paypal_email"] };
      case "tutor":
        return { col: "tutors", required: ["experience_years", "hourly_rate", "specializations", "paypal_email"] };
      case "school":
        return { col: "school_profiles", required: ["name", "school_level", "location"] };
      case "vendor":
        return { col: "vendors", required: ["business_name", "service_categories", "paypal_email"] };
      default:
        return { col: null, required: [] };
    }
  };

  const handleSaveRoleProfile = async () => {
    if (!currentUser?.id) return;
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const userType = currentUser.user_type;
      const { col, required } = getRoleMeta(userType);
      if (!col) {
        setError("Your account has no professional role to save.");
        setSaving(false);
        return;
      }

      const missing = required.filter((k) => {
        const v = roleFormData?.[k];
        if (Array.isArray(v)) return v.length === 0;
        return v === undefined || v === null || `${v}`.trim() === "";
      });
      if (missing.length) {
        setError("Please complete all required fields.");
        setSaving(false);
        return;
      }

      let savedData = null;

      if (roleSpecificData?.id) {
        const refDoc = doc(db, col, roleSpecificData.id);
        const { id, ...payload } = roleFormData || {};
        await updateDoc(refDoc, { ...payload, updatedAt: serverTimestamp() });
        const fresh = await getDoc(refDoc);
        savedData = { id: refDoc.id, ...fresh.data() };
      } else {
        const payload = {
          ...roleFormData,
          user_id: currentUser.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (userType === "agent" && !payload.referral_code) {
          payload.referral_code = `AG${Date.now().toString().slice(-6)}`;
        }
        const refDoc = await addDoc(collection(db, col), payload);
        const fresh = await getDoc(refDoc);
        savedData = { id: refDoc.id, ...fresh.data() };
      }

      setRoleSpecificData(savedData);
      setRoleFormData(savedData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving professional profile:", err);
      setError("Failed to save professional profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // -------- UI --------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">You’re signed out</h2>
            <p className="text-gray-600 mb-4">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and preferences.</p>
        </div>

        {saveSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">Profile updated successfully!</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="professional">Professional Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                {/* ---- Profile Photo Uploader ---- */}
                <div className="mb-6">
                  <ProfilePictureUpload
                    currentPicture={userFormData?.photo_url}
                    fallbackName={currentUser?.full_name || "User"}
                    onUpdate={(url) => {
                      // reflect immediately in UI state
                      setUserFormData((prev) => ({ ...prev, photo_url: url }));
                      setCurrentUser((prev) => (prev ? { ...prev, photo_url: url } : prev));
                    }}
                    // autoSaveToFirestore is true by default; keeps users/{uid}.photo_url in sync
                  />
                </div>

                {/* ---- Personal form fields ---- */}
                <UserProfileForm formData={userFormData} handleInputChange={handleUserInputChange} />

                <div className="flex justify-end mt-6">
                  <Button onClick={handleSaveUserProfile} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional">
            <Card>
              <CardHeader>
                <CardTitle>Professional Profile</CardTitle>
              </CardHeader>
              <CardContent>
                {currentUser.user_type === "agent" && (
                  <AgentProfileForm formData={roleFormData} handleInputChange={handleRoleInputChange} />
                )}
                {currentUser.user_type === "tutor" && (
                  <TutorProfileForm formData={roleFormData} handleInputChange={handleRoleInputChange} />
                )}
                {currentUser.user_type === "school" && (
                  <SchoolProfileForm formData={roleFormData} handleInputChange={handleRoleInputChange} />
                )}
                {currentUser.user_type === "vendor" && (
                  <VendorProfileForm formData={roleFormData} handleInputChange={handleRoleInputChange} />
                )}
                {["user", "student"].includes(currentUser.user_type) && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      Professional profile settings are available after selecting a professional role.
                    </p>
                  </div>
                )}

                {!["user", "student"].includes(currentUser.user_type) && (
                  <div className="flex justify-end mt-6">
                    <Button onClick={handleSaveRoleProfile} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
