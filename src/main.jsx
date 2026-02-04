// src/main.jsx
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css"; // <-- IMPORTANT: load Tailwind/global CSS

import "./i18n"; // ✅ i18n init
import { initLangOnBoot } from "@/lib/lang";

initLangOnBoot();

// ✅ Make React Router respect the Vite base path (e.g. /app/)
// Vite exposes this as import.meta.env.BASE_URL which matches `base` from vite.config.js
const basename = import.meta.env.BASE_URL || "/";

createRoot(document.getElementById("root")).render(
  <BrowserRouter basename={basename}>
    <App />
  </BrowserRouter>
);
