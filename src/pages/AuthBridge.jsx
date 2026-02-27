// src/pages/AuthBridge.jsx
import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase";

/**
 * Rules:
 * - If user doc does NOT exist => create it => go /onboarding (preserve next)
 * - If user doc exists and onboarding_completed === true => go to `next` if provided else /dashboard
 * - Else => go /onboarding (preserve next)
 *
 * Query:
 * - code=... (required)
 * - next=/accept-org-invite?invite=...&token=... (optional)
 * - role=student|agent|tutor|school|institution|provider (optional; for NEW users)
 * - lang=en (optional)
 */
export default function AuthBridge() {
  const [params] = useSearchParams();
  const role = params.get("role");
  const navigate = useNavigate();
  const [status, setStatus] = React.useState("Exchanging sign-in code...");

  const code = params.get("code");
  const lang = params.get("lang") || "en";
  const nextHint = params.get("next") || "";

  const safeInternalPath = (p) => {
    if (!p) return null;
    if (typeof p !== "string") return null;
    if (!p.startsWith("/")) return null;
    if (p.startsWith("//")) return null;
    if (p.includes("http://") || p.includes("https://")) return null;
    return p;
  };

  const appendQuery = (path, queryObj) => {
    try {
      const u = new URL(path, window.location.origin);
      Object.entries(queryObj || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        u.searchParams.set(k, String(v));
      });
      return u.pathname + (u.search ? u.search : "");
    } catch {
      return path;
    }
  };

  const exchangeUrl =
    import.meta.env?.VITE_EXCHANGE_AUTH_BRIDGE_URL ||
    "https://us-central1-greenpass-dc92d.cloudfunctions.net/exchangeAuthBridgeCode";

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!code) {
          setStatus("Missing sign-in code.");
          navigate(`/login?mode=login&lang=${encodeURIComponent(lang)}`, { replace: true });
          return;
        }

        const res = await fetch(exchangeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`exchangeAuthBridgeCode failed (${res.status}): ${txt}`);
        }

        const data = await res.json().catch(() => ({}));
        const customToken = data?.customToken || data?.token;
        if (!customToken) throw new Error("No customToken returned from exchangeAuthBridgeCode.");
        if (cancelled) return;

        setStatus("Signing you in...");
        await signInWithCustomToken(auth, customToken);
        if (cancelled) return;

        const fbUser = auth.currentUser;
        if (!fbUser?.uid) throw new Error("Signed in but auth.currentUser is missing.");

        setStatus("Checking your profile...");

        const userRef = doc(db, "users", fbUser.uid);
        const snap = await getDoc(userRef);

        const hint = safeInternalPath(nextHint);
        const isHintMeaningful = !!(hint && hint !== "/onboarding" && hint !== "/dashboard");

        let goTo = "/dashboard";

        if (!snap.exists()) {
          await setDoc(
            userRef,
            {
              uid: fbUser.uid,
              email: fbUser.email || "",
              emailLower: (fbUser.email || "").toLowerCase(),
              full_name: fbUser.displayName || "",
              selected_role: role || "student",
              user_type: role || "student",
              userType: role || "student",
              role: role || "student",
              onboarding_completed: false,
              onboarding_step: "basic_info",
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            },
            { merge: true }
          );

          goTo = isHintMeaningful
            ? appendQuery("/onboarding", { next: hint, lang })
            : appendQuery("/onboarding", { lang });
        } else {
          const u = snap.data() || {};
          const completed = u.onboarding_completed === true;

          if (!completed) {
            goTo = isHintMeaningful
              ? appendQuery("/onboarding", { next: hint, lang })
              : appendQuery("/onboarding", { lang });
          } else {
            goTo = hint ? appendQuery(hint, { lang }) : appendQuery("/dashboard", { lang });
          }
        }

        if (cancelled) return;

        setStatus("Redirecting...");
        window.location.replace(goTo);
      } catch (err) {
        console.error("[AuthBridge] error:", err);
        if (cancelled) return;

        setStatus("Sign-in failed. Redirecting to login...");
        setTimeout(() => {
          navigate(`/login?mode=login&lang=${encodeURIComponent(lang)}&bridge=fail`, {
            replace: true,
          });
        }, 600);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [code, exchangeUrl, lang, nextHint, navigate, role]);

  return (
    <div style={{ padding: 24 }}>
      <p>{status}</p>
    </div>
  );
}