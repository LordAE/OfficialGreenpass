import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// ✅ IMPORTANT: this expects your json files to be in src/locales/*.json
import en from "@/i18n/locales/en.json";
import vi from "@/i18n/locales/vi.json";
import fil from "@/i18n/locales/fil.json";
import ceb from "@/i18n/locales/ceb.json";
import es from "@/i18n/locales/es.json";
import fr from "@/i18n/locales/fr.json";
import de from "@/i18n/locales/de.json";
import ptBR from "@/i18n/locales/pt-BR.json";
import ar from "@/i18n/locales/ar.json";
import zh from "@/i18n/locales/zh.json";
import ja from "@/i18n/locales/ja.json";
import ko from "@/i18n/locales/ko.json";

const resources = {
  en: { translation: en },
  vi: { translation: vi },
  fil: { translation: fil },
  ceb: { translation: ceb },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  "pt-BR": { translation: ptBR },
  ar: { translation: ar },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",               // will be overridden by lang module on boot
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
