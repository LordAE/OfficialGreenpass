// src/pages/Directory.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { School } from "@/api/entities";
import { Institution } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Star,
  Globe,
  Loader2,
  Award,
  Users,
  Mail,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Chrome,
  Apple,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams, useNavigate } from "react-router-dom";
import ProvinceSelector from "../components/ProvinceSelector";
import CountrySelector from "@/components/CountrySelector";
import { getProvinceLabel } from "../components/utils/CanadianProvinces";
import _ from "lodash";

// 🔥 Firebase
import { db, auth } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  signOut,
  deleteUser,
} from "firebase/auth";

// shadcn dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PAGE_SIZE = 15;

/* -----------------------------
   Subscription helper (matches YOUR DB fields)
   ----------------------------- */
function hasActiveSubscription(userDoc) {
  const d = userDoc || {};
  if (typeof d.subscription_active === "boolean")
    return d.subscription_active === true;
  const status = String(d.subscription_status || "").toLowerCase().trim();
  return status === "active";
}

/* -----------------------------
   Country flag helpers (use IMAGE flags for reliability)
   ----------------------------- */
const isIso2 = (code) => /^[A-Z]{2}$/.test((code || "").trim().toUpperCase());

const codeToFlagEmoji = (code) => {
  const cc = (code || "").trim().toUpperCase();
  if (!isIso2(cc)) return "";
  return String.fromCodePoint(
    ...[...cc].map((c) => 127397 + c.charCodeAt(0))
  );
};

