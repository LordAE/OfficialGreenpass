import React from "react";
import { useTranslation } from "react-i18next";
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
 *
 * ✅ Language handling:
 * - Reads `lang` from query
 * - Applies it to i18next immediately (so UI/status strings match SEO selection)
 * - Persists to localStorage for app-wide reload consistency
 */
export default function AuthBridge() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const role = params.get("role");
  const navigate = useNavigate();

  const code = params.get("code");
  const lang = params.get("lang") || "en";
  const nextHint = params.get("next") || "";

  const [status, setStatus] = React.useState("…");

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

  // ✅ Apply language ASAP (before showing any status)
  React.useEffect(() => {
    try {
      // Persist for i18next default detector + your own helpers
      localStorage.setItem("i18nextLng", lang);
      localStorage.setItem("gp_lang", lang);
    } catch {}
    if (i18n?.language !== lang) {
      i18n.changeLanguage(lang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setStatus(t("authBridge.status_exchanging", "Exchanging sign-in code…"));

        if (!code) {
          setStatus(t("authBridge.status_missing_code", "Missing sign-in code."));
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

        setStatus(t("authBridge.status_signing_in", "Signing you in…"));
        await signInWithCustomToken(auth, customToken);
        if (cancelled) return;

        const fbUser = auth.currentUser;
        if (!fbUser?.uid) throw new Error("Signed in but auth.currentUser is missing.");

        setStatus(t("authBridge.status_checking_profile", "Checking your profile…"));

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

        setStatus(t("authBridge.status_redirecting", "Redirecting…"));
        window.location.replace(goTo);
      } catch (err) {
        console.error("[AuthBridge] error:", err);
        if (cancelled) return;

        setStatus(t("authBridge.status_failed_redirecting", "Sign-in failed. Redirecting to login…"));
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
  }, [code, exchangeUrl, lang, nextHint, navigate, role, t]);

  return (
    <div
      style={{
        minHeight: "60vh",
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="gp-spinner" aria-label={t("authBridge.aria_loading", "Loading")} />
      <div style={{ fontSize: 14, color: "#555", textAlign: "center" }}>{status}</div>

      <style>{`
        .gp-spinner {
          width: 52px;
          height: 52px;
          border-radius: 999px;
          border: 4px solid rgba(0, 0, 0, 0.12);
          border-top-color: rgba(0, 0, 0, 0.55);
          animation: gp-spin 0.9s linear infinite;
        }
        @keyframes gp-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
