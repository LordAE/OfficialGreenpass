import Layout from "@/pages/Layout.jsx";

import Dashboard from "@/pages/Dashboard";

import Onboarding from "@/pages/Onboarding";

import Schools from "@/pages/Schools";

import ReservationStatus from "@/pages/ReservationStatus";

import Tutors from "@/pages/Tutors";

import TutorDetails from "@/pages/TutorDetails";

import MySessions from "@/pages/MySessions";

import TutorSessions from "@/pages/TutorSessions";

import VisaRequests from "@/pages/VisaRequests";

import Profile from "@/pages/Profile";

import MyStudents from "@/pages/MyStudents";

import VisaCases from "@/pages/VisaCases";

import TutorStudents from "@/pages/TutorStudents";

import AdminSchools from "@/pages/AdminSchools";

import UserManagement from "@/pages/UserManagement";

import Verification from "@/pages/Verification";

import AdminVisaRequests from "@/pages/AdminVisaRequests";

import Marketplace from "@/pages/Marketplace";

import MyServices from "@/pages/MyServices";

import MyOrders from "@/pages/MyOrders";

import VisaPackages from "@/pages/VisaPackages";

import AgentLeads from "@/pages/AgentLeads";

import AgentEarnings from "@/pages/AgentEarnings";

import TutorAvailability from "@/pages/TutorAvailability";

import TutorEarnings from "@/pages/TutorEarnings";

import VendorAnalytics from "@/pages/VendorAnalytics";

import VendorEarnings from "@/pages/VendorEarnings";

import MarketplaceAdmin from "@/pages/MarketplaceAdmin";

import AdminReports from "@/pages/AdminReports";

import GAINFair2025Student from "@/pages/GAINFair2025Student";

import EventDetails from "@/pages/EventDetails";

import AdminPackages from "@/pages/AdminPackages";

import FindAgent from "@/pages/FindAgent";

import Checkout from "@/pages/Checkout";

import AdminEvents from "@/pages/AdminEvents";

import SchoolProfile from "@/pages/SchoolProfile";

import SchoolPrograms from "@/pages/SchoolPrograms";

import SchoolLeads from "@/pages/SchoolLeads";

import UserDetails from "@/pages/UserDetails";

import SchoolDetails from "@/pages/SchoolDetails";

import ProgramDetails from "@/pages/ProgramDetails";

import VisaDocuments from "@/pages/VisaDocuments";

import TutorPackages from "@/pages/TutorPackages";

import AgentPackages from "@/pages/AgentPackages";

import AdminBankSettings from "@/pages/AdminBankSettings";

import AdminPaymentVerification from "@/pages/AdminPaymentVerification";

import AdminWalletManagement from "@/pages/AdminWalletManagement";

import MyAgent from "@/pages/MyAgent";

import FairAndEvents from "@/pages/FairAndEvents";

import Home from "@/pages/Home";

import Programs from "@/pages/Programs";

import Events from "@/pages/Events";

import Partnership from "@/pages/Partnership";

import ProgramDetail from "@/pages/ProgramDetail";

import About from "@/pages/About";

import Blog from "@/pages/Blog";

import StudentLife from "@/pages/StudentLife";

import FAQ from "@/pages/FAQ";

import Resources from "@/pages/Resources";

import EventDetail from "@/pages/EventDetail";

import EventRegistration from "@/pages/EventRegistration";

import AdminHomeEditor from "@/pages/AdminHomeEditor";

import AdminChatSettings from "@/pages/AdminChatSettings";

import EventCheckIn from "@/pages/EventCheckIn";

import TermsOfService from "@/pages/TermsOfService";

import PrivacyPolicy from "@/pages/PrivacyPolicy";

import AgentAgreement from "@/pages/AgentAgreement";

import AdminBlog from "@/pages/AdminBlog";

import PostDetail from "@/pages/PostDetail";

import AdminAboutEditor from "@/pages/AdminAboutEditor";

import Welcome from "@/pages/Welcome";

import AdminFAQ from "@/pages/AdminFAQ";

import AdminBrandSettings from "@/pages/AdminBrandSettings";

import AdminContactEditor from "@/pages/AdminContactEditor";

import EventRegistrationSuccess from "@/pages/EventRegistrationSuccess";

import AdminPayments from "@/pages/AdminPayments";

import OurTeam from "@/pages/OurTeam";

import AdminOurTeamEditor from "@/pages/AdminOurTeamEditor";

import AdminInstitutions from "@/pages/AdminInstitutions";

import Contact from "@/pages/Contact";

import ComparePrograms from "@/pages/ComparePrograms";

import MarketplaceOrderSuccess from "@/pages/MarketplaceOrderSuccess";