const flagPngUrl = (code) => {
  const cc = (code || "").trim().toUpperCase();
  if (!isIso2(cc)) return "";
  return `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
};

function CountryFlag({ code, className = "" }) {
  const cc = (code || "").trim().toUpperCase();
  const [imgOk, setImgOk] = useState(true);

  const url = useMemo(() => flagPngUrl(cc), [cc]);
  const emoji = useMemo(() => codeToFlagEmoji(cc), [cc]);

  if (!isIso2(cc)) return null;

  if (!url || !imgOk) {
    return emoji ? (
      <span
        className={["text-base leading-none", className].join(" ")}
        title={cc}
      >
        {emoji}
      </span>
    ) : null;
  }

  return (
    <img
      src={url}
      alt={`${cc} flag`}
      className={["h-4 w-6 rounded-sm border object-cover", className].join(
        " "
      )}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setImgOk(false)}
    />
  );
}

/* -----------------------------
   Helpers: name normalization
   ----------------------------- */
const normalize = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(
      /\b(the|of|and|for|at|in|de|la|le|du|des|université|universite)\b/g,
      ""
    )
    .replace(
      /\b(university|college|institute|polytechnic|school|academy|centre|center)\b/g,
      ""
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();

/* -----------------------------
   Tabs
   ----------------------------- */
const BROWSE_TABS = [
  { key: "school", label: "School" },
  { key: "agent", label: "Agent" },
  { key: "tutor", label: "Tutor" },
  { key: "user", label: "User" },
];

/* -----------------------------
   Left list row (schools/institutions)
   ----------------------------- */
const SchoolListRow = ({ item, isSelected, onSelect }) => {
  const name = item.name || item.school_name || item.institution_name || "Unknown";
  const logo =
    item.logoUrl ||
    item.school_image_url ||
    item.institution_logo_url ||
    "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=600&fit=crop&q=80";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-left rounded-lg border p-3 transition",
        "focus:outline-none focus:ring-2 focus:ring-green-400",
        isSelected
          ? "border-green-400 bg-green-50"
          : "border-gray-200 bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      <div className="flex gap-3">
        <img src={logo} alt={name} className="h-12 w-12 rounded-md object-cover border" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-gray-900 truncate">{name}</h4>
            <Badge variant="secondary" className="shrink-0">
              {item.isInstitution ? "Institution" : item.institution_type || "School"}
            </Badge>
          </div>

          <div className="mt-1 flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">
              {(item.city || item.school_city || "City")},{" "}
              {getProvinceLabel(item.province || item.school_province) || "Province"},{" "}
              {item.country || item.school_country || "Country"}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-700">
            <span className="font-medium text-blue-600">{item.programCount || 0}+</span> programs
          </div>
        </div>
      </div>
    </button>
  );
};

/* -----------------------------
   Carousel helpers
   ----------------------------- */
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const uniqStrings = (arr) => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const s = typeof x === "string" ? x.trim() : "";
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
};

const getSchoolImageList = (item) => {
  const fallback =
    "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=600&fit=crop&q=80";
  if (!item) return [fallback];

  const candidates = [
    item.bannerUrl,
    item.banner,
    item.cover_photo,
    item.coverPhoto,
    item.school_image_url,
    item.institution_logo_url,
    item.logoUrl,

    ...asArray(item.images),
    ...asArray(item.imageUrls),
    ...asArray(item.photos),
    ...asArray(item.gallery),
    ...asArray(item.gallery_images),
    ...asArray(item.school_images),
    ...asArray(item.campus_images),
  ];

  const list = uniqStrings(candidates);
  return list.length ? list : [fallback];
};

/* -----------------------------
   Right details panel (schools/institutions)
   ----------------------------- */
const SchoolDetailsPanel = ({ item, onContactClick, programs = [], onProgramClick }) => {
  const [showPrograms, setShowPrograms] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const images = useMemo(() => getSchoolImageList(item), [item]);
  const hasMany = images.length > 1;

  useEffect(() => {
    setShowPrograms(false);
    setImgIndex(0);
  }, [item?.id, item?.school_key, item?.school_id, item?.institution_id]);

  const goPrev = useCallback(() => {
    setImgIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setImgIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  if (!item) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 text-gray-600">
          Select a school from the list to see details.
        </CardContent>
      </Card>
    );
  }

  const name = item.name || item.school_name || item.institution_name || "Unknown";

  const city = item.city || item.school_city || "—";
  const province = getProvinceLabel(item.province || item.school_province) || "—";
  const country = item.country || item.school_country || "—";

  const list = Array.isArray(programs) ? programs : [];
  const hasPrograms = list.length > 0;

  const getProgramTitle = (p) =>
    p?.program_title || p?.programTitle || p?.title || p?.name || "Untitled program";

  const getProgramMeta = (p) => {
    const level = p?.program_level || p?.level || p?.programLevel;
    const duration = p?.duration || p?.program_duration;
    const intake = p?.next_intake || p?.intake || p?.nextIntake;
    const parts = [level, duration, intake].filter(Boolean);
    return parts.join(" • ");
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
        <div className="relative h-56 bg-gradient-to-br from-blue-100 to-green-100">
          <img
            src={images[imgIndex]}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          <div className="absolute top-4 left-4 flex gap-2">
            {item.isDLI && (
              <Badge className="bg-green-600 text-white">
                <Award className="w-3 h-3 mr-1" />
                DLI
              </Badge>
            )}
            {item.isFeatured && (
              <Badge className="bg-yellow-500 text-white">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>

          {hasMany ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImgIndex(idx)}
                    className={[
                      "h-2 w-2 rounded-full transition",
                      idx === imgIndex ? "bg-white" : "bg-white/50 hover:bg-white/80",
                    ].join(" ")}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge variant="secondary" className="mb-2">
                {item.isInstitution ? "Institution" : item.institution_type || "School"}
              </Badge>

              <h2 className="text-2xl font-bold text-gray-900">{name}</h2>

              <div className="mt-2 flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">
                  {city}, {province}, {country}
                </span>
              </div>

              <div className="mt-4">
                <Button className="w-full h-11 text-base" onClick={() => onContactClick?.(item)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Us
                </Button>

                <button
                  type="button"
                  className="mt-3 text-sm text-blue-600 underline hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setShowPrograms((v) => !v)}
                  disabled={!hasPrograms}
                  title={!hasPrograms ? "No programs available for this school yet." : undefined}
                >
                  {showPrograms ? "Hide programs -" : "View programs +"}
                </button>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm text-gray-500">Programs</p>
              <p className="text-2xl font-bold text-blue-600">{item.programCount || 0}+</p>
            </div>
          </div>

          {showPrograms && (
            <div className="mt-5 border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 font-semibold text-gray-900 flex items-center justify-between">
                <span>Programs</span>
                <Badge variant="secondary">{list.length}</Badge>
              </div>

              <div className="max-h-72 overflow-auto divide-y">
                {list.map((p, idx) => {
                  const title = getProgramTitle(p);
                  const meta = getProgramMeta(p);
                  return (
                    <button
                      key={p?.id || p?.program_id || `${title}-${idx}`}
                      type="button"
                      onClick={() => onProgramClick?.(p, item)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <div className="text-sm font-medium text-gray-900">{title}</div>
                      {meta ? <div className="text-xs text-gray-500 mt-1">{meta}</div> : null}
                      <div className="text-xs text-blue-600 underline mt-2">Open</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {item.about && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Overview</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{item.about}</p>
            </div>
          )}

          {item.website && (
            <div className="mt-6">
              <a href={item.website} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" className="w-full h-11 text-base">
                  <Globe className="w-4 h-4 mr-2" />
                  Visit Website
                </Button>
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* -----------------------------
   User directory UI (FLAG IMAGE)
   ----------------------------- */
const UserListRow = ({ user, isSelected, onSelect }) => {
  const name = user.full_name || user.name || "Unnamed";
  const country = user.country || "—";
  const countryCode = (user.country_code || user.countryCode || "").trim().toUpperCase();

  const photo =
    user.profile_picture ||
    user.photoURL ||
    "https://ui-avatars.com/api/?background=E5E7EB&color=111827&name=" +
      encodeURIComponent(name);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-left rounded-lg border p-3 transition",
        "focus:outline-none focus:ring-2 focus:ring-green-400",
        isSelected
          ? "border-green-400 bg-green-50"
          : "border-gray-200 bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      <div className="flex gap-3 items-center">
        <img src={photo} alt={name} className="h-12 w-12 rounded-full object-cover border" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-gray-900 truncate">{name}</h4>
            <Badge variant="secondary" className="shrink-0 capitalize">
              {user.user_type || user.userType || user.role || user.selected_role || "user"}
            </Badge>
          </div>

          <div className="mt-1 flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate flex items-center gap-2">
              <CountryFlag code={countryCode} />
              <span className="truncate">{country}</span>
              {countryCode ? <span className="text-xs text-gray-400">({countryCode})</span> : null}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

/* -----------------------------
   ✅ UserDetailsPanel
   ----------------------------- */
const UserDetailsPanel = ({ user, onMessageClick }) => {
  if (!user) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 text-gray-600">Select a user from the list to see details.</CardContent>
      </Card>
    );
  }

  const name = user.full_name || user.name || "Unnamed";
  const role = user.user_type || user.userType || user.role || user.selected_role || "user";

  const country = user.country || "—";
  const countryCode = (user.country_code || user.countryCode || "").trim().toUpperCase();

  const photo =
    user.profile_picture ||
    user.photoURL ||
    "https://ui-avatars.com/api/?background=E5E7EB&color=111827&name=" +
      encodeURIComponent(name);

  const banner =
    user.cover_photo ||
    user.coverPhoto ||
    user.banner ||
    "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=1600&h=600&fit=crop&q=80";

  const bio =
    user.biography ||
    user.bio ||
    user.description ||
    user.about ||
    user.summary ||
    user.profile_description ||
    "";

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="relative shrink-0 h-44 bg-gradient-to-br from-gray-900 to-gray-700">
        <img src={banner} alt="" className="w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-black/35" />

        <div className="absolute left-1/2 -translate-x-1/2 -bottom-10">
          <div className="relative h-24 w-24 rounded-full bg-white p-1 shadow-lg">
            <img src={photo} alt={name} className="h-full w-full rounded-full object-cover border" />

            {countryCode ? (
              <div className="absolute -bottom-1 -right-1">
                <div className="h-7 w-7 rounded-full bg-white shadow border flex items-center justify-center">
                  <CountryFlag code={countryCode} className="h-4 w-6" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CardContent className="flex-1 overflow-auto pt-14 pb-6">
        <div className="flex flex-col items-center text-center">
          <div className="text-sm text-gray-600">
            {country}
            {countryCode ? <span className="text-xs text-gray-400"> ({countryCode})</span> : null}
          </div>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">{name}</h2>

          <Badge variant="secondary" className="mt-2 capitalize">
            {String(role).toLowerCase() === "user" || String(role).toLowerCase() === "student"
              ? "Student / User"
              : role}
          </Badge>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-2">Biography</h3>
          {bio ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{bio}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">No biography provided yet.</p>
          )}
        </div>

        {/* ✅ Message Us bottom-right */}
        <div className="mt-6 flex justify-end">
          <Button className="h-11" onClick={() => onMessageClick?.(user)}>
            <Mail className="w-4 h-4 mr-2" />
            Message Us
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Directory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [browseTab, setBrowseTab] = useState("school");

  // Schools data
  const [allSchools, setAllSchools] = useState([]);
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  // User directory data
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Common filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");

  // School filters
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState(null);

  // ✅ Auth state
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Current user's Firestore doc (gating uses THIS)
  const [currentUserDoc, setCurrentUserDoc] = useState(null);

  // ✅ current user's role (used to hide same-role tab)
  const [currentUserRole, setCurrentUserRole] = useState("");

  // ✅ In-page Auth modal
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [forceStudentSignup, setForceStudentSignup] = useState(false);
  const [authStep, setAuthStep] = useState("choice"); // "choice" | "login" | "role" | "signup_method" | "signup_email" | "oauth_finish"

  // ✅ Pending post-auth action
  const [pendingAction, setPendingAction] = useState(null);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPw, setLoginShowPw] = useState(false);

  // ✅ Signup role selected FIRST (NO school)
  const [signupRole, setSignupRole] = useState("user"); // user | agent | tutor

  // Email signup fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPassword2, setSignupPassword2] = useState("");
  const [signupShowPw, setSignupShowPw] = useState(false);

  // ✅ OAuth temporary state (Google/Apple)
  const [oauthUser, setOauthUser] = useState(null); // { uid, email, full_name }
  const [oauthName, setOauthName] = useState("");

  // role normalization helpers (IMPORTANT: student -> user)
  const normalizeRole = useCallback((r) => {
    const v = String(r || "").toLowerCase().trim();
    if (v === "student") return "user";
    if (v === "users") return "user";
    if (v === "tutors") return "tutor";
    if (v === "agents") return "agent";
    if (["user", "agent", "tutor", "school", "admin", "vendor", "support"].includes(v))
      return v;
    return "";
  }, []);

  const detectRoleFromUserDoc = useCallback(
    (data) =>
      normalizeRole(
        data?.role || data?.selected_role || data?.user_type || data?.userType || ""
      ),
    [normalizeRole]
  );

  // ✅ auth + user doc fetch
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u || null);

      if (!u?.uid) {
        setCurrentUserDoc(null);
        setCurrentUserRole("");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? snap.data() : {};
        const full = { id: u.uid, uid: u.uid, ...(data || {}) };
        setCurrentUserDoc(full);
        setCurrentUserRole(detectRoleFromUserDoc(full) || "");
      } catch (e) {
        console.error("Failed to load user doc:", e);
        setCurrentUserDoc(null);
        setCurrentUserRole("");
      }
    });

    return () => unsub();
  }, [detectRoleFromUserDoc]);

  // ✅ tabs visible: if logged in, hide the same role tab
  const visibleTabs = useMemo(() => {
    const role = normalizeRole(currentUserRole);
    return BROWSE_TABS.filter((t) => t.key === "school" || !role || t.key !== role);
  }, [currentUserRole, normalizeRole]);

  // ✅ if user is currently on a hidden tab, move them to school
  useEffect(() => {
    const role = normalizeRole(currentUserRole);
    if (!role) return;
    if (browseTab === role) {
      setBrowseTab("school");
      setSelectedCountry("all");
      setSearchTerm("");
    }
  }, [browseTab, currentUserRole, normalizeRole]);

  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authDialogOpen) return;
    if (forceStudentSignup && authStep === "role") {
      setSignupRole("user");
      setAuthStep("signup_method");
    }
  }, [authDialogOpen, forceStudentSignup, authStep]);

  const updatePage = useCallback(
    (nextPage) => {
      setPage(nextPage);
      const next = new URLSearchParams(searchParams);
      if (nextPage > 1) next.set("page", String(nextPage));
      else next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  /* -----------------------------
     Load schools + institutions
   ----------------------------- */
  const loadSchoolData = useCallback(async () => {
    setLoadingSchools(true);
    try {
      const [schoolsData, institutionsData] = await Promise.all([
        School.list("-created_date", 2000),
        Institution.list("-created_date", 1000),
      ]);
      setAllSchools(schoolsData || []);
      setAllInstitutions(institutionsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      setAllSchools([]);
      setAllInstitutions([]);
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  useEffect(() => {
    loadSchoolData();
  }, [loadSchoolData]);

  /* -----------------------------
     Load users for directory
   ----------------------------- */
  const fetchUsersForRole = useCallback(async (role) => {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, "users");

      const qs = [
        query(usersRef, where("user_type", "==", role)),
        query(usersRef, where("userType", "==", role)),
        query(usersRef, where("role", "==", role)),
        query(usersRef, where("selected_role", "==", role)),
      ];

      const snaps = await Promise.all(qs.map((q1) => getDocs(q1)));
      const byId = new Map();

      snaps.forEach((snap) => {
        snap.forEach((docSnap) => {
          const d = docSnap.data() || {};
          byId.set(docSnap.id, { id: docSnap.id, ...d });
        });
      });

      setAllUsers(Array.from(byId.values()));
    } catch (e) {
      console.error("Error loading users:", e);
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (browseTab === "school") return;
    fetchUsersForRole(browseTab);
  }, [browseTab, fetchUsersForRole]);

  /* -----------------------------
     Programs grouped by school key
   ----------------------------- */
  const programsBySchoolKey = useMemo(() => {
    return _.groupBy(allSchools || [], (s) => s.school_name || s.institution_name || "Unknown School");
  }, [allSchools]);

  /* -----------------------------
     Merge schools + institutions
   ----------------------------- */
  const institutionsByName = useMemo(() => {
    return Object.fromEntries((allInstitutions || []).map((inst) => [normalize(inst.name), inst]));
  }, [allInstitutions]);

  const mergedSchools = useMemo(() => {
    const schoolGroups = _.groupBy(allSchools, (s) => s.school_name || s.institution_name || "Unknown School");

    const schoolCards = Object.entries(schoolGroups).map(([schoolKey, schoolPrograms]) => {
      const representative = schoolPrograms[0];
      const matchKey = normalize(representative.institution_name || representative.school_name || representative.name);
      const matchedInst = institutionsByName[matchKey];

      return {
        ...representative,
        programCount: schoolPrograms.length,
        school_key: schoolKey,
        isInstitution: false,

        logoUrl:
          matchedInst?.logoUrl ||
          representative.logoUrl ||
          representative.school_image_url ||
          representative.institution_logo_url ||
          null,
        website: matchedInst?.website || representative.website || null,
        about: matchedInst?.about || representative.about || null,
        institution_type: matchedInst?.type || representative.institution_type || null,

        city: representative.city || representative.school_city || matchedInst?.city || null,
        province: representative.province || representative.school_province || matchedInst?.province || null,
        country: representative.country || representative.school_country || matchedInst?.country || null,
      };
    });

    const schoolInstitutionNames = new Set(
      allSchools.map((s) => (s.institution_name || s.school_name || "").trim()).filter(Boolean)
    );

    const institutionCards = (allInstitutions || [])
      .filter((inst) => !schoolInstitutionNames.has(inst.name))
      .map((inst) => ({
        ...inst,
        logoUrl: inst.logoUrl || null,
        website: inst.website || null,
        institution_type: inst.type || null,
        school_key: inst.name,
        isInstitution: true,
      }));

    return [...schoolCards, ...institutionCards];
  }, [allSchools, allInstitutions, institutionsByName]);

  const schoolCountryOptions = useMemo(() => {
    const fromData = mergedSchools.map((s) => s.country || s.school_country).filter(Boolean);
    const priority = ["Australia", "Germany", "Ireland", "United Kingdom", "United States", "New Zealand", "Canada"];
    return Array.from(new Set([...fromData, ...priority]));
  }, [mergedSchools]);

  const userCountryOptions = useMemo(() => {
    const fromData = (allUsers || []).map((u) => u.country).filter(Boolean);
    return Array.from(new Set(fromData));
  }, [allUsers]);

  const handleSearchChange = useCallback((e) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
  }, []);

  const handleCountryChange = useCallback((value) => {
    setSelectedCountry(value);
    setSelectedProvince("all");
    setSelectedCity("all");
  }, []);

  const handleProvinceChange = useCallback(
    (value) => {
      setSelectedProvince(value);
      if (value !== selectedProvince) setSelectedCity("all");
    },
    [selectedProvince]
  );

  useEffect(() => {
    updatePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    browseTab,
    searchTerm,
    selectedCountry,
    selectedProvince,
    selectedCity,
    selectedType,
    mergedSchools.length,
    allUsers.length,
  ]);

  /* -----------------------------
     Filter schools
   ----------------------------- */
  useEffect(() => {
    if (browseTab !== "school") return;

    let filtered = mergedSchools;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (school) =>
          (school.name || school.school_name || school.institution_name || "").toLowerCase().includes(q) ||
          (school.city || school.school_city || "").toLowerCase().includes(q) ||
          (school.program_title || "").toLowerCase().includes(q) ||
          (school.about || "").toLowerCase().includes(q)
      );
    }

    if (selectedCountry !== "all") filtered = filtered.filter((s) => (s.country || s.school_country) === selectedCountry);
    if (selectedProvince !== "all") filtered = filtered.filter((s) => (s.province || s.school_province) === selectedProvince);
    if (selectedCity !== "all") filtered = filtered.filter((s) => (s.city || s.school_city) === selectedCity);

    if (selectedType !== "all") {
      if (selectedType === "institution") filtered = filtered.filter((s) => s.isInstitution);
      else if (selectedType === "program") filtered = filtered.filter((s) => !s.isInstitution);
      else filtered = filtered.filter((s) => (s.institution_type || "").toLowerCase() === selectedType.toLowerCase());
    }

    setFilteredSchools(filtered);
  }, [browseTab, mergedSchools, searchTerm, selectedCountry, selectedProvince, selectedCity, selectedType]);

  /* -----------------------------
     Filter users (directory)
   ----------------------------- */
  useEffect(() => {
    if (browseTab === "school") return;

    let filtered = allUsers;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((u) => {
        const name = (u.full_name || u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const phone = (u.phone || "").toLowerCase();
        const country = (u.country || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || country.includes(q);
      });
    }

    if (selectedCountry !== "all") {
      filtered = filtered.filter((u) => (u.country || "") === selectedCountry);
    }

    setFilteredUsers(filtered);
  }, [browseTab, allUsers, searchTerm, selectedCountry]);

  const isSchoolTab = browseTab === "school";
  const loading = isSchoolTab ? loadingSchools : loadingUsers;

  const totalCount = isSchoolTab ? filteredSchools.length : filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) updatePage(totalPages);
    if (page < 1) updatePage(1);
  }, [page, totalPages, updatePage]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalCount);

  const pagedItems = useMemo(() => {
    const src = isSchoolTab ? filteredSchools : filteredUsers;
    return src.slice(startIndex, endIndex);
  }, [isSchoolTab, filteredSchools, filteredUsers, startIndex, endIndex]);

  useEffect(() => {
    if (!pagedItems.length) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey) {
      setSelectedKey(pagedItems[0].school_key || pagedItems[0].id);
      return;
    }
    const stillOnPage = pagedItems.some((s) => (s.school_key || s.id) === selectedKey);
    if (!stillOnPage) setSelectedKey(pagedItems[0].school_key || pagedItems[0].id);
  }, [pagedItems, selectedKey]);

  const selectedItem = useMemo(() => {
    if (!selectedKey) return null;
    const src = isSchoolTab ? filteredSchools || [] : filteredUsers || [];
    return src.find((s) => (s.school_key || s.id) === selectedKey) || null;
  }, [isSchoolTab, filteredSchools, filteredUsers, selectedKey]);

  const selectedPrograms = useMemo(() => {
    if (!isSchoolTab || !selectedItem) return [];
    const k = selectedItem.school_key || selectedItem.name || selectedItem.school_name || selectedItem.institution_name;
    return programsBySchoolKey[k] || [];
  }, [isSchoolTab, selectedItem, programsBySchoolKey]);

  const getPageNumbers = (current, total) => {
    const pages = [];
    const add = (x) => pages.push(x);
    const windowSize = 1;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) add(i);
      return pages;
    }

    add(1);
    if (current - windowSize > 2) add("…");
    for (let i = Math.max(2, current - windowSize); i <= Math.min(total - 1, current + windowSize); i++) add(i);
    if (current + windowSize < total - 1) add("…");
    add(total);
    return pages;
  };

  const pageNumbers = getPageNumbers(page, totalPages);

  const clearAllFilters = useCallback((e) => {
    e.preventDefault();
    setSearchTerm("");
    setSelectedCountry("all");
    setSelectedProvince("all");
    setSelectedCity("all");
    setSelectedType("all");
  }, []);

  // ✅ Helper to get my effective role from Firestore doc
  const myRole = useMemo(() => {
    return normalizeRole(
      currentUserDoc?.role ||
        currentUserDoc?.selected_role ||
        currentUserDoc?.user_type ||
        currentUserDoc?.userType ||
        ""
    );
  }, [currentUserDoc, normalizeRole]);

  /* -----------------------------
     ✅ Messaging navigation helpers
   ----------------------------- */
  const navToMessages = useCallback(
    ({ studentId, targetId, targetRole }) => {
      const qs = new URLSearchParams();
      if (targetId) qs.set("to", String(targetId));
      if (targetRole) qs.set("role", String(targetRole));
      const url = `/messages?${qs.toString()}`;

      navigate(url, {
        state: {
          studentId,
          targetId,
          targetRole,
          source: "directory",
        },
      });
    },
    [navigate]
  );

  const onContactSchool = useCallback(
    (schoolItem) => {
      const uid = currentUser?.uid;

      // If not logged in: handled by openAuthDialog from caller
      if (!uid) return;

      const norm = myRole;
      const supportTarget = { targetId: "support", targetRole: "support" };

      // ✅ user/student never messages school: route to assigned agent or support
      if (norm === "user") {
        const assignedAgent = String(
          currentUserDoc?.assigned_agent_id ||
            currentUserDoc?.assignedAgentId ||
            currentUserDoc?.assigned_agent ||
            ""
        ).trim();

        if (assignedAgent) {
          navToMessages({ studentId: uid, targetId: assignedAgent, targetRole: "agent" });
          return;
        }

        navToMessages({ studentId: uid, ...supportTarget });
        return;
      }

      // All other roles: route to GP Team
      navToMessages({ studentId: uid, ...supportTarget });
    },
    [currentUser?.uid, currentUserDoc, myRole, navToMessages]
  );

  const onMessageProfile = useCallback(
    (profileUser, roleKey) => {
      const uid = currentUser?.uid;
      if (!uid) return;

      const targetId = String(profileUser?.id || "").trim();
      const rRaw = String(
        roleKey ||
          profileUser?.user_type ||
          profileUser?.userType ||
          profileUser?.role ||
          "support"
      );
      const targetRole = normalizeRole(rRaw);

      // ✅ FIX: ONLY user/student cannot message schools
      const meRole = myRole || normalizeRole(currentUserDoc?.role || currentUserDoc?.user_type || "");
      if ((meRole === "user" || meRole === "student") && targetRole === "school") {
        navToMessages({ studentId: uid, targetId: "support", targetRole: "support" });
        return;
      }

      // ✅ Support route
      if (targetRole === "support") {
        navToMessages({ studentId: uid, targetId: "support", targetRole: "support" });
        return;
      }

      if (!targetId) return;
      navToMessages({ studentId: uid, targetId, targetRole });
    },
    [currentUser?.uid, currentUserDoc, myRole, navToMessages, normalizeRole]
  );

  /* -----------------------------
     Auth modal helpers
   ----------------------------- */
  const resetAuthForm = useCallback(() => {
    setAuthError("");
    setAuthLoading(false);

    setLoginEmail("");
    setLoginPassword("");
    setLoginShowPw(false);

    setSignupRole("user");

    setSignupName("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupPassword2("");
    setSignupShowPw(false);

    setOauthUser(null);
    setOauthName("");
  }, []);

  const openAuthDialog = useCallback(
    (action, options = {}) => {
      const forceStudent = !!options.forceStudent;

      setPendingAction(action || null);
      setAuthStep("choice");
      resetAuthForm();

      setForceStudentSignup(forceStudent);
      if (forceStudent) setSignupRole("user");

      setAuthDialogOpen(true);
    },
    [resetAuthForm]
  );

  const afterAuthSuccess = useCallback(
    (opts = {}) => {
      const onboardingRole = opts?.onboardingRole;

      setAuthDialogOpen(false);
      setAuthStep("choice");
      setAuthError("");
      setAuthLoading(false);

      // ✅ ALWAYS send NEW signups to onboarding
      if (onboardingRole) {
        navigate(`/onboarding?role=${encodeURIComponent(String(onboardingRole))}`, { replace: true });
        setPendingAction(null);
        return;
      }

      if (pendingAction?.type === "navigate" && pendingAction?.url) {
        navigate(pendingAction.url);
      } else if (pendingAction?.type === "contact" && pendingAction?.schoolItem) {
        onContactSchool(pendingAction.schoolItem);
      } else if (pendingAction?.type === "message_profile" && pendingAction?.profile) {
        onMessageProfile(pendingAction.profile, pendingAction.roleKey);
      }

      setPendingAction(null);
    },
    [navigate, onContactSchool, onMessageProfile, pendingAction]
  );

  /* -----------------------------
     ✅ Message click logic (directory)
   ----------------------------- */
  const onMessageClick = useCallback(
    (profileUser) => {
      if (!profileUser) return;

      // If NOT logged in: force student signup when messaging agent/tutor
      if (!currentUser || !currentUserDoc) {
        const forceStudent = browseTab === "tutor" || browseTab === "agent";
        openAuthDialog(
          { type: "message_profile", profile: profileUser, roleKey: browseTab },
          { forceStudent }
        );
        return;
      }

      const me = myRole || "";
      const targetRole = normalizeRole(
        browseTab ||
          profileUser?.role ||
          profileUser?.selected_role ||
          profileUser?.user_type ||
          profileUser?.userType ||
          ""
      );

      // 🚫 Hard policy: schools cannot message students/users
      if (me === "school" && targetRole === "user") {
        window.alert("Schools cannot message students. Schools can only contact Admin/Advisor (GP Team).");
        navToMessages({ studentId: currentUser.uid, targetId: "support", targetRole: "support" });
        return;
      }

      // 🔒 Subscription gate: agent/tutor must be subscribed to use messaging
      if ((me === "agent" || me === "tutor") && !hasActiveSubscription(currentUserDoc)) {
        navigate(`/checkout?plan=${encodeURIComponent(`${me}_yearly`)}`);
        return;
      }

      // ✅ FIX: ONLY user/student cannot message schools (covers any future school-profile message button)
      if ((me === "user" || me === "student") && targetRole === "school") {
        navToMessages({ studentId: currentUser.uid, targetId: "support", targetRole: "support" });
        return;
      }

      // ✅ Proceed
      onMessageProfile(profileUser, browseTab);
    },
    [
      browseTab,
      currentUser,
      currentUserDoc,
      myRole,
      navigate,
      navToMessages,
      normalizeRole,
      onMessageProfile,
      openAuthDialog,
    ]
  );

  const handleLogin = useCallback(async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const email = (loginEmail || "").trim();
      if (!email || !loginPassword) throw new Error("Please enter your email and password.");
      await signInWithEmailAndPassword(auth, email, loginPassword);
      afterAuthSuccess();
    } catch (e) {
      setAuthError(e?.message || "Login failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, [afterAuthSuccess, loginEmail, loginPassword]);

  const handleSignupEmail = useCallback(async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const email = (signupEmail || "").trim();
      const name = (signupName || "").trim();

      if (!signupRole) throw new Error("Please select a role.");
      if (!email) throw new Error("Please enter your email.");
      if (!signupPassword) throw new Error("Please enter a password.");
      if (signupPassword.length < 6) throw new Error("Password must be at least 6 characters.");
      if (signupPassword !== signupPassword2) throw new Error("Passwords do not match.");

      const cred = await createUserWithEmailAndPassword(auth, email, signupPassword);

      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }

      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          email,
          full_name: name || "",
          user_type: signupRole,
          userType: signupRole,
          role: signupRole,
          selected_role: signupRole,
          created_at: serverTimestamp(),
          createdAt: Date.now(),
        },
        { merge: true }
      );

      // ✅ email signup => onboarding
      afterAuthSuccess({ onboardingRole: signupRole });
    } catch (e) {
      setAuthError(e?.message || "Sign up failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, [afterAuthSuccess, signupEmail, signupName, signupPassword, signupPassword2, signupRole]);

  /* -----------------------------
     ✅ OAuth helpers
   ----------------------------- */
  const ensureBasicUserDoc = useCallback(async (fbUser) => {
    if (!fbUser?.uid) return;
    const ref = doc(db, "users", fbUser.uid);
    await setDoc(
      ref,
      {
        uid: fbUser.uid,
        email: fbUser.email || "",
        full_name: fbUser.displayName || "",
        updated_at: serverTimestamp(),
        createdAt: Date.now(),
      },
      { merge: true }
    );
  }, []);

  const isValidRole = (r) => ["user", "agent", "tutor"].includes(String(r || "").toLowerCase().trim());

  const handleOAuthSignIn = useCallback(
    async (providerKey, intent = "login") => {
      setAuthError("");
      setAuthLoading(true);

      try {
        let provider = null;

        if (providerKey === "google") {
          provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
        } else if (providerKey === "apple") {
          provider = new OAuthProvider("apple.com");
          provider.addScope("email");
          provider.addScope("name");
        } else {
          throw new Error("Unsupported provider.");
        }

        if (intent === "signup") {
          const role = String(signupRole || "").toLowerCase().trim();
          if (!isValidRole(role)) {
            setAuthError("Please select a valid role (Student, Agent, or Tutor).");
            setAuthStep("role");
            return;
          }
        }

        const res = await signInWithPopup(auth, provider);
        const fbUser = res?.user;
        if (!fbUser?.uid) throw new Error("Authentication failed. Please try again.");

        const info = getAdditionalUserInfo(res);
        const isNewUser = !!info?.isNewUser;

        const userRef = doc(db, "users", fbUser.uid);
        const snap = await getDoc(userRef);
        const existsInDb = snap.exists();
        const existing = existsInDb ? snap.data() || {} : null;
        const roleInDoc = detectRoleFromUserDoc(existing || {});

        if (intent === "login") {
          if (!existsInDb || isNewUser) {
            try {
              if (isNewUser) await deleteUser(fbUser);
            } catch {}
            try {
              await signOut(auth);
            } catch {}

            setAuthError("No account exists for this Google/Apple email. Please sign up first.");
            if (forceStudentSignup) {
              setSignupRole("user");
              setAuthStep("signup_method");
            } else {
              setAuthStep("role");
            }
            return;
          }

          afterAuthSuccess();
          return;
        }

        const role = String(signupRole || "").toLowerCase().trim();

        if (existsInDb && roleInDoc) {
          try {
            await signOut(auth);
          } catch {}
          setAuthError("This Google/Apple account already has an account. Please log in instead.");
          setAuthStep("login");
          return;
        }

        await ensureBasicUserDoc(fbUser);

        const fullName = (fbUser.displayName || existing?.full_name || "").trim();
        const email = (fbUser.email || existing?.email || "").trim();

        if (fullName) {
          await setDoc(
            doc(db, "users", fbUser.uid),
            {
              uid: fbUser.uid,
              email,
              full_name: fullName,
              user_type: role,
              userType: role,
              role,
              selected_role: role,
              updated_at: serverTimestamp(),
              created_at: serverTimestamp(),
              createdAt: Date.now(),
            },
            { merge: true }
          );

          afterAuthSuccess({ onboardingRole: role });
          return;
        }

        setOauthUser({
          uid: fbUser.uid,
          email,
          full_name: fullName,
        });
        setOauthName(fullName);
        setAuthStep("oauth_finish");
      } catch (e) {
        console.error(e);
        setAuthError(e?.message || "OAuth sign in failed. Please try again.");
      } finally {
        setAuthLoading(false);
      }
    },
    [
      afterAuthSuccess,
      detectRoleFromUserDoc,
      ensureBasicUserDoc,
      forceStudentSignup,
      signupRole,
    ]
  );

  const handleOAuthComplete = useCallback(async () => {
    setAuthError("");
    setAuthLoading(true);

    try {
      if (!oauthUser?.uid) throw new Error("Missing user session. Please try again.");

      const role = String(signupRole).toLowerCase().trim();
      if (!["user", "agent", "tutor"].includes(role)) {
        throw new Error("Invalid role. Please choose Student, Agent, or Tutor.");
      }

      const name = (oauthName || "").trim();
      if (!name) throw new Error("Please enter your full name to continue.");

      if (auth.currentUser?.uid === oauthUser.uid && name && !auth.currentUser.displayName) {
        try {
          await updateProfile(auth.currentUser, { displayName: name });
        } catch {}
      }

      await setDoc(
        doc(db, "users", oauthUser.uid),
        {
          uid: oauthUser.uid,
          email: oauthUser.email || auth.currentUser?.email || "",
          full_name: name || oauthUser.full_name || auth.currentUser?.displayName || "",
          user_type: role,
          userType: role,
          role: role,
          selected_role: role,
          updated_at: serverTimestamp(),
          created_at: serverTimestamp(),
          createdAt: Date.now(),
        },
        { merge: true }
      );

      afterAuthSuccess({ onboardingRole: role });
    } catch (e) {
      setAuthError(e?.message || "Could not finish setup. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, [afterAuthSuccess, oauthName, oauthUser, signupRole]);

  const onProgramClick = useCallback(
    (program, schoolItem) => {
      const programId = program?.id || program?.program_id || "";
      const url = programId
        ? `/programdetails?id=${encodeURIComponent(String(programId))}`
        : `/schooldetails?school=${encodeURIComponent(
            schoolItem?.school_key ||
              schoolItem?.name ||
              schoolItem?.school_name ||
              schoolItem?.institution_name ||
              ""
          )}`;

      if (currentUser) {
        navigate(url);
        return;
      }

      openAuthDialog({ type: "navigate", url });
    },
    [currentUser, navigate, openAuthDialog]
  );

  const onContactClick = useCallback(
    (schoolItem) => {
      if (currentUser && currentUserDoc) {
        onContactSchool(schoolItem);
        return;
      }
      // ✅ Not logged in: require login; treat as prospective student
      openAuthDialog({ type: "contact", schoolItem }, { forceStudent: true });
    },
    [currentUser, currentUserDoc, onContactSchool, openAuthDialog]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* ✅ In-page Login / Signup prompt */}
      <Dialog
        open={authDialogOpen}
        onOpenChange={(v) => {
          setAuthDialogOpen(v);
          if (!v) {
            setAuthStep("choice");
            setPendingAction(null);
            setForceStudentSignup(false);
            resetAuthForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              You need to log in to continue. You can use email/password, or sign in with Google / Apple.
            </DialogDescription>
          </DialogHeader>

          {authError ? (
            <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {authError}
            </div>
          ) : null}

          {/* CHOICE */}
          {authStep === "choice" ? (
            <div className="mt-4 space-y-3">
              <Button
                className="w-full h-11"
                onClick={() => handleOAuthSignIn("google", "login")}
                disabled={authLoading}
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Chrome className="w-4 h-4 mr-2" />
                )}
                Log in with Google
              </Button>

              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => handleOAuthSignIn("apple", "login")}
                disabled={authLoading}
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Apple className="w-4 h-4 mr-2" />
                )}
                Log in with Apple
              </Button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-gray-200 flex-1" />
                <div className="text-xs text-gray-500">or</div>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <Button className="w-full h-11" onClick={() => setAuthStep("login")} disabled={authLoading}>
                <LogIn className="w-4 h-4 mr-2" />
                Log in with email
              </Button>

              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => {
                  if (forceStudentSignup) {
                    setSignupRole("user");
                    setAuthStep("signup_method");
                  } else {
                    setAuthStep("role");
                  }
                }}
                disabled={authLoading}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create an account
              </Button>

              <Button variant="ghost" className="w-full" onClick={() => setAuthDialogOpen(false)} disabled={authLoading}>
                Cancel
              </Button>
            </div>
          ) : null}

          {/* LOGIN */}
          {authStep === "login" ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button className="h-11" onClick={() => handleOAuthSignIn("google", "login")} disabled={authLoading}>
                  {authLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Chrome className="w-4 h-4 mr-2" />}
                  Google
                </Button>
                <Button variant="outline" className="h-11" onClick={() => handleOAuthSignIn("apple", "login")} disabled={authLoading}>
                  {authLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Apple className="w-4 h-4 mr-2" />}
                  Apple
                </Button>
              </div>

              <div className="flex items-center gap-3 my-1">
                <div className="h-px bg-gray-200 flex-1" />
                <div className="text-xs text-gray-500">or email</div>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Email</label>
                <Input
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Password</label>
                <div className="relative">
                  <Input
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    type={loginShowPw ? "text" : "password"}
                    className="h-11 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                    onClick={() => setLoginShowPw((v) => !v)}
                    aria-label={loginShowPw ? "Hide password" : "Show password"}
                  >
                    {loginShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button className="w-full h-11" onClick={handleLogin} disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                Log in
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => setAuthStep("choice")} disabled={authLoading}>
                  Back
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setAuthDialogOpen(false)} disabled={authLoading}>
                  Cancel
                </Button>
              </div>

              <div className="text-sm text-gray-600 text-center">
                No account yet?{" "}
                <button
                  type="button"
                  className="text-blue-600 underline hover:text-blue-700"
                  onClick={() => setAuthStep("role")}
                  disabled={authLoading}
                >
                  Create one
                </button>
              </div>
            </div>
          ) : null}

          {/* ✅ ROLE SELECT (FIRST STEP FOR SIGNUP) */}
          {authStep === "role" ? (
            <div className="mt-4 space-y-3">
              <div className="text-sm font-medium text-gray-900">Select your role</div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button variant={signupRole === "user" ? "default" : "outline"} className="h-11" onClick={() => setSignupRole("user")} disabled={authLoading}>
                  Student
                </Button>
                <Button variant={signupRole === "agent" ? "default" : "outline"} className="h-11" onClick={() => setSignupRole("agent")} disabled={authLoading}>
                  Agent
                </Button>
                <Button variant={signupRole === "tutor" ? "default" : "outline"} className="h-11" onClick={() => setSignupRole("tutor")} disabled={authLoading}>
                  Tutor
                </Button>
              </div>

              <Button className="w-full h-11" onClick={() => setAuthStep("signup_method")} disabled={authLoading}>
                Continue
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => setAuthStep("choice")} disabled={authLoading}>
                  Back
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setAuthDialogOpen(false)} disabled={authLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {/* ✅ SIGNUP METHOD (SECOND STEP) */}
          {authStep === "signup_method" ? (
            <div className="mt-4 space-y-3">
              <div className="text-sm text-gray-600">
                Creating account as:{" "}
                <span className="font-semibold capitalize">
                  {signupRole === "user" ? "Student" : signupRole}
                </span>
              </div>

              <Button className="w-full h-11" onClick={() => handleOAuthSignIn("google", "signup")} disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Chrome className="w-4 h-4 mr-2" />}
                Sign up with Google
              </Button>

              <Button variant="outline" className="w-full h-11" onClick={() => handleOAuthSignIn("apple", "signup")} disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Apple className="w-4 h-4 mr-2" />}
                Sign up with Apple
              </Button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-gray-200 flex-1" />
                <div className="text-xs text-gray-500">or</div>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <Button className="w-full h-11" onClick={() => setAuthStep("signup_email")} disabled={authLoading}>
                <Mail className="w-4 h-4 mr-2" />
                Sign up with Email
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => setAuthStep("role")} disabled={authLoading}>
                  Back
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setAuthDialogOpen(false)} disabled={authLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {/* ✅ SIGNUP EMAIL FORM (THIRD STEP) */}
          {authStep === "signup_email" ? (
            <div className="mt-4 space-y-3">
              <div className="text-sm text-gray-600">
                Creating account as:{" "}
                <span className="font-semibold capitalize">
                  {signupRole === "user" ? "Student" : signupRole}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Full name</label>
                <Input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Your name" className="h-11" autoComplete="name" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Email</label>
                <Input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@example.com" type="email" className="h-11" autoComplete="email" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Password</label>
                <div className="relative">
                  <Input
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a password"
                    type={signupShowPw ? "text" : "password"}
                    className="h-11 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                    onClick={() => setSignupShowPw((v) => !v)}
                    aria-label={signupShowPw ? "Hide password" : "Show password"}
                  >
                    {signupShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Confirm password</label>
                <Input
                  value={signupPassword2}
                  onChange={(e) => setSignupPassword2(e.target.value)}
                  placeholder="Confirm your password"
                  type={signupShowPw ? "text" : "password"}
                  className="h-11"
                  autoComplete="new-password"
                />
              </div>

              <Button className="w-full h-11" onClick={handleSignupEmail} disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Create account
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => setAuthStep("signup_method")} disabled={authLoading}>
                  Back
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setAuthDialogOpen(false)} disabled={authLoading}>
                  Cancel
                </Button>
              </div>

              <div className="text-sm text-gray-600 text-center">
                Already have an account?{" "}
                <button type="button" className="text-blue-600 underline hover:text-blue-700" onClick={() => setAuthStep("login")} disabled={authLoading}>
                  Log in
                </button>
              </div>
            </div>
          ) : null}

          {/* ✅ OAUTH FINISH */}
          {authStep === "oauth_finish" ? (
            <div className="mt-4 space-y-3">
              <div className="text-sm text-gray-600">
                Creating account as:{" "}
                <span className="font-semibold capitalize">
                  {signupRole === "user" ? "Student" : signupRole}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Full name</label>
                <Input
                  value={oauthName}
                  onChange={(e) => setOauthName(e.target.value)}
                  placeholder="Your name"
                  className="h-11"
                  autoComplete="name"
                  disabled={authLoading}
                />
                <p className="text-xs text-gray-500">
                  Apple may not provide your name every time — you can type it here.
                </p>
              </div>

              <Button className="w-full h-11" onClick={handleOAuthComplete} disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Continue to onboarding
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => setAuthStep("signup_method")} disabled={authLoading}>
                  Back
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setAuthDialogOpen(false)} disabled={authLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
            {browseTab === "school"
              ? "Browse Schools & Institutions"
              : `Browse ${browseTab.charAt(0).toUpperCase() + browseTab.slice(1)} Directory`}
          </h1>

          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {browseTab === "school"
              ? "Explore schools and institutions, then expand to view programs and contact options."
              : "Explore our public directory and connect with verified profiles by country and search."}
          </p>
        </div>

        {/* Filters + Tabs */}
        <div className="relative mb-8">
          <div className="absolute -top-6 right-4 z-10 flex items-center gap-2">
            {visibleTabs.map((t) => (
              <Button
                key={t.key}
                type="button"
                variant={browseTab === t.key ? "default" : "outline"}
                className={[
                  "h-10 px-5 text-base rounded-xl shadow-sm",
                  browseTab === t.key ? "shadow" : "",
                ].join(" ")}
                onClick={() => {
                  setBrowseTab(t.key);
                  setSelectedCountry("all");
                  setSearchTerm("");
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <Card>
            <CardContent className="p-6">
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>
                      Browse: <span className="font-semibold capitalize">{browseTab}</span>
                    </span>
                  </div>
                  <div />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="text"
                        placeholder={
                          browseTab === "school"
                            ? "Search schools, institutions, programs..."
                            : `Search ${browseTab}s by name, country...`
                        }
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="pl-10 h-11 text-base"
                      />
                    </div>
                  </div>

                  <CountrySelector
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    options={browseTab === "school" ? schoolCountryOptions : userCountryOptions}
                    includeAll
                    allLabel="All Countries"
                    placeholder="All Countries"
                    className="h-11"
                  />

                  {browseTab === "school" ? (
                    <>
                      {/* ✅ FIX: Pass BOTH props to avoid mismatch with your ProvinceSelector implementation */}
                      <ProvinceSelector
                        value={selectedProvince}
                        onChange={handleProvinceChange}
                        onValueChange={handleProvinceChange}
                        placeholder="All Provinces"
                        includeAll={true}
                        includeInternational={true}
                        className="h-11"
                      />

                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="institution">Institutions Only</SelectItem>
                          <SelectItem value="program">Programs Only</SelectItem>
                          <SelectItem value="university">Universities</SelectItem>
                          <SelectItem value="college">Colleges</SelectItem>
                          <SelectItem value="institute">Institutes</SelectItem>
                          <SelectItem value="language school">Language Schools</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <>
                      <div className="hidden lg:block" />
                      <div className="hidden lg:block" />
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {totalCount > 0 ? (
                      <>
                        Showing <span className="font-medium">{startIndex + 1}</span>–<span className="font-medium">{endIndex}</span> of{" "}
                        <span className="font-medium">{totalCount}</span>{" "}
                        {browseTab === "school" ? "schools & institutions" : `${browseTab}s`}
                        {browseTab === "school" ? (
                          <>
                            {" "}
                            ({allSchools.length} programs, {allInstitutions.length} institutions)
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>Showing 0 {browseTab === "school" ? "schools & institutions" : `${browseTab}s`}</>
                    )}
                  </div>

                  <Button type="button" variant="outline" onClick={clearAllFilters} className="text-sm">
                    Clear All Filters
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT LIST */}
          <div className="lg:col-span-5 min-h-0">
            <Card className="h-[70vh] flex flex-col">
              <CardContent className="p-4 h-full flex flex-col min-h-0">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {browseTab === "school"
                      ? "Schools & Institutions"
                      : `${browseTab.charAt(0).toUpperCase() + browseTab.slice(1)}s`}
                  </h3>
                  <Badge variant="secondary">{totalCount}</Badge>
                </div>

                <div className="flex-1 min-h-0 overflow-auto space-y-3 pr-1">
                  {pagedItems.map((item) => {
                    const key = item.school_key || item.id;
                    return browseTab === "school" ? (
                      <SchoolListRow
                        key={key}
                        item={item}
                        isSelected={key === selectedKey}
                        onSelect={() => setSelectedKey(key)}
                      />
                    ) : (
                      <UserListRow
                        key={key}
                        user={item}
                        isSelected={key === selectedKey}
                        onSelect={() => setSelectedKey(key)}
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalCount > 0 && totalPages > 1 && (
                  <div className="pt-4 flex items-center justify-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updatePage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Prev
                    </Button>

                    {pageNumbers.map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-500 select-none">
                          …
                        </span>
                      ) : (
                        <Button
                          key={p}
                          type="button"
                          size="sm"
                          variant={p === page ? "default" : "outline"}
                          onClick={() => updatePage(p)}
                          aria-current={p === page ? "page" : undefined}
                        >
                          {p}
                        </Button>
                      )
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updatePage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT DETAILS */}
          <div className="lg:col-span-7 min-h-0">
            <div className="h-[70vh] min-h-0">
              {browseTab === "school" ? (
                <SchoolDetailsPanel
                  item={selectedItem}
                  programs={selectedPrograms}
                  onContactClick={onContactClick}
                  onProgramClick={onProgramClick}
                />
              ) : (
                <UserDetailsPanel user={selectedItem} onMessageClick={onMessageClick} />
              )}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {totalCount === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {browseTab === "school" ? "schools or institutions" : `${browseTab}s`} found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or clear filters to see all available options.
            </p>
            <Button type="button" onClick={clearAllFilters} variant="outline">
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
