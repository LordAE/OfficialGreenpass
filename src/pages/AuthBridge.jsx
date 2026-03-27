import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "@/firebase";

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "user") return "student";
  if (["student", "agent", "tutor", "school", "institution", "provider", "vendor"].includes(role)) {
    if (role === "institution") return "school";
    if (role === "provider") return "vendor";
    return role;
  }
  return "student";
}

async function resolveCollaboratorRef(refCode) {
  const code = String(refCode || "").trim();
  if (!code) return "";

  try {
    const q = query(
      collection(db, "users"),
      where("collaborator_referral_code", "==", code),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return "";
    return snap.docs[0]?.id || "";
  } catch (error) {
    console.error("resolveCollaboratorRef error:", error);
    return "";
  }
}

function buildCollaboratorReferralFields(refCode = "", referredByUid = "") {
  const code = String(refCode || "").trim();
  if (!code) return {};

  return {
    referred_by_collaborator_code: code,
    referred_by_collaborator_uid: referredByUid || "",
    referred_by_collaborator_at: serverTimestamp(),
  };
}

export default function AuthBridge() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const role = params.get("role");
  const navigate = useNavigate();

  const code = params.get("code");
  const lang = params.get("lang") || "en";
  const nextHint = params.get("next") || "";
  const collaboratorRef = String(params.get("ref") || "").trim();

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

  React.useEffect(() => {
    try {
      localStorage.setItem("i18nextLng", lang);
      localStorage.setItem("gp_lang", lang);
      if (collaboratorRef) localStorage.setItem("gp_collaborator_ref", collaboratorRef);
    } catch {}
    if (i18n?.language !== lang) {
      i18n.changeLanguage(lang).catch(() => {});
    }
  }, [lang, i18n, collaboratorRef]);

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

        const storedRef = (() => {
          try {
            return collaboratorRef || localStorage.getItem("gp_collaborator_ref") || "";
          } catch {
            return collaboratorRef || "";
          }
        })();

        const referredByCollaboratorUid = await resolveCollaboratorRef(storedRef);

        const hint = safeInternalPath(nextHint);
        const isHintMeaningful = !!(hint && hint !== "/onboarding" && hint !== "/dashboard");

        let goTo = "/dashboard";

        if (!snap.exists()) {
          const normalizedRole = normalizeRole(role);

          await setDoc(
            userRef,
            {
              uid: fbUser.uid,
              email: fbUser.email || "",
              emailLower: (fbUser.email || "").toLowerCase(),
              full_name: fbUser.displayName || "",
              selected_role: normalizedRole,
              user_type: normalizedRole,
              userType: normalizedRole,
              role: normalizedRole,
              onboarding_completed: false,
              onboarding_step: "basic_info",
              ...buildCollaboratorReferralFields(storedRef, referredByCollaboratorUid),
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            },
            { merge: true }
          );

          goTo = isHintMeaningful
            ? appendQuery("/onboarding", { next: hint, lang, ref: storedRef || undefined })
            : appendQuery("/onboarding", { lang, ref: storedRef || undefined });
        } else {
          const u = snap.data() || {};
          const completed = u.onboarding_completed === true;

          if (storedRef && !u.referred_by_collaborator_code) {
            await setDoc(
              userRef,
              {
                ...buildCollaboratorReferralFields(
                  storedRef,
                  u.referred_by_collaborator_uid || referredByCollaboratorUid
                ),
                updated_at: serverTimestamp(),
              },
              { merge: true }
            );
          }

          if (!completed) {
            goTo = isHintMeaningful
              ? appendQuery("/onboarding", { next: hint, lang, ref: storedRef || undefined })
              : appendQuery("/onboarding", { lang, ref: storedRef || undefined });
          } else {
            goTo = hint
              ? appendQuery(hint, { lang, ref: storedRef || undefined })
              : appendQuery("/dashboard", { lang, ref: storedRef || undefined });
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
  }, [code, exchangeUrl, lang, nextHint, navigate, role, t, collaboratorRef]);

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