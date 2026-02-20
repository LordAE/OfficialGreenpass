import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "@/firebase";
import { signInWithCustomToken } from "firebase/auth";

function getFunctionsBase() {
  // Prefer explicit env
  const explicit = import.meta.env.VITE_FUNCTIONS_BASE;
  if (explicit) return explicit.replace(/\/+$/, "");

  // Fallback to standard Firebase Functions URL
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Missing VITE_FUNCTIONS_BASE or VITE_FIREBASE_PROJECT_ID");
  return `https://us-central1-${projectId}.cloudfunctions.net`;
}

export default function AuthBridge() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const run = async () => {
      try {
        const code = params.get("code");
        const next = params.get("next") || "/dashboard";

        if (!code) {
          setError("Missing bridge code.");
          return;
        }

        const base = getFunctionsBase();
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

        await signInWithCustomToken(auth, customToken);

        // Important: navigate inside SPA
        nav(next, { replace: true });
      } catch (e) {
        setError(e?.message || "Auth bridge failed.");
      }
    };

    run();
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

  return <div style={{ padding: 24 }}>Signing you in…</div>;
}