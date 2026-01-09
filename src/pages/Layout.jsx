// src/pages/Layout.jsx
import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home,
  School,
  Users,
  BookOpen,
  FileText,
  Settings,
  UserCheck,
  Calendar,
  ShoppingCart,
  Store,
  Package,
  BarChart3,
  Building,
  LogOut,
  Globe,
  DollarSign,
  Search,
  MessageSquare,
  UsersIcon,
  LayoutGrid,
  Edit,
  Phone,
  Info,
  Palette,
  Landmark,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Ticket,
  DoorOpen,
  Bell,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

import ChatWidget from "@/components/chat/ChatWidget";
import { Button } from "@/components/ui/button";

/* ---------- Firebase auth/profile ---------- */
import { auth, db } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";

/* =========================
   English-only text helper (exported)
========================= */
const TEXT = {
  login: "Login",
  logOut: "Log Out",
  profileSettings: "Profile Settings",
  more: "More",

  about: "About",
  events: "Events & Fairs",
  blog: "News and Highlights",

  dashboard: "Dashboard",
  discoverSchools: "Discover Schools",
  findTutors: "Tutors",
  findAgent: "Find Agent",
  myAgent: "My Agent",
  visaPackages: "Visa Packages",
  visaApplications: "Visa Applications",
  marketplace: "Marketplace",
  mySessions: "My Sessions",
  myStudents: "My Students",
  visaCases: "Visa Cases",
  leads: "Leads",
  earnings: "Earnings",
  availability: "Availability",
  myServices: "My Services",
  myOrders: "My Orders",
  analytics: "Analytics",
  userManagement: "User Management",
  schoolManagement: "Program Management",
  institutionManagement: "Institution Management",
  verifications: "Verifications",
  paymentVerification: "Payment Verification",
  walletManagement: "Wallet Management",
  eventsAdmin: "Events Admin",
  homePageEditor: "Home Page",
  blogEditor: "Blog Editor",
  aboutPageEditor: "About Page Editor",
  contactPageEditor: "Contact Page Editor",
  faqEditor: "FAQ Editor",
  bankSettings: "Bank Settings",
  reports: "Reports",
  chatSettings: "Chat Settings",
  marketplaceAdmin: "Marketplace Admin",
  packageAdmin: "Package Admin",
};

export const getText = (key) => TEXT[key] || key;

/* ---------- Social links ---------- */
const SOCIAL_LINKS = [
  { platform: "YouTube", url: "https://www.youtube.com/@GreenPassGroup" },
  { platform: "Facebook", url: "https://www.facebook.com/greenpassgroup" },
  { platform: "Instagram", url: "https://www.instagram.com/greenpassglobal/" },
  {
    platform: "TikTok",
    url: "https://www.tiktok.com/@greenpasstv?_t=ZS-8zH7Q114gVM&_r=1",
  },
];

// TikTok icon
const TikTokIcon = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M240 96a96 96 0 0 1-56-18.1V160a56 56 0 1 1-56-56 56.1 56.1 0 0 1 9 .74V80.22a96.19 96.19 0 0 1-16-.22v37.84A72 72 0 1 0 216 128V112a96.26 96.26 0 0 0 24 3.17Z"
      fill="currentColor"
    />
  </svg>
);

const iconByPlatform = (platform = "") => {
  const p = platform.toLowerCase().trim();
  if (p === "facebook") return <Facebook className="h-5 w-5" />;
  if (p === "instagram") return <Instagram className="h-5 w-5" />;
  if (p === "youtube") return <Youtube className="h-5 w-5" />;
  if (p === "linkedin") return <Linkedin className="h-5 w-5" />;
  if (p === "tiktok" || p === "tik tok") return <TikTokIcon className="h-5 w-5" />;
  return <Globe className="h-5 w-5" />;
};

/* =========================
   Small: click-outside hook
========================= */
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

