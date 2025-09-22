// src/pages/Layout.jsx
import React from "react";
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
  MoreHorizontal,
  X,
  DollarSign,
  Menu,
  Rocket,
  LifeBuoy,
  GraduationCap,
  Handshake,
  Search,
  ArrowRight,
  Compass,
  MessageSquare,
  Edit,
  Phone,
  Info,
  Palette,
  Landmark,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube
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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

import { ChatSettings } from "@/api/entities";
import { BrandSettings } from "@/api/entities";
import ChatWidget from "@/components/chat/ChatWidget";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

/* ---------- Firebase auth/profile ---------- */
import { auth, db } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/* =========================
   i18n
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
    schoolManagement: "School Management",
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
    moreOptions: "More Options",
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
    blog: "Blog",
    support: "Support",
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
  },
  vi: {
    dashboard: "Bảng điều khiển",
    events: "Hội chợ và Sự kiện",
    discoverSchools: "Khám phá trường học",
    visaPackages: "Gói visa",
    findAgent: "Tìm agent",
    findTutors: "Tìm gia sư",
    marketplace: "Thị trường",
    mySessions: "Các buổi học của tôi",
    visaApplications: "Đơn xin visa",
    myStudents: "Học sinh của tôi",
    visaCases: "Hồ sơ visa",
    leads: "Khách hàng tiềm năng",
    earnings: "Thu nhập",
    availability: "Lịch trống",
    myServices: "Dịch vụ của tôi",
    myOrders: "Đơn hàng của tôi",
    analytics: "Phân tích",
    profile: "Hồ sơ",
    programs: "Chương trình",
    userManagement: "Quản lý người dùng",
    schoolManagement: "Quản lý trường học",
    verifications: "Xác minh",
    adminVisaRequests: "Quản lý đơn visa",
    marketplaceAdmin: "Quản lý thị trường",
    eventsAdmin: "Quản lý sự kiện",
    packageAdmin: "Quản lý gói",
    reports: "Báo cáo",
    profileSettings: "Cài đặt hồ sơ",
    logOut: "Đăng xuất",
    paymentVerification: "Xác minh thanh toán",
    walletManagement: "Quản lý ví",
    myAgent: "Agent của tôi",
    assignedAgent: "Agent được chỉ định",
    loading: "Đang tải...",
    status: "Trạng thái",
    pending: "Đang chờ",
    verified: "Đã xác minh",
    rejected: "Bị từ chối",
    actions: "Hành động",
    save: "Lưu",
    cancel: "Hủy",
    submit: "Gửi",
    search: "Tìm kiếm",
    viewDetails: "Xem chi tiết",
    all: "Tất cả",
    more: "Thêm",
    moreOptions: "Tùy chọn khác",
    dashboardShort: "Trang chủ",
    discoverSchoolsShort: "Trường",
    findTutorsShort: "Gia sư",
    findAgentShort: "Agent",
    mySessionsShort: "Buổi học",
    visaApplicationsShort: "Visa",
    visaPackagesShort: "Gói",
    marketplaceShort: "Chợ",
    profileShort: "Hồ sơ",
    myStudentsShort: "Học sinh",
    visaCasesShort: "Hồ sơ",
    earningsShort: "Thu nhập",
    myServicesShort: "Dịch vụ",
    myOrdersShort: "Đơn hàng",
    analyticsShort: "Phân tích",
    availabilityShort: "Lịch",
    programsShort: "Chương trình",
    leadsShort: "Khách hàng",
    userManagementShort: "Người dùng",
    verificationsShort: "Xác minh",
    homePageEditor: "Trang chủ",
    chatSettings: "Cài đặt trò chuyện",
    bankSettings: "Cài đặt ngân hàng",
    blogEditor: "Trình chỉnh sửa Blog",
    aboutPageEditor: "Trình chỉnh sửa trang Giới thiệu",
    faqEditor: "Trình chỉnh sửa FAQ",
    contactPageEditor: "Trình chỉnh sửa trang Liên hệ",
    ourTeam: "Đội ngũ của chúng tôi",
    ourTeamEditor: "Trình chỉnh sửa Đội ngũ",
    meetTheTeam: "Gặp gỡ những người đứng sau thành công của chúng tôi",
    welcome: "Chào mừng",
    chooseRole: "Chọn vai trò của bạn để bắt đầu",
    welcomeSubtitle: "Ứng dụng toàn diện cho việc du học",
    studyAbroadConfidence: "Du học với sự tự tin",
    exploreSchoolsPrograms: "Khám phá trường học, nhận sự giúp đỡ từ chuyên gia, và lập kế hoạch từng bước",
    getStarted: "Bắt đầu",
    about: "Giới thiệu",
    blog: "Blog",
    support: "Hỗ trợ",
    contactUs: "Liên hệ chúng tôi",
    faq: "Câu hỏi thường gặp",
    frequentlyAskedQuestions: "Các câu hỏi thường gặp",
    getInTouch: "Liên hệ với đội ngũ hỗ trợ của chúng tôi",
    guidesForStudents: "Tài nguyên cho sinh viên, đối tác",
    exploreSchools: "Khám phá trường học",
    login: "Đăng nhập",
    forStudents: "Dành cho sinh viên",
    forPartners: "Dành cho đối tác",
    quickLinks: "Liên kết nhanh",
    findSchoolsPrograms: "Tìm trường học & chương trình",
    searchTopSchools: "Tìm kiếm các trường hàng đầu",
    comparePrograms: "So sánh chương trình",
    filterByLevel: "Lọc theo cấp độ, khu vực, đợt tuyển sinh",
    studentLife: "Đời sống sinh viên",
    visaHousingTips: "Mẹo về visa, nhà ở và đến nơi",
    agentNetwork: "Mạng lưới agent",
    joinVerifiedAgent: "Tham gia nhóm agent đã xác minh của chúng tôi",
    tutorPrep: "Chuẩn bị gia sư",
    connectStudentsPrep: "Kết nối với sinh viên để chuẩn bị",
    eventsAndFairs: "Sự kiện & Hội chợ",
    promoteEvent: "Quảng bá hoặc tài trợ sự kiện của bạn",
    faqs: "Câu hỏi thường gặp",
    findQuickAnswers: "Tìm câu trả lời nhanh tại đây",
    contact: "Liên hệ",
    messageSupportTeam: "Nhắn tin cho đội ngũ hỗ trợ",
    resources: "Tài nguyên",
    solutions: "Giải pháp",
    findSchools: "Tìm trường học",
    findAnAgent: "Tìm Agent",
    findATutor: "Tìm Gia sư",
    visaHelp: "Hỗ trợ Visa",
    chatSupport: "Hỗ trợ trò chuyện",
    company: "Công ty",
    aboutUs: "Về chúng tôi",
    partnerships: "Đối tác",
    legal: "Pháp lý",
    termsOfService: "Điều khoản dịch vụ",
    privacyPolicy: "Chính sách bảo mật",
    agentAgreement: "Thỏa thuận Agent",
    institutionManagement: "Quản lý Tổ chức",
    institutionManagementShort: "Tổ chức",
  },
};

export const getLang = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("greenpass-language") || "en";
  }
  return "en";
};

export const getText = (key) => {
  const lang = getLang();
  return translations[lang][key] || translations.en[key] || key;
};

/* =========================
   Public Marketing Layout
========================= */
const ListItem = React.forwardRef(({ className, title, children, icon: Icon, ...props }, ref) => {
  return (
    <NavigationMenuLink asChild>
      <a
        ref={ref}
        className={cn(
          "group block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 hover:shadow-md border border-transparent hover:border-green-100",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 mb-2">
          {Icon && <Icon className="h-5 w-5 text-green-600 group-hover:text-green-700 transition-colors" />}
          <div className="text-sm font-semibold leading-none text-gray-900 group-hover:text-green-700 transition-colors">
            {title}
          </div>
        </div>
        <p className="line-clamp-2 text-sm leading-snug text-gray-600 group-hover:text-gray-700 transition-colors">
          {children}
        </p>
      </a>
    </NavigationMenuLink>
  );
});
ListItem.displayName = "ListItem";

const exploreForStudents = [
  {
    title: getText("findSchoolsPrograms"),
    href: createPageUrl("Programs"),
    icon: Search,
    description: getText("searchTopSchools"),
  },
  {
    title: getText("comparePrograms"),
    href: createPageUrl("ComparePrograms"),
    icon: Compass,
    description: getText("filterByLevel"),
  },
  {
    title: getText("studentLife"),
    href: createPageUrl("StudentLife"),
    icon: LifeBuoy,
    description: getText("visaHousingTips"),
  },
];

const exploreForPartners = [
  {
    title: getText("agentNetwork"),
    href: createPageUrl("Partnership"),
    icon: Handshake,
    description: getText("joinVerifiedAgent"),
  },
  {
    title: getText("tutorPrep"),
    href: createPageUrl("Partnership"),
    icon: GraduationCap,
    description: getText("connectStudentsPrep"),
  },
];

const quickLinks = [
  {
    title: getText("faqs"),
    href: createPageUrl("FAQ"),
    icon: MessageSquare,
    description: getText("findQuickAnswers"),
  },
  {
    title: getText("contact"),
    href: createPageUrl("Contact"),
    icon: Rocket,
    description: getText("messageSupportTeam"),
  },
  {
    title: getText("resources"),
    href: createPageUrl("Resources"),
    icon: BookOpen,
    description: getText("guidesForStudents"),
  },
  {
    title: getText("ourTeam"),
    href: createPageUrl("OurTeam"),
    icon: Users,
    description: getText("meetTheTeam"),
  },
];

const PublicLayout = ({ children, getLogoUrl, getCompanyName, brandSettings }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [language, setLanguage] = React.useState(getLang());

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("greenpass-language", newLang);
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-100/95 backdrop-blur-md text-gray-800 border-b border-gray-200 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-gray-200 hover:text-green-600 focus:bg-gray-200 data-[active]:bg-gray-200 data-[state=open]:bg-gray-200 data-[active]:text-green-600 transition-all duration-200 font-medium">
                      Explore
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid w-[950px] grid-cols-4 gap-6 p-8 bg-white/95 backdrop-blur-sm">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <p className="text-xs uppercase font-bold text-blue-600 tracking-wider">{getText("forStudents")}</p>
                          </div>
                          <div className="space-y-1">
                            {exploreForStudents.map((item) => (
                              <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                                {item.description}
                              </ListItem>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <p className="text-xs uppercase font-bold text-purple-600 tracking-wider">{getText("forPartners")}</p>
                          </div>
                          <div className="space-y-1">
                            {exploreForPartners.map((item) => (
                              <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                                {item.description}
                              </ListItem>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <p className="text-xs uppercase font-bold text-emerald-600 tracking-wider">{getText("quickLinks")}</p>
                          </div>
                          <div className="space-y-1">
                            {quickLinks.map((item) => (
                              <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                                {item.description}
                              </ListItem>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <Link
                            to={createPageUrl("Home")}
                            className="group flex h-full w-full select-none flex-col justify-end rounded-xl bg-gradient-to-br from-green-500 via-green-600 to-blue-600 p-6 no-underline outline-none focus:shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                <Rocket className="h-5 w-5 text-white" />
                                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                                  Get Started
                                </Badge>
                              </div>
                              <div className="mb-2 text-lg font-bold text-white">{getText("studyAbroadConfidence")}</div>
                              <p className="text-sm leading-tight text-white/90 mb-4">{getText("exploreSchoolsPrograms")}</p>
                              <div className="flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition-all duration-200">
                                <span>{getText("getStarted")}</span>
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                              </div>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <Link to={createPageUrl("About")}>
                      <NavigationMenuLink className={cn(
                        navigationMenuTriggerStyle(),
                        "bg-transparent text-gray-700 hover:bg-gray-200 hover:text-green-600 focus:bg-gray-200 transition-all duration-200 font-medium"
                      )}>
                        {getText("about")}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <Link to={createPageUrl("Events")}>
                      <NavigationMenuLink className={cn(
                        navigationMenuTriggerStyle(),
                        "bg-transparent text-gray-700 hover:bg-gray-200 hover:text-green-600 focus:bg-gray-200 transition-all duration-200 font-medium"
                      )}>
                        {getText("events")}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <Link to={createPageUrl("Blog")}>
                      <NavigationMenuLink className={cn(
                        navigationMenuTriggerStyle(),
                        "bg-transparent text-gray-700 hover:bg-gray-200 hover:text-green-600 focus:bg-gray-200 transition-all duration-200 font-medium"
                      )}>
                        {getText("blog")}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-gray-200 hover:text-green-600 focus:bg-gray-200 data-[active]:bg-gray-200 data-[state=open]:bg-gray-200 data-[active]:text-green-600 transition-all duration-200 font-medium">
                      {getText("support")}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[350px] gap-3 p-6 bg-white/95 backdrop-blur-sm">
                        <ListItem href={createPageUrl("Contact")} title={getText("contactUs")} icon={Phone}>
                          {getText("getInTouch")}
                        </ListItem>
                        <ListItem href={createPageUrl("FAQ")} title={getText("faq")} icon={MessageSquare}>
                          {getText("frequentlyAskedQuestions")}
                        </ListItem>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className="hidden md:flex items-center space-x-3">
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-auto h-9 border-gray-300 bg-white/90 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
                </SelectContent>
              </Select>

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
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-300 transition-all duration-200"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile flyout */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-gray-100/95 backdrop-blur-md border-t border-gray-200"
            >
              <div className="px-4 pt-4 pb-6 space-y-4">
                <div className="space-y-3">
                  <p className="text-xs uppercase font-bold text-blue-600 tracking-wider px-2">{getText("forStudents")}</p>
                  {exploreForStudents.map((link) => (
                    <Link
                      key={link.title}
                      to={link.href}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-200 hover:text-green-700 transition-all duration-200"
                    >
                      <link.icon className="h-5 w-5 text-green-600" />
                      <span>{link.title}</span>
                    </Link>
                  ))}
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <p className="text-xs uppercase font-bold text-purple-600 tracking-wider px-2">{getText("forPartners")}</p>
                  {exploreForPartners.map((link) => (
                    <Link
                      key={link.title}
                      to={link.href}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-200 hover:text-purple-700 transition-all duration-200"
                    >
                      <link.icon className="h-5 w-5 text-purple-600" />
                      <span>{link.title}</span>
                    </Link>
                  ))}
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <p className="text-xs uppercase font-bold text-emerald-600 tracking-wider px-2">{getText("quickLinks")}</p>
                  {quickLinks.map((link) => (
                    <Link
                      key={link.title}
                      to={link.href}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-200 hover:text-emerald-700 transition-all duration-200"
                    >
                      <link.icon className="h-5 w-5 text-emerald-600" />
                      <span>{link.title}</span>
                    </Link>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="px-3">
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                        <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Link to={createPageUrl("Welcome")} className="block w-full">
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

      <main className="pt-16">  <Outlet /> </main>
      <Footer getCompanyName={getCompanyName} brandSettings={brandSettings} />
      <PublicChatWidget />
    </div>
  );
};

const PublicChatWidget = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = React.useState(false);
  const [settings, setSettings] = React.useState(null);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const chatSettingsList = await ChatSettings.list();
        if (chatSettingsList.length > 0) {
          setSettings(chatSettingsList[0]);
        }
      } catch (error) {
        console.warn("Could not load chat settings for public widget.", error);
        setSettings({ whatsapp_number: null, zalo_number: null });
      }
    };
    fetchSettings();
  }, []);

  const whatsappLink = settings?.whatsapp_number ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}` : null;
  const zaloLink = settings?.zalo_number ? `https://zalo.me/${settings.zalo_number.replace(/\D/g, "")}` : null;

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (isAiChatOpen) setIsAiChatOpen(false);
  };

  const toggleAiChat = () => {
    setIsOpen(false);
    setIsAiChatOpen(!isAiChatOpen);
  };

  return (
    <>
      <div className="fixed bottom-6 right-4 sm:right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-end space-y-3 mb-4"
            >
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105"
                >
                  <span className="font-semibold text-gray-700 text-sm sm:text-base">Chat on WhatsApp</span>
                  <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </a>
              )}
              {zaloLink && (
                <a
                  href={zaloLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105"
                >
                  <span className="font-semibold text-gray-700 text-sm sm:text-base">Chat on Zalo</span>
                  <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </a>
              )}
              <button
                onClick={toggleAiChat}
                className="flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105"
              >
                <span className="font-semibold text-gray-700 text-sm sm:text-base">AI Support Chat</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMenu}
          className="bg-green-600 text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label="Open chat menu"
        >
          {isOpen || isAiChatOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />}
        </motion.button>
      </div>

      <AnimatePresence>
        {isAiChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-72 sm:w-80 h-80 sm:h-96 bg-white rounded-lg shadow-xl flex flex-col z-50"
          >
            <div className="flex items-center justify-between p-3 sm:p-4 bg-green-600 text-white rounded-t-lg">
              <h3 className="font-semibold text-sm sm:text-base">AI Support Chat</h3>
              <button onClick={() => setIsAiChatOpen(false)} className="text-white hover:text-gray-200 focus:outline-none" aria-label="Close chat">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto text-gray-700 text-xs sm:text-sm">
              <p className="mb-2">Hello! How can I assist you today?</p>
              <p className="mb-2">I'm an AI assistant designed to answer your questions about GreenPass and studying abroad.</p>
              <p>Feel free to ask me anything!</p>
            </div>
            <div className="p-3 sm:p-4 border-t border-gray-200">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
              <Button className="mt-2 w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base">Send</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const socialIconMap = {
  Facebook: <Facebook className="h-6 w-6" />,
  Twitter: <Twitter className="h-6 w-6" />,
  Instagram: <Instagram className="h-6 w-6" />,
  Linkedin: <Linkedin className="h-6 w-6" />,
  LinkedIn: <Linkedin className="h-6 w-6" />,
  YouTube: <Youtube className="h-6 w-6" />,
  Youtube: <Youtube className="h-6 w-6" />,
};

const Footer = ({ getCompanyName, brandSettings }) => {
  const defaultFooterLinks = [
    {
      column_title: getText("solutions"),
      links: [
        { text: getText("findSchools"), url: createPageUrl("Schools") },
        { text: getText("findAnAgent"), url: createPageUrl("FindAgent") },
        { text: getText("findATutor"), url: createPageUrl("Tutors") },
        { text: getText("visaHelp"), url: createPageUrl("VisaRequests") },
      ],
    },
    {
      column_title: getText("support"),
      links: [
        { text: getText("contactUs"), url: createPageUrl("Contact") },
        { text: getText("faq"), url: createPageUrl("FAQ") },
        { text: getText("chatSupport"), url: createPageUrl("Messages") },
      ],
    },
    {
      column_title: getText("company"),
      links: [
        { text: getText("aboutUs"), url: createPageUrl("About") },
        { text: getText("ourTeam"), url: createPageUrl("OurTeam") },
        { text: getText("blog"), url: createPageUrl("Blog") },
        { text: getText("partnerships"), url: createPageUrl("Partnership") },
      ],
    },
    {
      column_title: getText("legal"),
      links: [
        { text: getText("termsOfService"), url: createPageUrl("TermsOfService") },
        { text: getText("privacyPolicy"), url: createPageUrl("PrivacyPolicy") },
        { text: getText("agentAgreement"), url: createPageUrl("AgentAgreement") },
      ],
    },
  ];

  const footerLinks = brandSettings?.footer_links?.length > 0 ? brandSettings.footer_links : defaultFooterLinks;

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
            {(brandSettings?.social_links || []).map((social, index) => (
              <a key={index} href={social.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <span className="sr-only">{social.platform}</span>
                {socialIconMap[social.platform] || socialIconMap[(social.platform || "").trim()] || <Link to={social.url}>↗</Link>}
              </a>
            ))}
          </div>
          <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1">
            &copy; {new Date().getFullYear()} {getCompanyName()}. {brandSettings?.footer_text || "All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
};

/* =========================
   AUTHENTICATED LAYOUT
========================= */

/** Avatar component (uses user.photo_url if present; otherwise gradient + initial) */
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

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [language, setLanguage] = React.useState(getLang());
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  const [brandSettings, setBrandSettings] = React.useState(null);

  // normalize Firestore user -> UI model
  const normalizeUser = (uid, data = {}, fbUser = {}) => {
    const full_name = data.full_name || data.displayName || fbUser.displayName || data.name || "";
    const user_type = (data.user_type || data.role || "student").toLowerCase();
    const onboarding_completed = data.onboarding_completed ?? data.onboardingComplete ?? false;
    const settings = data.settings || {};
    return {
      id: uid,
      ...data,
      full_name,
      user_type,
      onboarding_completed,
      purchased_packages: Array.isArray(data.purchased_packages) ? data.purchased_packages : [],
      settings,
    };
  };

  React.useEffect(() => {
    let unsub = () => {};
    (async () => {
      setLoading(true);
      try {
        // Brand settings
        try {
          const brandData = await BrandSettings.list();
          if (brandData.length > 0) {
            setBrandSettings(brandData[0]);
          }
        } catch (err) {
          console.warn("Could not load brand settings:", err);
        }

        // Firebase auth + profile load
        unsub = onAuthStateChanged(auth, async (fbUser) => {
          if (!fbUser) {
            setCurrentUser(null);
            setLoading(false);
            return;
          }
          try {
            const ref = doc(db, "users", fbUser.uid);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
              // Seed minimal doc so preferences can save immediately
              const seed = {
                uid: fbUser.uid,
                full_name: fbUser.displayName || "",
                email: fbUser.email || "",
                user_type: "student",
                onboarding_completed: false,
                settings: { language: language || "en" },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              await setDoc(ref, seed, { merge: true });
              setCurrentUser(normalizeUser(fbUser.uid, seed, fbUser));
            } else {
              const profile = normalizeUser(fbUser.uid, snap.data(), fbUser);
              setCurrentUser(profile);

              // Use stored language preference if present
              const prefLang = profile.settings?.language || profile.language;
              if (prefLang) {
                if (prefLang !== language) {
                  setLanguage(prefLang);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("greenpass-language", prefLang);
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Failed to load user profile:", e);
            setCurrentUser({ id: fbUser.uid, user_type: "student", full_name: fbUser.displayName || "" });
          } finally {
            setLoading(false);
          }
        });
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    })();
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      navigate(createPageUrl(""));
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLanguageChange = async (newLang) => {
    setLanguage(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("greenpass-language", newLang);
    }
    // persist to Firestore if logged in
    try {
      if (currentUser?.id) {
        const ref = doc(db, "users", currentUser.id);
        const currentSettings = currentUser.settings || {};
        try {
          await updateDoc(ref, { settings: { ...currentSettings, language: newLang } });
        } catch (err) {
          // If doc missing (rare), seed it
          await setDoc(ref, { settings: { language: newLang } }, { merge: true });
        }
        setCurrentUser((prev) => ({ ...prev, settings: { ...currentSettings, language: newLang } }));
      }
    } catch (error) {
      console.error("Failed to save language preference:", error);
    }

    window.location.reload();
  };

  // Brand visuals
  const getLogoUrl = () =>
    brandSettings?.logo_url ||
    "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/rawdatas%2FGreenPass%20Superapp.png?alt=media&token=987ad375-1aeb-4e1f-af08-7d89eb0ee2d8";
  const getCompanyName = () => brandSettings?.company_name || "GreenPass";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Auth not present → show public marketing shell
  if (!currentUser) {
    return (
      <PublicLayout
        getLogoUrl={getLogoUrl}
        getCompanyName={getCompanyName}
        brandSettings={brandSettings}
      />
    );
  }

  // If authenticated but not onboarded → render page content without nav
  if (currentUser && !currentUser.onboarding_completed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Outlet />
      </div>
    );
  }

  // Build navs for authenticated users
  const getNavigationItems = () => {
    const baseItems = [
      { title: getText("dashboard"), url: createPageUrl("Dashboard"), icon: Home },
      { title: getText("events"), url: createPageUrl("FairAndEvents"), icon: Calendar },
    ];

    const hasPurchasedPackage = currentUser?.purchased_packages && currentUser.purchased_packages.length > 0;

    switch (currentUser.user_type) {
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
  };

  const getMobileNavigationItems = () => {
    const hasPurchasedPackage = currentUser?.purchased_packages && currentUser.purchased_packages.length > 0;

    switch (currentUser.user_type) {
      case "user":
      case "student": {
        const commonMainItems = [
          { title: getText("dashboardShort"), url: createPageUrl("Dashboard"), icon: Home },
          { title: getText("discoverSchoolsShort"), url: createPageUrl("Schools"), icon: School },
          { title: getText("findTutorsShort"), url: createPageUrl("Tutors"), icon: BookOpen },
        ];

        const studentMoreItems = [
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
          studentMoreItems.splice(3, 0, { title: getText("visaApplications"), url: createPageUrl("VisaRequests"), icon: FileText });
        }

        return { main: commonMainItems, more: studentMoreItems };
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
  };

  const navigationItems = getNavigationItems();
  const mobileNavigationItems = getMobileNavigationItems();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        {/* Desktop Sidebar */}
        <Sidebar className="border-r border-gray-200 bg-white hidden md:flex">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200">
              <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-10 w-auto object-contain" />
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarMenu>
              {navigationItems.map((item, index) => {
                const isActive = location.pathname === item.url || location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem
                    key={index}
                    asChild
                    isActive={isActive}
                    className={`rounded-lg ${isActive ? "bg-green-100 text-green-700" : "hover:bg-gray-100"}`}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
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
              {/* Avatar (photo if available, otherwise initial in gradient) */}
              <UserAvatar user={currentUser} sizeClass="w-10 h-10" textClass="text-lg" />

              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-gray-800 truncate text-sm">{currentUser?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser?.user_type}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            <SidebarMenu>
              <SidebarMenuItem asChild className="rounded-lg hover:bg-gray-100">
                <Link to={createPageUrl("Profile")} className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{getText("profileSettings")}</span>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main area + mobile chrome */}
        <main className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 md:hidden sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
                <img src={getLogoUrl()} alt={`${getCompanyName()} Super App`} className="h-8 w-auto object-contain" />
              </Link>
              <div className="flex items-center gap-2">
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-auto h-9 border-0 bg-gray-100">
                    <Globe className="w-4 h-4 text-gray-600" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇺🇸 EN</SelectItem>
                    <SelectItem value="vi">🇻🇳 VI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-auto pb-20 md:pb-0">
            <Outlet />
          </div>

          {/* Mobile Bottom Nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 z-50">
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

              {/* More Button */}
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
                >
                  <div className="p-4 pt-3">
                    <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

                    <div className="p-4 bg-white rounded-xl shadow-sm mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                          {/* Avatar (photo or initial) */}
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
                      {getMobileNavigationItems().more.map((item, index) => (
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

      <ChatWidget />
    </SidebarProvider>
  );
}
