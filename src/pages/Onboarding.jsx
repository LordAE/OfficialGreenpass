// src/pages/Onboarding.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Loader2,
  User as UserIcon,
  Briefcase,
  BookOpen,
  Building,
  Store,
  ArrowRight,
  Check,
  ArrowLeft,
  LogOut,
  BadgeCheck,
  CreditCard,
  ShieldCheck,
  ChevronsUpDown,
} from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

// 🔥 Firebase
import { auth, db } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

// 🔧 Firestore entities (for creating the first role record after onboarding)
import { Agent, Tutor, SchoolProfile, Vendor } from "@/api/entities";

const STEPS = {
  CHOOSE_ROLE: "choose_role",
  BASIC_INFO: "basic_info",
  ROLE_SPECIFIC: "role_specific",
  SUBSCRIPTION: "subscription",
  COMPLETE: "complete",
};

const ROLE_OPTIONS = [
  {
    type: "user",
    title: "Student",
    subtitle: "I want to study abroad",
    description:
      "Find schools, get visa help, connect with tutors, and manage your study abroad journey",
    icon: <UserIcon className="w-8 h-8" />,
    color: "bg-blue-500",
    benefits: [
      "Access to thousands of programs",
      "Free counselor matching",
      "Visa application support",
      "Test prep resources",
    ],
  },
  {
    type: "agent",
    title: "Education Agent",
    subtitle: "I help students study abroad",
    description:
      "Connect with students, manage applications, earn commissions, and grow your agency",
    icon: <Briefcase className="w-8 h-8" />,
    color: "bg-purple-500",
    benefits: ["Student referral system", "Commission tracking", "Case management tools", "Marketing support"],
  },
  {
    type: "tutor",
    title: "Tutor",
    subtitle: "I teach test prep & languages",
    description: "Offer tutoring services, manage sessions, earn income teaching students",
    icon: <BookOpen className="w-8 h-8" />,
    color: "bg-green-500",
    benefits: ["Online session platform", "Student matching", "Payment processing", "Schedule management"],
  },
  {
    type: "school",
    title: "Educational Institution",
    subtitle: "I represent a school/college",
    description: "Promote programs, connect with students, manage applications and enrollments",
    icon: <Building className="w-8 h-8" />,
    color: "bg-indigo-500",
    benefits: ["Program listings", "Student inquiries", "Application management", "Marketing tools"],
  },
  {
    type: "vendor",
    title: "Service Provider",
    subtitle: "I offer student services",
    description: "Provide services like transport, SIM cards, accommodation to international students",
    icon: <Store className="w-8 h-8" />,
    color: "bg-orange-500",
    benefits: ["Service marketplace", "Order management", "Payment processing", "Customer reviews"],
  },
];

// ✅ Helpers to handle CSV ↔ array safely
const csvToArray = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const arrayToCSV = (v) => (Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "");

// 🌍 Country helpers (flags as images + all countries via Intl, with API fallback)
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
    const dn = Intl.DisplayNames ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

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

function CountrySelect({ valueCode, valueName, onChange }) {
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
    const byCode = valueCode && countries.find((c) => c.code === valueCode.toUpperCase());
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between mt-1">
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
              <span className="text-gray-500">Select your country</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList className="max-h-72">
            {loading && (
              <div className="p-3 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading countries...
              </div>
            )}

            {!loading && <CommandEmpty>No country found.</CommandEmpty>}

            <CommandGroup>
              {countries.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code}`}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
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

// ✅ keep stable component (no remount on typing)
const BiographyField = React.memo(function BiographyField({
  label = "Biography / Description",
  value = "",
  onChange,
}) {
  return (
    <div>
      <Label htmlFor="bio">{label}</Label>
      <Textarea
        id="bio"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Write a short bio/description that will be shown on your public profile..."
        className="mt-1"
        rows={4}
      />
      <p className="text-xs text-gray-500 mt-1">Optional, but recommended for better profile visibility.</p>
    </div>
  );
});

const VALID_ROLES = ["user", "agent", "tutor", "school", "vendor"];
const DEFAULT_ROLE = "user";

const normalizeRole = (r) => {
  const v = (r || "").toString().trim().toLowerCase();
  return VALID_ROLES.includes(v) ? v : DEFAULT_ROLE;
};

function buildUserDefaults({ email, full_name = "", role = DEFAULT_ROLE }) {
  const finalRole = normalizeRole(role);

  return {
    role: finalRole,
    email,
    full_name,
    user_type: finalRole,
    userType: finalRole,
    phone: "",
    country: "",
    country_code: "",

    // keep bio field supported at root for directory; but user/student onboarding won't ask for it
    bio: "",

    address: { street: "", ward: "", district: "", province: "", postal_code: "" },
    profile_picture: "",
    is_verified: false,
    onboarding_completed: false,
    onboarding_step: STEPS.CHOOSE_ROLE,
    selected_role: finalRole,

    subscription_active: false,
    subscription_status: "none",
    subscription_provider: "paypal",
    subscription_plan: "",
    subscription_amount: 0,
    subscription_currency: "USD",

    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
}

// 🔐 Subscription prices (USD/year)
const SUBSCRIPTION_PRICING = {
  user: { label: "Student", amount: 19, currency: "USD" },
  tutor: { label: "Tutor", amount: 29, currency: "USD" },
  agent: { label: "Agent", amount: 29, currency: "USD" },
  school: { label: "School", amount: 299, currency: "USD" },
  vendor: { label: "Vendor", amount: 29, currency: "USD" },
};

function loadPayPalScript({ clientId, currency = "USD" }) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.paypal) return resolve(true);

    const existing = document.querySelector('script[data-paypal-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons`;
    script.async = true;
    script.defer = true;
    script.type = "text/javascript";
    script.dataset.paypalSdk = "true";
    script.setAttribute("data-paypal-sdk", "true");

    script.onload = () => resolve(true);
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
}

