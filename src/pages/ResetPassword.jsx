// src/pages/ResetPassword.jsx
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Mail, Check, X, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

// 🔥 Firebase
import { auth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const isValidEmail = (em) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);

function InfoBanner({ tone = 'info', children }) {
  const toneStyles = {
    info: 'text-blue-800 bg-blue-50 border-blue-200',
    success: 'text-green-800 bg-green-50 border-green-200',
    warn: 'text-amber-800 bg-amber-50 border-amber-200',
    error: 'text-red-800 bg-red-50 border-red-200',
  };
  return <div className={`text-sm border rounded-md p-3 ${toneStyles[tone]}`}>{children}</div>;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const prefill = useMemo(() => {
    const stateEmail = location.state?.email || '';
    const q = new URLSearchParams(location.search);
    return stateEmail || q.get('email') || '';
  }, [location]);

  const [email, setEmail] = useState(prefill);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ kind: '', msg: '' }); // '', 'success', 'error'

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const em = email.trim().toLowerCase();

    if (!isValidEmail(em)) {
      setStatus({ kind: 'error', msg: 'Please enter a valid email address.' });
      return;
    }

    try {
      setBusy(true);
      setStatus({ kind: '', msg: '' });

      // Optional: set the language for Firebase system emails
      auth.languageCode = navigator.language || 'en';

      // Optional: control where the user lands after finishing reset
      const actionCodeSettings = {
        url: `${window.location.origin}${createPageUrl('Welcome')}`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, em, actionCodeSettings);

      // For privacy, show success even if the email might not exist
      setStatus({
        kind: 'success',
        msg: `If an account exists for ${em}, a password reset link has been sent. Please check your inbox (and spam folder).`,
      });
    } catch (err) {
      // Still show a generic success on user-not-found to avoid email enumeration
      if (err?.code === 'auth/user-not-found') {
        setStatus({
          kind: 'success',
          msg: `If an account exists for ${em}, a password reset link has been sent. Please check your inbox (and spam folder).`,
        });
      } else if (err?.code === 'auth/invalid-email') {
        setStatus({ kind: 'error', msg: 'Please enter a valid email address.' });
      } else {
        setStatus({
          kind: 'error',
          msg: err?.code ? `Firebase: ${err.code}` : (err?.message || 'Could not send password reset email.'),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-lg py-16 sm:py-24">
          <Card className="p-8 sm:p-10 shadow-2xl rounded-2xl bg-white/80 backdrop-blur-lg">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              Reset your password
            </h1>
            <p className="mt-3 text-center text-gray-600">
              Enter the email associated with your account and we’ll send you a reset link.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Email address"
                  className="pl-10 pr-10 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                />
              </div>

              {status.msg && (
                <InfoBanner tone={status.kind === 'success' ? 'success' : status.kind === 'error' ? 'error' : 'info'}>
                  {status.kind === 'success' && (
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5" /> <span>{status.msg}</span>
                    </div>
                  )}
                  {status.kind === 'error' && (
                    <div className="flex items-start gap-2">
                      <X className="h-4 w-4 mt-0.5" /> <span>{status.msg}</span>
                    </div>
                  )}
                  {!status.kind && status.msg}
                </InfoBanner>
              )}

              <Button type="submit" className="w-full h-12 text-base" disabled={busy}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Sending…
                  </span>
                ) : (
                  'Send reset link'
                )}
              </Button>

              <div className="flex justify-center gap-3 pt-1 text-sm">
                <Button type="button" variant="ghost" onClick={() => navigate(createPageUrl('Welcome'))}>
                  Back to Sign in
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(createPageUrl('Welcome'), { state: { mode: 'signup', email } })}
                >
                  Go to Sign up
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
