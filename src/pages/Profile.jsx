// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  User,
  Globe,
  BookOpen,
  Briefcase,
 Building,
  Store,
  Upload,
  Loader2,
  Save,
  Check,
  ChevronsUpDown,
  Pencil,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { UploadFile } from "@/api/integrations";
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

const csvToArray = (s) =>
  (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const arrayToCSV = (v) =>
  Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "tl", label: "Tagalog" },
  { value: "ceb", label: "Cebuano" },
  { value: "zh", label: "中文" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
];

const flagUrlFromCode = (code) => {
  const cc = (code || "").toString().trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return "";
  return `https://flagcdn.com/w20/${cc}.png`;
};

const getAllCountriesIntl = () => {
  try {
    if (typeof Intl === "undefined") return [];
    if (!Intl.supportedValuesOf) return [];

    const codes = Intl.supportedValuesOf("region") || [];
    const dn = Intl.DisplayNames
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;

    return codes
      .filter((code) => /^[A-Z]{2}$/.test(code))
      .map((code) => ({
        code,
        name: dn?.of(code) || code,
        flagUrl: flagUrlFromCode(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
};

async function getAllCountriesFallback() {
  const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
  const json = await res.json();

  return (json || [])
    .filter((x) => x?.cca2 && /^[A-Z]{2}$/.test(x.cca2))
    .map((x) => ({
      code: x.cca2,
      name: x?.name?.common || x.cca2,
      flagUrl: flagUrlFromCode(x.cca2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function CountrySelect({ valueCode, valueName, onChange, disabled = false }) {
  const tr0 = useTr();
  const tr = React.useCallback((key, fallback) => {
    if (typeof tr0 === "function") return tr0(key, fallback);
    if (tr0 && typeof tr0.tr === "function") return tr0.tr(key, fallback);
    if (tr0 && typeof tr0.t === "function") return tr0.t(key, fallback);
    return fallback ?? key;
  }, [tr0]);

  const [open, setOpen] = React.useState(false);
  const [countries, setCountries] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      try {
        const intlList = getAllCountriesIntl();
        if (alive && intlList.length) {
          setCountries(intlList);
          return;
        }

        const apiList = await getAllCountriesFallback();
        if (alive) setCountries(apiList);
      } catch (e) {
        console.error("Country list load failed:", e);
        if (alive) setCountries([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const selected = React.useMemo(() => {
    const byCode =
      valueCode && countries.find((c) => c.code === String(valueCode).toUpperCase());
    if (byCode) return byCode;

    const n = (valueName || "").trim().toLowerCase();
    if (!n) return null;

    return (
      countries.find((c) => c.name.toLowerCase() === n) ||
      countries.find((c) => c.name.toLowerCase().startsWith(n)) ||
      null
    );
  }, [countries, valueCode, valueName]);

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between disabled:opacity-100 disabled:cursor-default"
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                {selected.flagUrl ? (
                  <img
                    src={selected.flagUrl}
                    alt={`${selected.name} flag`}
                    width={20}
                    height={15}
                    className="rounded-[2px] border"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <span className="truncate">{selected.name}</span>
              </>
            ) : (
              <span className="text-gray-500">
                {tr("onboarding.placeholders.select_country", "Select your country")}
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={tr("search_country", "Search country...")} />
          <CommandList>
            <CommandEmpty>
              {loading ? tr("loading", "Loading...") : tr("no_results", "No results.")}
            </CommandEmpty>

            <CommandGroup heading={tr("country", "Country")}>
              {(countries || []).map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code}`}
                  onSelect={() => {
                    onChange?.({ code: c.code, name: c.name });
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={[
                      "h-4 w-4",
                      selected?.code === c.code ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                  />
                  {c.flagUrl ? (
                    <img
                      src={c.flagUrl}
                      alt={`${c.name} flag`}
                      width={20}
                      height={15}
                      className="rounded-[2px] border"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SimpleArrayInput({
  id,
  label,
  value,
  disabled,
  onChange,
  placeholder,
  helpText,
}) {
  const [text, setText] = React.useState(arrayToCSV(value));

  React.useEffect(() => {
    setText(arrayToCSV(value));
  }, [value]);

  const handleBlur = () => {
    onChange(csvToArray(text));
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={3}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="resize-none"
      />
      {helpText ? <p className="text-sm text-gray-500">{helpText}</p> : null}
    </div>
  );
}

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
      {
        key: "agent_id_front",
        label: tr("verification.agent_id_front", "Valid ID (Front)"),
        required: true,
      },
      {
        key: "agent_id_back",
        label: tr("verification.agent_id_back", "Valid ID (Back)"),
        required: true,
      },
      {
        key: "agent_business_permit",
        label: tr("verification.agent_business_permit", "Business Permit / Registration"),
        required: true,
      },
    ];
  }

  if (r === "tutor") {
    return [
      {
        key: "tutor_id_front",
        label: tr("verification.tutor_id_front", "Valid ID (Front)"),
        required: true,
      },
      {
        key: "tutor_id_back",
        label: tr("verification.tutor_id_back", "Valid ID (Back)"),
        required: true,
      },
      {
        key: "tutor_proof",
        label: tr("verification.tutor_proof", "Proof of Qualification (optional)"),
        required: false,
      },
    ];
  }

  if (r === "school") {
    return [
      {
        key: "school_dli_or_permit",
        label: tr(
          "verification.school_dli_or_permit",
          "DLI / School Permit / Accreditation Proof"
        ),
        required: true,
      },
    ];
  }

  if (r === "user") {
    return [
      {
        key: "student_id_front",
        label: tr("verification.student_id_front", "Valid ID (Front)"),
        required: true,
      },
      {
        key: "student_id_back",
        label: tr("verification.student_id_back", "Valid ID (Back)"),
        required: true,
      },
    ];
  }

  return [];
};

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

function roleMeta(role, tr) {
  if (role === "agent") {
    return { label: tr("role_agent", "Agent"), icon: <Briefcase className="w-5 h-5" /> };
  }
  if (role === "tutor") {
    return { label: tr("role_tutor", "Tutor"), icon: <BookOpen className="w-5 h-5" /> };
  }
  if (role === "school") {
    return { label: tr("role_school", "School"), icon: <Building className="w-5 h-5" /> };
  }
  if (role === "vendor") {
    return { label: tr("role_vendor", "Vendor"), icon: <Store className="w-5 h-5" /> };
  }
  return { label: tr("role_student", "Student"), icon: <User className="w-5 h-5" /> };
}

async function syncSchoolCollections({ uid, payload }) {
  const name = (payload.school_name || "").trim();
  if (!name) return "";

  const baseInstitutionId =
    (payload.institution_id || "").trim() || `${slugify(name)}-${uid.substring(0, 6)}`;

  let institutionId = baseInstitutionId;

  const tryPickInstitutionId = async () => {
    const instRef0 = doc(db, "institutions", institutionId);
    const instSnap0 = await getDoc(instRef0);

    if (!instSnap0.exists()) return { institutionId, instRef: instRef0 };

    const existing = instSnap0.data() || {};
    const existingOwner = existing.user_id;

    if (existingOwner === uid) return { institutionId, instRef: instRef0 };

    const suffix = Date.now().toString(36);
    institutionId = `${baseInstitutionId}-${suffix}`;
    const instRef1 = doc(db, "institutions", institutionId);
    return { institutionId, instRef: instRef1 };
  };

  const { institutionId: finalInstitutionId, instRef } = await tryPickInstitutionId();
  const spRef = doc(db, "school_profiles", uid);

  const institutionData = {
    user_id: uid,
    name,
    short_name: name,
    website: payload.website || "",
    city: payload.location || "",
    description: payload.about || "",
    updated_at: serverTimestamp(),
  };

  const schoolProfileData = {
    institution_id: finalInstitutionId,
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

  return finalInstitutionId;
}

/* ---------------- small UI wrappers ---------------- */
function ProfileHeader({
  tr,
  displayName,
  roleLabel,
  profilePhoto,
  initial,
  avatarBg,
  onUpload,
  uploading,
  isVerified,
  isSubscribed,
  verificationLabel,
  subscriptionLabel,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  saving,
}) {
  return (
    <div className="rounded-3xl bg-white border shadow-sm p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="w-24 h-24 rounded-3xl object-cover border bg-white shadow-sm"
              />
            ) : (
              <div
                className={`w-24 h-24 rounded-3xl ${avatarBg} text-white flex items-center justify-center text-3xl font-bold shadow-sm`}
              >
                {initial}
              </div>
            )}

            <input
              type="file"
              id="profile_picture_upload"
              accept="image/*"
              onChange={onUpload}
              className="hidden"
            />

            {isEditing && (
              <button
                type="button"
                onClick={() => document.getElementById("profile_picture_upload")?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full border bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-60"
                title={tr("upload_picture", "Upload Picture")}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 truncate">
              {displayName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{roleLabel}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={
                  isVerified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-700"
                }
              >
                {verificationLabel}
              </Badge>

              <Badge
                variant="outline"
                className={
                  isSubscribed
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-gray-50 text-gray-700"
                }
              >
                {subscriptionLabel}
              </Badge>
            </div>
          </div>
        </div>

        <div className="md:ml-auto flex items-center gap-2">
          {!isEditing ? (
            <Button type="button" variant="outline" onClick={onStartEdit} className="rounded-xl">
              <Pencil className="w-4 h-4 mr-2" />
              {tr("edit_profile", "Edit Profile")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onCancelEdit}
                className="rounded-xl"
              >
                <X className="w-4 h-4 mr-2" />
                {tr("cancel", "Cancel")}
              </Button>

              <Button
                type="button"
                className="rounded-xl bg-green-600 hover:bg-green-700"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? tr("saving", "Saving…") : tr("save_changes", "Save Changes")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ title, icon: Icon, action, children }) {
  return (
    <Card className="rounded-3xl shadow-sm border">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-gray-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 truncate">{title}</h2>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const detectType = useCallback((url = "") => {
    const u = String(url || "").toLowerCase();
    if (u.includes(".pdf") || u.includes("application%2fpdf")) return "pdf";
    if (u.match(/\.(png|jpg|jpeg|webp)(\?|$)/) || u.includes("image%2f")) return "image";
    return "file";
  }, []);

  const tr0 = useTr("profile");
  const tr = useCallback(
    (key, fallback) => {
      if (typeof tr0 === "function") return tr0(key, fallback);
      if (tr0 && typeof tr0.tr === "function") return tr0.tr(key, fallback);
      if (tr0 && typeof tr0.t === "function") return tr0.t(key, fallback);
      return fallback ?? key;
    },
    [tr0]
  );

  const { subscriptionModeEnabled, loading: subscriptionModeLoading } = useSubscriptionMode();

  const [uid, setUid] = useState(null);
  const [role, setRole] = useState("user");
  const [userDoc, setUserDoc] = useState(null);

  const meta = useMemo(() => roleMeta(role, tr), [role, tr]);
  const verificationFields = useMemo(() => buildVerificationFieldsForRole(role, tr), [role, tr]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);

  const initialLang = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("lang") || localStorage.getItem("gp_lang") || "en";
    } catch {
      return "en";
    }
  })();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "",
    country_code: "",
    lang: initialLang,
    profile_picture: "",
    bio: "",

    date_of_birth: "",
    gender: "",
    age: "",
    interested_in: "",
    current_level: "",
    comments: "",
    interests: [],
    education: [],
    selected_courses: [],
    preferred_countries: [],
    study_areas: [],
    spoken_languages: [],

    company_name: "",
    business_license_mst: "",
    year_established: "",
    paypal_email: "",

    specializations: "",
    experience_years: "",
    hourly_rate: "",

    institution_id: "",
    school_name: "",
    type: "",
    location: "",
    website: "",
    about: "",

    business_name: "",
    service_categories: [],
  });

  const [verification, setVerification] = useState({
    status: "unverified",
    reason: "",
    docs: {},
  });
  const [docUploading, setDocUploading] = useState({});
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const v = form?.lang || "en";
    try {
      localStorage.setItem("gp_lang", v);
    } catch {}
    window.dispatchEvent(new CustomEvent("gp_lang_changed", { detail: v }));
  }, [form?.lang]);

  const handleLanguageChange = useCallback(
    async (v) => {
      if (!v || !isEditing) return;

      setField("lang", v);

      try {
        localStorage.setItem("gp_lang", v);
      } catch {}

      try {
        const url = new URL(window.location.href);
        url.searchParams.set("lang", v);
        window.history.replaceState({}, "", url.toString());
      } catch {}

      try {
        if (uid) {
          await updateDoc(doc(db, "users", uid), { lang: v, language: v });
        }
      } catch {}

      window.location.reload();
    },
    [uid, isEditing]
  );

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
      const uref = doc(db, "users", userId);
      const usnap = await getDoc(uref);

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

      let schoolProfileDoc = null;
      if (resolvedRole === "school") {
        const spRef = doc(db, "school_profiles", userId);
        const spSnap = await getDoc(spRef);
        if (spSnap.exists()) schoolProfileDoc = spSnap.data();
      }

      const resolvedBio =
        u.bio ||
        u.agent_profile?.bio ||
        u.tutor_profile?.bio ||
        u.school_profile?.bio ||
        u.vendor_profile?.bio ||
        "";

      const isStudentRole = resolvedRole === "user";

      setForm((p) => ({
        ...p,
        full_name: u.full_name || "",
        email: u.email || auth.currentUser?.email || "",
        phone: u.phone || "",
        country: u.country || "",
        country_code: u.country_code || "",
        lang:
          (typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("lang") ||
              localStorage.getItem("gp_lang")
            : null) ||
          u.lang ||
          u.language ||
          "en",
        profile_picture: u.profile_picture || "",
        bio: resolvedBio || "",

        date_of_birth: !isStudentRole ? u.date_of_birth || "" : "",
        gender: !isStudentRole ? u.gender || "" : "",
        age: isStudentRole ? String(u.age || "") : String(u.age || ""),
        interested_in: isStudentRole ? u.interested_in || "" : u.interested_in || "",
        current_level: isStudentRole ? u.current_level || "" : u.current_level || "",
        comments: isStudentRole ? u.comments || "" : u.comments || "",
        interests: Array.isArray(u.interests) ? u.interests : [],
        education: Array.isArray(u.education) ? u.education : [],
        selected_courses: Array.isArray(u.selected_courses) ? u.selected_courses : [],
        preferred_countries: Array.isArray(u.preferred_countries) ? u.preferred_countries : [],
        study_areas: Array.isArray(u.study_areas) ? u.study_areas : [],
        spoken_languages: Array.isArray(u.spoken_languages) ? u.spoken_languages : [],

        company_name: u.agent_profile?.company_name || "",
        business_license_mst: u.agent_profile?.business_license_mst || "",
        year_established: u.agent_profile?.year_established || "",
        paypal_email:
          u.agent_profile?.paypal_email ||
          u.tutor_profile?.paypal_email ||
          u.vendor_profile?.paypal_email ||
          "",

        specializations: arrayToCSV(u.tutor_profile?.specializations),
        experience_years: u.tutor_profile?.experience_years || "",
        hourly_rate: u.tutor_profile?.hourly_rate || "",

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

        business_name: u.vendor_profile?.business_name || "",
        service_categories: u.vendor_profile?.service_categories || [],
      }));

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

  const handleUploadProfilePicture = async (e) => {
    if (!isEditing) return;

    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfilePic(true);
    try {
      const { file_url } = await UploadFile({ file });
      setField("profile_picture", file_url);

      if (uid) {
        await updateDoc(doc(db, "users", uid), {
          profile_picture: file_url,
          updated_at: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Profile picture upload failed:", err);
      alert(tr("alerts.upload_failed", "Failed to upload profile picture. Please try again."));
    } finally {
      setUploadingProfilePic(false);
      e.target.value = "";
    }
  };

  const uploadVerificationDoc = async (docKey, file) => {
    if (!uid || !file || !isEditing) return;

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

      setVerification((p) => ({
        ...p,
        docs: { ...(p.docs || {}), [docKey]: url },
      }));

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
    if (!uid || !isEditing) return;

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

  const submitVerificationForReview = async () => {
    if (!uid || !isEditing) return;

    const fields = buildVerificationFieldsForRole(role, tr);
    const docs = verification.docs || {};
    const missingRequired = fields.filter((f) => f.required).filter((f) => !docs?.[f.key]);

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

  const handleSaveAll = async () => {
    if (!uid) return;

    if (!form.full_name?.trim()) {
      return alert(tr("alerts.required_full_name", "Full name is required."));
    }
    if (!form.phone?.trim()) {
      return alert(tr("alerts.required_phone", "Phone is required."));
    }
    if (!form.country?.trim()) {
      return alert(tr("alerts.required_country", "Country is required."));
    }

    if (role === "agent") {
      if (!form.company_name?.trim()) {
        return alert(tr("alerts.required_company_name", "Company name is required."));
      }
      if (!form.business_license_mst?.trim()) {
        return alert(tr("alerts.required_business_license", "Business license (MST) is required."));
      }
      if (!form.paypal_email?.trim()) {
        return alert(tr("alerts.required_paypal_email", "PayPal email is required."));
      }
    }

    if (role === "tutor") {
      if (csvToArray(form.specializations).length === 0) {
        return alert(tr("alerts.required_specializations", "Specializations are required."));
      }
      if (!String(form.experience_years).trim()) {
        return alert(tr("alerts.required_experience_years", "Years of experience is required."));
      }
      if (!String(form.hourly_rate).trim()) {
        return alert(tr("alerts.required_hourly_rate", "Hourly rate is required."));
      }
      if (!form.paypal_email?.trim()) {
        return alert(tr("alerts.required_paypal_email", "PayPal email is required."));
      }
    }

    if (role === "school") {
      if (!form.school_name?.trim()) {
        return alert(tr("alerts.required_institution_name", "Institution name is required."));
      }
      if (!form.type?.trim()) {
        return alert(tr("alerts.required_school_type", "School type is required."));
      }
      if (!form.location?.trim()) {
        return alert(tr("alerts.required_city_location", "City/Location is required."));
      }
      if (!form.website?.trim()) {
        return alert(tr("alerts.required_website", "Website is required."));
      }
    }

    if (role === "vendor") {
      if (!form.business_name?.trim()) {
        return alert(tr("alerts.required_business_name", "Business name is required."));
      }
      if (!Array.isArray(form.service_categories) || form.service_categories.length === 0) {
        return alert(tr("alerts.required_service_category", "Select at least 1 service category."));
      }
      if (!form.paypal_email?.trim()) {
        return alert(tr("alerts.required_paypal_email", "PayPal email is required."));
      }
    }

    setSaveNotice(null);
    setSaving(true);

    try {
      const uref = doc(db, "users", uid);

      const updates = {
        full_name: form.full_name || "",
        phone: form.phone || "",
        country: form.country || "",
        country_code: form.country_code || "",
        lang: form.lang || "en",
        language: form.lang || "en",
        profile_picture: form.profile_picture || "",
        bio: form.bio || "",
        age: form.age ? Number(form.age) : "",
        current_level: form.current_level || "",
        interested_in: form.interested_in || "",
        comments: form.comments || "",
        interests: Array.isArray(form.interests) ? form.interests : [],
        education: Array.isArray(form.education) ? form.education : [],
        selected_courses: Array.isArray(form.selected_courses) ? form.selected_courses : [],
        preferred_countries: Array.isArray(form.preferred_countries) ? form.preferred_countries : [],
        study_areas: Array.isArray(form.study_areas) ? form.study_areas : [],
        spoken_languages: Array.isArray(form.spoken_languages) ? form.spoken_languages : [],
        updated_at: serverTimestamp(),
      };

      if (role !== "user") {
        updates.date_of_birth = form.date_of_birth || "";
        updates.gender = form.gender || "";
      }

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

      try {
        localStorage.setItem("gp_lang", updates.lang || "en");
      } catch {}

      window.dispatchEvent(new CustomEvent("gp_lang_changed", { detail: updates.lang || "en" }));

      setSaveNotice({
        type: "success",
        text: tr("alerts.saved", "Saved! All changes were updated."),
      });

      setTimeout(() => setSaveNotice(null), 4000);
      setIsEditing(false);
      await loadProfile(uid);
    } catch (e) {
      console.error("Save failed:", e);
      setSaveNotice({
        type: "error",
        text: tr("alerts.save_failed", "Failed to save changes. Please try again."),
      });
      setTimeout(() => setSaveNotice(null), 6000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = async () => {
    setIsEditing(false);
    if (uid) {
      await loadProfile(uid);
    }
  };

  const displayName = (form.full_name || tr("default_user", "User")).trim();
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const avatarBg = "bg-gradient-to-br from-green-500 to-blue-500";
  const profilePhoto = form.profile_picture || form.photo_url || form.photoURL || "";

  const isVerified = verification?.status === "verified" || Boolean(userDoc?.is_verified);
  const isSubscribed =
    Boolean(userDoc?.subscription_active) ||
    ["active", "subscribed"].includes(String(userDoc?.subscription_status || "").toLowerCase());

  const subscriptionLabel = isSubscribed
    ? tr("subscription.subscribed", "Subscribed")
    : tr("subscription.not_subscribed", "Not subscribed");

  const verificationLabel = isVerified
    ? tr("verification.verified", "Verified")
    : tr("verification.unverified", "Unverified");

  const memberSince = useMemo(() => {
    const raw = userDoc?.created_at;

    try {
      const date =
        typeof raw?.toDate === "function"
          ? raw.toDate()
          : raw instanceof Date
            ? raw
            : null;

      if (!date || Number.isNaN(date.getTime())) {
        return tr("member_since_unknown", "Recently joined");
      }

      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return tr("member_since_unknown", "Recently joined");
    }
  }, [userDoc?.created_at, tr]);

  const languageLabel =
    LANGUAGE_OPTIONS.find((l) => l.value === (form.lang || "en"))?.label || "English";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }

  const showStudent = role === "user";
  const showAgent = role === "agent";
  const showTutor = role === "tutor";
  const showSchool = role === "school";
  const showVendor = role === "vendor";

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
          <ProfileHeader
            tr={tr}
            displayName={displayName}
            roleLabel={meta.label}
            profilePhoto={profilePhoto}
            initial={initial}
            avatarBg={avatarBg}
            onUpload={handleUploadProfilePicture}
            uploading={uploadingProfilePic}
            isVerified={isVerified}
            isSubscribed={!subscriptionModeLoading && subscriptionModeEnabled && isSubscribed}
            verificationLabel={verificationLabel}
            subscriptionLabel={subscriptionLabel}
            isEditing={isEditing}
            onStartEdit={() => setIsEditing(true)}
            onCancelEdit={handleCancelEdit}
            onSave={handleSaveAll}
            saving={saving}
          />

          {saveNotice && (
            <div
              className={[
                "rounded-2xl border px-4 py-3 text-sm",
                saveNotice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="leading-5">{saveNotice.text}</div>
                <button
                  type="button"
                  onClick={() => setSaveNotice(null)}
                  className="rounded-full px-2 py-1 text-xs font-semibold hover:bg-white/60"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <ProfileSection title={tr("about", "About")} icon={User}>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{tr("role", "Role")}</p>
                    <Badge variant="outline">{meta.label}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {tr("member_since", "Member Since")}
                    </p>
                    <p>{memberSince}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{tr("status", "Status")}</p>
                    <Badge
                      variant="secondary"
                      className={
                        isVerified
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }
                    >
                      {verificationLabel}
                    </Badge>
                  </div>
                </div>
              </ProfileSection>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <ProfileSection
                title={tr("personal_information", "Personal Information")}
                icon={Globe}
                action={
                  <Select
                    value={form.lang || "en"}
                    onValueChange={handleLanguageChange}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="full_name">
                      {tr("full_name", "Full Name")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      disabled={!isEditing}
                      onChange={(e) => setField("full_name", e.target.value)}
                      placeholder={tr("enter_full_name", "Enter your full name")}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">
                      {tr("email_login", "Email (Login)")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="phone">
                      {tr("phone", "Phone")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      disabled={!isEditing}
                      onChange={(e) => setField("phone", e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  {showStudent ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="current_level">{tr("current_level", "Current Level")}</Label>
                      <Input
                        id="current_level"
                        value={form.current_level}
                        disabled={!isEditing}
                        onChange={(e) => setField("current_level", e.target.value)}
                        placeholder={tr("current_level_placeholder", "e.g. Masters")}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="date_of_birth">{tr("date_of_birth", "Date of Birth")}</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={form.date_of_birth}
                        disabled={!isEditing}
                        onChange={(e) => setField("date_of_birth", e.target.value)}
                      />
                    </div>
                  )}

                  {showStudent ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="age">{tr("age", "Age")}</Label>
                      <Input
                        id="age"
                        type="number"
                        min="0"
                        value={form.age}
                        disabled={!isEditing}
                        onChange={(e) => setField("age", e.target.value)}
                        placeholder={tr("age_placeholder", "Enter your age")}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="gender">{tr("gender", "Gender")}</Label>
                      <Select
                        value={form.gender}
                        onValueChange={(value) => isEditing && setField("gender", value)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder={tr("select_gender", "Select gender")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <Label htmlFor="country">
                      {tr("country", "Country")} <span className="text-red-500">*</span>
                    </Label>
                    <CountrySelect
                      disabled={!isEditing}
                      valueCode={form.country_code}
                      valueName={form.country}
                      onChange={({ code, name }) => {
                        setField("country", name || "");
                        setField("country_code", (code || "").toUpperCase());
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-6">
                  <Label htmlFor="bio">{tr("bio_label", "Biography / Description")}</Label>
                  <Textarea
                    id="bio"
                    value={form.bio}
                    disabled={!isEditing}
                    onChange={(e) => setField("bio", e.target.value)}
                    placeholder={tr(
                      "bio_placeholder",
                      "Write a short bio/description shown on your profile..."
                    )}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-sm text-gray-500">
                    {tr(
                      "bio_help_long",
                      "Tell others about yourself, your interests, and what makes you unique."
                    )}
                  </p>
                </div>
              </ProfileSection>

              {showStudent && (
                <ProfileSection title={tr("interests", "Interests")} icon={BookOpen}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SimpleArrayInput
                      id="selected_courses"
                      label={tr("courses", "Courses")}
                      value={form.selected_courses}
                      disabled={!isEditing}
                      onChange={(v) => setField("selected_courses", v)}
                      placeholder={tr(
                        "courses_placeholder",
                        "Example: Language Programs, Business, Engineering"
                      )}
                      helpText={tr("comma_help", "Separate multiple values with commas.")}
                    />

                    <SimpleArrayInput
                      id="preferred_countries"
                      label={tr("countries", "Countries")}
                      value={form.preferred_countries}
                      disabled={!isEditing}
                      onChange={(v) => setField("preferred_countries", v)}
                      placeholder={tr(
                        "countries_placeholder",
                        "Example: South Korea, Canada, Australia"
                      )}
                      helpText={tr("comma_help", "Separate multiple values with commas.")}
                    />

                    <SimpleArrayInput
                      id="study_areas"
                      label={tr("areas", "Areas")}
                      value={form.study_areas}
                      disabled={!isEditing}
                      onChange={(v) => setField("study_areas", v)}
                      placeholder={tr(
                        "areas_placeholder",
                        "Example: Business and Management, Film Media and Communication"
                      )}
                      helpText={tr("comma_help", "Separate multiple values with commas.")}
                    />

                    <SimpleArrayInput
                      id="spoken_languages"
                      label={tr("languages", "Languages")}
                      value={form.spoken_languages}
                      disabled={!isEditing}
                      onChange={(v) => setField("spoken_languages", v)}
                      placeholder={tr("languages_placeholder", "Example: English, French, Korean")}
                      helpText={tr("comma_help", "Separate multiple values with commas.")}
                    />
                  </div>
                </ProfileSection>
              )}

              <ProfileSection title={tr("validation.title", "Validation")} icon={Briefcase}>
                <div className="space-y-4">
                  {(verification.status === "rejected" || verification.status === "denied") &&
                  verification.reason ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <div className="font-semibold">
                        {tr("verification.denied_title", "Verification denied")}
                      </div>
                      <div className="mt-1">{verification.reason}</div>
                    </div>
                  ) : null}

                  {verificationFields.length === 0 ? (
                    <div className="text-sm text-gray-600">
                      {tr(
                        "verification.none_required",
                        "No verification documents required for your role."
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {verificationFields.map((f) => {
                        const url = verification.docs?.[f.key] || "";
                        const uploading = !!docUploading?.[f.key];

                        return (
                          <div key={f.key} className="rounded-2xl border bg-white p-4 space-y-3">
                            <div className="font-medium text-gray-900">
                              {f.label} {f.required ? "*" : ""}
                            </div>

                            {url ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setViewerUrl(url);
                                  setViewerName(f.label);
                                  setViewerOpen(true);
                                }}
                              >
                                {tr("verification.view", "View uploaded document")}
                              </Button>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {tr("verification.no_file", "No file uploaded yet")}
                              </div>
                            )}

                            {isEditing && (
                              <div className="flex items-center gap-2">
                                {url ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => clearVerificationDoc(f.key)}
                                  >
                                    {tr("verification.remove", "Remove")}
                                  </Button>
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {verificationFields.length && isEditing ? (
                    <div className="flex justify-end">
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
                </div>
              </ProfileSection>

              {showAgent && (
                <ProfileSection title={tr("agent_details", "Agent Details")} icon={Briefcase}>
                  <div className="space-y-4">
                    <div>
                      <Label>{tr("company_name", "Company Name *")}</Label>
                      <Input
                        value={form.company_name}
                        disabled={!isEditing}
                        onChange={(e) => setField("company_name", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>{tr("business_license_mst", "Business License (MST) *")}</Label>
                      <Input
                        value={form.business_license_mst}
                        disabled={!isEditing}
                        onChange={(e) => setField("business_license_mst", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>{tr("year_established", "Year Established")}</Label>
                      <Input
                        type="number"
                        value={form.year_established}
                        disabled={!isEditing}
                        onChange={(e) => setField("year_established", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>{tr("paypal_email", "PayPal Email *")}</Label>
                      <Input
                        type="email"
                        value={form.paypal_email}
                        disabled={!isEditing}
                        onChange={(e) => setField("paypal_email", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </ProfileSection>
              )}

              {showTutor && (
                <ProfileSection title={tr("tutor_details", "Tutor Details")} icon={BookOpen}>
                  <div className="space-y-4">
                    <div>
                      <Label>{tr("specializations", "Specializations *")}</Label>
                      <Input
                        value={form.specializations}
                        disabled={!isEditing}
                        onChange={(e) => setField("specializations", e.target.value)}
                        className="mt-1"
                        placeholder={tr("specializations_placeholder", "IELTS, TOEFL...")}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>{tr("experience_years", "Years of Experience *")}</Label>
                        <Input
                          type="number"
                          value={form.experience_years}
                          disabled={!isEditing}
                          onChange={(e) => setField("experience_years", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>{tr("hourly_rate_usd", "Hourly Rate (USD) *")}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.hourly_rate}
                          disabled={!isEditing}
                          onChange={(e) => setField("hourly_rate", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>{tr("paypal_email", "PayPal Email *")}</Label>
                      <Input
                        type="email"
                        value={form.paypal_email}
                        disabled={!isEditing}
                        onChange={(e) => setField("paypal_email", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </ProfileSection>
              )}

              {showVendor && (
                <ProfileSection title={tr("vendor_details", "Vendor Details")} icon={Store}>
                  <div className="space-y-4">
                    <div>
                      <Label>{tr("business_name", "Business Name *")}</Label>
                      <Input
                        value={form.business_name}
                        disabled={!isEditing}
                        onChange={(e) => setField("business_name", e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>{tr("service_categories", "Service Categories *")}</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {vendorCategoryOptions.map(({ value, label }) => (
                          <div key={value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`cat-${value}`}
                              checked={form.service_categories?.includes(value) || false}
                              disabled={!isEditing}
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
                      <Label>{tr("paypal_email", "PayPal Email *")}</Label>
                      <Input
                        type="email"
                        value={form.paypal_email}
                        disabled={!isEditing}
                        onChange={(e) => setField("paypal_email", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </ProfileSection>
              )}

              {showSchool && (
                <ProfileSection title={tr("school_details", "School Details")} icon={Building}>
                  <div className="space-y-4">
                    <div>
                      <Label>{tr("institution_name", "Institution Name *")}</Label>
                      <Input
                        value={form.school_name}
                        disabled={!isEditing}
                        onChange={(e) => setField("school_name", e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>{tr("school_type", "School Type *")}</Label>
                      <Select
                        value={form.type || ""}
                        onValueChange={(v) => isEditing && setField("type", v)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue
                            placeholder={tr("select_institution_type", "Select institution type")}
                          />
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
                      <Label>{tr("city_location", "City/Location *")}</Label>
                      <Input
                        value={form.location}
                        disabled={!isEditing}
                        onChange={(e) => setField("location", e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>{tr("official_website", "Official Website *")}</Label>
                      <Input
                        value={form.website}
                        disabled={!isEditing}
                        onChange={(e) => setField("website", e.target.value)}
                        className="mt-1"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <Label>{tr("about_institution", "About Your Institution")}</Label>
                      <Textarea
                        value={form.about}
                        disabled={!isEditing}
                        onChange={(e) => setField("about", e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                </ProfileSection>
              )}
            </div>
          </div>
        </div>
      </div>

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