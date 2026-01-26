// src/pages/Welcome.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

// 🔥 Firebase
import { auth, db } from '@/firebase';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';


// ✅ Language helper (safe for async helpers outside component scope)
const resolveLangGlobal = () => {
  try {
    return (
      new URLSearchParams(window.location.search).get("lang") ||
      localStorage.getItem("gp_lang") ||
      (typeof i18n !== "undefined" ? i18n.language : null) ||
      "en"
    ).toString();
  } catch {
    return (localStorage.getItem("gp_lang") || "en").toString();
  }
};

const GoogleIcon = ({ className = 'w-5 h-5 mr-3' }) => (
  <svg className={className} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <title>Google</title>
    <path
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.48 1.68-4.34 1.68-3.66 0-6.6-3-6.6-6.6s2.94-6.6 6.6-6.6c1.93 0 3.33.72 4.14 1.48l2.5-2.5C18.17 2.09 15.65 1 12.48 1 7.02 1 3 5.02 3 10.5s4.02 9.5 9.48 9.5c2.82 0 5.2-1 6.9-2.73 1.76-1.79 2.5-4.35 2.5-6.81 0-.57-.05-.96-.12-1.32H12.48z"
      fill="currentColor"
    />
  </svg>
);

// ───────────────────────────── simple info dialog ─────────────────────────────
function InfoDialog({ open, title, message, onClose, okLabel = 'OK' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{message}</p>
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose}>{okLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────── helpers ─────────────────────────────────
const VALID_ROLES = ['agent', 'tutor', 'school', 'vendor'];
const DEFAULT_ROLE = 'user';

function normalizeRole(r) {
  const v = (r || '').toString().trim().toLowerCase();
  return VALID_ROLES.includes(v) ? v : DEFAULT_ROLE;
}

function buildUserDoc({ email, full_name = '', userType = DEFAULT_ROLE, signupEntryRole = DEFAULT_ROLE }) {
  return {
    role: userType, // legacy UI that reads "role"
    userType, // camelCase for any legacy reads
    user_type: userType, // ← canonical field
    signup_entry_role: signupEntryRole, // how they entered (from URL)
    email,
    full_name,
    phone: '',
    country: '',
    address: { street: '', ward: '', district: '', province: '', postal_code: '' },
    profile_picture: '',
    is_verified: false,
    onboarding_completed: false,
    kyc_document_id: '',
    kyc_document_url: '',
    assigned_agent_id: '',
    referred_by_agent_id: '',
    purchased_packages: [],
    purchased_tutor_packages: [],
    session_credits: 0,
    schoolId: '',
    programId: '',
    enrollment_date: null,
    agent_reassignment_request: { requested_at: null, reason: '', new_agent_id: '', status: 'pending' },
    settings: {
      language: 'en',
      timezone: 'Asia/Ho_Chi_Minh',
      currency: 'USD',
      notification_preferences: {
        email_notifications: true,
        sms_notifications: false,
        application_updates: true,
        marketing_emails: false,
        session_reminders: true,
      },
    },
    package_assignment: { package_id: '', assigned_at: null, expires_at: null },
    is_guest_created: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
}

function validatePassword(pw) {
  const lengthOK = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return { lengthOK, hasUpper, hasNumber, hasSpecial, ok: lengthOK && hasUpper && hasNumber && hasSpecial };
}
const isValidEmail = (em) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);

function RuleRow({ ok, label }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-gray-400" />}
      <span className={ok ? 'text-green-700' : 'text-gray-600'}>{label}</span>
    </li>
  );
}

async function routeAfterSignIn(navigate, fbUser, entryRole = DEFAULT_ROLE) {
  const ref = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const createRole = normalizeRole(entryRole);
    await setDoc(
      ref,
      buildUserDoc({
        email: fbUser.email || '',
        full_name: fbUser.displayName || '',
        userType: createRole,
        signupEntryRole: createRole,
      }),
      { merge: true }
    );
    // carry role to onboarding
    return navigate(`${createPageUrl('Onboarding')}?role=${createRole}`);
  }

  const profile = snap.data();
  if (!profile?.onboarding_completed) {
    const roleToUse = normalizeRole(profile?.user_type || entryRole || DEFAULT_ROLE);
    return navigate(`${createPageUrl('Onboarding')}?role=${roleToUse}`);
  }
  return navigate(createPageUrl('Dashboard'));
}

