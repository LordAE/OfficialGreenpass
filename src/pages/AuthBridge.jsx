// src/pages/AuthBridge.jsx
import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase";

/**
 * Rules:
 * - If user doc does NOT exist => create it => go /onboarding
 * - If user doc exists and onboarding_completed === true => go /dashboard
 * - Else => go /onboarding
 *
 * Query:
 * - code=... (required)
 * - next=/onboarding or /dashboard (optional; used only as a hint, not authority)
 * - lang=en (optional)
 */
export default function AuthBridge() {
  const [params] = useSearchParams();
  const role = params.get("role"); // optional: student | agent | tutor | school | institution | provider
  const navigate = useNavigate();
  const [status, setStatus] = React.useState("Exchanging sign-in code...");

  const code = params.get("code");
  const lang = params.get("lang") || "en";

  // optional hint only (we still decide based on Firestore)
  const nextHint = params.get("next") || "/onboarding";

  const safeInternalPath = (p) => {
    if (!p) return null;
    // allow only internal relative paths like "/onboarding"
    if (typeof p !== "string") return null;
    if (!p.startsWith("/")) return null;
    if (p.startsWith("//")) return null;
    if (p.includes("http://") || p.includes("https://")) return null;
    return p;
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
          // send them back to login
          navigate(`/login?mode=login&lang=${encodeURIComponent(lang)}`, { replace: true });
          return;
        }

        // 1) Exchange code -> customToken
        const res = await fetch(exchangeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`exchangeAuthBridgeCode failed (${res.status}): ${txt}`);
        }

        const data = await res.json();
        const customToken = data?.customToken || data?.token;

        if (!customToken) {
          throw new Error("No customToken returned from exchangeAuthBridgeCode.");
        }

        if (cancelled) return;

        setStatus("Signing you in...");

        // 2) Sign in with the custom token
        await signInWithCustomToken(auth, customToken);

        if (cancelled) return;

        const fbUser = auth.currentUser;
        if (!fbUser?.uid) {
          throw new Error("Signed in but auth.currentUser is missing.");
        }

        setStatus("Checking your profile...");

        // 3) Check/create user doc
        const userRef = doc(db, "users", fbUser.uid);
        const snap = await getDoc(userRef);

        let goTo = "/onboarding";

        if (!snap.exists()) {
          // New user => create doc
          await setDoc(
            userRef,
            {
              uid: fbUser.uid,
              email: fbUser.email || "",
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
          goTo = "/onboarding";
        } else {
          const u = snap.data() || {};
          if (u.onboarding_completed === true) goTo = "/dashboard";
          else goTo = "/onboarding";
        }

        // optional hint: if they are NOT completed, allow /onboarding
        // but NEVER force onboarding for completed users
        const hint = safeInternalPath(nextHint);
        if (hint && goTo !== "/dashboard") {
          goTo = hint; // only applies when not completed
        }

        if (cancelled) return;

        setStatus("Redirecting...");

        // Use hard navigation so app state resets cleanly after auth
        window.location.replace(`${goTo}?lang=${encodeURIComponent(lang)}`);
      } catch (err) {
        console.error("[AuthBridge] error:", err);
        if (cancelled) return;

        setStatus("Sign-in failed. Redirecting to login...");
        // Back to login with a simple error flag
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
  }, [code, exchangeUrl, lang, nextHint, navigate]);

  return (
    <div style={{ padding: 24 }}>
      <p>{status}</p>
    </div>
  );
}