export default function Onboarding() {
  const navigate = useNavigate();

  // stable search params
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const urlRoleRaw = useMemo(() => {
    const raw = params.get("role") ?? params.get("userType") ?? params.get("as");
    return raw && String(raw).trim() ? String(raw).trim() : null;
  }, [params]);

  const urlRole = useMemo(() => (urlRoleRaw ? normalizeRole(urlRoleRaw) : null), [urlRoleRaw]);

  const urlLock = useMemo(() => {
    const v = (params.get("lock") || params.get("locked") || "").toString();
    return v === "1" || v.toLowerCase() === "true";
  }, [params]);

  const sessionRoleRaw = useMemo(() => {
    if (typeof window === "undefined") return null;
    const v = sessionStorage.getItem("onboarding_role");
    return v && String(v).trim() ? String(v).trim() : null;
  }, []);

  const sessionRole = useMemo(() => (sessionRoleRaw ? normalizeRole(sessionRoleRaw) : null), [sessionRoleRaw]);

  const sessionLock = useMemo(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("onboarding_role_locked") === "1";
  }, []);

  const rolePreselected = useMemo(() => Boolean(urlRole || sessionRole), [urlRole, sessionRole]);

  const roleHintFromEntry = useMemo(() => {
    if (urlRole) return urlRole;
    if (sessionRole) return sessionRole;
    return DEFAULT_ROLE;
  }, [urlRole, sessionRole]);

  const roleLockedFromEntry = useMemo(() => {
    return Boolean(urlLock || sessionLock || rolePreselected);
  }, [urlLock, sessionLock, rolePreselected]);

  const roleHintRef = useRef(roleHintFromEntry);
  const roleLockedRef = useRef(roleLockedFromEntry);
  useEffect(() => {
    roleHintRef.current = roleHintFromEntry;
    roleLockedRef.current = roleLockedFromEntry;
  }, [roleHintFromEntry, roleLockedFromEntry]);

  const formDirtyRef = useRef(false);

  const [currentStep, setCurrentStep] = useState(STEPS.CHOOSE_ROLE);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({});
  const [profile, setProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // PayPal state (used ONLY for non-user roles)
  const paypalContainerRef = useRef(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const PAYPAL_CLIENT_ID = (import.meta?.env?.VITE_PAYPAL_CLIENT_ID || "").trim();

  // ✅ Dynamic step order aligned to: user/student has no ROLE_SPECIFIC & no SUBSCRIPTION
  const STEP_ORDER = useMemo(() => {
    if (selectedRole === "user") {
      return [STEPS.CHOOSE_ROLE, STEPS.BASIC_INFO, STEPS.COMPLETE];
    }
    return [STEPS.CHOOSE_ROLE, STEPS.BASIC_INFO, STEPS.ROLE_SPECIFIC, STEPS.SUBSCRIPTION, STEPS.COMPLETE];
  }, [selectedRole]);

  const getStepProgress = () => {
    const idx = Math.max(0, STEP_ORDER.indexOf(currentStep));
    const total = Math.max(1, STEP_ORDER.length - 1);
    return Math.round((idx / total) * 100);
  };

  // ✅ Auth/load profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        navigate(createPageUrl("Welcome"), { replace: true });
        return;
      }

      const entryRoleHint = roleHintRef.current;
      const entryRoleLocked = roleLockedRef.current;

      const ref = doc(db, "users", fbUser.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(
          ref,
          buildUserDefaults({
            email: fbUser.email || "",
            full_name: fbUser.displayName || "",
            role: entryRoleHint,
          })
        );
      }

      const finalSnap = await getDoc(ref);
      const data = finalSnap.data() || {};
      setProfile(data);

      const roleFromProfile = normalizeRole(
        data.selected_role || data.user_type || data.userType || data.role || DEFAULT_ROLE
      );

      const effectiveRole = entryRoleLocked ? normalizeRole(entryRoleHint) : roleFromProfile;

      // ✅ if role locked from entry and still at choose_role, bump to BASIC_INFO
      let nextStep = data.onboarding_completed ? STEPS.COMPLETE : data.onboarding_step || STEPS.CHOOSE_ROLE;

      const needsRoleSync =
        entryRoleLocked &&
        (data.selected_role !== effectiveRole ||
          data.user_type !== effectiveRole ||
          data.userType !== effectiveRole ||
          data.role !== effectiveRole);

      if (entryRoleLocked && nextStep === STEPS.CHOOSE_ROLE) {
        nextStep = STEPS.BASIC_INFO;
        await updateDoc(ref, {
          selected_role: effectiveRole,
          user_type: effectiveRole,
          userType: effectiveRole,
          role: effectiveRole,
          onboarding_step: STEPS.BASIC_INFO,
          updated_at: serverTimestamp(),
        });
      } else if (needsRoleSync) {
        await updateDoc(ref, {
          selected_role: effectiveRole,
          user_type: effectiveRole,
          userType: effectiveRole,
          role: effectiveRole,
          updated_at: serverTimestamp(),
        });
      }

      // ✅ ALIGNMENT: if user role, force next step to BASIC_INFO or COMPLETE only
      if (effectiveRole === "user" && !data.onboarding_completed) {
        if (nextStep === STEPS.ROLE_SPECIFIC || nextStep === STEPS.SUBSCRIPTION) {
          nextStep = STEPS.BASIC_INFO;
          await updateDoc(ref, { onboarding_step: STEPS.BASIC_INFO, updated_at: serverTimestamp() });
        }
      }

      setSelectedRole(effectiveRole);
      setCurrentStep(nextStep);

      // ✅ resolve bio (kept, but user onboarding won't ask)
      const resolvedBio =
        data.bio ||
        data.agent_profile?.bio ||
        data.tutor_profile?.bio ||
        data.school_profile?.bio ||
        data.vendor_profile?.bio ||
        "";

      setFormData((prev) => {
        if (formDirtyRef.current) return prev;

        return {
          full_name: data.full_name || fbUser.displayName || "",
          phone: data.phone || "",
          country: data.country || "",
          country_code: data.country_code || "",
          email: data.email || fbUser.email || "",

          bio: resolvedBio,

          company_name: data.agent_profile?.company_name || "",
          business_license_mst: data.agent_profile?.business_license_mst || "",
          year_established: data.agent_profile?.year_established || "",

          paypal_email:
            data.agent_profile?.paypal_email ||
            data.tutor_profile?.paypal_email ||
            data.vendor_profile?.paypal_email ||
            "",

          specializations: arrayToCSV(data.tutor_profile?.specializations),
          experience_years: data.tutor_profile?.experience_years || "",
          hourly_rate: data.tutor_profile?.hourly_rate || "",

          school_name: data.school_profile?.school_name || "",
          location: data.school_profile?.location || "",
          website: data.school_profile?.website || "",
          type: data.school_profile?.type || "",
          about: data.school_profile?.about || "",

          business_name: data.vendor_profile?.business_name || "",
          service_categories: data.vendor_profile?.service_categories || [],
        };
      });

      // if already complete
      if (data.onboarding_completed) {
        try {
          sessionStorage.removeItem("onboarding_role_locked");
          sessionStorage.removeItem("onboarding_role");
        } catch {}
        navigate(createPageUrl("Dashboard"), { replace: true });
        return;
      }

      setProfileLoading(false);
      setAuthChecked(true);
    });

    return () => unsub();
  }, [navigate]);

  const handleRoleSelect = async (roleType) => {
    if (roleLockedFromEntry) return;
    setSelectedRole(roleType);

    // ✅ user goes straight to basic info; others too
    setCurrentStep(STEPS.BASIC_INFO);

    if (auth.currentUser) {
      const ref = doc(db, "users", auth.currentUser.uid);
      await updateDoc(ref, {
        selected_role: roleType,
        user_type: roleType,
        userType: roleType,
        role: roleType,
        onboarding_step: STEPS.BASIC_INFO,
        updated_at: serverTimestamp(),
      });
    }
  };

  const validateBasicInfo = () => !!(formData.full_name && formData.phone && formData.country);

  const validateRoleSpecificInfo = () => {
    // ✅ user should never be in role_specific anymore
    if (selectedRole === "user") return true;

    if (selectedRole === "agent") return formData.company_name && formData.business_license_mst && formData.paypal_email;
    if (selectedRole === "tutor")
      return (
        csvToArray(formData.specializations).length > 0 &&
        !!formData.experience_years &&
        !!formData.hourly_rate &&
        !!formData.paypal_email
      );
    if (selectedRole === "school") return formData.school_name && formData.location && formData.website && formData.type;
    if (selectedRole === "vendor") return formData.business_name && formData.service_categories?.length > 0 && formData.paypal_email;
    return false;
  };

  // ✅ Finalize onboarding (reused)
  const finalizeOnboarding = async ({ subscriptionActive, paypalOrderId = "", paypalDetails = null, skipped = false }) => {
    if (!auth.currentUser || !selectedRole) return;
    setSaving(true);
    try {
      const uid = auth.currentUser.uid;
      const ref = doc(db, "users", uid);

      const plan = SUBSCRIPTION_PRICING[selectedRole] || SUBSCRIPTION_PRICING.user;

      const updates = {
        onboarding_completed: true,
        onboarding_step: STEPS.COMPLETE,
        updated_at: serverTimestamp(),

        subscription_active: Boolean(subscriptionActive),
        subscription_status: subscriptionActive ? "active" : skipped ? "skipped" : "none",
        subscription_provider: "paypal",
        subscription_plan: `${selectedRole}_yearly`,
        subscription_amount: Number(plan.amount) || 0,
        subscription_currency: plan.currency || "USD",

        paypal_order_id: paypalOrderId || "",
        paypal_capture: paypalDetails ? paypalDetails : null,
        subscribed_at: subscriptionActive ? serverTimestamp() : null,
      };

      await updateDoc(ref, updates);

      // ✅ Seed role collections ONLY for non-user roles
      if (selectedRole !== "user") {
        const now = serverTimestamp();
        try {
          const profileSnap = await getDoc(ref);
          const data = profileSnap.data() || {};

          if (selectedRole === "agent" && data.agent_profile) {
            const existing = await Agent.filter({ user_id: uid }, { limit: 1 });
            if (!existing.length) {
              await Agent.create({
                user_id: uid,
                verification_status: "pending",
                is_visible: false,
                referral_code: `AG${Date.now().toString().slice(-6)}`,
                created_at: now,
                updated_at: now,
                ...data.agent_profile,
              });
            }
          }

          if (selectedRole === "tutor" && data.tutor_profile) {
            const existing = await Tutor.filter({ user_id: uid }, { limit: 1 });
            if (!existing.length) {
              await Tutor.create({
                user_id: uid,
                verification_status: "pending",
                is_visible: false,
                rating: 0,
                total_students: 0,
                created_at: now,
                updated_at: now,
                ...data.tutor_profile,
              });
            }
          }

          if (selectedRole === "school" && data.school_profile) {
            const existing = await SchoolProfile.filter({ user_id: uid }, { limit: 1 });
            if (!existing.length) {
              await SchoolProfile.create({
                user_id: uid,
                verification_status: "pending",
                created_at: now,
                updated_at: now,
                ...data.school_profile,
              });
            }
          }

          if (selectedRole === "vendor" && data.vendor_profile) {
            const existing = await Vendor.filter({ user_id: uid }, { limit: 1 });
            if (!existing.length) {
              await Vendor.create({
                user_id: uid,
                verification_status: "pending",
                created_at: now,
                updated_at: now,
                ...data.vendor_profile,
              });
            }
          }
        } catch (e) {
          console.warn("Seeding role collection failed (non-fatal):", e);
        }
      }

      setCurrentStep(STEPS.COMPLETE);

      try {
        sessionStorage.removeItem("onboarding_role_locked");
        sessionStorage.removeItem("onboarding_role");
      } catch {}

      setTimeout(() => navigate(createPageUrl("Dashboard"), { replace: true }), 600);
    } catch (e) {
      console.error("Error finalizing onboarding:", e);
      alert("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ BASIC INFO submit: user goes straight to complete (skips role_specific + subscription)
  const handleBasicInfoSubmit = async () => {
    if (!selectedRole || !validateBasicInfo()) return;

    if (auth.currentUser) {
      const ref = doc(db, "users", auth.currentUser.uid);
      await updateDoc(ref, {
        onboarding_step: selectedRole === "user" ? STEPS.COMPLETE : STEPS.ROLE_SPECIFIC,
        full_name: formData.full_name || "",
        phone: formData.phone || "",
        country: formData.country || "",
        country_code: formData.country_code || "",
        updated_at: serverTimestamp(),
      });
    }

    if (selectedRole === "user") {
      // ✅ immediate finish for user/student
      await finalizeOnboarding({ subscriptionActive: false, skipped: true });
      return;
    }

    setCurrentStep(STEPS.ROLE_SPECIFIC);
  };

  const handleBack = async () => {
    let next = STEPS.CHOOSE_ROLE;

    if (currentStep === STEPS.COMPLETE) {
      next = selectedRole === "user" ? STEPS.BASIC_INFO : STEPS.SUBSCRIPTION;
    } else if (currentStep === STEPS.SUBSCRIPTION) next = STEPS.ROLE_SPECIFIC;
    else if (currentStep === STEPS.ROLE_SPECIFIC) next = STEPS.BASIC_INFO;
    else if (currentStep === STEPS.BASIC_INFO) next = roleLockedFromEntry ? STEPS.BASIC_INFO : STEPS.CHOOSE_ROLE;

    if (next === currentStep) return;

    setCurrentStep(next);
    if (auth.currentUser) {
      const ref = doc(db, "users", auth.currentUser.uid);
      await updateDoc(ref, { onboarding_step: next, updated_at: serverTimestamp() });
    }
  };

  /**
   * Save role-specific info then go to subscription (non-user roles only)
   */
  const handleRoleSpecificSubmitGoSubscription = async () => {
    if (!auth.currentUser || !selectedRole || selectedRole === "user" || !validateRoleSpecificInfo()) return;
    setSaving(true);
    try {
      const uid = auth.currentUser.uid;
      const ref = doc(db, "users", uid);

      const updates = {
        selected_role: selectedRole,
        full_name: formData.full_name || "",
        phone: formData.phone || "",
        country: formData.country || "",
        country_code: formData.country_code || "",

        // ✅ save bio for directory display (non-user roles)
        bio: formData.bio || "",

        onboarding_step: STEPS.SUBSCRIPTION,
        updated_at: serverTimestamp(),
      };

      updates.user_type = selectedRole;
      updates.userType = selectedRole;
      updates.role = selectedRole;

      if (selectedRole === "agent") {
        updates.agent_profile = {
          company_name: formData.company_name || "",
          business_license_mst: formData.business_license_mst || "",
          year_established: formData.year_established || "",
          paypal_email: formData.paypal_email || "",
          bio: formData.bio || "",
        };
      }

      if (selectedRole === "tutor") {
        updates.tutor_profile = {
          specializations: csvToArray(formData.specializations),
          experience_years: Number(formData.experience_years) || 0,
          hourly_rate: Number(formData.hourly_rate) || 0,
          paypal_email: formData.paypal_email || "",
          bio: formData.bio || "",
        };
      }

      if (selectedRole === "school") {
        updates.school_profile = {
          school_name: formData.school_name || "",
          location: formData.location || "",
          website: formData.website || "",
          type: formData.type || "",
          about: formData.about || "",
          bio: formData.bio || "",
        };
      }

      if (selectedRole === "vendor") {
        updates.vendor_profile = {
          business_name: formData.business_name || "",
          service_categories: formData.service_categories || [],
          paypal_email: formData.paypal_email || "",
          bio: formData.bio || "",
        };
      }

      await updateDoc(ref, updates);
      setCurrentStep(STEPS.SUBSCRIPTION);
    } catch (e) {
      console.error("Error saving role-specific info:", e);
      alert("An error occurred while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // 🧾 PayPal render (ONLY for non-user roles)
  useEffect(() => {
    const run = async () => {
      if (currentStep !== STEPS.SUBSCRIPTION) return;
      if (selectedRole === "user") return; // ✅ never show PayPal for user/student

      setPaypalError("");
      setPaypalReady(false);

      if (!PAYPAL_CLIENT_ID) {
        setPaypalError("PayPal is not configured (missing VITE_PAYPAL_CLIENT_ID). You can skip for now.");
        return;
      }

      const plan = SUBSCRIPTION_PRICING[selectedRole] || SUBSCRIPTION_PRICING.user;
      const amountValue = Number(plan.amount || 0).toFixed(2);

      try {
        await loadPayPalScript({ clientId: PAYPAL_CLIENT_ID, currency: plan.currency || "USD" });

        if (!paypalContainerRef.current) return;
        paypalContainerRef.current.innerHTML = "";

        const buttons = window.paypal.Buttons({
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [
                {
                  description: `GreenPass Subscription (${plan.label}) - Yearly`,
                  amount: { value: amountValue, currency_code: plan.currency || "USD" },
                },
              ],
            });
          },
          onApprove: async (data, actions) => {
            try {
              setSubmittingPayment(true);
              const details = await actions.order.capture();
              await finalizeOnboarding({
                subscriptionActive: true,
                paypalOrderId: data?.orderID || "",
                paypalDetails: details || null,
                skipped: false,
              });
            } catch (e) {
              console.error(e);
              setPaypalError("Payment was approved but capture failed. Please try again.");
            } finally {
              setSubmittingPayment(false);
            }
          },
          onCancel: () => setPaypalError("Payment cancelled. You can try again or skip for now."),
          onError: (err) => {
            console.error(err);
            setPaypalError("PayPal error occurred. Please try again or skip for now.");
          },
        });

        buttons.render(paypalContainerRef.current);
        setPaypalReady(true);
      } catch (e) {
        console.error(e);
        setPaypalError("Failed to load PayPal. You can skip for now.");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedRole, PAYPAL_CLIENT_ID]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    } finally {
      navigate(createPageUrl("Welcome"), { replace: true });
      setLoggingOut(false);
    }
  };

  const RoleLockedPill = ({ role }) => {
    if (!roleLockedFromEntry) return null;
    const label = role?.charAt(0).toUpperCase() + role?.slice(1);
    return (
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-white/70">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        Role selected: <span className="font-semibold">{label}</span>
        <BadgeCheck className="w-4 h-4 text-emerald-600" />
      </div>
    );
  };

  const renderChooseRole = () => (
    <div className="text-center max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Welcome to GreenPass!</h1>
        <p className="text-lg text-gray-600">Choose your role to get started with your personalized experience</p>
        <div className="mt-3">
          <RoleLockedPill role={selectedRole} />
        </div>
      </div>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {ROLE_OPTIONS.map((role) => (
          <Card
            key={role.type}
            className={`cursor-pointer transition-all duration-300 border-2 hover:shadow-xl hover:scale-105 group
              ${roleLockedFromEntry ? "opacity-60 pointer-events-none" : "hover:border-green-500"}
            `}
            onClick={() => handleRoleSelect(role.type)}
            title={roleLockedFromEntry ? "Role already selected from previous step" : `Sign up as ${role.title}`}
          >
            <CardContent className="p-6">
              <div className="text-center">
                <div className={`${role.color} text-white p-4 rounded-full mb-4 mx-auto w-fit group-hover:scale-110 transition-transform`}>
                  {role.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{role.title}</h3>
                <p className="text-sm font-medium text-green-600 mb-3">{role.subtitle}</p>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">{role.description}</p>
                <div className="space-y-2">
                  {role.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center text-xs text-gray-500">
                      <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderBasicInfo = () => {
    const selectedRoleData = ROLE_OPTIONS.find((r) => r.type === selectedRole) || ROLE_OPTIONS[0];
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className={`${selectedRoleData?.color} text-white p-3 rounded-full mb-4 mx-auto w-fit`}>
            {selectedRoleData?.icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
          <p className="text-gray-600">Setting up your {selectedRoleData?.title} profile</p>
          <div className="mt-3">
            <RoleLockedPill role={selectedRole} />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name || ""}
              onChange={(e) => {
                formDirtyRef.current = true;
                setFormData((p) => ({ ...p, full_name: e.target.value }));
              }}
              placeholder="Enter your full name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" value={formData.email || ""} disabled className="mt-1 bg-gray-100" />
            <p className="text-xs text-gray-500 mt-1">This is your login email and cannot be changed</p>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone || ""}
              onChange={(e) => {
                formDirtyRef.current = true;
                setFormData((p) => ({ ...p, phone: e.target.value }));
              }}
              placeholder="Enter your phone number"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Country *</Label>
            <CountrySelect
              valueCode={formData.country_code || ""}
              valueName={formData.country || ""}
              onChange={(c) =>
                setFormData((p) => ({
                  ...p,
                  country: c.name,
                  country_code: c.code,
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">Search and select your country (with flag).</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
              disabled={roleLockedFromEntry && currentStep === STEPS.BASIC_INFO}
              title={roleLockedFromEntry && currentStep === STEPS.BASIC_INFO ? "Role locked by entry flow" : "Back"}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleBasicInfoSubmit} className="flex-1" disabled={!validateBasicInfo() || saving}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderRoleSpecific = () => {
    const selectedRoleData = ROLE_OPTIONS.find((r) => r.type === selectedRole);
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className={`${selectedRoleData?.color} text-white p-3 rounded-full mb-4 mx-auto w-fit`}>
            {selectedRoleData?.icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your {selectedRoleData?.title} Profile</h2>
          <p className="text-gray-600">Just a few more details to continue</p>
          <div className="mt-3">
            <RoleLockedPill role={selectedRole} />
          </div>
        </div>

        {/* Agent */}
        {selectedRole === "agent" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, company_name: e.target.value }));
                }}
                placeholder="Your education consultancy name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="business_license_mst">Business License (MST) *</Label>
              <Input
                id="business_license_mst"
                value={formData.business_license_mst || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, business_license_mst: e.target.value }));
                }}
                placeholder="Enter your business license number"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="year_established">Year Established</Label>
              <Input
                id="year_established"
                type="number"
                value={formData.year_established || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, year_established: e.target.value }));
                }}
                placeholder="2020"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="paypal_email">PayPal Email *</Label>
              <Input
                id="paypal_email"
                type="email"
                value={formData.paypal_email || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, paypal_email: e.target.value }));
                }}
                placeholder="payouts@example.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Required for commission payouts</p>
            </div>

            <BiographyField
              label="Agency Biography / Description"
              value={formData.bio || ""}
              onChange={(val) => {
                formDirtyRef.current = true;
                setFormData((p) => ({ ...p, bio: val }));
              }}
            />
          </div>
        )}

        {/* Tutor */}
        {selectedRole === "tutor" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="specializations">Specializations *</Label>
              <Input
                id="specializations"
                value={formData.specializations || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, specializations: e.target.value }));
                }}
                placeholder="IELTS, TOEFL, General English"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple specializations with commas</p>
            </div>

            <div>
              <Label htmlFor="experience_years">Years of Experience *</Label>
              <Input
                id="experience_years"
                type="number"
                value={formData.experience_years || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, experience_years: e.target.value }));
                }}
                placeholder="5"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="hourly_rate">Hourly Rate (USD) *</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                value={formData.hourly_rate || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, hourly_rate: e.target.value }));
                }}
                placeholder="25.00"
                className="mt-1"
              />
            </div>

            <BiographyField
              label="Tutor Biography / Description"
              value={formData.bio || ""}
              onChange={(val) => {
                formDirtyRef.current = true;
                setFormData((p) => ({ ...p, bio: val }));
              }}
            />

            <div>
              <Label htmlFor="paypal_email">PayPal Email *</Label>
              <Input
                id="paypal_email"
                type="email"
                value={formData.paypal_email || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, paypal_email: e.target.value }));
                }}
                placeholder="payouts@example.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Required for session payouts</p>
            </div>
          </div>
        )}

        {/* School */}
        {selectedRole === "school" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="school_name">Institution Name *</Label>
              <Input
                id="school_name"
                value={formData.school_name || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, school_name: e.target.value }));
                }}
                placeholder="e.g., University of Toronto"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="type">School Type *</Label>
              <Select value={formData.type || ""} onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select institution type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High School">High School</SelectItem>
                  <SelectItem value="College">College</SelectItem>
                  <SelectItem value="University">University</SelectItem>
                  <SelectItem value="Institute">Institute</SelectItem>
                  <SelectItem value="Vocational">Vocational School</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">City/Location *</Label>
              <Input
                id="location"
                value={formData.location || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, location: e.target.value }));
                }}
                placeholder="e.g., Toronto, ON"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="website">Official Website *</Label>
              <Input
                id="website"
                type="url"
                value={formData.website || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, website: e.target.value }));
                }}
                placeholder="https://www.university.edu"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="about">About Your Institution</Label>
              <Textarea
                id="about"
                value={formData.about || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, about: e.target.value }));
                }}
                placeholder="Brief description of your institution..."
                className="mt-1"
                rows={3}
              />
            </div>

            <BiographyField
              label="Profile Biography / Description"
              value={formData.bio || ""}
              onChange={(val) => {
                formDirtyRef.current = true;
                setFormData((p) => ({ ...p, bio: val }));
              }}
            />
          </div>
        )}

        {/* Vendor */}
        {selectedRole === "vendor" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={formData.business_name || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, business_name: e.target.value }));
                }}
                placeholder="Your business name"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Service Categories *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {["Transport", "SIM Card", "Banking", "Accommodation", "Delivery", "Tours"].map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={formData.service_categories?.includes(category) || false}
                      onChange={(e) => {
                        const cur = formData.service_categories || [];
                        const updated = e.target.checked ? [...cur, category] : cur.filter((c) => c !== category);
                        setFormData((p) => ({ ...p, service_categories: updated }));
                      }}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor={`category-${category}`} className="text-sm text-gray-700">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="paypal_email">PayPal Email *</Label>
              <Input
                id="paypal_email"
                type="email"
                value={formData.paypal_email || ""}
                onChange={(e) => {
                  formDirtyRef.current = true;
                  setFormData((p) => ({ ...p, paypal_email: e.target.value }));
                }}
                placeholder="payouts@example.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Required for service payouts</p>
            </div>

            <BiographyField
              label="Business Biography / Description"
              value={formData.bio || ""}
              onChange={(val) => {
                formDirtyRef.current = true;
                setFormData((p) => ({ ...p, bio: val }));
              }}
            />
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <Button
            onClick={handleRoleSpecificSubmitGoSubscription}
            disabled={saving || !validateRoleSpecificInfo()}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        <div className="text-center mt-4">
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 inline-flex items-center gap-1">
            <LogOut className="w-4 h-4" /> Log out instead
          </button>
        </div>
      </div>
    );
  };

  const renderSubscription = () => {
    const plan = SUBSCRIPTION_PRICING[selectedRole] || SUBSCRIPTION_PRICING.user;

    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="bg-emerald-600 text-white p-3 rounded-full mb-4 mx-auto w-fit">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription</h2>
          <p className="text-gray-600">Subscribe now or skip for later. We’ll store your choice.</p>
          <div className="mt-3">
            <RoleLockedPill role={selectedRole} />
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500">Plan</div>
                <div className="text-lg font-semibold text-gray-900">{plan.label} — Yearly</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Price</div>
                <div className="text-xl font-bold text-gray-900">${plan.amount}/year</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
                Subscription unlocks your full {plan.label.toLowerCase()} features.
              </div>
            </div>

            <div className="mt-4">
              {paypalError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-3">{paypalError}</div>
              )}

              <div className="rounded-lg border p-3">
                <div className="text-sm font-semibold text-gray-900 mb-2">Pay with PayPal</div>
                <div ref={paypalContainerRef} />

                {!paypalReady && !paypalError && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading PayPal...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleBack} disabled={saving || submittingPayment}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => finalizeOnboarding({ subscriptionActive: false, skipped: true })}
                disabled={saving || submittingPayment}
                title="Skip subscription for now"
              >
                Skip for now
              </Button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Your choice will be saved as <b>subscription_active: true/false</b> in Firestore.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderComplete = () => (
    <div className="text-center max-w-md mx-auto">
      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to GreenPass!</h2>
      <p className="text-gray-600 mb-6">Your account has been set up successfully. Get ready to start your journey!</p>
      <div className="bg-green-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">Redirecting to your personalized dashboard...</p>
      </div>
      <div className="flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    </div>
  );

  if (!authChecked || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Step {Math.max(1, STEP_ORDER.indexOf(currentStep) + 1)} of {STEP_ORDER.length}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-red-600 hover:bg-red-50"
            title="Log out and exit onboarding"
          >
            {loggingOut ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Logging out
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-1" /> Log out
              </>
            )}
          </Button>
        </div>

        <Progress value={getStepProgress()} className="h-2 w-full max-w-md mx-auto mb-8" />

        <Card className="p-6 sm:p-8 lg:p-12 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardContent className="p-0">
            {currentStep === STEPS.CHOOSE_ROLE && renderChooseRole()}
            {currentStep === STEPS.BASIC_INFO && renderBasicInfo()}
            {currentStep === STEPS.ROLE_SPECIFIC && selectedRole !== "user" && renderRoleSpecific()}
            {currentStep === STEPS.SUBSCRIPTION && selectedRole !== "user" && renderSubscription()}
            {currentStep === STEPS.COMPLETE && renderComplete()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
