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
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProvinceSelector from "../components/ProvinceSelector";
import CountrySelector from "@/components/CountrySelector";
import { getProvinceLabel } from "../components/utils/CanadianProvinces";
import _ from "lodash";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// 🔥 Firebase
import { auth, db } from "@/firebase";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const PAGE_SIZE = 15;

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
   Role helpers (aligned with Welcome.jsx)
   ----------------------------- */
const VALID_ROLES = ["agent", "tutor", "school", "vendor"]; // Welcome.jsx list
const DEFAULT_ROLE = "user";

function normalizeRole(r) {
  const v = (r || "").toString().trim().toLowerCase();
  return VALID_ROLES.includes(v) ? v : DEFAULT_ROLE;
}

function buildUserDoc({ email, full_name = "", userType = DEFAULT_ROLE, signupEntryRole = DEFAULT_ROLE }) {
  return {
    role: userType,
    userType,
    user_type: userType,
    signup_entry_role: signupEntryRole,
    email,
    full_name,
    phone: "",
    country: "",
    address: { street: "", ward: "", district: "", province: "", postal_code: "" },
    profile_picture: "",
    is_verified: false,
    onboarding_completed: false,
    kyc_document_id: "",
    kyc_document_url: "",
    assigned_agent_id: "",
    referred_by_agent_id: "",
    purchased_packages: [],
    purchased_tutor_packages: [],
    session_credits: 0,
    schoolId: "",
    programId: "",
    enrollment_date: null,
    agent_reassignment_request: { requested_at: null, reason: "", new_agent_id: "", status: "pending" },
    settings: {
      language: "en",
      timezone: "Asia/Ho_Chi_Minh",
      currency: "USD",
      notification_preferences: {
        email_notifications: true,
        sms_notifications: false,
        application_updates: true,
        marketing_emails: false,
        session_reminders: true,
      },
    },
    package_assignment: { package_id: "", assigned_at: null, expires_at: null },
    is_guest_created: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
}

async function routeAfterAuth(navigate, fbUser, entryRole, nextPage) {
  const roleToUse = normalizeRole(entryRole);
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      buildUserDoc({
        email: fbUser.email || "",
        full_name: fbUser.displayName || "",
        userType: roleToUse,
        signupEntryRole: roleToUse,
      }),
      { merge: true }
    );

    const qp = new URLSearchParams();
    qp.set("role", roleToUse);
    qp.set("lock", "1");
    if (nextPage) qp.set("next", nextPage);
    return navigate(`${createPageUrl("Onboarding")}?${qp.toString()}`);
  }

  const profile = snap.data();
  if (!profile?.onboarding_completed) {
    const qp = new URLSearchParams();
    qp.set("role", normalizeRole(profile?.user_type || roleToUse));
    qp.set("lock", "1");
    if (nextPage) qp.set("next", nextPage);
    return navigate(`${createPageUrl("Onboarding")}?${qp.toString()}`);
  }

  return navigate(createPageUrl(nextPage || "Dashboard"));
}

/* -----------------------------
   Helpers: stable target id
   ----------------------------- */
function getTargetId(item) {
  return item?.id || item?.school_id || item?.institution_id || item?.school_key || null;
}

/* -----------------------------
   Left list row (master)
   - Updated: lock overlay for non-users
   ----------------------------- */
const SchoolListRow = ({ item, isSelected, locked, onSelect, onLockedClick }) => {
  const name = item.name || item.school_name || item.institution_name || "Unknown";
  const logo =
    item.logoUrl ||
    item.school_image_url ||
    item.institution_logo_url ||
    "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=600&fit=crop&q=80";

  const handleClick = () => {
    if (locked) return onLockedClick?.();
    onSelect?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        "w-full text-left rounded-lg border p-3 transition relative group",
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

      {/* Lock overlay (non-users) */}
      {locked && (
        <div
          className={[
            "absolute inset-0 rounded-lg",
            "bg-white/70 backdrop-blur-[1px]",
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            "transition flex items-center justify-center",
          ].join(" ")}
          aria-hidden="true"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Lock className="w-4 h-4" />
            Please sign in to view details
          </div>
        </div>
      )}
    </button>
  );
};

