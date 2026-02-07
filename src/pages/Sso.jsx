import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { createPageUrl } from "@/utils";

async function routeAfterSignIn(navigate, fbUser, roleHint = "user") {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        uid: fbUser.uid,
        email: fbUser.email || "",
        full_name: fbUser.displayName || "",
        user_type: roleHint,
        onboarding_completed: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
    return navigate(`${createPageUrl("Onboarding")}?role=${roleHint}`, { replace: true });
  }

  const profile = snap.data();
  if (!profile?.onboarding_completed) {
    const r = (profile?.user_type || roleHint || "user").toString();
    return navigate(`${createPageUrl("Onboarding")}?role=${r}`, { replace: true });
  }

  return navigate(createPageUrl("Dashboard"), { replace: true });
}

export default function Sso() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash || "";
        const qs = hash.startsWith("#") ? hash.slice(1) : hash;
        const params = new URLSearchParams(qs);

        const token = params.get("token");
        const lang = params.get("lang") || "en";

        if (!token) {
          navigate("/welcome", { replace: true });
          return;
        }

        // Sign into Firebase on app domain
        const cred = await signInWithCustomToken(auth, token);

        // Optional: store lang
        localStorage.setItem("gp_lang", lang);

        await routeAfterSignIn(navigate, cred.user);
      } catch (e) {
        navigate("/welcome", { replace: true });
      }
    })();
  }, [navigate]);

  return null;
}