/* =========================
   Avatar + Account Button (Facebook-style)
========================= */
const UserAvatar = ({ user, sizeClass = "w-10 h-10", textClass = "text-lg", className = "" }) => {
  const name = user?.full_name || "User";
  const initial = name.charAt(0).toUpperCase();
  if (user?.photo_url) {
    return (
      <img
        src={user.photo_url}
        alt={name}
        className={`rounded-full object-cover border border-white shadow-sm ${sizeClass} ${className}`}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold ${sizeClass} ${textClass} ${className}`}
    >
      {initial}
    </div>
  );
};

const AccountTrigger = ({ currentUser, open, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 sm:h-11 inline-flex items-center gap-2 rounded-full px-2 pr-2.5 transition",
        open
          ? "bg-green-100 text-green-700 ring-1 ring-green-200"
          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
      )}
      aria-label="Account"
      title="Account"
      aria-expanded={open}
      aria-haspopup="menu"
    >
      <UserAvatar user={currentUser} sizeClass="w-8 h-8 sm:w-9 sm:h-9" textClass="text-base" />
      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
    </button>
  );
};

const AccountDropdown = ({
  currentUser,
  open,
  setOpen,
  onLogout,
  items = [],
  title = "Account",
}) => {
  const wrapRef = React.useRef(null);
  useClickOutside(wrapRef, () => setOpen(false), open);

  const MenuItem = ({ to, onClick, Icon, label, danger = false, chevron = false }) => {
    const base =
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors";
    const cls = danger
      ? `${base} text-red-600 hover:bg-red-50`
      : `${base} text-gray-800 hover:bg-gray-50`;

    const Right = () =>
      chevron ? <ChevronRight className="ml-auto h-4 w-4 text-gray-400" /> : null;

    if (to) {
      return (
        <Link to={to} className={cls} onClick={() => setOpen(false)}>
          <Icon className={cn("h-4.5 w-4.5", danger ? "text-red-600" : "text-gray-600")} />
          <span className="truncate">{label}</span>
          <Right />
        </Link>
      );
    }

    return (
      <button
        type="button"
        className={cls}
        onClick={() => {
          setOpen(false);
          onClick?.();
        }}
      >
        <Icon className={cn("h-4.5 w-4.5", danger ? "text-red-600" : "text-gray-600")} />
        <span className="truncate">{label}</span>
        <Right />
      </button>
    );
  };

  return (
    <div className="relative" ref={wrapRef}>
      <AccountTrigger currentUser={currentUser} open={open} onClick={() => setOpen((v) => !v)} />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.12 }}
            role="menu"
            className="absolute right-0 mt-2 w-[320px] max-w-[90vw] rounded-2xl bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 p-2 z-[210]"
          >
            {/* Header like screenshot */}
            <div className="px-2 pt-2 pb-3">
              <div className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-gray-50 transition">
                <UserAvatar user={currentUser} sizeClass="w-12 h-12" textClass="text-lg" />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {currentUser?.full_name || "User"}
                  </div>
                  <div className="text-xs text-gray-500 capitalize truncate">
                    {currentUser?.user_type || "user"}
                  </div>
                </div>
              </div>
              <div className="mt-2 h-px bg-gray-100" />
            </div>

            <div className="px-1 pb-1">
              <div className="px-3 pb-2 text-xs text-gray-500">{title}</div>

              {items.map((it) => (
                <MenuItem
                  key={it.url || it.label}
                  to={it.url}
                  onClick={it.onClick}
                  Icon={it.icon}
                  label={it.label}
                  danger={it.danger}
                  chevron={it.chevron}
                />
              ))}

              <div className="my-2 h-px bg-gray-100" />

              <MenuItem onClick={onLogout} Icon={LogOut} label={getText("logOut")} danger />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* =========================
   ✅ Mobile Bottom Nav (restored)
   - 3 main icons + "More"
   - More opens a bottom sheet with extra links
========================= */
const MobileBottomNav = ({ nav, isActive }) => {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const sheetRef = React.useRef(null);
  useClickOutside(sheetRef, () => setMoreOpen(false), moreOpen);

  const main = nav?.main || [];
  const more = nav?.more || [];

  const ItemButton = ({ to, Icon, label, active, onClick }) => (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 flex-1",
        active ? "text-green-700" : "text-gray-600"
      )}
      aria-label={label}
      title={label}
    >
      <Icon className={cn("h-6 w-6", active ? "text-green-700" : "text-gray-600")} />
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </Link>
  );

  const SheetItem = ({ to, Icon, label }) => (
    <Link
      to={to}
      onClick={() => setMoreOpen(false)}
      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 text-gray-800"
    >
      <Icon className="h-5 w-5 text-gray-600" />
      <span className="text-sm font-medium">{label}</span>
      <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
    </Link>
  );

  return (
    <>
      {/* Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200">
        <div className="h-[72px] px-2 flex items-stretch">
          {main.slice(0, 3).map((it) => (
            <ItemButton
              key={it.url}
              to={it.url}
              Icon={it.icon}
              label={it.title}
              active={isActive(it.url)}
              onClick={() => setMoreOpen(false)}
            />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 flex-1",
              moreOpen ? "text-green-700" : "text-gray-600"
            )}
            aria-label={getText("more")}
            title={getText("more")}
          >
            <MoreHorizontal className={cn("h-6 w-6", moreOpen ? "text-green-700" : "text-gray-600")} />
            <span className="text-[11px] font-medium leading-none">{getText("more")}</span>
          </button>
        </div>
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-50 bg-black/35"
          >
            <motion.div
              ref={sheetRef}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="absolute left-0 right-0 bottom-0 rounded-t-3xl bg-white shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.25)]"
            >
              <div className="px-4 pt-3 pb-2">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200" />
                <div className="mt-3 text-sm font-semibold text-gray-900">More</div>
                <div className="mt-2 h-px bg-gray-100" />
              </div>

              <div className="px-3 pb-6 max-h-[65vh] overflow-y-auto">
                <div className="space-y-1">
                  {more.map((it) => (
                    <SheetItem key={it.url} to={it.url} Icon={it.icon} label={it.title} />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ---------- Countries mega-menu (PORTAL + centered under Globe icon) ---------- */
function CountriesMegaMenuIcon({ iconSizeClass = "h-6 w-6 sm:h-7 sm:w-7" }) {
  const [open, setOpen] = React.useState(false);
  const [geom, setGeom] = React.useState({ top: 64, left: 16, width: 900 });

  const btnRef = React.useRef(null);
  const closeTimerRef = React.useRef(null);

  const moreCountries = [
    { name: "Australia", href: createPageUrl("StudyAustralia") },
    { name: "Ireland", href: createPageUrl("StudyIreland") },
    { name: "Germany", href: createPageUrl("StudyGermany") },
    { name: "United Kingdom", href: createPageUrl("StudyUnitedKingdom") },
    { name: "United States", href: createPageUrl("StudyUnitedStates") },
  ];

  const Card = ({ to, title, img, desc }) => (
    <Link
      to={to}
      className="group block rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300 transition"
    >
      <div className="relative h-60 sm:h-64">
        <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
      </div>

      <div className="p-6">
        <div className="text-base sm:text-lg font-semibold text-gray-900 mb-1 whitespace-normal break-words leading-snug">
          {title}
        </div>
        <p className="text-sm sm:text-base text-gray-600 leading-snug line-clamp-3">{desc}</p>
      </div>
    </Link>
  );

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  }, [clearCloseTimer]);

  const computeGeom = React.useCallback(() => {
    const br = btnRef.current?.getBoundingClientRect();
    const vw = window.innerWidth;
    const edgePad = 16;

    const desired =
      vw < 900
        ? Math.min(740, vw - edgePad * 2)
        : vw < 1200
          ? Math.min(980, vw - edgePad * 2)
          : Math.min(1180, vw - edgePad * 2);

    const width = Math.max(520, desired);

    const btnBottom = (br?.bottom ?? 56) + 12;
    const btnCenterX = (br?.left ?? vw / 2) + (br?.width ?? 0) / 2;

    const minCenter = edgePad + width / 2;
    const maxCenter = vw - edgePad - width / 2;
    const clampedCenter = Math.max(minCenter, Math.min(btnCenterX, maxCenter));

    const left = Math.round(clampedCenter - width / 2);

    setGeom({ top: Math.round(btnBottom), left, width: Math.round(width) });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    computeGeom();

    const onResize = () => computeGeom();
    const onScroll = () => computeGeom();

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open, computeGeom]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const menu = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.12 }}
          role="menu"
          className="fixed z-[200] rounded-2xl bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5"
          style={{ top: geom.top, left: geom.left, width: geom.width }}
          onMouseEnter={() => {
            clearCloseTimer();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
        >
          <div className="grid grid-cols-12 gap-7 p-7">
            <div className="col-span-12 md:col-span-5">
              <Card
                to={createPageUrl("StudyCanada")}
                title="Study in Canada"
                img="https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1600&auto=format&fit=crop"
                desc="Hassle-free visa options, affordable tuition, and globally ranked universities make Canada a top destination."
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <Card
                to={createPageUrl("StudyNewZealand")}
                title="Study in New Zealand"
                img="https://images.unsplash.com/photo-1502786129293-79981df4e689?q=80&w=1600&auto=format&fit=crop"
                desc="Safe cities, world-class research, flexible work-study options, and breathtaking scenery."
              />
            </div>

            <div className="col-span-12 md:col-span-3 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6">
              <div className="text-sm sm:text-base font-extrabold text-pink-600 tracking-wide mb-3">
                More Countries
              </div>

              <ul className="space-y-2">
                {moreCountries.map((c) => (
                  <li key={c.name}>
                    <Link
                      to={c.href}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:text-green-700 whitespace-normal break-words"
                    >
                      <span>Study in {c.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                to={createPageUrl("Directory")}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-pink-200 bg-pink-50 px-5 py-3 text-sm sm:text-base font-semibold text-pink-700 hover:bg-pink-100 whitespace-nowrap"
              >
                Explore all countries
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl p-3 sm:p-3.5 transition",
          open ? "bg-green-100 text-green-700 ring-1 ring-green-200" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        aria-label="Countries"
        title="Countries"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Globe className={iconSizeClass} />
      </button>

      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

/* ---------- Public layout (ONE LAYER, CORNER GROUPS, BIG CENTER) ---------- */
const PublicLayout = ({ getLogoUrl, getCompanyName }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const headerRef = React.useRef(null);
  const [headerH, setHeaderH] = React.useState(72);
  const [measured, setMeasured] = React.useState(false);

  const [q, setQ] = React.useState("");

  React.useLayoutEffect(() => {
    const update = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      if (h) {
        setHeaderH(h);
        setMeasured(true);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  const onSubmitSearch = React.useCallback(
    (e) => {
      e.preventDefault();
      const term = (q || "").trim();
      const base = createPageUrl("Directory");
      navigate(term ? `${base}?q=${encodeURIComponent(term)}` : base);
    },
    [q, navigate]
  );

  const isActive = React.useCallback(
    (to) => {
      if (!to) return false;
      const path = (location.pathname || "").toLowerCase();
      const target = (to || "").toLowerCase();
      if (!target || target === "/") return path === "/" || path === "";
      return path === target || path.startsWith(target);
    },
    [location.pathname]
  );

  const IconLink = ({ to, Icon, label, iconClass = "h-6 w-6 sm:h-7 sm:w-7" }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl p-3 sm:p-3.5 transition",
          active ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        aria-label={label}
        title={label}
      >
        <Icon className={iconClass} />
      </Link>
    );
  };

  return (
    <div className="min-h-[100svh] bg-white font-sans text-gray-800">
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <nav data-public-nav="1" className="w-full px-4 sm:px-5 lg:px-7 py-2">
          <div className="relative flex items-center h-12 sm:h-14">
            {/* LEFT */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link to={createPageUrl("")} className="flex items-center shrink-0" aria-label="GreenPass" title="GreenPass">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 sm:h-9 w-auto" />
              </Link>

              {/* Desktop search */}
              <form onSubmit={onSubmitSearch} className="hidden sm:flex items-center min-w-0">
                <div className="relative min-w-0 w-[170px] md:w-[210px] lg:w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                    className="w-full h-10 rounded-full border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300"
                    aria-label="Search"
                  />
                </div>
              </form>
            </div>

            {/* CENTER (TRUE CENTER) */}
            <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none">
              <div className="pointer-events-auto w-[520px] md:w-[600px] lg:w-[680px]">
                <div className="flex w-full">
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("")} Icon={Home} label="Home" />
                  </div>

                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("Directory")} Icon={UsersIcon} label="Directory" />
                  </div>

                  <div className="flex-1 flex justify-center">
                    <CountriesMegaMenuIcon iconSizeClass="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>

                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("Events")} Icon={Calendar} label="Events & Fairs" />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="ml-auto flex items-center justify-end gap-2">
              <Link
                to={createPageUrl("Directory")}
                className="w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                aria-label="Apps"
                title="Apps"
              >
                <LayoutGrid className="h-6 w-6" />
              </Link>

              <Link
                to={createPageUrl("Welcome")}
                className="w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                aria-label="Login"
                title="Login"
              >
                <DoorOpen className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main
        className="min-h-[100svh] transition-[padding] ease-out overflow-y-auto overflow-x-hidden touch-pan-y"
        style={{
          paddingTop: headerH,
          visibility: measured ? "visible" : "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Outlet />
      </main>

      <Footer getCompanyName={getCompanyName} />
    </div>
  );
};

/* ---------- Shared helpers for role layouts ---------- */
const useHeaderMeasure = () => {
  const headerRef = React.useRef(null);
  const [headerH, setHeaderH] = React.useState(72);
  const [measured, setMeasured] = React.useState(false);

  React.useLayoutEffect(() => {
    const update = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      if (h) {
        setHeaderH(h);
        setMeasured(true);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  return { headerRef, headerH, measured };
};

const useIsActive = () => {
  const location = useLocation();
  return React.useCallback(
    (to) => {
      if (!to) return false;
      const path = (location.pathname || "").toLowerCase();
      const target = (to || "").toLowerCase();
      if (!target || target === "/") return path === "/" || path === "";
      return path === target || path.startsWith(target);
    },
    [location.pathname]
  );
};

/* ---------- School authenticated top navbar (matches public style) ---------- */
const SchoolAuthedTopNavLayout = ({ currentUser, getLogoUrl, getCompanyName, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = useIsActive();

  const { headerRef, headerH, measured } = useHeaderMeasure();
  const [q, setQ] = React.useState("");

  // account menu
  const [acctOpen, setAcctOpen] = React.useState(false);

  const onSubmitSearch = React.useCallback(
    (e) => {
      e.preventDefault();
      const term = (q || "").trim();
      const base = createPageUrl("Directory");
      navigate(term ? `${base}?q=${encodeURIComponent(term)}` : base);
    },
    [q, navigate]
  );

  const IconLink = ({ to, Icon, label, iconClass = "h-6 w-6 sm:h-7 sm:w-7" }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl p-3 sm:p-3.5 transition",
          active ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        aria-label={label}
        title={label}
      >
        <Icon className={iconClass} />
      </Link>
    );
  };

  const mobileNav = buildMobileNav(currentUser, false, null);

  return (
    <div className="min-h-[100svh] bg-white font-sans text-gray-800">
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <nav className="w-full px-4 sm:px-5 lg:px-7 py-2">
          <div className="relative flex items-center h-12 sm:h-14">
            {/* LEFT: logo + search */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link to={createPageUrl("Dashboard")} className="flex items-center shrink-0" aria-label="GreenPass" title="GreenPass">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 sm:h-9 w-auto" />
              </Link>

              <form onSubmit={onSubmitSearch} className="hidden sm:flex items-center min-w-0">
                <div className="relative min-w-0 w-[170px] md:w-[210px] lg:w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                    className="w-full h-10 rounded-full border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300"
                    aria-label="Search"
                  />
                </div>
              </form>
            </div>

            {/* CENTER: Dashboard, Events & Fair, Profile, Programs, Leads */}
            <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none">
              <div className="pointer-events-auto w-[560px] md:w-[640px] lg:w-[720px]">
                <div className="flex w-full">
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("Dashboard")} Icon={Home} label="Dashboard" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("FairAndEvents")} Icon={Calendar} label="Events & Fair" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("SchoolProfile")} Icon={Building} label="Profile" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("SchoolPrograms")} Icon={BookOpen} label="Programs" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("SchoolLeads")} Icon={Users} label="Leads" />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: bell + account (profile pic + dropdown icon) */}
            <div className="ml-auto flex items-center justify-end gap-2">
              <Link
                to={createPageUrl("Notifications")}
                className="w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
              </Link>

              <AccountDropdown
                currentUser={currentUser}
                open={acctOpen}
                setOpen={setAcctOpen}
                onLogout={onLogout}
                title="Account"
                items={[
                  { label: getText("profileSettings"), url: createPageUrl("Profile"), icon: Settings },
                ]}
              />
            </div>
          </div>
        </nav>
      </header>

      <main
        className="min-h-[100svh] transition-[padding] ease-out overflow-y-auto overflow-x-hidden touch-pan-y pb-[84px] md:pb-0"
        style={{
          paddingTop: headerH,
          visibility: measured ? "visible" : "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Outlet />
      </main>

      <Footer getCompanyName={getCompanyName} />
      <MobileBottomNav nav={mobileNav} isActive={isActive} />
    </div>
  );
};

const AgentAuthedTopNavLayout = ({ currentUser, getLogoUrl, getCompanyName, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = useIsActive();

  const { headerRef, headerH, measured } = useHeaderMeasure();
  const [q, setQ] = React.useState("");

  const [acctOpen, setAcctOpen] = React.useState(false);

  const onSubmitSearch = React.useCallback(
    (e) => {
      e.preventDefault();
      const term = (q || "").trim();
      const base = createPageUrl("Directory");
      navigate(term ? `${base}?q=${encodeURIComponent(term)}` : base);
    },
    [q, navigate]
  );

  const IconLink = ({ to, Icon, label, iconClass = "h-6 w-6 sm:h-7 sm:w-7" }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl p-3 sm:p-3.5 transition",
          active ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        aria-label={label}
        title={label}
      >
        <Icon className={iconClass} />
      </Link>
    );
  };

  const mobileNav = buildMobileNav(currentUser, false, null);

  return (
    <div className="min-h-[100svh] bg-white font-sans text-gray-800">
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <nav className="w-full px-4 sm:px-5 lg:px-7 py-2">
          <div className="relative flex items-center h-12 sm:h-14">
            {/* LEFT */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link to={createPageUrl("Dashboard")} className="flex items-center shrink-0" aria-label="GreenPass" title="GreenPass">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 sm:h-9 w-auto" />
              </Link>

              <form onSubmit={onSubmitSearch} className="hidden sm:flex items-center min-w-0">
                <div className="relative min-w-0 w-[170px] md:w-[210px] lg:w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                    className="w-full h-10 rounded-full border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300"
                    aria-label="Search"
                  />
                </div>
              </form>
            </div>

            {/* CENTER */}
            <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none">
              <div className="pointer-events-auto w-[520px] md:w-[600px] lg:w-[680px]">
                <div className="flex w-full">
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("Dashboard")} Icon={Home} label="Dashboard" />
                  </div>

                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("FairAndEvents")} Icon={Calendar} label="Events & Fair" />
                  </div>

                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("MyStudents")} Icon={Users} label="My Students" />
                  </div>

                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("VisaCases")} Icon={FileText} label="Visa Cases" />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="ml-auto flex items-center justify-end gap-2">
              <Link
                to={createPageUrl("Notifications")}
                className="w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
              </Link>

              <AccountDropdown
                currentUser={currentUser}
                open={acctOpen}
                setOpen={setAcctOpen}
                onLogout={onLogout}
                title="Account"
                items={[
                  { label: getText("profileSettings"), url: createPageUrl("Profile"), icon: Settings },
                  { label: getText("leads"), url: createPageUrl("AgentLeads"), icon: Users },
                  { label: getText("earnings"), url: createPageUrl("AgentEarnings"), icon: BarChart3 },
                ]}
              />
            </div>
          </div>
        </nav>
      </header>

      <main
        className="min-h-[100svh] transition-[padding] ease-out overflow-y-auto overflow-x-hidden touch-pan-y pb-[84px] md:pb-0"
        style={{
          paddingTop: headerH,
          visibility: measured ? "visible" : "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Outlet />
      </main>

      <Footer getCompanyName={getCompanyName} />
      <MobileBottomNav nav={mobileNav} isActive={isActive} />
    </div>
  );
};

const TutorAuthedTopNavLayout = ({ currentUser, getLogoUrl, getCompanyName, onLogout }) => {
  const navigate = useNavigate();
  const isActive = useIsActive();

  const { headerRef, headerH, measured } = useHeaderMeasure();
  const [q, setQ] = React.useState("");

  const [acctOpen, setAcctOpen] = React.useState(false);

  const onSubmitSearch = React.useCallback(
    (e) => {
      e.preventDefault();
      const term = (q || "").trim();
      const base = createPageUrl("Directory");
      navigate(term ? `${base}?q=${encodeURIComponent(term)}` : base);
    },
    [q, navigate]
  );

  const IconLink = ({ to, Icon, label, iconClass = "h-6 w-6 sm:h-7 sm:w-7" }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl p-3 sm:p-3.5 transition",
          active ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        aria-label={label}
        title={label}
      >
        <Icon className={iconClass} />
      </Link>
    );
  };

  const mobileNav = buildMobileNav(currentUser, false, null);

  return (
    <div className="min-h-[100svh] bg-white font-sans text-gray-800">
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <nav className="w-full px-4 sm:px-5 lg:px-7 py-2">
          <div className="relative flex items-center h-12 sm:h-14">
            {/* LEFT */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link to={createPageUrl("Dashboard")} className="flex items-center shrink-0" aria-label="GreenPass" title="GreenPass">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 sm:h-9 w-auto" />
              </Link>

              <form onSubmit={onSubmitSearch} className="hidden sm:flex items-center min-w-0">
                <div className="relative min-w-0 w-[170px] md:w-[210px] lg:w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                    className="w-full h-10 rounded-full border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300"
                    aria-label="Search"
                  />
                </div>
              </form>
            </div>

            {/* CENTER */}
            <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none">
              <div className="pointer-events-auto w-[520px] md:w-[600px] lg:w-[680px]">
                <div className="flex w-full">
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("Dashboard")} Icon={Home} label="Dashboard" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("FairAndEvents")} Icon={Calendar} label="Events & Fair" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("TutorStudents")} Icon={Users} label="My Students" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("TutorSessions")} Icon={Calendar} label="My Sessions" />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="ml-auto flex items-center justify-end gap-2">
              <Link
                to={createPageUrl("Notifications")}
                className="w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
              </Link>

              <AccountDropdown
                currentUser={currentUser}
                open={acctOpen}
                setOpen={setAcctOpen}
                onLogout={onLogout}
                title="Account"
                items={[
                  { label: getText("profileSettings"), url: createPageUrl("Profile"), icon: Settings },
                  { label: getText("availability"), url: createPageUrl("TutorAvailability"), icon: Calendar },
                  { label: getText("earnings"), url: createPageUrl("TutorEarnings"), icon: BarChart3 },
                ]}
              />
            </div>
          </div>
        </nav>
      </header>

      <main
        className="min-h-[100svh] transition-[padding] ease-out overflow-y-auto overflow-x-hidden touch-pan-y pb-[84px] md:pb-0"
        style={{
          paddingTop: headerH,
          visibility: measured ? "visible" : "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Outlet />
      </main>

      <Footer getCompanyName={getCompanyName} />
      <MobileBottomNav nav={mobileNav} isActive={isActive} />
    </div>
  );
};

const UserAuthedTopNavLayout = ({ currentUser, getLogoUrl, getCompanyName, onLogout }) => {
  const navigate = useNavigate();
  const isActive = useIsActive();

  const { headerRef, headerH, measured } = useHeaderMeasure();
  const [q, setQ] = React.useState("");

  const [acctOpen, setAcctOpen] = React.useState(false);

  const onSubmitSearch = React.useCallback(
    (e) => {
      e.preventDefault();
      const term = (q || "").trim();
      const base = createPageUrl("Directory");
      navigate(term ? `${base}?q=${encodeURIComponent(term)}` : base);
    },
    [q, navigate]
  );

  const IconLink = ({ to, Icon, label, iconClass = "h-6 w-6 sm:h-7 sm:w-7" }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl p-3 sm:p-3.5 transition",
          active ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        aria-label={label}
        title={label}
      >
        <Icon className={iconClass} />
      </Link>
    );
  };

  const mobileNav = buildMobileNav(currentUser, false, null);

  return (
    <div className="min-h-[100svh] bg-white font-sans text-gray-800">
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <nav className="w-full px-4 sm:px-5 lg:px-7 py-2">
          <div className="relative flex items-center h-12 sm:h-14">
            {/* LEFT */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link to={createPageUrl("Dashboard")} className="flex items-center shrink-0" aria-label="GreenPass" title="GreenPass">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 sm:h-9 w-auto" />
              </Link>

              <form onSubmit={onSubmitSearch} className="hidden sm:flex items-center min-w-0">
                <div className="relative min-w-0 w-[170px] md:w-[210px] lg:w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                    className="w-full h-10 rounded-full border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300"
                    aria-label="Search"
                  />
                </div>
              </form>
            </div>

            {/* CENTER */}
            <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none">
              <div className="pointer-events-auto w-[520px] md:w-[600px] lg:w-[680px]">
                <div className="flex w-full">
                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("Dashboard")} Icon={Home} label="Dashboard" />
                  </div>

                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("Directory")} Icon={UsersIcon} label="Directory" />
                  </div>

                  <div className="flex-1 flex justify-center">
                    <IconLink to={createPageUrl("FairAndEvents")} Icon={Calendar} label="Events & Fair" />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="ml-auto flex items-center justify-end gap-2">
              <Link
                to={createPageUrl("Notifications")}
                className="w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
              </Link>

              <AccountDropdown
                currentUser={currentUser}
                open={acctOpen}
                setOpen={setAcctOpen}
                onLogout={onLogout}
                title="Account"
                items={[
                  { label: getText("mySessions"), url: createPageUrl("MySessions"), icon: Calendar },
                  { label: getText("profileSettings"), url: createPageUrl("Profile"), icon: Settings },
                ]}
              />
            </div>
          </div>
        </nav>
      </header>

      <main
        className="min-h-[100svh] transition-[padding] ease-out overflow-y-auto overflow-x-hidden touch-pan-y pb-[84px] md:pb-0"
        style={{
          paddingTop: headerH,
          visibility: measured ? "visible" : "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Outlet />
      </main>

      <Footer getCompanyName={getCompanyName} />
      <MobileBottomNav nav={mobileNav} isActive={isActive} />
    </div>
  );
};

/* =========================
   ✅ ADMIN: Top Nav + Left Panel (Facebook-style)
========================= */
const AdminAuthedTopNavWithLeftPanelLayout = ({ currentUser, getLogoUrl, getCompanyName, onLogout }) => {
  const location = useLocation();
  const isActive = useIsActive();

  const { headerRef, headerH, measured } = useHeaderMeasure();

  // account dropdown
  const [acctOpen, setAcctOpen] = React.useState(false);

  // Top-center items
  const centerItems = React.useMemo(
    () => [
      { title: getText("dashboard"), url: createPageUrl("Dashboard"), icon: Home },
      { title: "Events & Fair", url: createPageUrl("FairAndEvents"), icon: Calendar },
      { title: getText("institutionManagement"), url: createPageUrl("AdminInstitutions"), icon: Landmark },
      { title: getText("userManagement"), url: createPageUrl("UserManagement"), icon: Users },
      { title: "Agent Assignments", url: createPageUrl("AdminAgentAssignments"), icon: UserCheck },
    ],
    []
  );

  const accountSettingsItems = React.useMemo(
    () => [
      { title: getText("profileSettings"), url: createPageUrl("Profile"), icon: Settings },
      { title: "Brand Settings", url: createPageUrl("AdminBrandSettings"), icon: Palette },
      { title: getText("bankSettings"), url: createPageUrl("AdminBankSettings"), icon: Building },
      { title: getText("chatSettings"), url: createPageUrl("AdminChatSettings"), icon: MessageSquare },
    ],
    []
  );

  const leftPanelItems = React.useMemo(
    () => [
      { title: getText("verifications"), url: createPageUrl("Verification"), icon: UserCheck },
      { title: getText("paymentVerification"), url: createPageUrl("AdminPaymentVerification"), icon: FileText },
      { title: "Payment Monitoring", url: createPageUrl("AdminPayments"), icon: DollarSign },
      { title: getText("walletManagement"), url: createPageUrl("AdminWalletManagement"), icon: DollarSign },
      { title: getText("eventsAdmin"), url: createPageUrl("AdminEvents"), icon: Calendar },
      { title: getText("schoolManagement"), url: createPageUrl("AdminSchools"), icon: Building },
      { title: getText("homePageEditor"), url: createPageUrl("AdminHomeEditor"), icon: Edit },
      { title: getText("blogEditor"), url: createPageUrl("AdminBlog"), icon: BookOpen },
      { title: getText("aboutPageEditor"), url: createPageUrl("AdminAboutEditor"), icon: Info },
      { title: getText("contactPageEditor"), url: createPageUrl("AdminContactEditor"), icon: Phone },
      { title: getText("faqEditor"), url: createPageUrl("AdminFAQ"), icon: MessageSquare },
      { title: getText("marketplaceAdmin"), url: createPageUrl("MarketplaceAdmin"), icon: Store },
      { title: getText("packageAdmin"), url: createPageUrl("AdminPackages"), icon: Package },
      { title: getText("reports"), url: createPageUrl("AdminReports"), icon: BarChart3 },
    ],
    []
  );

  const AdminTopLink = ({ item }) => {
    const active = isActive(item.url);
    return (
      <Link
        to={item.url}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl p-3 sm:p-3.5 transition",
          active ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        aria-label={item.title}
        title={item.title}
      >
        <item.icon className="h-6 w-6 sm:h-7 sm:w-7" />
      </Link>
    );
  };

  const LeftPanelLink = ({ item }) => {
    const active = isActive(item.url);
    return (
      <Link
        to={item.url}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
          active ? "bg-green-100 text-green-700" : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <item.icon className={cn("h-5 w-5", active ? "text-green-700" : "text-gray-600")} />
        <span className="text-sm font-medium">{item.title}</span>
      </Link>
    );
  };

  const mobileNav = buildMobileNav(currentUser, false, null);

  return (
    <div className="min-h-[100svh] bg-gray-50 font-sans text-gray-800">
      {/* TOP NAV */}
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <nav className="w-full px-4 sm:px-5 lg:px-7 py-2">
          <div className="relative flex items-center h-12 sm:h-14">
            {/* LEFT */}
            <div className="flex items-center min-w-0">
              <Link to={createPageUrl("Dashboard")} className="flex items-center shrink-0" aria-label="GreenPass" title="GreenPass">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 sm:h-9 w-auto" />
              </Link>
            </div>

            {/* CENTER */}
            <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none">
              <div className="pointer-events-auto w-[620px] md:w-[720px] lg:w-[820px]">
                <div className="flex w-full">
                  {centerItems.map((it) => (
                    <div key={it.url} className="flex-1 flex justify-center">
                      <AdminTopLink item={it} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="ml-auto flex items-center justify-end gap-2">
              <Link
                to={createPageUrl("Notifications")}
                className="w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
              </Link>

              <AccountDropdown
                currentUser={currentUser}
                open={acctOpen}
                setOpen={setAcctOpen}
                onLogout={onLogout}
                title="Account Settings"
                items={accountSettingsItems.map((it) => ({
                  label: it.title,
                  url: it.url,
                  icon: it.icon,
                  chevron: true,
                }))}
              />
            </div>
          </div>
        </nav>
      </header>

      {/* BODY */}
      <div
        className="flex w-full"
        style={{
          paddingTop: headerH,
          visibility: measured ? "visible" : "hidden",
        }}
      >
        {/* LEFT PANEL */}
        <aside className="hidden md:block w-[280px] shrink-0">
          <div className="sticky" style={{ top: headerH }}>
            <div className="h-[calc(100svh-theme(spacing.0))] max-h-[calc(100svh)] overflow-y-auto px-3 py-4">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">
                  Admin Tools
                </div>
                <div className="space-y-1">
                  {leftPanelItems.map((it) => (
                    <LeftPanelLink key={it.url} item={it} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden touch-pan-y pb-[84px] md:pb-0">
          <div className="px-4 sm:px-6 lg:px-8 py-5">
            <Outlet />
          </div>
        </main>
      </div>

      <Footer getCompanyName={getCompanyName} />
      <MobileBottomNav nav={mobileNav} isActive={isActive} />
    </div>
  );
};

/* ---------- Footer ---------- */
const Footer = ({ getCompanyName }) => {
  const footerLinks = [
    {
      column_title: "Solutions",
      links: [
        { text: "Find Schools", url: createPageUrl("Directory") },
        { text: "Visa Help", url: createPageUrl("VisaRequests") },
      ],
    },
    {
      column_title: "Support",
      links: [
        { text: "Contact Us", url: createPageUrl("Contact") },
        { text: "FAQ", url: createPageUrl("FAQ") },
        { text: "Chat Support", url: createPageUrl("Messages") },
      ],
    },
    {
      column_title: "Company",
      links: [
        { text: "About Us", url: createPageUrl("About") },
        { text: "News and Highlights", url: createPageUrl("Blog") },
        { text: "Partnerships", url: createPageUrl("Partnership") },
      ],
    },
    {
      column_title: "Legal",
      links: [
        { text: "Terms of Service", url: createPageUrl("TermsOfService") },
        { text: "Privacy Policy", url: createPageUrl("PrivacyPolicy") },
        { text: "Agent Agreement", url: createPageUrl("AgentAgreement") },
      ],
    },
  ];

  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {footerLinks.map((column, index) => (
            <div key={index}>
              <h3 className="text-sm font-semibold tracking-wider uppercase">{column.column_title}</h3>
              <ul className="mt-4 space-y-4">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link to={link.url} className="text-base text-gray-300 hover:text-white">
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-gray-700 pt-8 md:flex md:items-center md:justify-between">
          <div className="flex space-x-6 md:order-2">
            {SOCIAL_LINKS.map((social, index) => (
              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                <span className="sr-only">{social.platform}</span>
                {iconByPlatform(social.platform)}
              </a>
            ))}
          </div>
          <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1">
            &copy; {new Date().getFullYear()} {getCompanyName()}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

/* ---------- Nav builders ---------- */
function buildDesktopNav(currentUser, hasReservation, latestReservationId) {
  const baseItems = [
    { title: getText("dashboard"), url: createPageUrl("Dashboard"), icon: Home },
    { title: getText("events"), url: createPageUrl("FairAndEvents"), icon: Calendar },
  ];

  switch ((currentUser?.user_type || "").toLowerCase()) {
    case "vendor":
      return [
        ...baseItems,
        { title: getText("myServices"), url: createPageUrl("MyServices"), icon: Store },
        { title: getText("myOrders"), url: createPageUrl("MyOrders"), icon: ShoppingCart },
        { title: getText("analytics"), url: createPageUrl("VendorAnalytics"), icon: BarChart3 },
        { title: getText("earnings"), url: createPageUrl("VendorEarnings"), icon: BarChart3 },
      ];

    default:
      return baseItems;
  }
}

function buildMobileNav(currentUser, hasReservation, latestReservationId) {
  const hasPurchasedPackage =
    currentUser?.purchased_packages && currentUser.purchased_packages.length > 0;

  switch ((currentUser?.user_type || "student").toLowerCase()) {
    case "user":
    case "student": {
      const main = [
        { title: "Home", url: createPageUrl("Dashboard"), icon: Home },
        { title: "Schools", url: createPageUrl("Directory"), icon: School },
        { title: "Tutors", url: createPageUrl("Tutors"), icon: BookOpen },
      ];

      const more = [
        { title: "Events & Fairs", url: createPageUrl("FairAndEvents"), icon: Calendar },
        {
          title: currentUser?.assigned_agent_id ? "My Agent" : "Find Agent",
          url: createPageUrl(currentUser?.assigned_agent_id ? "MyAgent" : "FindAgent"),
          icon: UserCheck,
        },
        { title: "My Sessions", url: createPageUrl("MySessions"), icon: Calendar },
        { title: "Visa Packages", url: createPageUrl("VisaPackages"), icon: Package },
        { title: "Marketplace", url: createPageUrl("Marketplace"), icon: ShoppingCart },
        { title: "Profile", url: createPageUrl("Profile"), icon: Settings },
      ];

      if (hasPurchasedPackage) {
        more.splice(3, 0, {
          title: "Visa Applications",
          url: createPageUrl("VisaRequests"),
          icon: FileText,
        });
      }

      if (hasReservation && latestReservationId) {
        more.splice(3, 0, {
          title: "Seat Reservations",
          url: `${createPageUrl("ReservationStatus")}?reservationId=${encodeURIComponent(latestReservationId)}`,
          icon: Ticket,
        });
      }

      return { main, more };
    }

    case "agent":
      return {
        main: [
          { title: "Home", url: createPageUrl("Dashboard"), icon: Home },
          { title: "Students", url: createPageUrl("MyStudents"), icon: Users },
          { title: "Cases", url: createPageUrl("VisaCases"), icon: FileText },
        ],
        more: [
          { title: "Events & Fairs", url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: "Leads", url: createPageUrl("AgentLeads"), icon: Users },
          { title: "Earnings", url: createPageUrl("AgentEarnings"), icon: BarChart3 },
          { title: "Profile", url: createPageUrl("Profile"), icon: Settings },
        ],
      };

    case "tutor":
      return {
        main: [
          { title: "Home", url: createPageUrl("Dashboard"), icon: Home },
          { title: "Sessions", url: createPageUrl("TutorSessions"), icon: Calendar },
          { title: "Students", url: createPageUrl("TutorStudents"), icon: Users },
        ],
        more: [
          { title: "Events & Fairs", url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: "Availability", url: createPageUrl("TutorAvailability"), icon: Calendar },
          { title: "Earnings", url: createPageUrl("TutorEarnings"), icon: BarChart3 },
          { title: "Profile", url: createPageUrl("Profile"), icon: Settings },
        ],
      };

    case "vendor":
      return {
        main: [
          { title: "Home", url: createPageUrl("Dashboard"), icon: Home },
          { title: "Services", url: createPageUrl("MyServices"), icon: Store },
          { title: "Orders", url: createPageUrl("MyOrders"), icon: ShoppingCart },
        ],
        more: [
          { title: "Events & Fairs", url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: "Analytics", url: createPageUrl("VendorAnalytics"), icon: BarChart3 },
          { title: "Earnings", url: createPageUrl("VendorEarnings"), icon: BarChart3 },
          { title: "Profile", url: createPageUrl("Profile"), icon: Settings },
        ],
      };

    case "school":
      return {
        main: [
          { title: "Home", url: createPageUrl("Dashboard"), icon: Home },
          { title: "Programs", url: createPageUrl("SchoolPrograms"), icon: BookOpen },
          { title: "Leads", url: createPageUrl("SchoolLeads"), icon: Users },
        ],
        more: [
          { title: "Events & Fairs", url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: "Profile", url: createPageUrl("SchoolProfile"), icon: Building },
          { title: "Settings", url: createPageUrl("Profile"), icon: Settings },
        ],
      };

    case "admin":
      return {
        main: [
          { title: "Home", url: createPageUrl("Dashboard"), icon: Home },
          { title: "Users", url: createPageUrl("UserManagement"), icon: Users },
          { title: "Events", url: createPageUrl("FairAndEvents"), icon: Calendar },
        ],
        more: [
          { title: "Institutions", url: createPageUrl("AdminInstitutions"), icon: Landmark },
          { title: "Agent Assignments", url: createPageUrl("AdminAgentAssignments"), icon: UserCheck },
          { title: "Verify", url: createPageUrl("Verification"), icon: UserCheck },
          { title: "Payments", url: createPageUrl("AdminPayments"), icon: DollarSign },
          { title: "Reports", url: createPageUrl("AdminReports"), icon: BarChart3 },
          { title: "Profile", url: createPageUrl("Profile"), icon: Settings },
        ],
      };

    default:
      return {
        main: [
          { title: "Home", url: createPageUrl("Dashboard"), icon: Home },
          { title: "Schools", url: createPageUrl("Directory"), icon: School },
          { title: "Tutors", url: createPageUrl("Tutors"), icon: BookOpen },
        ],
        more: [
          { title: "Events & Fairs", url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: "Profile", url: createPageUrl("Profile"), icon: Settings },
        ],
      };
  }
}

/* =========================
   MAIN LAYOUT
========================= */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = useIsActive();

  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const profileUnsubRef = React.useRef(null);

  // seat reservation visibility
  const [hasReservation, setHasReservation] = React.useState(false);
  const [latestReservationId, setLatestReservationId] = React.useState(null);

  const normalizeUser = React.useCallback((uid, data = {}, fbUser = {}) => {
    const full_name = data.full_name || data.displayName || fbUser.displayName || data.name || "";
    const user_type = (data.user_type || data.role || "student").toLowerCase();
    const onboarding_completed = data.onboarding_completed ?? data.onboardingComplete ?? false;

    return {
      id: uid,
      ...data,
      full_name,
      user_type,
      onboarding_completed,
      purchased_packages: Array.isArray(data.purchased_packages) ? data.purchased_packages : [],
      settings: data.settings || {},
    };
  }, []);

  React.useEffect(() => {
    setLoading(true);
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (!fbUser) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const seed = {
            uid: fbUser.uid,
            full_name: fbUser.displayName || "",
            email: fbUser.email || "",
            user_type: "student",
            onboarding_completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await setDoc(ref, seed, { merge: true });
        }

        profileUnsubRef.current = onSnapshot(ref, (docSnap) => {
          const data = docSnap.data() || {};
          const profile = normalizeUser(fbUser.uid, data, fbUser);
          setCurrentUser(profile);
        });
      } catch {
        setCurrentUser({
          id: fbUser.uid,
          user_type: "student",
          full_name: fbUser.displayName || "",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
    };
  }, [normalizeUser]);

  React.useEffect(() => {
    if (!currentUser?.id) {
      setHasReservation(false);
      setLatestReservationId(null);
      return;
    }

    const checkReservations = async () => {
      try {
        const qx = query(collection(db, "reservations"), where("student_id", "==", currentUser.id), limit(1));
        const snap = await getDocs(qx);
        if (!snap.empty) {
          setHasReservation(true);
          setLatestReservationId(snap.docs[0].id);
        } else {
          setHasReservation(false);
          setLatestReservationId(null);
        }
      } catch (err) {
        console.error("[Layout] failed to check reservations:", err);
        setHasReservation(false);
        setLatestReservationId(null);
      }
    };

    checkReservations();
  }, [currentUser?.id]);

  const handleLogout = React.useCallback(async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      navigate(createPageUrl(""));
    } catch {}
  }, [navigate]);

  const getLogoUrl = React.useCallback(
    () =>
      "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/rawdatas%2FGreenPass%20Superapp.png?alt=media&token=987ad375-1aeb-4e1f-af08-7d89eb0ee2d8",
    []
  );
  const getCompanyName = React.useCallback(() => "GreenPass", []);

  React.useEffect(() => {
    if (currentUser?.onboarding_completed && location.pathname.toLowerCase().startsWith("/onboarding")) {
      navigate(createPageUrl("Dashboard"), { replace: true });
    }
  }, [currentUser?.onboarding_completed, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <PublicLayout getLogoUrl={getLogoUrl} getCompanyName={getCompanyName} />
        <ChatWidget />
      </>
    );
  }

  const isOnboardingRoute = location.pathname.toLowerCase().startsWith("/onboarding");
  const notDoneOnboarding = currentUser?.onboarding_completed === false;

  if (isOnboardingRoute || notDoneOnboarding) {
    return (
      <div className="min-h-[100svh] w-full bg-gray-50">
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    );
  }

  const role = (currentUser?.user_type || "student").toLowerCase();

  if (role === "admin") {
    return (
      <>
        <AdminAuthedTopNavWithLeftPanelLayout
          currentUser={currentUser}
          getLogoUrl={getLogoUrl}
          getCompanyName={getCompanyName}
          onLogout={handleLogout}
        />
        <ChatWidget />
      </>
    );
  }

  if (role === "school") {
    return (
      <>
        <SchoolAuthedTopNavLayout
          currentUser={currentUser}
          getLogoUrl={getLogoUrl}
          getCompanyName={getCompanyName}
          onLogout={handleLogout}
        />
        <ChatWidget />
      </>
    );
  }

  if (role === "agent") {
    return (
      <>
        <AgentAuthedTopNavLayout
          currentUser={currentUser}
          getLogoUrl={getLogoUrl}
          getCompanyName={getCompanyName}
          onLogout={handleLogout}
        />
        <ChatWidget />
      </>
    );
  }

  if (role === "tutor") {
    return (
      <>
        <TutorAuthedTopNavLayout
          currentUser={currentUser}
          getLogoUrl={getLogoUrl}
          getCompanyName={getCompanyName}
          onLogout={handleLogout}
        />
        <ChatWidget />
      </>
    );
  }

  if (role === "user" || role === "student") {
    return (
      <>
        <UserAuthedTopNavLayout
          currentUser={currentUser}
          getLogoUrl={getLogoUrl}
          getCompanyName={getCompanyName}
          onLogout={handleLogout}
        />
        <ChatWidget />
      </>
    );
  }

  // everything else stays as sidebar layout (vendor/etc.)
  const navigationItems = buildDesktopNav(currentUser, hasReservation, latestReservationId);
  const mobileNav = buildMobileNav(currentUser, hasReservation, latestReservationId);

  return (
    <SidebarProvider>
      <div className="min-h-[100svh] flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200 bg-white hidden md:flex">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200">
              <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-10 w-auto object-contain" />
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarMenu>
              {navigationItems.map((item, index) => {
                const active = location.pathname === item.url || location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={index} className="rounded-lg">
                    <Link
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        active ? "bg-green-100 text-green-700" : "hover:bg-gray-100 text-gray-700"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-gray-50">
              <UserAvatar user={currentUser} sizeClass="w-10 h-10" textClass="text-lg" />
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-gray-800 truncate text-sm">{currentUser?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser?.user_type}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-1" /> {getText("logOut")}
              </Button>
            </div>

            <SidebarMenu>
              <SidebarMenuItem className="rounded-lg">
                <Link
                  to={createPageUrl("Profile")}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{getText("profileSettings")}</span>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-[100svh]">
          <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 md:hidden sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 w-auto object-contain" />
              </Link>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto md:pb-0 pb-[84px]" style={{ WebkitOverflowScrolling: "touch" }}>
            <Outlet />
          </div>

          {/* ✅ restored mobile bottom nav */}
          <MobileBottomNav nav={mobileNav} isActive={isActive} />
        </main>
      </div>

      <ChatWidget />
    </SidebarProvider>
  );
}