import AdminAgentAssignments from "@/pages/AdminAgentAssignments";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Onboarding: Onboarding,
    
    Schools: Schools,
    
    ReservationStatus: ReservationStatus,
    
    Tutors: Tutors,
    
    TutorDetails: TutorDetails,
    
    MySessions: MySessions,
    
    TutorSessions: TutorSessions,
    
    VisaRequests: VisaRequests,
    
    Profile: Profile,
    
    MyStudents: MyStudents,
    
    VisaCases: VisaCases,
    
    TutorStudents: TutorStudents,
    
    AdminSchools: AdminSchools,
    
    UserManagement: UserManagement,
    
    Verification: Verification,
    
    AdminVisaRequests: AdminVisaRequests,
    
    Marketplace: Marketplace,
    
    MyServices: MyServices,
    
    MyOrders: MyOrders,
    
    VisaPackages: VisaPackages,
    
    AgentLeads: AgentLeads,
    
    AgentEarnings: AgentEarnings,
    
    TutorAvailability: TutorAvailability,
    
    TutorEarnings: TutorEarnings,
    
    VendorAnalytics: VendorAnalytics,
    
    VendorEarnings: VendorEarnings,
    
    MarketplaceAdmin: MarketplaceAdmin,
    
    AdminReports: AdminReports,
    
    GAINFair2025Student: GAINFair2025Student,
    
    EventDetails: EventDetails,
    
    AdminPackages: AdminPackages,
    
    FindAgent: FindAgent,
    
    Checkout: Checkout,
    
    AdminEvents: AdminEvents,
    
    SchoolProfile: SchoolProfile,
    
    SchoolPrograms: SchoolPrograms,
    
    SchoolLeads: SchoolLeads,
    
    UserDetails: UserDetails,
    
    SchoolDetails: SchoolDetails,
    
    ProgramDetails: ProgramDetails,
    
    VisaDocuments: VisaDocuments,
    
    TutorPackages: TutorPackages,
    
    AgentPackages: AgentPackages,
    
    AdminBankSettings: AdminBankSettings,
    
    AdminPaymentVerification: AdminPaymentVerification,
    
    AdminWalletManagement: AdminWalletManagement,
    
    MyAgent: MyAgent,
    
    FairAndEvents: FairAndEvents,
    
    Home: Home,
    
    Programs: Programs,
    
    Events: Events,
    
    Partnership: Partnership,
    
    ProgramDetail: ProgramDetail,
    
    About: About,
    
    Blog: Blog,
    
    StudentLife: StudentLife,
    
    FAQ: FAQ,
    
    Resources: Resources,
    
    EventDetail: EventDetail,
    
    EventRegistration: EventRegistration,
    
    AdminHomeEditor: AdminHomeEditor,
    
    AdminChatSettings: AdminChatSettings,
    
    EventCheckIn: EventCheckIn,
    
    TermsOfService: TermsOfService,
    
    PrivacyPolicy: PrivacyPolicy,
    
    AgentAgreement: AgentAgreement,
    
    AdminBlog: AdminBlog,
    
    PostDetail: PostDetail,
    
    AdminAboutEditor: AdminAboutEditor,
    
    Welcome: Welcome,
    
    AdminFAQ: AdminFAQ,
    
    AdminBrandSettings: AdminBrandSettings,
    
    AdminContactEditor: AdminContactEditor,
    
    EventRegistrationSuccess: EventRegistrationSuccess,
    
    AdminPayments: AdminPayments,
    
    OurTeam: OurTeam,
    
    AdminOurTeamEditor: AdminOurTeamEditor,
    
    AdminInstitutions: AdminInstitutions,
    
    Contact: Contact,
    
    ComparePrograms: ComparePrograms,
    
    MarketplaceOrderSuccess: MarketplaceOrderSuccess,
    
    AdminAgentAssignments: AdminAgentAssignments,
    
}

