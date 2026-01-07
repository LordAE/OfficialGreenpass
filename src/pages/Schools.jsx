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
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams, useNavigate } from "react-router-dom";
import ProvinceSelector from "../components/ProvinceSelector";
import CountrySelector from "@/components/CountrySelector";
import { getProvinceLabel } from "../components/utils/CanadianProvinces";
import _ from "lodash";

// 🔥 Firebase
import { db, auth } from "@/firebase";
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
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
   Country flag helpers (use IMAGE flags for reliability)
   ----------------------------- */
const isIso2 = (code) => /^[A-Z]{2}$/.test((code || "").trim().toUpperCase());

const codeToFlagEmoji = (code) => {
  const cc = (code || "").trim().toUpperCase();
  if (!isIso2(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
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
      <span className={["text-base leading-none", className].join(" ")} title={cc}>
        {emoji}
      </span>
    ) : null;
  }

  return (
    <img
      src={url}
      alt={`${cc} flag`}
      className={["h-4 w-6 rounded-sm border object-cover", className].join(" ")}
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
    .replace(/\b(the|of|and|for|at|in|de|la|le|du|des|université|universite)\b/g, "")
    .replace(/\b(university|college|institute|polytechnic|school|academy|centre|center)\b/g, "")
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
        isSelected ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:bg-gray-50",
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
   Right details panel (schools/institutions)
   - Main button: Contact Us
   - Toggle link: View programs + / Hide programs -
   - Program rows are clickable (calls onProgramClick)
   ----------------------------- */
const SchoolDetailsPanel = ({ item, onContact, programs = [], onProgramClick }) => {
  const [showPrograms, setShowPrograms] = useState(false);

  useEffect(() => {
    setShowPrograms(false);
  }, [item?.id, item?.school_key, item?.school_id, item?.institution_id]);

  if (!item) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 text-gray-600">Select a school from the list to see details.</CardContent>
      </Card>
    );
  }

  const name = item.name || item.school_name || item.institution_name || "Unknown";

  const banner =
    item.logoUrl ||
    item.school_image_url ||
    item.institution_logo_url ||
    "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=600&fit=crop&q=80";

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
      <div className="shrink-0 aspect-[16/7] bg-gradient-to-br from-blue-100 to-green-100 relative">
        <img src={banner} alt={name} className="w-full h-full object-cover" />
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
      </div>

      <CardContent className="p-6 flex-1 min-h-0 overflow-auto">
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
              <Button className="w-full h-11 text-base" onClick={() => onContact?.(item)}>
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
    "https://ui-avatars.com/api/?background=E5E7EB&color=111827&name=" + encodeURIComponent(name);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-left rounded-lg border p-3 transition",
        "focus:outline-none focus:ring-2 focus:ring-green-400",
        isSelected ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:bg-gray-50",
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

const UserDetailsPanel = ({ user }) => {
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
    "https://ui-avatars.com/api/?background=E5E7EB&color=111827&name=" + encodeURIComponent(name);

  // Optional banner/cover fields if you have them; otherwise fallback
  const banner =
    user.cover_photo ||
    user.coverPhoto ||
    user.banner ||
    "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=1600&h=600&fit=crop&q=80";

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Banner */}
      <div className="relative shrink-0 h-44 bg-gradient-to-br from-gray-900 to-gray-700">
        <img src={banner} alt="" className="w-full h-full object-cover opacity-90" />

        {/* soft dark overlay */}
        <div className="absolute inset-0 bg-black/35" />

        {/* Profile circle (overlapping) */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-10">
          <div className="h-24 w-24 rounded-full bg-white p-1 shadow-lg">
            <img
              src={photo}
              alt={name}
              className="h-full w-full rounded-full object-cover border"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <CardContent className="flex-1 overflow-auto pt-14 pb-6">
        {/* Flag BELOW profile pic */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <CountryFlag code={countryCode} className="h-5 w-7" />
            <span className="text-sm text-gray-600">{country}</span>
            {countryCode ? <span className="text-xs text-gray-400">({countryCode})</span> : null}
          </div>

          {/* Name BELOW flag */}
          <h2 className="mt-2 text-2xl font-bold text-gray-900">{name}</h2>

          <Badge variant="secondary" className="mt-2 capitalize">
            {role === "user" ? "Student / User" : role}
          </Badge>
        </div>

        {/* Optional info section (keep if you want) */}
        <div className="mt-6 border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 font-semibold text-gray-900">Basic information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="px-4 py-3 border-t text-sm">
              <span className="text-gray-500">Email: </span>
              <span className="font-medium">{user.email || "—"}</span>
            </div>
            <div className="px-4 py-3 border-t sm:border-l text-sm">
              <span className="text-gray-500">Phone: </span>
              <span className="font-medium">{user.phone || user.phone_number || "—"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


export default function Schools() {
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

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ In-page Auth modal (no route navigation)
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authStep, setAuthStep] = useState("choice"); // "choice" | "login" | "role" | "signup"
  const [pendingTargetUrl, setPendingTargetUrl] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPw, setLoginShowPw] = useState(false);

  const [signupRole, setSignupRole] = useState("user"); // user | agent | tutor (NO school)
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPassword2, setSignupPassword2] = useState("");
  const [signupShowPw, setSignupShowPw] = useState(false);

  // Watch auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  // read initial page from URL
  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const src = isSchoolTab ? (filteredSchools || []) : (filteredUsers || []);
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

  const onContactSchool = useCallback((schoolItem) => {
    const name = schoolItem?.name || schoolItem?.school_name || schoolItem?.institution_name || "School";

    const email =
      schoolItem?.contact_email ||
      schoolItem?.contactEmail ||
      schoolItem?.admissions_email ||
      schoolItem?.international_email ||
      schoolItem?.email;

    if (email) {
      const subject = encodeURIComponent(`Inquiry: ${name}`);
      window.location.href = `mailto:${email}?subject=${subject}`;
      return;
    }

    window.location.href = `/contact?school=${encodeURIComponent(name)}`;
  }, []);

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
  }, []);

  const openAuthDialog = useCallback((targetUrl) => {
    setPendingTargetUrl(targetUrl || "");
    setAuthStep("choice");
    resetAuthForm();
    setAuthDialogOpen(true);
  }, [resetAuthForm]);

  const afterAuthSuccess = useCallback(() => {
    setAuthDialogOpen(false);
    setAuthStep("choice");
    setAuthError("");
    setAuthLoading(false);
    if (pendingTargetUrl) navigate(pendingTargetUrl);
  }, [navigate, pendingTargetUrl]);

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

  const handleSignup = useCallback(async () => {
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

      // Create/merge user doc in Firestore (users collection)
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          email,
          full_name: name || "",
          // store role in multiple fields for compatibility with your existing queries
          user_type: signupRole,
          userType: signupRole,
          role: signupRole,
          selected_role: signupRole,
          created_at: serverTimestamp(),
          createdAt: Date.now(),
        },
        { merge: true }
      );

      afterAuthSuccess();
    } catch (e) {
      setAuthError(e?.message || "Sign up failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, [afterAuthSuccess, signupEmail, signupName, signupPassword, signupPassword2, signupRole]);

  // When a user clicks a program:
  // - if logged in: open program details
  // - if not: open the in-page auth dialog
  const onProgramClick = useCallback(
    (program, schoolItem) => {
      const programId = program?.id || program?.program_id || "";
      const url = programId
        ? `/programdetails?id=${encodeURIComponent(String(programId))}`
        : `/schooldetails?school=${encodeURIComponent(
            schoolItem?.school_key || schoolItem?.name || schoolItem?.school_name || schoolItem?.institution_name || ""
          )}`;

      if (currentUser) {
        navigate(url);
        return;
      }

      openAuthDialog(url);
    },
    [currentUser, navigate, openAuthDialog]
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
      {/* ✅ In-page Login / Signup prompt (NO navigation) */}
      <Dialog
        open={authDialogOpen}
        onOpenChange={(v) => {
          setAuthDialogOpen(v);
          if (!v) {
            setAuthStep("choice");
            setPendingTargetUrl("");
            resetAuthForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              You need to log in to view program details. If you don’t have an account yet, create one by choosing a role.
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
              <Button className="w-full h-11" onClick={() => setAuthStep("login")} disabled={authLoading}>
                <LogIn className="w-4 h-4 mr-2" />
                Log in
              </Button>

              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => setAuthStep("role")}
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

          {/* ROLE SELECT (NO SCHOOL ROLE) */}
          {authStep === "role" ? (
            <div className="mt-4 space-y-3">
              <div className="text-sm font-medium text-gray-900">Select your role</div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant={signupRole === "user" ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setSignupRole("user")}
                  disabled={authLoading}
                >
                  Student
                </Button>
                <Button
                  variant={signupRole === "agent" ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setSignupRole("agent")}
                  disabled={authLoading}
                >
                  Agent
                </Button>
                <Button
                  variant={signupRole === "tutor" ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setSignupRole("tutor")}
                  disabled={authLoading}
                >
                  Tutor
                </Button>
              </div>

              <Button className="w-full h-11" onClick={() => setAuthStep("signup")} disabled={authLoading}>
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

          {/* SIGNUP */}
          {authStep === "signup" ? (
            <div className="mt-4 space-y-3">
              <div className="text-sm text-gray-600">
                Creating account as:{" "}
                <span className="font-semibold capitalize">{signupRole === "user" ? "Student" : signupRole}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Full name</label>
                <Input
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Your name"
                  className="h-11"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Email</label>
                <Input
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
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

              <Button className="w-full h-11" onClick={handleSignup} disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Create account
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => setAuthStep("role")} disabled={authLoading}>
                  Back
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setAuthDialogOpen(false)} disabled={authLoading}>
                  Cancel
                </Button>
              </div>

              <div className="text-sm text-gray-600 text-center">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-blue-600 underline hover:text-blue-700"
                  onClick={() => setAuthStep("login")}
                  disabled={authLoading}
                >
                  Log in
                </button>
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
          {/* ✅ Roles OUTSIDE the box, clumped top-right */}
          <div className="absolute -top-4 right-4 z-10 flex items-center gap-2">
            {BROWSE_TABS.map((t) => (
              <Button
                key={t.key}
                type="button"
                variant={browseTab === t.key ? "default" : "outline"}
                size="sm"
                className="h-8 px-3"
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
                {/* ✅ Remove the old roles block from here */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>
                      Browse: <span className="font-semibold capitalize">{browseTab}</span>
                    </span>
                  </div>

                  {/* Keep right side empty or put something else if you want */}
                  <div />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="text"
                        placeholder={
                          isSchoolTab
                            ? "Search schools, institutions, programs..."
                            : `Search ${browseTab}s by name, email, phone, country...`
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
                    options={isSchoolTab ? schoolCountryOptions : userCountryOptions}
                    includeAll
                    allLabel="All Countries"
                    placeholder="All Countries"
                    className="h-11"
                  />

                  {isSchoolTab ? (
                    <>
                      <ProvinceSelector
                        value={selectedProvince}
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
                        Showing <span className="font-medium">{startIndex + 1}</span>–<span className="font-medium">{endIndex}</span>{" "}
                        of <span className="font-medium">{totalCount}</span>{" "}
                        {isSchoolTab ? "schools & institutions" : `${browseTab}s`}
                        {isSchoolTab ? (
                          <> ({allSchools.length} programs, {allInstitutions.length} institutions)</>
                        ) : null}
                      </>
                    ) : (
                      <>Showing 0 {isSchoolTab ? "schools & institutions" : `${browseTab}s`}</>
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
                    {isSchoolTab ? "Schools & Institutions" : `${browseTab.charAt(0).toUpperCase() + browseTab.slice(1)}s`}
                  </h3>
                  <Badge variant="secondary">{totalCount}</Badge>
                </div>

                <div className="flex-1 min-h-0 overflow-auto space-y-3 pr-1">
                  {pagedItems.map((item) => {
                    const key = item.school_key || item.id;
                    return isSchoolTab ? (
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
              {isSchoolTab ? (
                <SchoolDetailsPanel
                  item={selectedItem}
                  programs={selectedPrograms}
                  onContact={onContactSchool}
                  onProgramClick={onProgramClick}
                />
              ) : (
                <UserDetailsPanel user={selectedItem} />
              )}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {totalCount === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {isSchoolTab ? "schools or institutions" : `${browseTab}s`} found
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