// ───────────────────────────── component ─────────────────────────────
export default function Welcome() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t, i18n } = useTranslation();

  // small helper that:
  // - uses i18n key when available
  // - falls back to default English (so nothing breaks while you translate progressively)
  const tr = React.useCallback(
    (key, fallback) => t(key, { defaultValue: fallback }),
    [t]
  );

  // role from URL (with legacy fallbacks)
  const entryRole = useMemo(() => {
    const raw = params.get('role') ?? params.get('userType') ?? params.get('as');
    return normalizeRole(raw);
  }, [params]);

  // persist for OAuth redirect hops
  useEffect(() => {
    sessionStorage.setItem('onboarding_role', entryRole);
  }, [entryRole]);

  const [mode, setMode] = useState('signin');

  // shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup-only
  const [fullName, setFullName] = useState('');
  const [confirm, setConfirm] = useState('');

  // visibility toggles
  const [showSigninPw, setShowSigninPw] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // info dialog
  const [dialog, setDialog] = useState({ open: false, title: '', message: '' });

  // email availability (signup)
  const [emailCheck, setEmailCheck] = useState({
    checking: false,
    available: null,
    methods: [],
    error: '',
  });

  const [emailCheckVersion, setEmailCheckVersion] = useState(0);
  const emailCheckVersionRef = useRef(0);
  useEffect(() => {
    emailCheckVersionRef.current = emailCheckVersion;
  }, [emailCheckVersion]);

  const pwStatus = validatePassword(password);

  // IMPORTANT: if already authenticated, route to Onboarding/Dashboard
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {}
      unsub = onAuthStateChanged(auth, async (user) => {
        setChecking(false);
        if (user) {
          // prefer Firestore user_type, fall back to session/URL
          const roleHint = sessionStorage.getItem('onboarding_role') || entryRole || DEFAULT_ROLE;
          await routeAfterSignIn(navigate, user, roleHint);
        }
      });
    })();
    return () => unsub && unsub();
  }, [navigate, entryRole]);

  async function runEmailCheck(em, versionAtCall) {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, em);
      if (versionAtCall !== emailCheckVersionRef.current) return;
      setEmailCheck({
        checking: false,
        available: methods.length === 0,
        methods,
        error: '',
      });
    } catch (e) {
      if (versionAtCall !== emailCheckVersionRef.current) return;
      setEmailCheck({
        checking: false,
        available: null,
        methods: [],
        error: tr('auth.email_check_failed', 'Could not check email right now.'),
      });
    }
  }

  // Debounced email check for SIGN UP
  useEffect(() => {
    if (mode !== 'signup') return;
    const em = email.trim().toLowerCase();
    if (!em || !isValidEmail(em)) {
      setEmailCheck({ checking: false, available: null, methods: [], error: '' });
      return;
    }
    const nextVersion = emailCheckVersion + 1;
    setEmailCheckVersion(nextVersion);
    setEmailCheck({ checking: true, available: null, methods: [], error: '' });
    const handle = setTimeout(() => {
      runEmailCheck(em, nextVersion);
    }, 400);
    return () => clearTimeout(handle);
  }, [email, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ───────── Provider sign-ins ─────────
  const handleLoginGoogle = async () => {
    try {
      setBusy(true);
      // keep role through OAuth
      sessionStorage.setItem('onboarding_role', entryRole);
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await routeAfterSignIn(navigate, cred.user, entryRole);
    } catch (err) {
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setDialog({
          open: true,
          title: tr('auth.use_original_method_title', 'Use your original sign-in method'),
          message: tr(
            'auth.use_original_method_message_google',
            'This email is already linked to a different sign-in method. Try signing in with Email & Password or Apple.'
          ),
        });
      } else if (err?.code === 'auth/popup-closed-by-user') {
        // ignore silently
      } else {
        setDialog({
          open: true,
          title: tr('auth.google_failed_title', 'Google sign-in failed'),
          message: err?.code ? `Firebase: ${err.code}` : err?.message || tr('auth.google_failed_message', 'Google sign-in failed'),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLoginApple = async () => {
    try {
      setBusy(true);
      sessionStorage.setItem('onboarding_role', entryRole);
      const appleProvider = new OAuthProvider('apple.com');
      const cred = await signInWithPopup(auth, appleProvider);
      await routeAfterSignIn(navigate, cred.user, entryRole);
    } catch (err) {
      if (err?.code === 'auth/operation-not-supported-in-this-environment') {
        setDialog({
          open: true,
          title: tr('auth.apple_unavailable_title', 'Apple sign-in unavailable'),
          message: tr('auth.apple_unavailable_message', 'Apple sign-in is not enabled for this project/environment.'),
        });
      } else if (err?.code === 'auth/account-exists-with-different-credential') {
        setDialog({
          open: true,
          title: tr('auth.use_original_method_title', 'Use your original sign-in method'),
          message: tr(
            'auth.use_original_method_message_apple',
            'This email is already linked to a different sign-in method. Try signing in with Email & Password or Google.'
          ),
        });
      } else if (err?.code === 'auth/popup-closed-by-user') {
        // ignore
      } else {
        setDialog({
          open: true,
          title: tr('auth.apple_failed_title', 'Apple sign-in failed'),
          message: err?.code ? `Firebase: ${err.code}` : err?.message || tr('auth.apple_failed_message', 'Apple sign-in failed'),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  // 👉 Forgot password: navigate to Reset Password page with email (carry ?lang=)
  const handleForgotPassword = () => {
    const em = (email || '').trim();
    const currentLang =
      params.get('lang') ||
      localStorage.getItem('gp_lang') ||
      (i18n && i18n.language) ||
      'en';
    navigate(`${createPageUrl('ResetPassword')}?lang=${encodeURIComponent(currentLang)}`, {
      state: { email: em },
    });
  };

  // ───────── Email/Password Sign In (TRY AUTH FIRST) ─────────
  const handleSignInEmail = async () => {
    const em = email.trim().toLowerCase();
    if (!em || !isValidEmail(em)) {
      setDialog({
        open: true,
        title: tr('auth.invalid_email_title', 'Invalid email'),
        message: tr('auth.invalid_email_message', 'Please enter a valid email address.'),
      });
      return;
    }
    try {
      setBusy(true);
      sessionStorage.setItem('onboarding_role', entryRole);
      const cred = await signInWithEmailAndPassword(auth, em, password);
      await routeAfterSignIn(navigate, cred.user, entryRole);
    } catch (err) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setDialog({
          open: true,
          title: tr('auth.incorrect_password_title', 'Incorrect password'),
          message: tr('auth.incorrect_password_message', 'The password you entered is incorrect. Please try again.'),
        });
      } else if (err?.code === 'auth/user-not-found') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, em);
          if (!methods || methods.length === 0) {
            setMode('signup');
            setDialog({
              open: true,
              title: tr('auth.no_account_title', 'No account found'),
              message: tr('auth.no_account_message', 'We couldn’t find an account for that email. Please create one.'),
            });
          } else if (methods.includes('google.com') && !methods.includes('password')) {
            setDialog({
              open: true,
              title: tr('auth.use_google_title', 'Use Google to sign in'),
              message: tr('auth.use_google_message', 'This email is registered with Google. Please use “Continue with Google”.'),
            });
          } else if (methods.includes('apple.com') && !methods.includes('password')) {
            setDialog({
              open: true,
              title: tr('auth.use_apple_title', 'Use Apple to sign in'),
              message: tr('auth.use_apple_message', 'This email is registered with Apple. Please use “Continue with Apple”.'),
            });
          } else {
            setDialog({
              open: true,
              title: tr('auth.signin_error_title', 'Couldn’t sign in'),
              message: tr('auth.signin_error_message', 'Please try again, or reset your password.'),
            });
          }
        } catch (lookupErr) {
          setDialog({
            open: true,
            title: tr('auth.signin_error_title', 'Sign-in error'),
            message: lookupErr?.message || tr('auth.signin_error_try_again', 'Please try again.'),
          });
        }
      } else {
        setDialog({
          open: true,
          title: tr('auth.signin_failed_title', 'Sign-in failed'),
          message: err?.code ? `Firebase: ${err.code}` : err?.message || tr('auth.email_signin_failed', 'Email sign-in failed.'),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  // ───────── Sign Up ─────────
  const handleSignUpEmail = async () => {
    try {
      setBusy(true);
      const em = email.trim().toLowerCase();

      if (!fullName.trim()) {
        setDialog({
          open: true,
          title: tr('auth.missing_name_title', 'Missing name'),
          message: tr('auth.missing_name_message', 'Please enter your full name.'),
        });
        return;
      }

      const { ok, lengthOK, hasUpper, hasNumber, hasSpecial } = validatePassword(password);
      if (!ok) {
        const issues = [
          !lengthOK && tr('auth.pw_min_len', '• Minimum length is 8 characters'),
          !hasUpper && tr('auth.pw_upper', '• At least 1 capital letter'),
          !hasNumber && tr('auth.pw_number', '• At least 1 number'),
          !hasSpecial && tr('auth.pw_special', '• At least 1 special character'),
        ]
          .filter(Boolean)
          .join('\n');
        setDialog({
          open: true,
          title: tr('auth.password_requirements_title', 'Password requirements'),
          message: `${tr('auth.password_requirements_message', 'Password does not meet requirements:')}\n${issues}`,
        });
        return;
      }

      if (password !== confirm) {
        setDialog({
          open: true,
          title: tr('auth.passwords_no_match_title', 'Passwords do not match'),
          message: tr('auth.passwords_no_match_message', 'Please make sure the passwords are identical.'),
        });
        return;
      }

      const methods = await fetchSignInMethodsForEmail(auth, em);
      if (methods.length > 0) {
        const hasPassword = methods.includes('password');
        const hasGoogle = methods.includes('google.com');
        const hasApple = methods.includes('apple.com');

        if (!hasPassword && hasGoogle && !hasApple) {
          setDialog({
            open: true,
            title: tr('auth.email_registered_google_title', 'Email registered with Google'),
            message: tr(
              'auth.email_registered_google_message',
              'This email is already registered with Google. Please use “Continue with Google”.'
            ),
          });
        } else if (!hasPassword && hasApple && !hasGoogle) {
          setDialog({
            open: true,
            title: tr('auth.email_registered_apple_title', 'Email registered with Apple'),
            message: tr(
              'auth.email_registered_apple_message',
              'This email is already registered with Apple. Please use “Continue with Apple”.'
            ),
          });
        } else {
          const providers = [hasPassword && tr('auth.provider_email', 'Email & password'), hasGoogle && 'Google', hasApple && 'Apple']
            .filter(Boolean)
            .join(', ');
          setDialog({
            open: true,
            title: tr('auth.email_already_registered_title', 'Email already registered'),
            message: tr('auth.email_already_registered_message', 'This email is already in use ({{providers}}). Try signing in.')
              .replace('{{providers}}', providers),
          });
        }
        setMode('signin');
        return;
      }

      // persist chosen entryRole for onboarding that follows
      sessionStorage.setItem('onboarding_role', entryRole);

      const cred = await createUserWithEmailAndPassword(auth, em, password);
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }
      await routeAfterSignIn(navigate, cred.user, entryRole);
    } catch (err) {
      let message = err?.message || tr('auth.signup_failed_message', 'Sign-up failed.');
      if (err?.code === 'auth/invalid-email') message = tr('auth.invalid_email_message', 'Please enter a valid email address.');
      else if (err?.code === 'auth/weak-password') message = tr('auth.weak_password_message', 'Password should meet the requirements listed.');
      else if (err?.code === 'auth/email-already-in-use') message = tr('auth.email_in_use_message', 'Email already in use.');
      setDialog({ open: true, title: tr('auth.signup_failed_title', 'Sign-up failed'), message });
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  const emailIsGoogleOnly =
    emailCheck.methods.includes?.('google.com') &&
    !emailCheck.methods.includes?.('password') &&
    !emailCheck.methods.includes?.('apple.com');

  const emailIsAppleOnly =
    emailCheck.methods.includes?.('apple.com') &&
    !emailCheck.methods.includes?.('password') &&
    !emailCheck.methods.includes?.('google.com');

  const emailTaken = emailCheck.available === false;

  const canSubmitSignup =
    mode !== 'signup' ||
    (!emailCheck.checking && emailCheck.available === true && pwStatus.ok && fullName.trim() && confirm === password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-4xl py-16 sm:py-24">
          <Card className="p-8 sm:p-12 shadow-2xl rounded-2xl bg-white/80 backdrop-blur-lg">
            <div className="text-center">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/52125f446_GP2withnameTransparent.png"
                alt={tr('brand.alt', 'GreenPass Super App')}
                className="h-12 sm:h-16 w-auto mx-auto mb-6"
              />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                {tr('welcome.title', 'Your Journey Starts Here')}
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                {mode === 'signin'
                  ? tr('welcome.subtitle_signin', 'Welcome back! Sign in to your dashboard.')
                  : tr('welcome.subtitle_signup', 'Create your account to get a personalized experience.')}
              </p>
            </div>

            {/* Tabs */}
            <div className="max-w-md mx-auto mt-8">
              <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 text-sm mb-6">
                <button
                  className={`py-2 rounded-lg transition ${mode === 'signin' ? 'bg-white shadow font-semibold' : 'text-gray-600'}`}
                  onClick={() => setMode('signin')}
                >
                  {tr('auth.signin', 'Sign in')}
                </button>
                <button
                  className={`py-2 rounded-lg transition ${mode === 'signup' ? 'bg-white shadow font-semibold' : 'text-gray-600'}`}
                  onClick={() => setMode('signup')}
                >
                  {tr('auth.signup', 'Sign up')}
                </button>
              </div>

              {/* Social */}
              <div className="space-y-3 mb-6">
                <Button size="lg" variant="outline" className="w-full h-12 text-base" onClick={handleLoginGoogle} disabled={busy}>
                  <GoogleIcon />
                  {tr('auth.continue_google', 'Continue with Google')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-12 text-base bg-black text-white hover:bg-gray-800 hover:text-white"
                  onClick={handleLoginApple}
                  disabled={busy}
                >
                  <span className="mr-3"></span>
                  {tr('auth.continue_apple', 'Continue with Apple')}
                </Button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white/80 px-2 text-gray-500">{tr('auth.or_continue_email', 'or continue with email')}</span>
                </div>
              </div>

              {/* Forms */}
              {mode === 'signin' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder={tr('auth.email_placeholder', 'Email address')}
                      className="pl-10 h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Sign-in password with visibility toggle */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showSigninPw ? 'text' : 'password'}
                      placeholder={tr('auth.password_placeholder', 'Password')}
                      className="pl-10 pr-10 h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showSigninPw ? tr('auth.hide_password', 'Hide password') : tr('auth.show_password', 'Show password')}
                      aria-pressed={showSigninPw}
                      onClick={() => setShowSigninPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                    >
                      {showSigninPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Forgot password → navigates to ResetPassword */}
                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-green-700 hover:text-green-600 underline underline-offset-2"
                      disabled={busy}
                    >
                      {tr('auth.forgot_password', 'Forgot password?')}
                    </button>
                  </div>

                  <Button size="lg" className="w-full h-12 text-base" onClick={handleSignInEmail} disabled={busy}>
                    {tr('auth.signin', 'Sign in')}
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    {tr('auth.no_account', "Don’t have an account?")}{' '}
                    <button onClick={() => setMode('signup')} className="font-semibold text-green-600 hover:text-green-500">
                      {tr('auth.signup', 'Sign up')}
                    </button>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder={tr('auth.fullname_placeholder', 'Full name')}
                      className="pl-10 h-12"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  {/* Email with availability + provider awareness */}
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder={tr('auth.email_placeholder', 'Email address')}
                      className={`pl-10 pr-10 h-12 ${isValidEmail(email) && emailTaken ? 'border-red-300' : ''}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => {
                        if (mode !== 'signup') return;
                        const em = email.trim().toLowerCase();
                        if (!isValidEmail(em) || !em) return;
                        const nextVersion = emailCheckVersion + 1;
                        setEmailCheckVersion(nextVersion);
                        setEmailCheck({ checking: true, available: null, methods: [], error: '' });
                        runEmailCheck(em, nextVersion);
                      }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isValidEmail(email) && emailCheck.checking && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
                      {isValidEmail(email) && emailCheck.available === true && <Check className="h-5 w-5 text-green-600" />}
                      {isValidEmail(email) && emailTaken && <X className="h-5 w-5 text-red-500" />}
                    </div>
                  </div>

                  {/* Contextual availability messages */}
                  {isValidEmail(email) && emailTaken &&
                    (emailIsGoogleOnly ? (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                        <GoogleIcon className="w-4 h-4 mr-0" />
                        {tr(
                          'auth.email_google_only',
                          'This email is already registered with Google. Please use “Continue with Google”.'
                        )}
                      </div>
                    ) : emailIsAppleOnly ? (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                        <span className="inline-block text-base leading-none"></span>
                        {tr(
                          'auth.email_apple_only',
                          'This email is already registered with Apple. Please use “Continue with Apple”.'
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-red-600">
                        {tr(
                          'auth.email_already_registered_simple',
                          'This email is already registered. Try signing in (Email & password, Google, or Apple).'
                        )}
                      </p>
                    ))}
                  {emailCheck.error && <p className="text-xs text-amber-600">{emailCheck.error}</p>}

                  {/* Sign-up password with visibility toggle */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showPw ? 'text' : 'password'}
                      placeholder={tr('auth.create_password_placeholder', 'Create a password')}
                      className={`pl-10 pr-10 h-12 ${password && !pwStatus.ok ? 'border-red-300' : ''}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPw ? tr('auth.hide_password', 'Hide password') : tr('auth.show_password', 'Show password')}
                      aria-pressed={showPw}
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                    >
                      {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Password requirements with live checkmarks */}
                  <div className="text-xs rounded-md bg-gray-50 border border-gray-200 p-3 leading-5">
                    <div className="font-medium text-gray-700 mb-1">
                      {tr('auth.password_requirements_label', 'Password requirements:')}
                    </div>
                    <ul className="ml-1 space-y-1">
                      <RuleRow ok={pwStatus.lengthOK} label={tr('auth.pw_rule_len', 'Minimum length: 8 characters')} />
                      <RuleRow ok={pwStatus.hasUpper} label={tr('auth.pw_rule_upper', 'At least 1 capital letter')} />
                      <RuleRow ok={pwStatus.hasNumber} label={tr('auth.pw_rule_number', 'At least 1 number')} />
                      <RuleRow ok={pwStatus.hasSpecial} label={tr('auth.pw_rule_special', 'At least 1 special character')} />
                    </ul>
                  </div>

                  {/* Confirm password with visibility toggle */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder={tr('auth.confirm_password_placeholder', 'Confirm password')}
                      className="pl-10 pr-10 h-12"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={
                        showConfirm ? tr('auth.hide_confirm_password', 'Hide confirm password') : tr('auth.show_confirm_password', 'Show confirm password')
                      }
                      aria-pressed={showConfirm}
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  <Button size="lg" className="w-full h-12 text-base" onClick={handleSignUpEmail} disabled={busy || !canSubmitSignup}>
                    {tr('auth.create_account', 'Create account')}
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    {tr('auth.have_account', 'Already have an account?')}{' '}
                    <button onClick={() => setMode('signin')} className="font-semibold text-green-600 hover:text-green-500">
                      {tr('auth.signin', 'Sign in')}
                    </button>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              {tr('legal.by_continuing', 'By continuing, you agree to our')}{' '}
              <Link to={createPageUrl('TermsOfService')} className="font-semibold text-green-600 hover:text-green-500">
                {tr('legal.terms', 'Terms of Service')}
              </Link>{' '}
              {tr('legal.and', 'and')}{' '}
              <Link to={createPageUrl('PrivacyPolicy')} className="font-semibold text-green-600 hover:text-green-500">
                {tr('legal.privacy', 'Privacy Policy')}
              </Link>
              .
            </div>
          </Card>
        </div>
      </div>

      {/* global info dialog */}
      <InfoDialog
        open={dialog.open}
        title={dialog.title}
        message={dialog.message}
        okLabel={tr('common.ok', 'OK')}
        onClose={() => setDialog({ open: false, title: '', message: '' })}
      />
    </div>
  );
}
