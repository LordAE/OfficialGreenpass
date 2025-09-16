// src/pages/Welcome.jsx
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';

// 🔥 Firebase
import { auth, db } from '@/firebase';
import {
  GoogleAuthProvider,
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

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <title>Google</title>
    <path
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.48 1.68-4.34 1.68-3.66 0-6.6-3-6.6-6.6s2.94-6.6 6.6-6.6c1.93 0 3.33.72 4.14 1.48l2.5-2.5C18.17 2.09 15.65 1 12.48 1 7.02 1 3 5.02 3 10.5s4.02 9.5 9.48 9.5c2.82 0 5.2-1 6.9-2.73 1.76-1.79 2.5-4.35 2.5-6.81 0-.57-.05-.96-.12-1.32H12.48z"
      fill="currentColor"
    />
  </svg>
);

// ───────────────────────────────── helpers ─────────────────────────────────
function buildUserDoc({ email, full_name = '' }) {
  return {
    role: 'user',
    email,
    full_name,
    user_type: 'user',
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

/** Create Firestore doc if missing, then route accordingly */
async function routeAfterSignIn(navigate, fbUser) {
  const ref = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      buildUserDoc({
        email: fbUser.email || '',
        full_name: fbUser.displayName || '',
      }),
    );
    return navigate(createPageUrl('Onboarding'));
  }

  const profile = snap.data();
  if (!profile?.onboarding_completed) {
    return navigate(createPageUrl('Onboarding'));
  }
  return navigate(createPageUrl('Dashboard'));
}

// ───────────────────────────── component ─────────────────────────────
export default function Welcome() {
  const navigate = useNavigate();

  // “tab” state
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'

  // shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup-only fields
  const [fullName, setFullName] = useState('');
  const [confirm, setConfirm] = useState('');

  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // Auth listener → do NOT auto-redirect (prevents ping-pong)
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try { await setPersistence(auth, browserLocalPersistence); } catch {}
      unsub = onAuthStateChanged(auth, () => setChecking(false));
    })();
    return () => unsub && unsub();
  }, []);

  // Google sign-in (works for both tabs)
  const handleLoginGoogle = async () => {
    try {
      setBusy(true);
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await routeAfterSignIn(navigate, cred.user);
    } catch (err) {
      console.error('Google sign-in failed:', err);
      alert(err?.code ? `Firebase: ${err.code}` : (err?.message || 'Google sign-in failed'));
    } finally {
      setBusy(false);
    }
  };

  // ───────── Sign In (robust) ─────────
  const handleSignInEmail = async () => {
    const em = email.trim().toLowerCase();
    try {
      setBusy(true);

      // Try direct password login first (fast path)
      const cred = await signInWithEmailAndPassword(auth, em, password);
      await routeAfterSignIn(navigate, cred.user);
    } catch (err) {
      try {
        // Interpret the failure → which methods exist for this email?
        const methods = await fetchSignInMethodsForEmail(auth, em);

        if (err.code === 'auth/user-not-found' || methods.length === 0) {
          alert('No account found for this email. Please sign up first.');
          setMode('signup');
          return;
        }

        if (methods.includes('google.com') && !methods.includes('password')) {
          alert('This email is registered with Google. Use "Continue with Google" to sign in.');
          return;
        }

        if (err.code === 'auth/invalid-credential') {
          // Typically wrong password when user exists for password sign-in
          alert('Incorrect password. If you forgot it, reset it or sign in with Google if that’s how you registered.');
          return;
        }

        alert(err?.code ? `Firebase: ${err.code}` : (err?.message || 'Email sign-in failed.'));
      } catch {
        alert(err?.code ? `Firebase: ${err.code}` : (err?.message || 'Email sign-in failed.'));
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

      if (!fullName.trim()) return alert('Please enter your full name.');
      if (password.length < 6) return alert('Password should be at least 6 characters.');
      if (password !== confirm) return alert('Passwords do not match.');

      const methods = await fetchSignInMethodsForEmail(auth, em);
      if (methods.length > 0) {
        alert('This email is already registered. Try signing in.');
        setMode('signin');
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, em, password);

      // Store displayName so Firestore doc gets it on first creation
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }

      await routeAfterSignIn(navigate, cred.user);
    } catch (err) {
      console.error('Sign-up failed:', err);
      if (err?.code === 'auth/invalid-email') alert('Please enter a valid email address.');
      else if (err?.code === 'auth/weak-password') alert('Password should be at least 6 characters.');
      else if (err?.code === 'auth/email-already-in-use') alert('Email already in use. Try signing in.');
      else alert(err?.code ? `Firebase: ${err.code}` : (err?.message || 'Sign-up failed.'));
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

  // UI — tabbed Sign in / Sign up
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-4xl py-16 sm:py-24">
          <Card className="p-8 sm:p-12 shadow-2xl rounded-2xl bg-white/80 backdrop-blur-lg">
            <div className="text-center">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/52125f446_GP2withnameTransparent.png"
                alt="GreenPass Super App"
                className="h-12 sm:h-16 w-auto mx-auto mb-6"
              />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                Your Journey to Canada Starts Here
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                {mode === 'signin'
                  ? 'Welcome back! Sign in to your dashboard.'
                  : 'Create your account to get a personalized experience.'}
              </p>
            </div>

            {/* Tabs */}
            <div className="max-w-md mx-auto mt-8">
              <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 text-sm mb-6">
                <button
                  className={`py-2 rounded-lg transition ${
                    mode === 'signin' ? 'bg-white shadow font-semibold' : 'text-gray-600'
                  }`}
                  onClick={() => setMode('signin')}
                >
                  Sign in
                </button>
                <button
                  className={`py-2 rounded-lg transition ${
                    mode === 'signup' ? 'bg-white shadow font-semibold' : 'text-gray-600'
                  }`}
                  onClick={() => setMode('signup')}
                >
                  Sign up
                </button>
              </div>

              {/* Social */}
              <div className="space-y-3 mb-6">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={handleLoginGoogle}
                  disabled={busy}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-12 text-base bg-black text-white hover:bg-gray-800 hover:text-white"
                  onClick={() => alert('Apple sign-in not available yet')}
                >
                  <span className="mr-3"></span>
                  Continue with Apple
                </Button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white/80 px-2 text-gray-500">or continue with email</span>
                </div>
              </div>

              {/* Forms */}
              {mode === 'signin' ? (
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
                      type="password"
                      placeholder="Password"
                      className="pl-10 h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    size="lg"
                    className="w-full h-12 text-base"
                    onClick={handleSignInEmail}
                    disabled={busy}
                  >
                    Sign in
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    Don’t have an account?{' '}
                    <button
                      onClick={() => setMode('signup')}
                      className="font-semibold text-green-600 hover:text-green-500"
                    >
                      Sign up
                    </button>
                  </p>
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
                      type="password"
                      placeholder="Create a password (min 6 chars)"
                      className="pl-10 h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      className="pl-10 h-12"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                  <Button
                    size="lg"
                    className="w-full h-12 text-base"
                    onClick={handleSignUpEmail}
                    disabled={busy}
                  >
                    Create account
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <button
                      onClick={() => setMode('signin')}
                      className="font-semibold text-green-600 hover:text-green-500"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              By continuing, you agree to our{' '}
              <Link
                to={createPageUrl('TermsOfService')}
                className="font-semibold text-green-600 hover:text-green-500"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to={createPageUrl('PrivacyPolicy')}
                className="font-semibold text-green-600 hover:text-green-500"
              >
                Privacy Policy
              </Link>
              .
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
