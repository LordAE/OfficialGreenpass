// src/components/CountriesMegaMenuIcon.jsx
import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ---------- click outside ---------- */
function useClickOutside(ref, handler, when = true) {
  React.useEffect(() => {
    if (!when) return;
    const fn = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler?.();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [when, handler]);
}

export default function CountriesMegaMenuIcon({
  createPageUrl,
  iconSizeClass = "h-6 w-6 sm:h-7 sm:w-7",
}) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const wrapRef = React.useRef(null);

  useClickOutside(wrapRef, () => setOpen(false), open);

  const more = [
    "Australia",
    "Ireland",
    "Germany",
    "United Kingdom",
    "United States",
  ];

  const menu = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className="fixed z-[200] bg-white rounded-2xl shadow-xl border p-6 w-[520px]"
          style={{
            top: btnRef.current?.getBoundingClientRect().bottom + 12,
            left:
              btnRef.current?.getBoundingClientRect().left -
              220 +
              btnRef.current?.getBoundingClientRect().width / 2,
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Link
              to={createPageUrl("StudyCanada")}
              className="font-semibold hover:text-green-600"
            >
              Study in Canada
            </Link>
            <Link
              to={createPageUrl("StudyNewZealand")}
              className="font-semibold hover:text-green-600"
            >
              Study in New Zealand
            </Link>
          </div>

          <div className="mt-4 border-t pt-4 space-y-2">
            {more.map((c) => (
              <Link
                key={c}
                to={createPageUrl(`Study${c.replace(/\s/g, "")}`)}
                className="block text-sm hover:text-green-600"
              >
                Study in {c}
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl p-3 transition",
          open
            ? "bg-green-100 text-green-700"
            : "hover:bg-gray-100 text-gray-600"
        )}
      >
        <Globe className={iconSizeClass} />
      </button>

      {typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