/* -----------------------------
   Right details panel (detail)
   Updated: locked mode for non-users
   ----------------------------- */
const SchoolDetailsPanel = ({ item, locked, onRequireAuth, onViewDetails }) => {
  if (!item) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 text-gray-600">
          {locked ? "Sign in to view school details and programs." : "Select a school from the list to see details."}
        </CardContent>
      </Card>
    );
  }

  const targetId = getTargetId(item);
  const name = item.name || item.school_name || item.institution_name || "Unknown";

  // Locked view (non-user): list-only policy
  if (locked) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Lock className="w-5 h-5 text-gray-700" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900">Sign in to view full school details</h2>
              <p className="mt-1 text-sm text-gray-600">
                You can browse the list publicly, but profiles and programs require an account.
              </p>

              <div className="mt-4 rounded-lg border bg-gray-50 p-4 text-sm text-gray-700">
                <div className="font-semibold text-gray-900 mb-1">Selected:</div>
                <div className="truncate">{name}</div>
              </div>

              <div className="mt-6">
                <Button className="w-full h-11 text-base" onClick={() => onRequireAuth?.(targetId)}>
                  Continue (Sign in / Register)
                </Button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  You’ll be asked to choose: <span className="font-medium">Student, Agent</span> or{" "}
                  <span className="font-medium">Tutor</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 text-xs text-gray-500">
            Tip: Students typically connect to schools through an Agent or GP Team (based on your account setup).
          </div>
        </CardContent>
      </Card>
    );
  }

  // Signed-in full panel (existing UI)
  const banner =
    item.logoUrl ||
    item.school_image_url ||
    item.institution_logo_url ||
    "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=600&fit=crop&q=80";

  const city = item.city || item.school_city || "—";
  const province = getProvinceLabel(item.province || item.school_province) || "—";
  const country = item.country || item.school_country || "—";

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
              <Button className="w-full h-11 text-base" onClick={() => onViewDetails?.(targetId)}>
                View Programs
              </Button>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm text-gray-500">Programs</p>
            <p className="text-2xl font-bold text-blue-600">{item.programCount || 0}+</p>
          </div>
        </div>

        <div className="mt-6 border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 font-semibold text-gray-900">Basic information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="px-4 py-3 border-t text-sm">
              <span className="text-gray-500">Category: </span>
              <span className="font-medium">
                {item.isInstitution ? "Institution" : item.institution_type || "—"}
              </span>
            </div>

            <div className="px-4 py-3 border-t sm:border-l text-sm">
              <span className="text-gray-500">Type: </span>
              <span className="font-medium">{item.isInstitution ? (item.isPublic ? "Public" : "Private") : "—"}</span>
            </div>

            <div className="px-4 py-3 border-t text-sm">
              <span className="text-gray-500">Country: </span>
              <span className="font-medium">{country}</span>
            </div>

            <div className="px-4 py-3 border-t sm:border-l text-sm">
              <span className="text-gray-500">Province: </span>
              <span className="font-medium">{province}</span>
            </div>
          </div>
        </div>

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
   Inline Login Dialog (no navigation)
   ----------------------------- */
