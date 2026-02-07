import { useEffect } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../firebase"; // adjust path if needed

function getHashParams() {
  const h = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const sp = new URLSearchParams(h);
  return {
    token: sp.get("token") || "",
    next: sp.get("next") || "/dashboard",
    lang: sp.get("lang") || "en",
  };
}

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      const { token, next, lang } = getHashParams();

      if (!token) {
        window.location.replace(`/welcome?lang=${encodeURIComponent(lang)}`);
        return;
      }

      try {
        await signInWithCustomToken(auth, token);
        // keep lang
        const sep = next.includes("?") ? "&" : "?";
        window.location.replace(`${next}${sep}lang=${encodeURIComponent(lang)}`);
      } catch (e) {
        window.location.replace(`/welcome?lang=${encodeURIComponent(lang)}`);
      }
    })();
  }, []);

  return null;
}