function _getCurrentPage(url) {
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split('/').pop();
  if (urlLastPart.includes('?')) {
    urlLastPart = urlLastPart.split('?')[0];
  }
  if (!urlLastPart) return 'Home';
  const pageName = Object.keys(PAGES).find(
    page => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                <Route path="/" element={<Home />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/Schools" element={<Schools />} />
                
                <Route path="/ReservationStatus" element={<ReservationStatus />} />
                
                <Route path="/Tutors" element={<Tutors />} />
                
                <Route path="/TutorDetails" element={<TutorDetails />} />
                
                <Route path="/MySessions" element={<MySessions />} />
                
                <Route path="/TutorSessions" element={<TutorSessions />} />
                
                <Route path="/VisaRequests" element={<VisaRequests />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/MyStudents" element={<MyStudents />} />
                
                <Route path="/VisaCases" element={<VisaCases />} />
                
                <Route path="/TutorStudents" element={<TutorStudents />} />
                
                <Route path="/AdminSchools" element={<AdminSchools />} />
                
                <Route path="/UserManagement" element={<UserManagement />} />
                
                <Route path="/Verification" element={<Verification />} />
                
                <Route path="/AdminVisaRequests" element={<AdminVisaRequests />} />
                
                <Route path="/Marketplace" element={<Marketplace />} />
                
                <Route path="/MyServices" element={<MyServices />} />
                
                <Route path="/MyOrders" element={<MyOrders />} />
                
                <Route path="/VisaPackages" element={<VisaPackages />} />
                
                <Route path="/AgentLeads" element={<AgentLeads />} />
                
                <Route path="/AgentEarnings" element={<AgentEarnings />} />
                
                <Route path="/TutorAvailability" element={<TutorAvailability />} />
                
                <Route path="/TutorEarnings" element={<TutorEarnings />} />
                
                <Route path="/VendorAnalytics" element={<VendorAnalytics />} />
                
                <Route path="/VendorEarnings" element={<VendorEarnings />} />
                
                <Route path="/MarketplaceAdmin" element={<MarketplaceAdmin />} />
                
                <Route path="/AdminReports" element={<AdminReports />} />
                
                <Route path="/GAINFair2025Student" element={<GAINFair2025Student />} />
                
                <Route path="/EventDetails" element={<EventDetails />} />
                
                <Route path="/AdminPackages" element={<AdminPackages />} />
                
                <Route path="/FindAgent" element={<FindAgent />} />
                
                <Route path="/Checkout" element={<Checkout />} />
                
                <Route path="/AdminEvents" element={<AdminEvents />} />
                
                <Route path="/SchoolProfile" element={<SchoolProfile />} />
                
                <Route path="/SchoolPrograms" element={<SchoolPrograms />} />
                
                <Route path="/SchoolLeads" element={<SchoolLeads />} />
                
                <Route path="/UserDetails" element={<UserDetails />} />
                
                <Route path="/SchoolDetails" element={<SchoolDetails />} />
                
                <Route path="/ProgramDetails" element={<ProgramDetails />} />
                
                <Route path="/VisaDocuments" element={<VisaDocuments />} />
                
                <Route path="/TutorPackages" element={<TutorPackages />} />
                
                <Route path="/AgentPackages" element={<AgentPackages />} />
                
                <Route path="/AdminBankSettings" element={<AdminBankSettings />} />
                
                <Route path="/AdminPaymentVerification" element={<AdminPaymentVerification />} />
                
                <Route path="/AdminWalletManagement" element={<AdminWalletManagement />} />
                
                <Route path="/MyAgent" element={<MyAgent />} />
                
                <Route path="/FairAndEvents" element={<FairAndEvents />} />
                
                <Route path="/" element={<Home />} />
                
                <Route path="/Programs" element={<Programs />} />
                
                <Route path="/Events" element={<Events />} />
                
                <Route path="/Partnership" element={<Partnership />} />
                
                <Route path="/ProgramDetail" element={<ProgramDetail />} />
                
                <Route path="/About" element={<About />} />
                
                <Route path="/Blog" element={<Blog />} />
                
                <Route path="/StudentLife" element={<StudentLife />} />
                
                <Route path="/FAQ" element={<FAQ />} />
                
                <Route path="/Resources" element={<Resources />} />
                
                <Route path="/EventDetail" element={<EventDetail />} />
                
                <Route path="/EventRegistration" element={<EventRegistration />} />
                
                <Route path="/AdminHomeEditor" element={<AdminHomeEditor />} />
                
                <Route path="/AdminChatSettings" element={<AdminChatSettings />} />
                
                <Route path="/EventCheckIn" element={<EventCheckIn />} />
                
                <Route path="/TermsOfService" element={<TermsOfService />} />
                
                <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
                
                <Route path="/AgentAgreement" element={<AgentAgreement />} />
                
                <Route path="/AdminBlog" element={<AdminBlog />} />
                
                <Route path="/PostDetail" element={<PostDetail />} />
                
                <Route path="/AdminAboutEditor" element={<AdminAboutEditor />} />
                
                <Route path="/Welcome" element={<Welcome />} />
                
                <Route path="/AdminFAQ" element={<AdminFAQ />} />
                
                <Route path="/AdminBrandSettings" element={<AdminBrandSettings />} />
                
                <Route path="/AdminContactEditor" element={<AdminContactEditor />} />
                
                <Route path="/EventRegistrationSuccess" element={<EventRegistrationSuccess />} />
                
                <Route path="/AdminPayments" element={<AdminPayments />} />
                
                <Route path="/OurTeam" element={<OurTeam />} />
                
                <Route path="/AdminOurTeamEditor" element={<AdminOurTeamEditor />} />
                
                <Route path="/AdminInstitutions" element={<AdminInstitutions />} />
                
                <Route path="/Contact" element={<Contact />} />
                
                <Route path="/ComparePrograms" element={<ComparePrograms />} />
                
                <Route path="/MarketplaceOrderSuccess" element={<MarketplaceOrderSuccess />} />
                
                <Route path="/AdminAgentAssignments" element={<AdminAgentAssignments />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
            <PagesContent />
    );
}