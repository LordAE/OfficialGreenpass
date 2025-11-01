// src/pages/Layout.jsx
import React from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home, School, Users, BookOpen, FileText, Settings, UserCheck, Calendar, ShoppingCart,
  Store, Package, BarChart3, Building, LogOut, Globe, MoreHorizontal, X, DollarSign,
  Menu, Rocket, LifeBuoy, GraduationCap, Handshake, Search, Compass, MessageSquare,
  Edit, Phone, Info, Palette, Landmark, Facebook, Instagram, Linkedin, Youtube,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarProvider,
} from "@/components/ui/sidebar";
import {
  NavigationMenu, NavigationMenuItem, NavigationMenuLink,
  NavigationMenuList, navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

import ChatWidget from "@/components/chat/ChatWidget";
import { Button } from "@/components/ui/button";

/* ---------- Firebase auth/profile ---------- */
import { auth, db } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

/* =========================
   i18n (English only)
========================= */
export const translations = {
  en: {
    dashboard: "Dashboard",
    events: "Events & Fairs",
    discoverSchools: "Discover Schools",
    visaPackages: "Visa Packages",
    findAgent: "Find Agent",
    findTutors: "Tutors",
    marketplace: "Marketplace",
    mySessions: "My Sessions",
    visaApplications: "Visa Applications",
    myStudents: "My Students",
    visaCases: "Visa Cases",
    leads: "Leads",
    earnings: "Earnings",
    availability: "Availability",
    myServices: "My Services",
    myOrders: "My Orders",
    analytics: "Analytics",
    profile: "Profile",
    programs: "Programs",
    userManagement: "User Management",
    schoolManagement: "Program Management",
    verifications: "Verifications",
    adminVisaRequests: "Admin Visa Requests",
    marketplaceAdmin: "Marketplace Admin",
    eventsAdmin: "Events Admin",
    packageAdmin: "Package Admin",
    reports: "Reports",
    profileSettings: "Profile Settings",
    logOut: "Log Out",
    paymentVerification: "Payment Verification",
    walletManagement: "Wallet Management",
    myAgent: "My Agent",
    assignedAgent: "Assigned agent",
    loading: "Loading...",
    status: "Status",
    pending: "Pending",
    verified: "Verified",
    rejected: "Rejected",
    actions: "Actions",
    save: "Save",
    cancel: "Cancel",
    submit: "Submit",
    search: "Search",
    viewDetails: "View Details",
    all: "All",
    more: "More",
    dashboardShort: "Home",
    discoverSchoolsShort: "Schools",
    findTutorsShort: "Tutors",
    findAgentShort: "Agent",
    mySessionsShort: "Sessions",
    visaApplicationsShort: "Visa",
    visaPackagesShort: "Packages",
    marketplaceShort: "Market",
    profileShort: "Profile",
    myStudentsShort: "Students",
    visaCasesShort: "Cases",
    earningsShort: "Earnings",
    myServicesShort: "Services",
    myOrdersShort: "Orders",
    analyticsShort: "Analytics",
    availabilityShort: "Schedule",
    programsShort: "Programs",
    leadsShort: "Leads",
    userManagementShort: "Users",
    verificationsShort: "Verify",
    homePageEditor: "Home Page",
    chatSettings: "Chat Settings",
    bankSettings: "Bank Settings",
    blogEditor: "Blog Editor",
    aboutPageEditor: "About Page Editor",
    faqEditor: "FAQ Editor",
    contactPageEditor: "Contact Page Editor",
    ourTeam: "Our Team",
    ourTeamEditor: "Our Team Editor",
    meetTheTeam: "Meet the people behind our success",
    welcome: "Welcome",
    chooseRole: "Choose your role to get started",
    welcomeSubtitle: "Your comprehensive super app for studying abroad",
    studyAbroadConfidence: "Study abroad with confidence",
    exploreSchoolsPrograms: "Explore schools, get expert help, and plan your move step by step",
    getStarted: "Get started",
    about: "About",
    blog: "News and Highlights",
    contactUs: "Contact Us",
    faq: "FAQ",
    frequentlyAskedQuestions: "Frequently asked questions",
    getInTouch: "Get in touch with our support team",
    guidesForStudents: "Guides for students, partners",
    exploreSchools: "Explore schools",
    login: "Login",
    forStudents: "For Students",
    forPartners: "For Partners",
    quickLinks: "Quick Links",
    findSchoolsPrograms: "Find Schools & Programs",
    searchTopSchools: "Search top schools and programs",
    comparePrograms: "Compare Programs",
    filterByLevel: "Filter by level, region, intake",
    studentLife: "Student Life",
    visaHousingTips: "Visa, housing, and arrival tips",
    agentNetwork: "Agent Network",
    schoolPartners: "School Partners",
    partnerWithSchools: "Partner with us to reach qualified students",
    joinVerifiedAgent: "Join our verified agent group",
    tutorPrep: "Tutor Prep",
    connectStudentsPrep: "Connect with students for prep",
    eventsAndFairs: "Events & Fairs",
    promoteEvent: "Promote or sponsor your event",
    faqs: "FAQs",
    findQuickAnswers: "Find quick answers here",
    contact: "Contact",
    messageSupportTeam: "Message our support team",
    resources: "Resources",
    solutions: "Solutions",
    findSchools: "Find Schools",
    findAnAgent: "Find an Agent",
    findATutor: "Find a Tutor",
    visaHelp: "Visa Help",
    chatSupport: "Chat Support",
    company: "Company",
    aboutUs: "About Us",
    partnerships: "Partnerships",
    legal: "Legal",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
    agentAgreement: "Agent Agreement",
    institutionManagement: "Institution Management",
    institutionManagementShort: "Institutions",
    vendorNetwork: "Vendor Network",
    joinVendorNetwork: "Offer services on our marketplace",
  },
};

export const getText = (key) => translations.en[key] || key;

/* ---------- Social links ---------- */
const SOCIAL_LINKS = [
  { platform: "YouTube",  url: "https://www.youtube.com/@GreenPassGroup" },
  { platform: "Facebook", url: "https://www.facebook.com/greenpassgroup" },
  { platform: "Instagram",url: "https://www.instagram.com/greenpassglobal/" },
  { platform: "TikTok",   url: "https://www.tiktok.com/@greenpasstv?_t=ZS-8zH7Q114gVM&_r=1" },
];

// TikTok icon (lucide-react doesn't include TikTok)
const TikTokIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
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

/* ---------- Build “Explore” menus ---------- */
const buildExploreForStudents = () => ([
  { title: getText("findSchoolsPrograms"), href: createPageUrl("Schools"), icon: Search, description: getText("searchTopSchools") },
  { title: getText("comparePrograms"), href: createPageUrl("ComparePrograms"), icon: Compass, description: getText("filterByLevel") },
  { title: getText("studentLife"), href: createPageUrl("StudentLife"), icon: LifeBuoy, description: getText("visaHousingTips") },
]);

const buildExploreForPartners = () => ([
  { title: getText("agentNetwork"), href: createPageUrl("Partner Agents"), icon: Handshake, description: getText("joinVerifiedAgent") },
  { title: getText("tutorPrep"), href: createPageUrl("Partner Tutors"), icon: GraduationCap, description: getText("connectStudentsPrep") },
  { title: getText("schoolPartners"), href: createPageUrl("Partner Schools"), icon: Building, description: getText("partnerWithSchools") },
  { title: getText("vendorNetwork"), href: createPageUrl("Partner Vendors"), icon: Store, description: getText("joinVendorNetwork") }, 
]);

const buildQuickLinks = () => ([
  { title: getText("faqs"), href: createPageUrl("FAQ"), icon: MessageSquare, description: getText("findQuickAnswers") },
  { title: getText("contact"), href: createPageUrl("Contact"), icon: Rocket, description: getText("messageSupportTeam") },
  { title: getText("resources"), href: createPageUrl("Resources"), icon: BookOpen, description: getText("guidesForStudents") },
  { title: getText("ourTeam"), href: createPageUrl("OurTeam"), icon: Users, description: getText("meetTheTeam") },
]);

/* ---------- Desktop hover dropdown ---------- */
function HoverDropdown({ label, color = "green", items = [] }) {
  const [open, setOpen] = React.useState(false);
  const palette = {
    green: { ring: "ring-green-300", text: "text-green-700", icon: "text-green-600", hover: "hover:text-green-700" },
    purple: { ring: "ring-purple-300", text: "text-purple-700", icon: "text-purple-600", hover: "hover:text-purple-700" },
    emerald: { ring: "ring-emerald-300", text: "text-emerald-700", icon: "text-emerald-600", hover: "hover:text-emerald-700" },
  }[color];

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        className={`inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all ${open ? `bg-gray-100 ring-1 ${palette.ring} ${palette.text}` : ""}`}
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-40 mt-2 w-[380px] rounded-xl bg-white shadow-[0_12px_40px_-10px_rgba(0,0,0,0.25)] ring-1 ring-black/5"
          >
            <ul className="max-h-[70vh] overflow-auto p-2">
              {items.map((item) => (
                <li key={item.title}>
                  <Link
                    to={item.href}
                    className="group flex items-start gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <item.icon className={`mt-0.5 h-5 w-5 ${palette.icon} ${palette.hover}`} />
                    <div>
                      <div className={`text-sm font-semibold text-gray-900 ${palette.hover}`}>{item.title}</div>
                      {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Explore Bar ---------- */
const ExploreBar = ({ socialLinks = [] }) => {
  const students = React.useMemo(buildExploreForStudents, []);
  const partners = React.useMemo(buildExploreForPartners, []);
  const quick = React.useMemo(buildQuickLinks, []);

  return (
    <div className="bg-white/95 border-b border-gray-200 hidden md:block relative z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HoverDropdown label={getText("forStudents")} color="green" items={students} />
            <HoverDropdown label={getText("forPartners")} color="purple" items={partners} />
            <HoverDropdown label={getText("quickLinks")} color="emerald" items={quick} />
          </div>

          {Array.isArray(socialLinks) && socialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              {socialLinks.map((s, i) => (
                <a
                  key={`${s.platform || "social"}-${i}`}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-800 transition-colors"
                  aria-label={s.platform}
                  title={s.platform}
                >
                  {iconByPlatform(s.platform)}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Public layout (English only, no language selector) ---------- */
const PublicLayout = ({ getLogoUrl, getCompanyName }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const headerRef = React.useRef(null);
  const [headerH, setHeaderH] = React.useState(120);
  const [measured, setMeasured] = React.useState(false);

  React.useLayoutEffect(() => {
    const update = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      if (h) {
        setHeaderH(h);
        if (!measured) setMeasured(true);
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
  }, [measured]);

  const students = React.useMemo(buildExploreForStudents, []);
  const partners = React.useMemo(buildExploreForPartners, []);
  const quick = React.useMemo(buildQuickLinks, []);

  return (
    <div className="min-h-[100svh] bg-white font-sans text-gray-800">
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 bg-gray-100/95 backdrop-blur-md text-gray-800 border-b border-gray-200 shadow-sm"
      >
        <ExploreBar socialLinks={SOCIAL_LINKS} />

        {/* Main nav: About / Events & Fairs / Blog */}
        <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to={createPageUrl("")} className="flex-shrink-0 flex items-center">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 sm:h-10 w-auto" />
              </Link>
            </div>

            <div className="hidden md:flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        to={createPageUrl("About")}
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "bg-transparent text-gray-700 hover:bg-gray-200 hover:text-green-600 focus:bg-gray-200 transition-all duration-200 font-medium"
                        )}
                      >
                        {getText("about")}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        to={createPageUrl("Events")}
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "bg-transparent text-gray-700 hover:bg-gray-200 hover:text-green-600 focus:bg-gray-200 transition-all duration-200 font-medium"
                        )}
                      >
                        {getText("events")}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        to={createPageUrl("Blog")}
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "bg-transparent text-gray-700 hover:bg-gray-200 hover:text-green-600 focus:bg-gray-200 transition-all duration-200 font-medium"
                        )}
                      >
                        {getText("blog")}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className="hidden md:flex items-center space-x-3">
              <Link to={createPageUrl("Welcome")}>
                <Button
                  variant="outline"
                  className="font-semibold border-gray-400 text-gray-700 hover:border-green-500 hover:text-green-600 hover:bg-green-50 px-6 py-2 transition-all duration-200"
                >
                  {getText("login")}
                </Button>
              </Link>
            </div>

            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen((v) => !v)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-300 transition-all duration-200"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile dropdown (menus only) */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-gray-100/95 backdrop-blur-md border-t border-gray-200 z-10"
            >
              <div className="px-4 pt-4 pb-6 space-y-4">
                <div className="space-y-3">
                  <p className="text-xs uppercase font-bold text-blue-600 tracking-wider px-2">{getText("forStudents")}</p>
                  {students.map((link) => (
                    <Link
                      key={link.title}
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-200 hover:text-green-700 transition-all duration-200"
                    >
                      <link.icon className="h-5 w-5 text-green-600" />
                      <span>{link.title}</span>
                    </Link>
                  ))}
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <p className="text-xs uppercase font-bold text-purple-600 tracking-wider px-2">{getText("forPartners")}</p>
                  {partners.map((link) => (
                    <Link
                      key={link.title}
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-200 hover:text-purple-700 transition-all duration-200"
                    >
                      <link.icon className="h-5 w-5 text-purple-600" />
                      <span>{link.title}</span>
                    </Link>
                  ))}
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <p className="text-xs uppercase font-bold text-emerald-600 tracking-wider px-2">{getText("quickLinks")}</p>
                  {quick.map((link) => (
                    <Link
                      key={link.title}
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-200 hover:text-emerald-700 transition-all duration-200"
                    >
                      <link.icon className="h-5 w-5 text-emerald-600" />
                      <span>{link.title}</span>
                    </Link>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <Link to={createPageUrl("Welcome")} onClick={() => setIsMenuOpen(false)} className="block w/full">
                    <Button
                      variant="outline"
                      className="w-full font-semibold border-gray-400 text-gray-700 hover:border-green-500 hover:text-green-600 hover:bg-green-50 py-3 transition-all duration-200"
                    >
                      {getText("login")}
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main
        className="min-h-[100svh] transition-[padding] ease-out overflow-y-auto overflow-x-hidden touch-pan-y"
        style={{ paddingTop: headerH, visibility: measured ? "visible" : "hidden", WebkitOverflowScrolling: "touch" }}
      >
        <Outlet />
      </main>

      <Footer getCompanyName={getCompanyName} />
    </div>
  );
};

/* ---------- Footer ---------- */
const Footer = ({ getCompanyName }) => {
  const footerLinks = [
    {
      column_title: "Solutions",
      links: [
        { text: "Find Schools", url: createPageUrl("Schools") },
        { text: "Find an Agent", url: createPageUrl("FindAgent") },
        { text: "Find a Tutor", url: createPageUrl("Tutors") },
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
        { text: "Our Team", url: createPageUrl("OurTeam") },
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
              <a key={index} href={social.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
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

/* =========================
   AUTHENTICATED LAYOUT
========================= */
const UserAvatar = ({ user, sizeClass = "w-10 h-10", textClass = "text-lg", className = "" }) => {
  const name = user?.full_name || "User";
  const initial = name.charAt(0).toUpperCase();
  if (user?.photo_url) return <img src={user.photo_url} alt={name} className={`rounded-full object-cover border border-white shadow-sm ${sizeClass} ${className}`} />;
  return <div className={`rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold ${sizeClass} ${textClass} ${className}`}>{initial}</div>;
};

/* ---------- Nav builders ---------- */
function buildDesktopNav(currentUser) {
  const baseItems = [
    { title: getText("dashboard"), url: createPageUrl("Dashboard"), icon: Home },
    { title: getText("events"), url: createPageUrl("FairAndEvents"), icon: Calendar },
  ];
  const hasPurchasedPackage = currentUser?.purchased_packages && currentUser.purchased_packages.length > 0;

  switch ((currentUser?.user_type || "student").toLowerCase()) {
    case "user":
    case "student": {
      const studentNav = [
        ...baseItems,
        { title: getText("discoverSchools"), url: createPageUrl("Schools"), icon: School },
        { title: getText("findTutors"), url: createPageUrl("Tutors"), icon: BookOpen },
        { title: getText("visaPackages"), url: createPageUrl("VisaPackages"), icon: Package },
        {
          title: currentUser?.assigned_agent_id ? getText("myAgent") : getText("findAgent"),
          url: createPageUrl(currentUser?.assigned_agent_id ? "MyAgent" : "FindAgent"),
          icon: UserCheck,
        },
        { title: getText("marketplace"), url: createPageUrl("Marketplace"), icon: ShoppingCart },
        { title: getText("mySessions"), url: createPageUrl("MySessions"), icon: Calendar },
      ];
      if (hasPurchasedPackage) {
        studentNav.push({ title: getText("visaApplications"), url: createPageUrl("VisaRequests"), icon: FileText });
      }
      return studentNav;
    }
    case "agent":
      return [
        ...baseItems,
        { title: getText("myStudents"), url: createPageUrl("MyStudents"), icon: Users },
        { title: getText("visaCases"), url: createPageUrl("VisaCases"), icon: FileText },
        { title: getText("leads"), url: createPageUrl("AgentLeads"), icon: Users },
        { title: getText("earnings"), url: createPageUrl("AgentEarnings"), icon: BarChart3 },
      ];
    case "tutor":
      return [
        ...baseItems,
        { title: getText("myStudents"), url: createPageUrl("TutorStudents"), icon: Users },
        { title: getText("mySessions"), url: createPageUrl("TutorSessions"), icon: Calendar },
        { title: getText("availability"), url: createPageUrl("TutorAvailability"), icon: Calendar },
        { title: getText("earnings"), url: createPageUrl("TutorEarnings"), icon: BarChart3 },
      ];
    case "school":
      return [
        ...baseItems,
        { title: getText("profile"), url: createPageUrl("SchoolProfile"), icon: Building },
        { title: getText("programs"), url: createPageUrl("SchoolPrograms"), icon: BookOpen },
        { title: getText("leads"), url: createPageUrl("SchoolLeads"), icon: Users },
      ];
    case "vendor":
      return [
        ...baseItems,
        { title: getText("myServices"), url: createPageUrl("MyServices"), icon: Store },
        { title: getText("myOrders"), url: createPageUrl("MyOrders"), icon: ShoppingCart },
        { title: getText("analytics"), url: createPageUrl("VendorAnalytics"), icon: BarChart3 },
        { title: getText("earnings"), url: createPageUrl("VendorEarnings"), icon: BarChart3 },
      ];
    case "admin":
      return [
        ...baseItems,
        { title: getText("userManagement"), url: createPageUrl("UserManagement"), icon: Users },
        { title: getText("schoolManagement"), url: createPageUrl("AdminSchools"), icon: Building },
        { title: getText("institutionManagement"), url: createPageUrl("AdminInstitutions"), icon: Landmark },
        { title: "Agent Assignments", url: createPageUrl("AdminAgentAssignments"), icon: UserCheck },
        { title: getText("verifications"), url: createPageUrl("Verification"), icon: UserCheck },
        { title: getText("paymentVerification"), url: createPageUrl("AdminPaymentVerification"), icon: FileText },
        { title: "Payment Monitoring", url: createPageUrl("AdminPayments"), icon: DollarSign },
        { title: getText("walletManagement"), url: createPageUrl("AdminWalletManagement"), icon: DollarSign },
        { title: getText("eventsAdmin"), url: createPageUrl("AdminEvents"), icon: Calendar },
        { title: getText("homePageEditor"), url: createPageUrl("AdminHomeEditor"), icon: Edit },
        { title: getText("blogEditor"), url: createPageUrl("AdminBlog"), icon: BookOpen },
        { title: getText("aboutPageEditor"), url: createPageUrl("AdminAboutEditor"), icon: Info },
        { title: getText("contactPageEditor"), url: createPageUrl("AdminContactEditor"), icon: Phone },
        { title: getText("faqEditor"), url: createPageUrl("AdminFAQ"), icon: MessageSquare },
        { title: getText("ourTeamEditor"), url: createPageUrl("AdminOurTeamEditor"), icon: Users },
        { title: "Brand Settings", url: createPageUrl("AdminBrandSettings"), icon: Palette },
        { title: getText("chatSettings"), url: createPageUrl("AdminChatSettings"), icon: MessageSquare },
        { title: getText("marketplaceAdmin"), url: createPageUrl("MarketplaceAdmin"), icon: Store },
        { title: getText("packageAdmin"), url: createPageUrl("AdminPackages"), icon: Package },
        { title: getText("bankSettings"), url: createPageUrl("AdminBankSettings"), icon: Building },
        { title: getText("reports"), url: createPageUrl("AdminReports"), icon: BarChart3 },
      ];
    default:
      return baseItems;
  }
}

function buildMobileNav(currentUser) {
  const hasPurchasedPackage = currentUser?.purchased_packages && currentUser.purchased_packages.length > 0;

  switch ((currentUser?.user_type || "student").toLowerCase()) {
    case "user":
    case "student": {
      const main = [
        { title: getText("dashboardShort"), url: createPageUrl("Dashboard"), icon: Home },
        { title: getText("discoverSchoolsShort"), url: createPageUrl("Schools"), icon: School },
        { title: getText("findTutorsShort"), url: createPageUrl("Tutors"), icon: BookOpen },
      ];
      const more = [
        { title: getText("events"), url: createPageUrl("FairAndEvents"), icon: Calendar },
        {
          title: currentUser?.assigned_agent_id ? getText("myAgent") : getText("findAgent"),
          url: createPageUrl(currentUser?.assigned_agent_id ? "MyAgent" : "FindAgent"),
          icon: UserCheck,
        },
        { title: getText("mySessions"), url: createPageUrl("MySessions"), icon: Calendar },
        { title: getText("visaPackages"), url: createPageUrl("VisaPackages"), icon: Package },
        { title: getText("marketplace"), url: createPageUrl("Marketplace"), icon: ShoppingCart },
        { title: getText("profile"), url: createPageUrl("Profile"), icon: Settings },
      ];
      if (hasPurchasedPackage) {
        more.splice(3, 0, { title: getText("visaApplications"), url: createPageUrl("VisaRequests"), icon: FileText });
      }
      return { main, more };
    }
    case "agent":
      return {
        main: [
          { title: getText("dashboardShort"), url: createPageUrl("Dashboard"), icon: Home },
          { title: getText("myStudentsShort"), url: createPageUrl("MyStudents"), icon: Users },
          { title: getText("visaCasesShort"), url: createPageUrl("VisaCases"), icon: FileText },
        ],
        more: [
          { title: getText("events"), url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: getText("leads"), url: createPageUrl("AgentLeads"), icon: Users },
          { title: getText("earnings"), url: createPageUrl("AgentEarnings"), icon: BarChart3 },
          { title: getText("profile"), url: createPageUrl("Profile"), icon: Settings },
        ],
      };
    case "tutor":
      return {
        main: [
          { title: getText("dashboardShort"), url: createPageUrl("Dashboard"), icon: Home },
          { title: getText("mySessionsShort"), url: createPageUrl("TutorSessions"), icon: Calendar },
          { title: getText("myStudentsShort"), url: createPageUrl("TutorStudents"), icon: Users },
        ],
        more: [
          { title: getText("events"), url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: getText("availability"), url: createPageUrl("TutorAvailability"), icon: Calendar },
          { title: getText("earnings"), url: createPageUrl("TutorEarnings"), icon: BarChart3 },
          { title: getText("profile"), url: createPageUrl("Profile"), icon: Settings },
        ],
      };
    case "vendor":
      return {
        main: [
          { title: getText("dashboardShort"), url: createPageUrl("Dashboard"), icon: Home },
          { title: getText("myServicesShort"), url: createPageUrl("MyServices"), icon: Store },
          { title: getText("myOrdersShort"), url: createPageUrl("MyOrders"), icon: ShoppingCart },
        ],
        more: [
          { title: getText("events"), url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: getText("analytics"), url: createPageUrl("VendorAnalytics"), icon: BarChart3 },
          { title: getText("earnings"), url: createPageUrl("VendorEarnings"), icon: BarChart3 },
          { title: getText("profile"), url: createPageUrl("Profile"), icon: Settings },
        ],
      };
    case "school":
      return {
        main: [
          { title: getText("dashboardShort"), url: createPageUrl("Dashboard"), icon: Home },
          { title: getText("programsShort"), url: createPageUrl("SchoolPrograms"), icon: BookOpen },
          { title: getText("leadsShort"), url: createPageUrl("SchoolLeads"), icon: Users },
        ],
        more: [
          { title: getText("events"), url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: getText("profile"), url: createPageUrl("SchoolProfile"), icon: Building },
          { title: getText("profileSettings"), url: createPageUrl("Profile"), icon: Settings },
        ],
      };
    case "admin":
      return {
        main: [
          { title: getText("dashboardShort"), url: createPageUrl("Dashboard"), icon: Home },
          { title: getText("userManagementShort"), url: createPageUrl("UserManagement"), icon: Users },
          { title: getText("verificationsShort"), url: createPageUrl("Verification"), icon: UserCheck },
        ],
        more: [
          { title: "Agent Assignments", url: createPageUrl("AdminAgentAssignments"), icon: UserCheck },
          { title: getText("paymentVerification"), url: createPageUrl("AdminPaymentVerification"), icon: FileText },
          { title: "Payment Monitoring", url: createPageUrl("AdminPayments"), icon: DollarSign },
          { title: getText("walletManagement"), url: createPageUrl("AdminWalletManagement"), icon: DollarSign },
          { title: getText("eventsAdmin"), url: createPageUrl("AdminEvents"), icon: Calendar },
          { title: getText("homePageEditor"), url: createPageUrl("AdminHomeEditor"), icon: Edit },
          { title: getText("blogEditor"), url: createPageUrl("AdminBlog"), icon: BookOpen },
          { title: getText("aboutPageEditor"), url: createPageUrl("AdminAboutEditor"), icon: Info },
          { title: getText("contactPageEditor"), url: createPageUrl("AdminContactEditor"), icon: Phone },
          { title: getText("faqEditor"), url: createPageUrl("AdminFAQ"), icon: MessageSquare },
          { title: getText("ourTeamEditor"), url: createPageUrl("AdminOurTeamEditor"), icon: Users },
          { title: "Brand Settings", url: createPageUrl("AdminBrandSettings"), icon: Palette },
          { title: getText("chatSettings"), url: createPageUrl("AdminChatSettings"), icon: MessageSquare },
          { title: getText("schoolManagement"), url: createPageUrl("AdminSchools"), icon: Building },
          { title: getText("institutionManagementShort"), url: createPageUrl("AdminInstitutions"), icon: Landmark },
          { title: getText("adminVisaRequests"), url: createPageUrl("AdminVisaRequests"), icon: FileText },
          { title: getText("marketplaceAdmin"), url: createPageUrl("MarketplaceAdmin"), icon: Store },
          { title: getText("packageAdmin"), url: createPageUrl("AdminPackages"), icon: Package },
          { title: getText("bankSettings"), url: createPageUrl("AdminBankSettings"), icon: Building },
          { title: getText("reports"), url: createPageUrl("AdminReports"), icon: BarChart3 },
          { title: getText("profile"), url: createPageUrl("Profile"), icon: Settings },
        ],
      };
    default:
      return {
        main: [
          { title: getText("dashboardShort"), url: createPageUrl("Dashboard"), icon: Home },
          { title: getText("discoverSchoolsShort"), url: createPageUrl("Schools"), icon: School },
          { title: getText("findTutorsShort"), url: createPageUrl("Tutors"), icon: BookOpen },
        ],
        more: [
          { title: getText("events"), url: createPageUrl("FairAndEvents"), icon: Calendar },
          { title: getText("profile"), url: createPageUrl("Profile"), icon: Settings },
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

  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  const bottomNavRef = React.useRef(null);
  const [bottomH, setBottomH] = React.useState(0);
  const profileUnsubRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const update = () => setBottomH(bottomNavRef.current?.offsetHeight ?? 0);
    update();
    const ro = new ResizeObserver(update);
    if (bottomNavRef.current) ro.observe(bottomNavRef.current);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  // Auth + live profile subscription
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
        setCurrentUser({ id: fbUser.uid, user_type: "student", full_name: fbUser.displayName || "" });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      settings: data.settings || {}
    };
  }, []);

  const handleLogout = React.useCallback(async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      navigate(createPageUrl(""));
    } catch {}
  }, [navigate]);

  const getLogoUrl = React.useCallback(
    () => "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/rawdatas%2FGreenPass%20Superapp.png?alt=media&token=987ad375-1aeb-4e1f-af08-7d89eb0ee2d8",
    []
  );
  const getCompanyName = React.useCallback(() => "GreenPass", []);

  const navigationItems = React.useMemo(() => buildDesktopNav(currentUser), [currentUser]);
  const mobileNavigationItems = React.useMemo(() => buildMobileNav(currentUser), [currentUser]);

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

  // Public site
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

  // Authenticated shell
  return (
    <SidebarProvider>
      <div className="min-h-[100svh] flex w-full bg-gray-50">
        {/* Desktop Sidebar */}
        <Sidebar className="border-r border-gray-200 bg-white hidden md:flex">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <Link
              to={createPageUrl("Dashboard")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200"
            >
              <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-10 w-auto object-contain" />
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarMenu>
              {navigationItems.map((item, index) => {
                const isActive = location.pathname === item.url || location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={index} className="rounded-lg">
                    <Link
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isActive ? "bg-green-100 text-green-700" : "hover:bg-gray-100 text-gray-700"
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
                <Link to={createPageUrl("Profile")} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{getText("profileSettings")}</span>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main area + mobile chrome */}
        <main className="flex-1 flex flex-col min-h-[100svh]">
          {/* Mobile Header (no language selector) */}
          <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 md:hidden sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 w-auto object-contain" />
              </Link>
            </div>
          </header>

          {/* Page content */}
          <div
            className="flex-1 overflow-y-auto md:pb-0"
            style={{ paddingBottom: bottomH || 0, WebkitOverflowScrolling: "touch" }}
          >
            <Outlet />
          </div>

          {/* Mobile Bottom Nav */}
          <nav
            ref={bottomNavRef}
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 z-50"
          >
            <div className="flex justify-around items-center max-w-md mx-auto px-1 py-2 safe-area-pb">
              {mobileNavigationItems.main.map((item, index) => {
                const isActive = location.pathname === item.url || location.pathname.startsWith(item.url);
                return (
                  <Link
                    key={index}
                    to={item.url}
                    className={`flex flex-col items-center justify-center px-1 py-1 rounded-lg min-w-0 flex-1 transition-colors duration-200 ${
                      isActive ? "text-green-600" : "text-gray-500 hover:text-green-600"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mb-1 ${isActive ? "text-green-600" : "text-gray-600"}`} />
                    <span className={`text-[11px] font-medium text-center leading-tight ${isActive ? "text-green-600" : "text-gray-600"}`}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}

              <button
                onClick={() => setShowMoreMenu(true)}
                className="flex flex-col items-center justify-center px-1 py-1 rounded-lg min-w-0 flex-1 text-gray-500 hover:text-green-600 transition-colors duration-200"
              >
                <MoreHorizontal className="w-5 h-5 mb-1" />
                <span className="text-[11px] font-medium text-center leading-tight">{getText("more")}</span>
              </button>
            </div>
          </nav>

          {/* Mobile More Menu */}
          <AnimatePresence>
            {showMoreMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="md:hidden fixed inset-0 bg-black/40 z-[60]"
                  onClick={() => setShowMoreMenu(false)}
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 250 }}
                  className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-50 rounded-t-2xl shadow-2xl z-[70] max-h-[85vh] overflow-y-auto"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div className="p-4 pt-3">
                    <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

                    <div className="p-4 bg-white rounded-xl shadow-sm mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                          <UserAvatar user={currentUser} sizeClass="w-11 h-11" textClass="text-xl" className="shrink-0" />
                          <div className="flex-1 overflow-hidden">
                            <p className="font-semibold text-gray-800 truncate">{currentUser?.full_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{currentUser?.user_type?.replace("_", " ")}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShowMoreMenu(false);
                            handleLogout();
                          }}
                          className="text-red-500 hover:bg-red-100 hover:text-red-600 rounded-full ml-2"
                        >
                          <LogOut className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {mobileNavigationItems.more.map((item, index) => (
                        <Link
                          key={index}
                          to={item.url}
                          onClick={() => setShowMoreMenu(false)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors text-center ${
                            location.pathname === item.url || location.pathname.startsWith(item.url)
                              ? "bg-green-100 text-green-700"
                              : "hover:bg-white text-gray-700"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full mb-1.5 ${
                              location.pathname === item.url || location.pathname.startsWith(item.url)
                                ? "bg-green-200"
                                : "bg-gray-100"
                            }`}
                          >
                            <item.icon className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-medium leading-tight">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* In-app chat for logged-in users */}
      <ChatWidget />
    </SidebarProvider>
  );
}
