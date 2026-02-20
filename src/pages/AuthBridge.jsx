import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "@/firebase";
import {
  signInWithCustomToken,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";

function getFunctionsBase() {
  // Prefer explicit env
  const explicit = import.meta.env.VITE_FUNCTIONS_BASE;
  if (explicit) return explicit.replace(/\/+$/, "");

  // Fallback to standard Firebase Functions URL
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Missing VITE_FUNCTIONS_BASE or VITE_FIREBASE_PROJECT_ID");
  return `https://us-central1-${projectId}.cloudfunctions.net`;
}

// Wait until Firebase auth state is updated (prevents immediate redirect to /login due to guard timing)
function waitForAuthUser(timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      try { unsub?.(); } catch {}
      reject(new Error("Timed out waiting for auth state."));
    }, timeoutMs);

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        clearTimeout(t);
        try { unsub(); } catch {}
        resolve(u);
      }
    });
  });
}

export default function AuthBridge() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = React.useState("");
  const [status, setStatus] = React.useState("Signing you in…");

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const code = params.get("code");
        const next = params.get("next") || "/dashboard";

        if (!code) {
          setError("Missing bridge code.");
          return;
        }

        // Ensure the auth session persists (prevents instant “logged out” state)
        // In incognito, this persists for the incognito session.
        await setPersistence(auth, browserLocalPersistence);

        const base = getFunctionsBase();
        setStatus("Exchanging sign-in code…");

        const r = await fetch(`${base}/exchangeAuthBridgeCode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!r.ok) {
          const msg = await r.text();
          throw new Error(msg || "Exchange failed");
        }

        const { customToken } = await r.json();
        if (!customToken) throw new Error("Missing customToken");

        setStatus("Finalizing sign-in…");
        await signInWithCustomToken(auth, customToken);

        // IMPORTANT: wait for auth state to settle before navigating,
        // otherwise RequireAuth can briefly see currentUser=null and redirect to /login.
        await waitForAuthUser();

        if (cancelled) return;

        // Navigate inside SPA
        nav(next, { replace: true });
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Auth bridge failed.");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [params, nav]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Sign-in handoff failed</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
        <p>Go back and login again from greenpassgroup.com.</p>
      </div>
    );
  }

  return <div style={{ padding: 24 }}>{status}</div>;
}
