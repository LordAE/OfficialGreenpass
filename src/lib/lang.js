import i18n from "i18next";

const DEFAULT_LANG = "en";
const STORAGE_KEY = "gp_lang";

function normalizeLang(raw) {
  const v = String(raw || "").trim();
  if (!v) return DEFAULT_LANG;

  const lower = v.toLowerCase();
  if (lower.startsWith("vi")) return "vi";
  if (lower.startsWith("fil") || lower.startsWith("tl")) return "fil";
  if (lower.startsWith("ceb")) return "ceb";
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("ar")) return "ar";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("en")) return "en";

  return DEFAULT_LANG;
}

export function resolveInitialLang() {
  // 1) URL
  try {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("lang");
    if (q) return normalizeLang(q);
  } catch {}

  // 2) localStorage
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return normalizeLang(s);
  } catch {}

  // 3) browser
  return normalizeLang(navigator.language);
}
// ✅ Backwards-compatible helpers (some pages import getLang/setLang)
export function getLang() {
  return resolveInitialLang();
}

export async function setLang(lang, opts = { syncUrl: true }) {
  return applyLang(lang, opts);
}



export async function applyLang(lang, { syncUrl = true } = {}) {
  const code = normalizeLang(lang);

  // persist
  try {
    localStorage.setItem(STORAGE_KEY, code);
    localStorage.setItem("i18nextLng", code);
  } catch {}

  // html lang/dir
  try {
    document.documentElement.lang = code;
    document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
  } catch {}

  // i18n switch
  if (i18n.language !== code) await i18n.changeLanguage(code);

  // keep URL in sync across pages
  if (syncUrl) {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("lang", code);
      window.history.replaceState({}, "", u.toString());
    } catch {}
  }

  return code;
}

export async function initLangOnBoot() {
  const initial = resolveInitialLang();
  await applyLang(initial, { syncUrl: true });
}