function LoginDialog({ open, onOpenChange, entryRole, nextPage }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup fields
  const [fullName, setFullName] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showSigninPw, setShowSigninPw] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  // reset dialog state when closed
  useEffect(() => {
    if (!open) {
      setMode("signin");
      setBusy(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setConfirm("");
      setShowSigninPw(false);
      setShowPw(false);
      setShowConfirm(false);
      setErrorMsg("");
    }
  }, [open]);

  const safeClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleLoginGoogle = async () => {
    try {
      setBusy(true);
      setErrorMsg("");
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      safeClose();
      await routeAfterAuth(navigate, cred.user, entryRole, nextPage);
    } catch (err) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setErrorMsg(err?.code ? `Firebase: ${err.code}` : err?.message || "Google sign-in failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLoginApple = async () => {
    try {
      setBusy(true);
      setErrorMsg("");
      const appleProvider = new OAuthProvider("apple.com");
      const cred = await signInWithPopup(auth, appleProvider);
      safeClose();
      await routeAfterAuth(navigate, cred.user, entryRole, nextPage);
    } catch (err) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setErrorMsg(err?.code ? `Firebase: ${err.code}` : err?.message || "Apple sign-in failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignInEmail = async () => {
    const em = email.trim().toLowerCase();
    if (!em) return setErrorMsg("Please enter your email.");
    if (!password) return setErrorMsg("Please enter your password.");

    try {
      setBusy(true);
      setErrorMsg("");
      const cred = await signInWithEmailAndPassword(auth, em, password);
      safeClose();
      await routeAfterAuth(navigate, cred.user, entryRole, nextPage);
    } catch (err) {
      setErrorMsg(err?.code ? `Firebase: ${err.code}` : err?.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUpEmail = async () => {
    const em = email.trim().toLowerCase();
    if (!fullName.trim()) return setErrorMsg("Please enter your full name.");
    if (!em) return setErrorMsg("Please enter your email.");
    if (!password) return setErrorMsg("Please create a password.");
    if (password !== confirm) return setErrorMsg("Passwords do not match.");

    try {
      setBusy(true);
      setErrorMsg("");

      // If email exists, force sign-in instead
      const methods = await fetchSignInMethodsForEmail(auth, em);
      if (methods.length > 0) {
        setMode("signin");
        return setErrorMsg("This email is already registered. Please sign in instead.");
      }

      const cred = await createUserWithEmailAndPassword(auth, em, password);
      await updateProfile(cred.user, { displayName: fullName.trim() });

      safeClose();
      await routeAfterAuth(navigate, cred.user, entryRole, nextPage);
    } catch (err) {
      setErrorMsg(err?.code ? `Firebase: ${err.code}` : err?.message || "Sign-up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{mode === "signin" ? "Sign in to continue" : "Create your account"}</DialogTitle>
          <DialogDescription>
            Role selected: <span className="font-medium">{entryRole === "user" ? "Student" : entryRole}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 text-sm">
          <button
            type="button"
            className={`py-2 rounded-lg transition ${
              mode === "signin" ? "bg-white shadow font-semibold" : "text-gray-600"
            }`}
            onClick={() => setMode("signin")}
            disabled={busy}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`py-2 rounded-lg transition ${
              mode === "signup" ? "bg-white shadow font-semibold" : "text-gray-600"
            }`}
            onClick={() => setMode("signup")}
            disabled={busy}
          >
            Sign up
          </button>
        </div>

        {/* Social */}
        <div className="space-y-3 mt-4">
          <Button variant="outline" className="w-full h-12 text-base" onClick={handleLoginGoogle} disabled={busy}>
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base bg-black text-white hover:bg-gray-800 hover:text-white"
            onClick={handleLoginApple}
            disabled={busy}
          >
             Continue with Apple
          </Button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or continue with email</span>
          </div>
        </div>

        {errorMsg && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{errorMsg}</div>
        )}

        {/* Forms */}
        {mode === "signin" ? (
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Email address"
                className="pl-10 h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type={showSigninPw ? "text" : "password"}
                placeholder="Password"
                className="pl-10 pr-10 h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showSigninPw ? "Hide password" : "Show password"}
                aria-pressed={showSigninPw}
                onClick={() => setShowSigninPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
              >
                {showSigninPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button className="w-full h-12 text-base" onClick={handleSignInEmail} disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Full name"
                className="pl-10 h-12"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Email address"
                className="pl-10 h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Create a password"
                className="pl-10 pr-10 h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showPw ? "Hide password" : "Show password"}
                aria-pressed={showPw}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm password"
                className="pl-10 pr-10 h-12"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <button
                type="button"
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={showConfirm}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button className="w-full h-12 text-base" onClick={handleSignUpEmail} disabled={busy}>
              {busy ? "Creating..." : "Create account"}
            </Button>
          </div>
        )}

        <div className="pt-2">
          <Button variant="ghost" className="w-full" onClick={safeClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Schools() {
  const navigate = useNavigate();

  const [allSchools, setAllSchools] = useState([]);
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  const [selectedKey, setSelectedKey] = useState(null);

  // dialogs
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const [pendingSchoolId, setPendingSchoolId] = useState(null);
  const [chosenRole, setChosenRole] = useState("user"); // student default for generic flows

  // auth
  const [fbUser, setFbUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [fbProfile, setFbProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!fbUser) {
        setFbProfile(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        if (!cancelled) setFbProfile(snap.exists() ? snap.data() : null);
      } catch {
        if (!cancelled) setFbProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fbUser]);

  const isSignedIn = !!fbUser;
  const locked = authReady ? !isSignedIn : true;

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

  const loadData = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const countryOptions = useMemo(() => {
    const fromData = mergedSchools.map((s) => s.country || s.school_country).filter(Boolean);
    const priority = ["Australia", "Germany", "Ireland", "United Kingdom", "United States", "New Zealand", "Canada"];
    return Array.from(new Set([...fromData, ...priority]));
  }, [mergedSchools]);

  const handleSearchChange = useCallback((e) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
  }, []);

  const handleCountryChange = useCallback(
    (value) => {
      setSelectedCountry(value);
      if (value !== selectedCountry) {
        setSelectedProvince("all");
        setSelectedCity("all");
      }
    },
    [selectedCountry]
  );

  const handleProvinceChange = useCallback(
    (value) => {
      setSelectedProvince(value);
      if (value !== selectedProvince) setSelectedCity("all");
    },
    [selectedProvince]
  );

  // Reset to page 1 whenever filters/search change
  useEffect(() => {
    updatePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCountry, selectedProvince, selectedCity, selectedType, mergedSchools.length]);

  useEffect(() => {
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
  }, [mergedSchools, searchTerm, selectedCountry, selectedProvince, selectedCity, selectedType]);

  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) updatePage(totalPages);
    if (page < 1) updatePage(1);
  }, [page, totalPages, updatePage]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredSchools.length);
  const pagedSchools = filteredSchools.slice(startIndex, endIndex);

  useEffect(() => {
    if (!pagedSchools.length) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey) {
      setSelectedKey(pagedSchools[0].school_key || pagedSchools[0].id);
      return;
    }
    const stillOnPage = pagedSchools.some((s) => (s.school_key || s.id) === selectedKey);
    if (!stillOnPage) setSelectedKey(pagedSchools[0].school_key || pagedSchools[0].id);
  }, [pagedSchools, selectedKey]);

  const selectedItem = useMemo(() => {
    if (!selectedKey) return null;
    return filteredSchools.find((s) => (s.school_key || s.id) === selectedKey) || null;
  }, [filteredSchools, selectedKey]);

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

  /* -----------------------------
     Non-user gating: open role prompt
     Schools page rule: Agent or Tutor only
   ----------------------------- */
  const openRoleDialog = useCallback((schoolId) => {
    setPendingSchoolId(schoolId || null);
    setRoleDialogOpen(true);
  }, []);

  const chooseRoleAndShowLogin = useCallback((role) => {
    setChosenRole(role);

    // lock role for onboarding so user won't be asked again
    try {
      sessionStorage.setItem("onboarding_role", role);
      sessionStorage.setItem("onboarding_role_locked", "1");
    } catch {}

    setRoleDialogOpen(false);
    setLoginDialogOpen(true);
  }, []);

  /* -----------------------------
     Signed-in users: go directly (still respects onboarding via routeAfterAuth)
   ----------------------------- */
  const goToSchoolDetails = useCallback(
    async (schoolId) => {
      const target = schoolId ? String(schoolId) : "";
      if (!target) return;

      const next = `SchoolDetails?id=${encodeURIComponent(target)}`;

      // Not signed in -> role dialog
      if (!auth.currentUser) {
        openRoleDialog(target);
        return;
      }

      // Signed in -> ensure onboarding/doc, then go
      try {
        const roleHint = normalizeRole(fbProfile?.user_type || fbProfile?.role || "user");
        await routeAfterAuth(navigate, auth.currentUser, roleHint, next);
      } catch (e) {
        navigate(createPageUrl(next));
      }
    },
    [navigate, fbProfile, openRoleDialog]
  );

  // This is where login should go after auth
  const nextPage = useMemo(() => {
    const id = pendingSchoolId ? encodeURIComponent(pendingSchoolId) : "";
    return `SchoolDetails?id=${id}`;
  }, [pendingSchoolId]);

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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
            Discover Schools & Institutions
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Browse publicly, then sign in to view profiles and programs.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="sm:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Search schools, institutions, programs..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="pl-10 h-11 text-base"
                    />
                  </div>
                </div>

                <CountrySelector
                  value={selectedCountry}
                  onChange={handleCountryChange}
                  options={countryOptions}
                  includeAll
                  allLabel="All Countries"
                  placeholder="All Countries"
                  className="h-11"
                />

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
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {filteredSchools.length > 0 ? (
                    <>
                      Showing <span className="font-medium">{startIndex + 1}</span>–<span className="font-medium">{endIndex}</span>{" "}
                      of <span className="font-medium">{filteredSchools.length}</span> schools & institutions
                    </>
                  ) : (
                    <>Showing 0 of {mergedSchools.length} schools & institutions</>
                  )}
                </div>

                <Button type="button" variant="outline" onClick={clearAllFilters} className="text-sm">
                  Clear All Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT LIST */}
          <div className="lg:col-span-5 min-h-0">
            <Card className="h-[70vh] flex flex-col">
              <CardContent className="p-4 h-full flex flex-col min-h-0">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Schools & Institutions</h3>
                  <Badge variant="secondary">{filteredSchools.length}</Badge>
                </div>

                <div className="flex-1 min-h-0 overflow-auto space-y-3 pr-1">
                  {pagedSchools.map((item) => {
                    const key = item.school_key || item.id;
                    const targetId = getTargetId(item);

                    return (
                      <SchoolListRow
                        key={key}
                        item={item}
                        isSelected={key === selectedKey}
                        locked={locked}
                        onSelect={() => setSelectedKey(key)}
                        onLockedClick={() => openRoleDialog(targetId)}
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                {filteredSchools.length > 0 && totalPages > 1 && (
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
              <SchoolDetailsPanel
                item={selectedItem}
                locked={locked}
                onRequireAuth={(id) => openRoleDialog(id)}
                onViewDetails={(id) => goToSchoolDetails(id)}
              />
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filteredSchools.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No schools or institutions found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search criteria or clear filters to see all available options.</p>
            <Button type="button" onClick={clearAllFilters} variant="outline">
              Clear All Filters
            </Button>
          </div>
        )}

        {/* Role picker dialog (Schools page rule: Agent or Tutor only) */}
        {/* Role picker dialog (now includes Student) */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Continue to view this school</DialogTitle>
              <DialogDescription>
                Choose how you’re joining GreenPass. This helps us route you to the right onboarding.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 mt-2">
              {/* Student/Parent */}
              <Button
                onClick={() => chooseRoleAndShowLogin("user")} // student role in your system
                variant="outline"
                className="w-full h-11"
              >
                I’m a Student / Parent
              </Button>

              {/* Agent */}
              <Button onClick={() => chooseRoleAndShowLogin("agent")} className="w-full h-11">
                I’m an Agent
              </Button>

              {/* Tutor */}
              <Button onClick={() => chooseRoleAndShowLogin("tutor")} variant="outline" className="w-full h-11">
                I’m a Tutor
              </Button>

              <div className="pt-1 text-center text-sm text-gray-600">
                Already a member?{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={() => {
                    setChosenRole("user"); // role not used for existing members
                    setRoleDialogOpen(false);
                    setLoginDialogOpen(true);
                  }}
                >
                  Sign in
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Login dialog (inline, no navigation to Welcome page) */}
        <LoginDialog
          open={loginDialogOpen}
          onOpenChange={setLoginDialogOpen}
          entryRole={chosenRole}
          nextPage={nextPage}
        />
      </div>
    </div>
  );
}
