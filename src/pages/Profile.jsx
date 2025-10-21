import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import UserProfileForm from "../components/profile/UserProfileForm";
import AgentProfileForm from "../components/profile/AgentProfileForm";
import TutorProfileForm from "../components/profile/TutorProfileForm";
import SchoolProfileForm from "../components/profile/SchoolProfileForm";
import VendorProfileForm from "../components/profile/VendorProfileForm";
import ProfilePictureUpload from "../components/profile/ProfilePictureUpload";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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
   Helpers
========================= */
const pickFirst = (...vals) =>
  vals.find((v) => (Array.isArray(v) ? v.length : v || v === 0)) ?? undefined;

const csvToArray = (s) =>
  (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const ensureArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return csvToArray(v);
  return [];
};

const ensureNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/* =========================
   Field mapping from onboarding
========================= */
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
  year_established: ensureNumber(pickFirst(src.year_established, src.established_year, src.yearEstablished)),
  website: pickFirst(src.website, src.org_website),
  phone: pickFirst(src.phone, src.business_phone),
  address: pickFirst(src.address, src.business_address),
});

const mapOnboardingToTutor = (src = {}) => ({
  experience_years: ensureNumber(pickFirst(src.experience_years, src.experience, src.years_of_experience)),
  hourly_rate: ensureNumber(pickFirst(src.hourly_rate, src.rate, src.hourlyRate)),
  specializations: ensureArray(pickFirst(src.specializations, src.subjects, src.specialties)),
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
  service_categories: ensureArray(pickFirst(src.service_categories, src.categories, src.services)),
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

async function findRoleDoc(db, uid, userType, onError) {
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
        onError && onError(err);
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

function normalizeRoleData(userType, data = {}) {
  if (userType === "tutor") {
    return {
      ...data,
      experience_years: ensureNumber(data.experience_years),
      hourly_rate: ensureNumber(data.hourly_rate),
      specializations: ensureArray(data.specializations),
      qualifications: ensureArray(data.qualifications),
    };
  }
  if (userType === "vendor") {
    return {
      ...data,
      service_categories: ensureArray(data.service_categories),
    };
  }
  if (userType === "agent") {
    return {
      ...data,
      year_established: ensureNumber(data.year_established),
    };
  }
  return data;
}

/* role change helper */
async function changeUserRole(db, uid, newRole) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, { user_type: newRole, updatedAt: serverTimestamp() }, { merge: true });
  return newRole;
}

/* =========================
   Component
========================= */
export default function Profile() {
  const [currentUser, setCurrentUser] = useState(null);
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
        const freshUserSnap = await getDoc(uref);
        const freshUser = freshUserSnap.data() || {};
        const baseUser = normalizeUser(fbUser.uid, freshUser, fbUser);
        setCurrentUser(baseUser);

        // Merge onboarding into personal form (if any)
        const onboarding = await loadOnboardingDraft(db, fbUser.uid);
        const personalMerge = onboarding?.personal || onboarding?.user || onboarding || {};
        setUserFormData({ ...baseUser, ...personalMerge });

        // Load or seed role doc
        const found = await findRoleDoc(db, fbUser.uid, baseUser.user_type, (err) => {
          if (err?.code === "permission-denied") {
            setError(
              "Permission denied reading your professional profile. Ask an admin or update rules/owner field."
            );
          }
        });

        if (found) {
          const roleData = { id: found.id, ...found.data };
          const normalized = normalizeRoleData(baseUser.user_type, roleData);
          setRoleSpecificData(normalized);
          setRoleFormData(normalized);
        } else {
          // Map from onboarding draft if role doc doesn’t exist yet
          const src = onboarding?.[baseUser.user_type] || onboarding || {};
          let mapped = {};
          if (baseUser.user_type === "agent") mapped = mapOnboardingToAgent(src);
          if (baseUser.user_type === "tutor") mapped = mapOnboardingToTutor(src);
          if (baseUser.user_type === "school") mapped = mapOnboardingToSchool(src);
          if (baseUser.user_type === "vendor") mapped = mapOnboardingToVendor(src);

          const normalized = normalizeRoleData(baseUser.user_type, mapped);
          setRoleSpecificData(null);
          setRoleFormData(normalized);
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
      // Force a full refresh shortly after success so the UI reflects all changes
      setTimeout(() => window.location.reload(), 300);
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

      // Normalize before validating/saving
      let normalizedToSave = normalizeRoleData(userType, roleFormData);

      // Validate required fields
      const missing = required.filter((k) => {
        const v = normalizedToSave?.[k];
        if (Array.isArray(v)) return v.length === 0;
        return v === undefined || v === null || `${v}`.trim?.() === "" || (!`${v}`.trim && v === "");
      });
      if (missing.length) {
        setError("Please complete all required fields.");
        setSaving(false);
        return;
      }

      // Ensure Firestore gets correct shapes
      if (userType === "tutor") {
        normalizedToSave = {
          ...normalizedToSave,
          experience_years: ensureNumber(normalizedToSave.experience_years) ?? 0,
          hourly_rate: ensureNumber(normalizedToSave.hourly_rate) ?? 0,
          specializations: ensureArray(normalizedToSave.specializations),
          qualifications: ensureArray(normalizedToSave.qualifications),
        };
      }
      if (userType === "vendor") {
        normalizedToSave = {
          ...normalizedToSave,
          service_categories: ensureArray(normalizedToSave.service_categories),
        };
      }
      if (userType === "agent") {
        normalizedToSave = {
          ...normalizedToSave,
          year_established: ensureNumber(normalizedToSave.year_established),
        };
      }

      let savedData = null;

      if (roleSpecificData?.id) {
        const refDoc = doc(db, col, roleSpecificData.id);
        const { id, ...payload } = normalizedToSave || {};
        await updateDoc(refDoc, { ...payload, updatedAt: serverTimestamp() });
        const fresh = await getDoc(refDoc);
        savedData = { id: refDoc.id, ...fresh.data() };
      } else {
        const payload = {
          ...normalizedToSave,
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

      const normalizedSaved = normalizeRoleData(userType, savedData);
      setRoleSpecificData(normalizedSaved);
      setRoleFormData(normalizedSaved);
      setSaveSuccess(true);
      // Force a full refresh shortly after success so the UI reflects all changes
      setTimeout(() => window.location.reload(), 300);
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
                {/* Photo */}
                <div className="mb-6">
                  <ProfilePictureUpload
                    currentPicture={userFormData?.photo_url}
                    fallbackName={currentUser?.full_name || "User"}
                    onUpdate={(url) => {
                      setUserFormData((prev) => ({ ...prev, photo_url: url }));
                      setCurrentUser((prev) => (prev ? { ...prev, photo_url: url } : prev));
                    }}
                  />
                </div>

                {/* Personal form */}
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
                {["user", "student"].includes(currentUser.user_type) ? (
                  <div className="py-6">
                    <p className="text-gray-600 mb-3">Choose your professional role to continue:</p>
                    <div className="flex items-center gap-3">
                      <Select
                        onValueChange={async (val) => {
                          try {
                            await changeUserRole(db, currentUser.id, val);
                            setCurrentUser((u) => ({ ...u, user_type: val }));
                            setRoleSpecificData(null);
                            setRoleFormData({});
                          } catch (e) {
                            setError("Failed to set role. Please try again.");
                          }
                        }}
                      >
                        <SelectTrigger className="w-60">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tutor">Tutor</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="school">School</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <>
                    {currentUser.user_type === "agent" && (
                      <AgentProfileForm
                        formData={roleFormData}
                        handleInputChange={handleRoleInputChange}
                        autoLoadFromFirestore={false}
                      />
                    )}
                    {currentUser.user_type === "tutor" && (
                      <TutorProfileForm
                        formData={roleFormData}
                        handleInputChange={handleRoleInputChange}
                        autoLoadFromFirestore={false}
                      />
                    )}
                    {currentUser.user_type === "school" && (
                      <SchoolProfileForm
                        formData={roleFormData}
                        handleInputChange={handleRoleInputChange}
                        autoLoadFromFirestore={false}
                      />
                    )}
                    {currentUser.user_type === "vendor" && (
                      <VendorProfileForm
                        formData={roleFormData}
                        handleInputChange={handleRoleInputChange}
                        autoLoadFromFirestore={false}
                      />
                    )}

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
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
