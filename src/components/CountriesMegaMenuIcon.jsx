import React from "react";
import { createPortal } from "react-dom";
import { Globe, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Small helper (avoid needing cn utils)
function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function useClickOutside(ref, handler, when = true) {
  React.useEffect(() => {
    if (!when) return;
    const onDown = (e) => {
      const el = ref?.current;
      if (!el) return;
      if (el === e.target || el.contains(e.target)) return;
      handler?.(e);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler, when]);
}

// Simple flag emoji map (no assets needed)
const FLAG = {
  CA: "🇨🇦",
  AU: "🇦🇺",
  GB: "🇬🇧",
  US: "🇺🇸",
  DE: "🇩🇪",
  IE: "🇮🇪",
  NZ: "🇳🇿",
  FR: "🇫🇷",
  IT: "🇮🇹",
  CH: "🇨🇭",
};

const DEFAULT_FEATURED = [
  {
    code: "CA",
    label: "Canada",
    title: "Study in Canada",
    description:
      "A hassle-free visa process, affordable tuition fees, and highly-ranked universities.",
    // You can swap these to your own local images later
    image:
      "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=900&q=70",
  },
  {
    code: "AU",
    label: "Australia",
    title: "Study in Australia",
    description:
      "Top universities, great student life, and diverse programs with strong post-study options.",
    image:
      "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=900&q=70",
  },
];

const DEFAULT_MORE = [
  { code: "GB", label: "UK" },
  { code: "US", label: "USA" },
  { code: "DE", label: "Germany" },
  { code: "IE", label: "Ireland" },
  { code: "NZ", label: "New Zealand" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "CH", label: "Switzerland" },
];

export default function CountriesMegaMenuIcon({
  iconSizeClass = "h-6 w-6 sm:h-7 sm:w-7",
  value = "", // selected country code or label (optional)
  onSelect, // (countryObj) => void (optional)
  featured = DEFAULT_FEATURED,
  moreCountries = DEFAULT_MORE,
  titleLeft = "Countries",
  exploreLabel = "Explore all countries",
  onExploreAll, // optional callback
}) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const wrapRef = React.useRef(null);

  useClickOutside(wrapRef, () => setOpen(false), open);

  const computePosition = React.useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return { top: 0, left: 0, width: 980 };

    // Mega menu width similar to your screenshot
    const width = Math.min(980, Math.max(320, Math.floor(window.innerWidth * 0.92)));
    const desiredLeft = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(12, Math.min(desiredLeft, window.innerWidth - width - 12));
    const top = rect.bottom + 12;

    return { top, left, width };
  }, []);

  const [geom, setGeom] = React.useState({ top: 0, left: 0, width: 980 });

  React.useEffect(() => {
    if (!open) return;
    const update = () => setGeom(computePosition());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, computePosition]);

  const pick = (country) => {
    if (onSelect) onSelect(country);
    setOpen(false);
  };

  const isSelected = (codeOrLabel) =>
    value && (value === codeOrLabel || value === String(codeOrLabel).toLowerCase());

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className="fixed z-[200] bg-white rounded-2xl shadow-xl border"
          style={{ top: geom.top, left: geom.left, width: geom.width }}
          role="menu"
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">{titleLeft}</div>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-800"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            {/* 3-column mega menu */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Featured 1 */}
              <div className="lg:col-span-5">
                <FeaturedCard
                  item={featured?.[0]}
                  selected={isSelected(featured?.[0]?.code) || isSelected(featured?.[0]?.label)}
                  onClick={() => pick(featured?.[0])}
                />
              </div>

              {/* Featured 2 */}
              <div className="lg:col-span-4">
                <FeaturedCard
                  item={featured?.[1]}
                  selected={isSelected(featured?.[1]?.code) || isSelected(featured?.[1]?.label)}
                  onClick={() => pick(featured?.[1])}
                />
              </div>

              {/* More Countries */}
              <div className="lg:col-span-3">
                <div className="text-sm font-semibold text-gray-900">More Countries</div>
                <div className="mt-2 space-y-1">
                  {moreCountries.map((c) => {
                    const selected = isSelected(c.code) || isSelected(c.label);
                    return (
                      <button
                        key={`${c.code}-${c.label}`}
                        type="button"
                        onClick={() => pick(c)}
                        className={cx(
                          "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-left transition",
                          selected ? "bg-green-50 text-green-800" : "hover:bg-gray-50 text-gray-800"
                        )}
                      >
                        <span className="text-base leading-none">{FLAG[c.code] || "🌍"}</span>
                        <span className="truncate">Study in {c.label}</span>
                        {selected ? <Check className="ml-auto h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onExploreAll) onExploreAll();
                    // If no handler, just close (still no routes)
                    setOpen(false);
                  }}
                  className="mt-3 w-full rounded-full border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 text-sm font-medium"
                >
                  {exploreLabel}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "inline-flex items-center justify-center rounded-2xl p-3 transition",
          open ? "bg-green-100 text-green-700" : "hover:bg-gray-100 text-gray-600"
        )}
        aria-label="Countries"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Globe className={iconSizeClass} />
      </button>

      {typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </div>
  );
}

function FeaturedCard({ item, selected, onClick }) {
  if (!item) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full text-left rounded-2xl border p-3 sm:p-4 transition",
        selected ? "border-green-300 bg-green-50" : "hover:bg-gray-50"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-red-500">{item.title}</div>
        <div className="text-lg">{FLAG[item.code] || "🌍"}</div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border bg-gray-100">
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img
          src={item.image}
          className="h-44 w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="mt-3 text-xs text-gray-600 leading-relaxed">
        {item.description}
      </div>
    </button>
  );
}
