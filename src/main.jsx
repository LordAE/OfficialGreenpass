// src/main.jsx
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css"; // <-- IMPORTANT: load Tailwind/global CSS

import "./i18n"; // ✅ i18n init
import { initLangOnBoot } from "@/lib/lang";

initLangOnBoot();

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
