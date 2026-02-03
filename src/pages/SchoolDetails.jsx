// src/pages/SchoolDetails.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 MapPin,
 Globe,
 Calendar,
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
import SchoolForm from "@/components/admin/SchoolForm";

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
import {
 doc,
 getDoc,
 collection,
 getDocs,
 query,
 where,
 limit,
 setDoc,
 serverTimestamp,
 addDoc
} from "firebase/firestore";

/* ---------- helpers ---------- */
const pickFirst = (...vals) =>
 vals.find((v) => v !== undefined && v !== null && (`${v}`.trim?.() ?? `${v}`) !== "") ?? undefined;

const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const truncate = (txt, n = 220) => {
 const s = (txt || "").toString().trim();
 if (!s) return "";
 return s.length > n ? `${s.slice(0, n).trim()}...` : s;
};

const money = (amount) => {
 if (amount === undefined || amount === null || amount === "") return "";
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

const normalizeUrl = (url) => {
 const s = (url || "").toString().trim();
 if (!s) return "";
 if (s.startsWith("http://") || s.startsWith("https://")) return s;
 return `https://${s}`;
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
const DEFAULT_ROLE = "user"; // student/parent

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

/* ---------- Inline Login Dialog ---------- */
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

 // IMPORTANT: do NOT reference fbUser here (not in scope). Only reset when open changes.
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
 Apple Continue with Apple
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
 className="pl-10 h-12 pr-10"
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
 <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)} disabled={busy}>
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
 const schoolIdParam = searchParams.get("id"); // optional (admin/debug)
 const [school, setSchool] = useState(null);
 const [programs, setPrograms] = useState([]);
 const [loading, setLoading] = useState(true);
 const [programsPage, setProgramsPage] = useState(1);
 const programsPerPage = 10;

 const [fbUser, setFbUser] = useState(null);
 const [authReady, setAuthReady] = useState(false);
 const [fbProfile, setFbProfile] = useState(null);

 const [loginDialogOpen, setLoginDialogOpen] = useState(false);
 const [chosenRole] = useState("school"); // own-school-only: default to school

 // Add Program dialog
 const [programDialogOpen, setProgramDialogOpen] = useState(false);
 const [programSaving, setProgramSaving] = useState(false);
 // own-school-only: default to school

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

 // Resolve the institution doc id for the currently signed-in school user
 const resolveInstitutionId = useCallback(async () => {
 if (schoolIdParam) return schoolIdParam; // allow direct access by id (optional)
 if (!authReady) return null;
 if (!fbUser) return null;

 const uid = fbUser.uid;

 // institutions where user_id == uid (your schema)
 try {
 const instQ = query(collection(db, "institutions"), where("user_id", "==", uid), limit(1));
 const instSnap = await getDocs(instQ);
 if (!instSnap.empty) return instSnap.docs[0].id;
 } catch {
 // ignore
 }

 return null;
 }, [schoolIdParam, authReady, fbUser]);

 // Fetch institution + school_profile (both linked by user_id)
 useEffect(() => {
 let cancelled = false;

 (async () => {
 setLoading(true);

 try {
 // Wait for auth if no direct id
 if (!schoolIdParam && !authReady) return;

 // If auth is ready and still no user -> stop spinner and show login
 if (!schoolIdParam && authReady && !fbUser) {
 if (!cancelled) {
 setSchool(null);
 setPrograms([]);
 setLoading(false);
 }
 return;
 }

 const institutionId = await resolveInstitutionId();

 if (!institutionId) {
 if (!cancelled) {
 setSchool(null);
 setPrograms([]);
 setLoading(false);
 }
 return;
 }

 // Institution doc
 const instSnap = await safeGetDoc("institutions", institutionId);
 const instData = instSnap.exists() ? { id: instSnap.id, ...instSnap.data() } : null;

 // school_profiles doc via query where user_id == uid (your schema)
 let spData = null;
 if (fbUser?.uid) {
 try {
 const spQ = query(collection(db, "school_profiles"), where("user_id", "==", fbUser.uid), limit(1));
 const spSnap = await getDocs(spQ);
 if (!spSnap.empty) spData = { id: spSnap.docs[0].id, ...spSnap.docs[0].data() };
 } catch {
 spData = null;
 }
 }

 if (!instData && !spData) {
 if (!cancelled) {
 setSchool(null);
 setPrograms([]);
 setLoading(false);
 }
 return;
 }

 // Merge to a UI-ready school object
 const merged = {
 id: institutionId,
 name: pickFirst(instData?.name, spData?.school_name, spData?.institution_name, "Institution"),
 logo_url: pickFirst(instData?.logoUrl, instData?.logo_url),
 banner_url: pickFirst(instData?.bannerUrl, instData?.banner_url),
 image_url: pickFirst(instData?.imageUrl, instData?.image_url), // primary image
 image_urls: ensureArray(instData?.imageUrls),

 website: pickFirst(instData?.website, spData?.website),
 location: pickFirst(instData?.city, spData?.location),
 province: pickFirst(instData?.province),
 country: pickFirst(instData?.country),

 about: pickFirst(instData?.about, instData?.description, spData?.about, spData?.bio),
 description: pickFirst(instData?.description),
 address: pickFirst(instData?.address),
 phone: pickFirst(instData?.phone),
 email: pickFirst(instData?.email),

 dliNumber: pickFirst(instData?.dliNumber),
 year_established: pickFirst(instData?.year_established),
 application_fee: pickFirst(instData?.application_fee),
 avgTuition_field: pickFirst(instData?.avgTuition),
 cost_of_living: pickFirst(instData?.cost_of_living),
 public_private: pickFirst(instData?.public_private),

 verification_status: pickFirst(spData?.verification_status, instData?.verification_status),
 account_type: pickFirst(instData?.account_type, "real"),
 status: instData?.status,
 type: pickFirst(instData?.type, spData?.type),
 user_id: pickFirst(instData?.user_id, spData?.user_id),
 raw: { institution: instData, school_profile: spData }
 };

 if (!cancelled) setSchool(merged);

 // Programs: stored as documents in "schools" collection for this logged-in school user
 const programsFound = [];
 try {
 // Primary: by owner uid
 if (fbUser?.uid) {
 const q1 = query(
 collection(db, "schools"),
 where("user_id", "==", fbUser.uid),
 limit(500)
 );
 const snap1 = await getDocs(q1);
 snap1.forEach((d) => programsFound.push({ id: d.id, ...d.data() }));
 }
 } catch (e) {
 console.warn("Programs query (schools by user_id) failed:", e);
 }

 // Secondary: by institution link (if you ever support multiple institutions per uid)
 try {
 const q2 = query(
 collection(db, "schools"),
 where("institution_id", "==", institutionId),
 limit(500)
 );
 const snap2 = await getDocs(q2);
 snap2.forEach((d) => {
 if (!programsFound.find((p) => p.id === d.id)) programsFound.push({ id: d.id, ...d.data() });
 });
 } catch {}

 try {
 const q3 = query(
 collection(db, "schools"),
 where("institutionId", "==", institutionId),
 limit(500)
 );
 const snap3 = await getDocs(q3);
 snap3.forEach((d) => {
 if (!programsFound.find((p) => p.id === d.id)) programsFound.push({ id: d.id, ...d.data() });
 });
 } catch {}

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
 }, [schoolIdParam, fbUser, authReady, resolveInstitutionId]);

 const role = normalizeRole(fbProfile?.user_type || fbProfile?.role || "school");
 const isSignedIn = !!fbUser;

 const avgTuition = useMemo(() => {
 const vals = programs
 .map((p) => Number(p.tuition_per_year_cad ?? p.tuition_per_year ?? p.tuition_fee_cad ?? p.tuition ?? 0))
 .filter((v) => Number.isFinite(v) && v > 0);
 if (!vals.length) return null;
 const sum = vals.reduce((a, b) => a + b, 0);
 return Math.round(sum / vals.length);
 }, [programs]);

 const avgTuitionDisplay = avgTuition ?? school?.avgTuition_field ?? null;

 // pagination
 const totalPrograms = programs.length;
 const startIndex = (programsPage - 1) * programsPerPage;
 const endIndex = startIndex + programsPerPage;
 const currentPrograms = programs.slice(startIndex, endIndex);
 const totalPages = Math.max(1, Math.ceil(totalPrograms / programsPerPage));

 const nextPage = useMemo(() => "SchoolDetails", []);

 const openAddProgram = () => {
 setProgramDialogOpen(true);
 };

 const handleSaveProgram = async (data) => {
 if (!fbUser?.uid) return;
 if (!school?.id) return;

 setProgramSaving(true);

 try {
 // Save program documents in "schools" collection
 // Requirement: user_id must equal logged-in school user's UID
 const payload = {
 user_id: fbUser.uid,

 // ✅ REQUIRED BY FIRESTORE RULES
 school_id: school.id,

 // link back to institution (optional but useful)
 institution_id: school.id,
 institutionId: school.id,
 institution_name: school.name,
 school_name: school.name,

 // Program fields (SchoolForm output)
 program_title: data?.program_title || "",
 program_level: data?.program_level || "",
 field_of_study: data?.field_of_study || "",
 duration_display: data?.duration_display || "",
 tuition_fee_cad: Number(data?.tuition_fee_cad) || 0,
 application_fee: Number(data?.application_fee) || 0,
 intake_dates: Array.isArray(data?.intake_dates) ? data.intake_dates : [],
 program_overview: data?.program_overview || "",
 is_featured: !!data?.is_featured,

 created_at: serverTimestamp(),
 updated_at: serverTimestamp(),
 };

 await addDoc(collection(db, "schools"), payload);

 // Refresh programs list from "schools" (same logic as page)
 const programsFound = [];

 try {
 const q1 = query(collection(db, "schools"), where("user_id", "==", fbUser.uid), limit(500));
 const snap1 = await getDocs(q1);
 snap1.forEach((d) => programsFound.push({ id: d.id, ...d.data() }));
 } catch (e) {
 console.warn("Refresh programs by user_id failed:", e);
 }

 try {
 const q2 = query(collection(db, "schools"), where("institution_id", "==", school.id), limit(500));
 const snap2 = await getDocs(q2);
 snap2.forEach((d) => {
 if (!programsFound.find((p) => p.id === d.id)) programsFound.push({ id: d.id, ...d.data() });
 });
 } catch {}

 try {
 const q3 = query(collection(db, "schools"), where("institutionId", "==", school.id), limit(500));
 const snap3 = await getDocs(q3);
 snap3.forEach((d) => {
 if (!programsFound.find((p) => p.id === d.id)) programsFound.push({ id: d.id, ...d.data() });
 });
 } catch {}

 setPrograms(programsFound);
 setProgramsPage(1);
 setProgramDialogOpen(false);
 } catch (e) {
 console.error("Add program failed:", e);
 alert("Failed to add program. Check console for details.");
 } finally {
 setProgramSaving(false);
 }
 };


 const formatLocation = (s) => {
 const parts = [s?.location, s?.province, s?.country].filter(Boolean);
 return parts.join(", ");
 };

 // Loading
 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
 </div>
 );
 }

 // Own-user-only: auth ready, no user, and no ?id=
 if (authReady && !fbUser && !schoolIdParam) {
 return (
 <div className="min-h-screen flex items-center justify-center p-6">
 <Card className="max-w-md w-full">
 <CardContent className="p-6 text-center space-y-3">
 <Lock className="w-10 h-10 mx-auto text-gray-500" />
 <div className="text-lg font-semibold">Sign in required</div>
 <div className="text-sm text-gray-600">School Details is only available to your own school account.</div>
 <Button onClick={() => setLoginDialogOpen(true)} className="w-full">
 Sign in
 </Button>
 </CardContent>
 </Card>

 <LoginDialog
 open={loginDialogOpen}
 onOpenChange={setLoginDialogOpen}
 entryRole={chosenRole}
 nextPage={nextPage}
 />
 </div>
 );
 }

 // Not found / unresolved
 if (!school) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="text-center">
 <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
 <h2 className="text-xl font-semibold text-gray-900 mb-2">School Not Found</h2>
 <p className="text-gray-600">We couldn't load your school profile.</p>
 </div>
 </div>
 );
 }

 const websiteHref = normalizeUrl(school.website);

 return (
 <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
 <div className="max-w-6xl mx-auto">
 {/* Banner */}
 {school.banner_url ? (
 <div className="mb-6 overflow-hidden rounded-2xl shadow-lg bg-white">
 <img
 src={school.banner_url}
 alt={`${school.name} banner`}
 className="w-full h-[180px] md:h-[240px] object-cover"
 loading="lazy"
 />
 </div>
 ) : null}

 <Card className="bg-white/80 backdrop-blur-sm shadow-xl mb-8">
 <CardContent className="p-8">
 <div className="flex flex-col lg:flex-row gap-8">
 <div className="flex-shrink-0">
 {school.logo_url ? (
 <img src={school.logo_url} alt={`${school.name} logo`} className="w-48 h-32 object-cover rounded-lg shadow-md" />
 ) : school.image_url ? (
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
 <div className="flex gap-2 flex-wrap">
 {school.verification_status && (
 <Badge className={school.verification_status === "verified" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
 {school.verification_status === "verified" ? " Verified" : "Pending"}
 </Badge>
 )}
 {school.account_type && (
 <Badge className={school.account_type === "real" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
 {school.account_type === "real" ? "Real" : "Demo"}
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

 {websiteHref && (
 <div className="flex items-center text-gray-600">
 <Globe className="w-5 h-5 mr-2 text-emerald-600" />
 <a
 href={websiteHref}
 target="_blank"
 rel="noreferrer"
 className="text-emerald-700 hover:underline"
 >
 {school.website}
 </a>
 </div>
 )}
 </div>

 <div className="space-y-3">
 <div className="flex items-center text-gray-600">
 <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
 <span>Avg Tuition: {avgTuitionDisplay ? money(avgTuitionDisplay) : "Contact School"}</span>
 </div>
 {school.application_fee !== undefined && school.application_fee !== null && (
 <div className="text-sm text-gray-600">
 <span className="font-medium">Application fee:</span> {money(school.application_fee)}
 </div>
 )}
 </div>
 </div>

 {school.about ? (
 <div className="pt-2 text-gray-700">
 <p>{school.about}</p>
 </div>
 ) : null}
 </div>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
 <CardContent className="p-8">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-2xl font-bold text-gray-900">Programs</h2>

 <div className="flex items-center gap-3">
 <div className="text-sm text-gray-600">
 {totalPrograms} program{totalPrograms === 1 ? "" : "s"}
 </div>

 {isSignedIn && role === "school" && (
 <Button onClick={openAddProgram} className="h-9">
 Add Program
 </Button>
 )}
 </div>
 </div>

 {totalPrograms === 0 ? (
 <div className="text-gray-600">No programs found.</div>
 ) : (
 <div className="space-y-4">
 {currentPrograms.map((p) => (
 <div key={p.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
 <div>
 <div className="text-lg font-semibold text-gray-900">
 {pickFirst(p.program_title, p.title, p.program_name, "Program")}
 </div>
 <div className="text-sm text-gray-600">
 {pickFirst(p.program_level, p.level, "") ? `${pickFirst(p.program_level, p.level, "")} * ` : ""}
 {pickFirst(p.duration_display, p.duration, "")}
 </div>
 {pickFirst(p.program_overview, p.overview, p.description, "") ? (
 <div className="text-sm text-gray-600 mt-2">
 {truncate(pickFirst(p.program_overview, p.overview, p.description, ""), 160)}
 </div>
 ) : null}
 </div>

 <div className="flex items-center gap-2">
 <Button variant="outline" onClick={() => navigate(createPageUrl("Programs"))}>
 View all
 </Button>
 </div>
 </div>
 </div>
 ))}

 {totalPages > 1 && (
 <div className="flex items-center justify-between pt-4">
 <Button
 variant="outline"
 onClick={() => setProgramsPage((v) => Math.max(1, v - 1))}
 disabled={programsPage <= 1}
 >
 <ChevronLeft className="w-4 h-4 mr-1" />
 Prev
 </Button>

 <div className="text-sm text-gray-600">
 Page {programsPage} of {totalPages}
 </div>

 <Button
 variant="outline"
 onClick={() => setProgramsPage((v) => Math.min(totalPages, v + 1))}
 disabled={programsPage >= totalPages}
 >
 Next
 <ChevronRight className="w-4 h-4 ml-1" />
 </Button>
 </div>
 )}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Add Program Dialog */}
 <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
 <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
 <DialogHeader>
 <DialogTitle>Add Program</DialogTitle>
 <DialogDescription>Create a new program under this school.</DialogDescription>
 </DialogHeader>

 <div className="pb-2">
 <SchoolForm
 school={{
 institution_name: school?.name || "",
 institution_type: (school?.type || "University").toString().replace(/^\w/, (c) => c.toUpperCase()),
 institution_logo_url: school?.logo_url || "",
 school_name: school?.name || "",
 school_country: school?.country || "Canada",
 school_province: school?.province || "",
 school_city: school?.location || "",
 program_title: "",
 program_level: "bachelor",
 field_of_study: "",
 duration_display: "",
 tuition_fee_cad: 0,
 application_fee: 0,
 intake_dates: [],
 program_overview: "",
 is_featured: false,
 }}
 onSave={handleSaveProgram}
 onCancel={() => setProgramDialogOpen(false)}
 />

 {programSaving && (
 <div className="text-sm text-gray-600 mt-3">Saving program...</div>
 )}
 </div>
 </DialogContent>
 </Dialog>

 {/* Details */}
 <Card className="bg-white/80 backdrop-blur-sm shadow-xl mt-8">
 <CardContent className="p-8">
 <h2 className="text-2xl font-bold text-gray-900 mb-4">School Details</h2>

 <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
 <div><span className="font-semibold">Address:</span> {school.address || "-"}</div>
 <div><span className="font-semibold">Phone:</span> {school.phone || "-"}</div>
 <div><span className="font-semibold">Email:</span> {school.email || "-"}</div>
 <div><span className="font-semibold">DLI Number:</span> {school.dliNumber || "-"}</div>
 <div><span className="font-semibold">Year Established:</span> {school.year_established || "-"}</div>
 <div><span className="font-semibold">Application Fee:</span> {school.application_fee ? money(school.application_fee) : "-"}</div>
 <div><span className="font-semibold">Cost of Living:</span> {school.cost_of_living ? money(school.cost_of_living) : "-"}</div>
 <div><span className="font-semibold">Public/Private:</span> {school.public_private || "-"}</div>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
