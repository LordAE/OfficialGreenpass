// src/pages/SchoolDetails.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Globe,
  Calendar,
  Star,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Building,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff
} from "lucide-react";
import { createPageUrl } from "@/utils";

/* ---------- UI Dialog ---------- */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/* ---------- Firebase Auth ---------- */
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

/* ---------- Firestore ---------- */
import { doc, getDoc, collection, getDocs, query, where, limit, setDoc, serverTimestamp } from "firebase/firestore";

/* ---------- helpers ---------- */
const pickFirst = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && (`${v}`.trim?.() ?? `${v}`) !== "") ?? undefined;

const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const truncate = (txt, n = 220) => {
  const s = (txt || "").toString().trim();
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n).trim()}…` : s;
};

const money = (amount) => {
  if (amount === undefined || amount === null) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(amount));
  } catch {
    return `$${Number(amount || 0).toLocaleString()}`;
  }
};

/* ---------- safe Firestore get (swallow permission-denied) ---------- */
async function safeGetDoc(path, id) {
  try {
    return await getDoc(doc(db, path, id));
  } catch (e) {
    const msg = (e?.code || e?.message || "").toString().toLowerCase();
    if (msg.includes("permission") || msg.includes("insufficient")) {
      return { exists: () => false };
    }
    return { exists: () => false };
  }
}

/* ---------- role helpers ---------- */
const VALID_ROLES = ["agent", "tutor", "school", "vendor"];
const DEFAULT_ROLE = "user"; // student/parent in your system

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

    // keep your existing schema fields (safe defaults)
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

/* ---------- Inline Login Dialog (modal, no page redirect) ---------- */
function LoginDialog({ open, onOpenChange, entryRole, nextPage }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showSigninPw, setShowSigninPw] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

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

  const safeClose = useCallback(() => onOpenChange(false), [onOpenChange]);

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
            Selected role: <span className="font-medium">{entryRole === "user" ? "Student / Parent" : entryRole}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 text-sm">
          <button
            type="button"
            className={`py-2 rounded-lg transition ${mode === "signin" ? "bg-white shadow font-semibold" : "text-gray-600"}`}
            onClick={() => setMode("signin")}
            disabled={busy}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`py-2 rounded-lg transition ${mode === "signup" ? "bg-white shadow font-semibold" : "text-gray-600"}`}
            onClick={() => setMode("signup")}
            disabled={busy}
          >
            Sign up
          </button>
        </div>

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

export default function SchoolDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get("id");

  const [school, setSchool] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [programsPage, setProgramsPage] = useState(1);
  const programsPerPage = 10;

  // auth + profile
  const [fbUser, setFbUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [fbProfile, setFbProfile] = useState(null);

  // gating dialogs
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [chosenRole, setChosenRole] = useState("user");
  const [pendingProgramId, setPendingProgramId] = useState(null);

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

  const role = normalizeRole(fbProfile?.user_type || fbProfile?.role || "user");
  const isStudent = role === "user";
  const isPaidRole = ["agent", "tutor", "school", "vendor"].includes(role);

  // "subscribed" heuristic (you'll tighten this later in Phase 3)
  const isSubscribed =
    fbProfile?.subscription?.status === "active" ||
    fbProfile?.subscription_status === "active" ||
    fbProfile?.is_subscribed === true ||
    fbProfile?.paid === true;

  // Access rules for SchoolDetails
  const canSeeTuition = isSignedIn && (isSubscribed || (isPaidRole && fbProfile?.onboarding_completed));
  const canSeeWebsite = isSignedIn && (isSubscribed || (isPaidRole && fbProfile?.onboarding_completed));
  const canSeeAddress = isSignedIn && (isSubscribed || (isPaidRole && fbProfile?.onboarding_completed));
  const canSeeFullAbout = isSignedIn; // student can read about, but we hide contacts/fees
  const canOpenProgramDetails = isSignedIn; // non-user must login
  const showOnlyBasicForStudent = isStudent; // matches your "basic info only" principle for students

  const formatLocation = (s) => {
    const parts = [s?.location, s?.province, s?.country].filter(Boolean);
    return parts.join(", ");
  };

  const mapProgramFromSchoolDoc = (snap) => {
    const d = { id: snap.id, ...snap.data() };
    return {
      id: snap.id,
      name: pickFirst(d.program_title, d.title, d.program_name, "Program"),
      level: pickFirst(d.program_level, d.level, ""),
      duration: pickFirst(d.duration_display, d.duration, "Contact School"),
      tuition_per_year: Number(pickFirst(d.tuition_per_year_cad, d.tuition_fee_cad, d.tuition, 0)),
      intakes: ensureArray(pickFirst(d.intake_dates, d.intakes, [])),
      available_seats: d.available_seats,

      // optional preview snippet (if present)
      overview: pickFirst(d.program_overview, d.overview, d.description, ""),
    };
  };

  const buildHeaderFromProfile = (p) => ({
    id: p.id,
    name: pickFirst(p.institution_name, p.school_name, p.name, p.title, "Institution"),
    image_url: pickFirst(p.logoUrl, p.logo_url, p.institution_logo_url, p.image_url),
    verification_status: pickFirst(p.verification_status, p.verified && "verified"),
    account_type: pickFirst(p.account_type, "real"),
    address: pickFirst(p.address, p.street_address),
    website: pickFirst(p.website, p.url, p.homepage),
    founded_year: pickFirst(p.founded_year, p.established),
    tuition_fees: Number(p.tuition_fees ?? 0) || 0, // from school_profiles
    application_fee: Number(p.application_fee ?? 0) || 0,
    rating: Number(p.rating ?? 0) || undefined,
    acceptance_rate: Number(p.acceptance_rate ?? 0) || undefined,
    location: pickFirst(p.city, p.location),
    province: pickFirst(p.province, p.state),
    country: pickFirst(p.country, "Canada"),
    about: pickFirst(p.about, p.description)
  });

  const buildHeaderFromSchoolDoc = (s) => ({
    id: s.id,
    name: pickFirst(s.institution_name, s.school_name, s.name, "Institution"),
    image_url: pickFirst(s.institution_logo_url, s.school_image_url, s.logo_url, s.image_url),
    verification_status: pickFirst(s.verification_status, s.verified && "verified"),
    account_type: pickFirst(s.account_type, "real"),
    address: pickFirst(s.address, s.school_address),
    website: s.website,
    founded_year: pickFirst(s.founded_year, s.established),
    tuition_fees: undefined,
    application_fee: Number(pickFirst(s.application_fee, 0)) || 0,
    rating: Number(pickFirst(s.rating, 0)) || undefined,
    acceptance_rate: Number(pickFirst(s.acceptance_rate, 0)) || undefined,
    location: pickFirst(s.city, s.school_city, s.location),
    province: pickFirst(s.province, s.school_province, s.state),
    country: pickFirst(s.country, s.school_country, "Canada"),
    about: pickFirst(s.institution_about, s.about)
  });

  // fetch school + programs (same logic you had)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let profileSnap = await safeGetDoc("school_profiles", schoolId);
        if (!profileSnap.exists()) profileSnap = await safeGetDoc("SchoolProfiles", schoolId);

        let header = null;
        let nameForMatch = null;

        if (profileSnap.exists()) {
          const profile = { id: profileSnap.id, ...profileSnap.data() };
          header = buildHeaderFromProfile(profile);
          nameForMatch = header.name;
        } else {
          let sSnap = await safeGetDoc("schools", schoolId);
          if (!sSnap.exists()) sSnap = await safeGetDoc("Schools", schoolId);

          if (sSnap.exists()) {
            const s = { id: sSnap.id, ...sSnap.data() };
            header = buildHeaderFromSchoolDoc(s);
            nameForMatch = pickFirst(s.institution_name, s.school_name, header?.name);
          }
        }

        if (!header) {
          if (!cancelled) {
            setSchool(null);
            setPrograms([]);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) setSchool(header);

        const programsFound = [];

        try {
          const qId = query(collection(db, "schools"), where("school_id", "==", schoolId), limit(500));
          const resId = await getDocs(qId);
          resId.forEach((snap) => {
            const id = snap.id;
            if (!programsFound.find((p) => p.id === id)) programsFound.push(mapProgramFromSchoolDoc(snap));
          });
        } catch (_) {}

        if (nameForMatch) {
          const q1 = query(collection(db, "schools"), where("institution_name", "==", nameForMatch), limit(500));
          const res1 = await getDocs(q1);
          res1.forEach((snap) => {
            const id = snap.id;
            if (!programsFound.find((p) => p.id === id)) programsFound.push(mapProgramFromSchoolDoc(snap));
          });

          const q2 = query(collection(db, "schools"), where("school_name", "==", nameForMatch), limit(500));
          const res2 = await getDocs(q2);
          res2.forEach((snap) => {
            const id = snap.id;
            if (!programsFound.find((p) => p.id === id)) programsFound.push(mapProgramFromSchoolDoc(snap));
          });
        }

        if (!cancelled) {
          setPrograms(programsFound);
          setProgramsPage(1);
        }
      } catch (err) {
        console.error("Error fetching SchoolDetails:", err);
        if (!cancelled) {
          setSchool(null);
          setPrograms([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const avgTuition = useMemo(() => {
    const vals = programs.map((p) => Number(p.tuition_per_year)).filter((v) => Number.isFinite(v) && v > 0);
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round(sum / vals.length);
  }, [programs]);

  // pagination
  const totalPrograms = programs.length;
  const startIndex = (programsPage - 1) * programsPerPage;
  const endIndex = startIndex + programsPerPage;
  const currentPrograms = programs.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(totalPrograms / programsPerPage));

  const openRoleDialog = useCallback((programId) => {
    setPendingProgramId(programId || null);
    setRoleDialogOpen(true);
  }, []);

  const chooseRoleAndShowLogin = useCallback((roleChoice) => {
    setChosenRole(roleChoice);
    try {
      sessionStorage.setItem("onboarding_role", roleChoice);
      sessionStorage.setItem("onboarding_role_locked", "1");
    } catch {}
    setRoleDialogOpen(false);
    setLoginDialogOpen(true);
  }, []);

  const nextPage = useMemo(() => {
    if (!school?.id) return "Schools";
    if (!pendingProgramId) return `SchoolDetails?id=${encodeURIComponent(school.id)}`;
    return `ProgramDetails?schoolId=${encodeURIComponent(school.id)}&programId=${encodeURIComponent(pendingProgramId)}`;
  }, [school?.id, pendingProgramId]);

  const handleOpenProgram = useCallback(
    async (programId) => {
      // Non-user => role + login modal
      if (!auth.currentUser) {
        openRoleDialog(programId);
        return;
      }

      // Logged in:
      // - Students can view program details (optional). If you want to fully block students later, we can.
      // - Paid roles see full.
      try {
        const roleHint = normalizeRole(fbProfile?.user_type || fbProfile?.role || chosenRole);
        await routeAfterAuth(
          navigate,
          auth.currentUser,
          roleHint,
          `ProgramDetails?schoolId=${encodeURIComponent(school.id)}&programId=${encodeURIComponent(programId)}`
        );
      } catch {
        navigate(createPageUrl(`ProgramDetails?schoolId=${encodeURIComponent(school.id)}&programId=${encodeURIComponent(programId)}`));
      }
    },
    [navigate, school?.id, fbProfile, chosenRole, openRoleDialog]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">School Not Found</h2>
          <p className="text-gray-600">The school you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Link to={createPageUrl("Schools")} className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Schools
        </Link>

        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-shrink-0">
                {school.image_url ? (
                  <img src={school.image_url} alt={school.name} className="w-48 h-32 object-cover rounded-lg shadow-md" />
                ) : (
                  <div className="w-48 h-32 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-grow space-y-4">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h1 className="text-4xl font-bold text-gray-900">{school.name}</h1>
                  <div className="flex gap-2">
                    {school.verification_status && (
                      <Badge className={school.verification_status === "verified" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        {school.verification_status === "verified" ? "✓ Verified" : "Pending"}
                      </Badge>
                    )}
                    {school.account_type && (
                      <Badge className={school.account_type === "real" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                        {school.account_type === "real" ? "Real" : "Demo"}
                      </Badge>
                    )}
                    {locked && (
                      <Badge className="bg-gray-100 text-gray-800">
                        <Lock className="w-3 h-3 mr-1" />
                        Public Preview
                      </Badge>
                    )}
                    {isSignedIn && isStudent && (
                      <Badge className="bg-emerald-100 text-emerald-800">
                        Student View
                      </Badge>
                    )}
                    {isSignedIn && !isStudent && (
                      <Badge className="bg-purple-100 text-purple-800">
                        Member View
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
                      <span>{formatLocation(school)}</span>
                    </div>

                    {/* Address: paid roles only */}
                    {canSeeAddress && school.address && (
                      <div className="flex items-start text-gray-600">
                        <Building className="w-5 h-5 mr-2 text-emerald-600 mt-0.5" />
                        <span>{school.address}</span>
                      </div>
                    )}

                    {/* Website: paid roles only */}
                    {canSeeWebsite && school.website && (
                      <div className="flex items-center text-gray-600">
                        <Globe className="w-5 h-5 mr-2 text-emerald-600" />
                        <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {school.website}
                        </a>
                      </div>
                    )}

                    {school.founded_year && (
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
                        <span>Founded {school.founded_year}</span>
                      </div>
                    )}

                    {/* Public hint */}
                    {locked && (
                      <div className="text-sm text-gray-600 bg-gray-50 border rounded-lg p-3">
                        Sign in to view full details and proceed to program pages.
                      </div>
                    )}

                    {/* Student hint */}
                    {isSignedIn && isStudent && (
                      <div className="text-sm text-gray-600 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                        Students can browse basic school info. To connect with a school, use your assigned Agent or GP Team.
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Tuition: show only to subscribed/paid roles */}
                    {canSeeTuition ? (
                      (school.tuition_fees !== undefined && school.tuition_fees !== null) ? (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                          <span className="text-gray-700">Annual Tuition</span>
                          <span className="font-bold text-emerald-600">{money(school.tuition_fees)}</span>
                        </div>
                      ) : (
                        avgTuition !== null && (
                          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <span className="text-gray-700">Average Tuition</span>
                            <span className="font-bold text-emerald-600">{money(avgTuition)}</span>
                          </div>
                        )
                      )
                    ) : (
                      (avgTuition !== null || school.tuition_fees !== undefined) && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">Tuition</span>
                          <span className="font-semibold text-gray-800">Sign in to view</span>
                        </div>
                      )
                    )}

                    {/* Application fee: hide for public/student */}
                    {canSeeTuition && Number.isFinite(school.application_fee) && school.application_fee > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">Application Fee</span>
                        <span className="font-bold text-blue-600">{money(school.application_fee)}</span>
                      </div>
                    )}

                    {Number.isFinite(school.rating) && (
                      <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                        <Star className="w-5 h-5 text-yellow-400 fill-current mr-2" />
                        <span className="font-bold text-yellow-600">{school.rating}/5</span>
                      </div>
                    )}

                    {canSeeTuition && Number.isFinite(school.acceptance_rate) && (
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-gray-700">Acceptance Rate</span>
                        <span className="font-bold text-purple-600">{school.acceptance_rate}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* About: public gets short snippet, logged-in gets full */}
                {school.about && (
                  <div className="border-t pt-4 mt-6">
                    <h3 className="font-semibold text-gray-900 mb-2">About {school.name}</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {canSeeFullAbout ? school.about : truncate(school.about, 320)}
                    </p>
                    {!canSeeFullAbout && (
                      <div className="mt-3">
                        <Button variant="outline" onClick={() => openRoleDialog(null)}>
                          Sign in to read more
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programs */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">Available Programs</CardTitle>
              <span className="text-gray-600">
                Showing {totalPrograms === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalPrograms)} of {totalPrograms} programs
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Programs Available</h3>
                <p className="text-gray-600">This school hasn't listed any programs yet.</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-4 [grid-auto-rows:1fr]">
                  {currentPrograms.map((program) => {
                    const showTuitionLine = canSeeTuition && Number.isFinite(program.tuition_per_year) && program.tuition_per_year > 0;

                    return (
                      <Card key={program.id} className="border hover:shadow-lg transition-shadow h-full relative group">
                        <CardContent className="p-6 h-full">
                          <div className="grid h-full grid-rows-[minmax(120px,auto)_auto_auto] gap-3">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                                  {program.name}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {program.level && <Badge variant="secondary">{program.level}</Badge>}
                                  {program.duration && <Badge variant="outline">{program.duration}</Badge>}
                                </div>
                              </div>
                              {Number.isFinite(program.available_seats) && (
                                <Badge
                                  className={
                                    program.available_seats > 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }
                                >
                                  {program.available_seats} seats
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-3">
                              {/* Tuition line */}
                              {showTuitionLine ? (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Tuition per year</span>
                                  <span className="font-bold text-emerald-600">
                                    {money(program.tuition_per_year)}
                                  </span>
                                </div>
                              ) : (
                                // public/student: show soft hint (no numbers)
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Tuition</span>
                                  <span className="font-semibold text-gray-800">Sign in to view</span>
                                </div>
                              )}

                              {program.intakes && program.intakes.length > 0 && (
                                <div>
                                  <span className="text-gray-600">Intakes: </span>
                                  <span className="text-gray-900">{program.intakes.join(", ")}</span>
                                </div>
                              )}

                              {/* Overview snippet (safe for public) */}
                              {program.overview && (
                                <div className="text-sm text-gray-700">
                                  {truncate(program.overview, locked ? 180 : 260)}
                                </div>
                              )}
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                              {/* CTA */}
                              {canOpenProgramDetails && !showOnlyBasicForStudent ? (
                                <Button
                                  className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white"
                                  onClick={() => handleOpenProgram(program.id)}
                                >
                                  View Program Details
                                </Button>
                              ) : canOpenProgramDetails && showOnlyBasicForStudent ? (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleOpenProgram(program.id)}
                                >
                                  View Program Preview
                                </Button>
                              ) : (
                                <Button
                                  className="w-full"
                                  onClick={() => openRoleDialog(program.id)}
                                >
                                  Sign in to view details
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>

                        {/* overlay lock for non-users */}
                        {locked && (
                          <div className="absolute inset-0 rounded-lg bg-white/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                              <Lock className="w-4 h-4" />
                              Sign in to open details
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {/* Disclaimer */}
                <div className="text-xs text-gray-500 mb-6">
                  Program details, fees, and intakes may change. Confirm with the school or your agent.
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setProgramsPage((prev) => Math.max(1, prev - 1))}
                      disabled={programsPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <span className="text-gray-600">Page {programsPage} of {totalPages}</span>
                    <Button
                      variant="outline"
                      onClick={() => setProgramsPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={programsPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Role picker (includes Student) */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Continue</DialogTitle>
              <DialogDescription>
                Choose your role to sign in or register. This helps route you correctly.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 mt-2">
              <Button variant="outline" className="w-full h-11" onClick={() => chooseRoleAndShowLogin("user")}>
                I’m a Student / Parent
              </Button>
              <Button className="w-full h-11" onClick={() => chooseRoleAndShowLogin("agent")}>
                I’m an Agent
              </Button>
              <Button variant="outline" className="w-full h-11" onClick={() => chooseRoleAndShowLogin("tutor")}>
                I’m a Tutor
              </Button>

              <div className="pt-1 text-center text-sm text-gray-600">
                Already a member?{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={() => {
                    setChosenRole("user");
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

        {/* Login modal */}
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
