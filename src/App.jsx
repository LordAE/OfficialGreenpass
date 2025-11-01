// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Layout from "@/pages/Layout.jsx";
import Home from "@/pages/Home";
import Welcome from "@/pages/Welcome.jsx";
import Schools from "@/pages/Schools";
import ProgramsPage from "@/pages/Programs";
import Dashboard from "@/pages/Dashboard";
import ComparePrograms from "@/pages/ComparePrograms";
import ProgramDetail from "@/pages/ProgramDetail";
import About from "@/pages/About";
import StudentLife from "@/pages/StudentLife";
import EventsPage from "@/pages/Events";
import Blog from "@/pages/Blog";
import Partnership from "./pages/Partnership";
import FAQ from "./pages/FAQ";
import ContactPage from "./pages/Contact";
import Resources from "./pages/Resources";
import OurTeam from "./pages/OurTeam";
import EventDetails from "./pages/EventDetails";
import EventRegistrationPage from "./pages/EventRegistration";
import Onboarding from "./pages/Onboarding";
import FairAndEvents from "@/pages/FairAndEvents";
import FindAgent from "@/pages/FindAgent";
import MyAgent from "@/pages/MyAgent";
import Tutors from "@/pages/Tutors";
import MySessions from "@/pages/MySessions";
import Marketplace from "@/pages/Marketplace";
import VisaPackages from "@/pages/VisaPackages";
import VisaRequests from "@/pages/VisaRequests";
import VisaCases from "@/pages/VisaCases";
import VisaDocuments from "@/pages/VisaDocuments";
import AgentLeads from "@/pages/AgentLeads";
import AgentEarnings from "@/pages/AgentEarnings";
import AgentPackages from "@/pages/AgentPackages";
import TutorStudents from "@/pages/TutorStudents";
import TutorSessions from "@/pages/TutorSessions";
import TutorAvailability from "@/pages/TutorAvailability";
import TutorEarnings from "@/pages/TutorEarnings";
import TutorPackages from "@/pages/TutorPackages";
import TutorDetails from "@/pages/TutorDetails";
import SchoolProfile from "@/pages/SchoolProfile";
import SchoolPrograms from "@/pages/SchoolPrograms";
import SchoolLeads from "@/pages/SchoolLeads";
import SchoolDetails from "@/pages/SchoolDetails";
import MyServices from "@/pages/MyServices";
import MyOrders from "@/pages/MyOrders";
import VendorAnalytics from "@/pages/VendorAnalytics";
import VendorEarnings from "@/pages/VendorEarnings";
import UserManagement from "@/pages/UserManagement";
import AdminSchools from "@/pages/AdminSchools";
import AdminInstitutions from "@/pages/AdminInstitutions";
import AdminAgentAssignments from "@/pages/AdminAgentAssignments";
import Verification from "@/pages/Verification";
import AdminPaymentVerification from "@/pages/AdminPaymentVerification";
import AdminPayments from "@/pages/AdminPayments";
import AdminWalletManagement from "@/pages/AdminWalletManagement";
import AdminEvents from "@/pages/AdminEvents";
import AdminHomeEditor from "@/pages/AdminHomeEditor";
import AdminBlog from "@/pages/AdminBlog";
import AdminAboutEditor from "@/pages/AdminAboutEditor";
import AdminContactEditor from "@/pages/AdminContactEditor";
import AdminFAQ from "@/pages/AdminFAQ";
import AdminOurTeamEditor from "@/pages/AdminOurTeamEditor";
import AdminBrandSettings from "@/pages/AdminBrandSettings";
import AdminChatSettings from "@/pages/AdminChatSettings";
import MarketplaceAdmin from "@/pages/MarketplaceAdmin";
import AdminPackages from "@/pages/AdminPackages";
import AdminBankSettings from "@/pages/AdminBankSettings";
import AdminReports from "@/pages/AdminReports";
import AdminVisaRequests from "@/pages/AdminVisaRequests";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import AgentAgreement from "@/pages/AgentAgreement";
import Checkout from "@/pages/Checkout";
import ReservationStatus from "@/pages/ReservationStatus";
import EventCheckIn from "@/pages/EventCheckIn";
import ProgramDetails from "@/pages/ProgramDetails";
import UserDetails from "@/pages/UserDetails";
import MyStudents from "./pages/MyStudents";
import Profile from "./pages/Profile";
import AuthForm from "./pages/AuthForm";
import EventRegistrationSuccess from "@/pages/EventRegistrationSuccess";
import ResetPassword from "./pages/ResetPassword.jsx";
import PostDetail from "./pages/PostDetail";
import PartnerAgents from "@/pages/PartnerAgents";
import PartnerTutors from "@/pages/PartnerTutors";
import PartnerSchools from "@/pages/PartnerSchools";
import PartnerVendor from "./pages/PartnerVendor";


export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Index route → Home */}
        <Route index element={<Home />} />
        <Route path="home" element={<Home />} />
        <Route path="welcome" element={<Welcome />} />
        <Route path="schools" element={<Schools />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="compareprograms" element={<ComparePrograms />} />
        <Route path="programsDetail" element={<ProgramDetail />} />
        <Route path="about" element={<About />} />
        <Route path="studentlife" element={<StudentLife />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="blog" element={<Blog />} />
        <Route path="partnership" element={<Partnership />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="contact" element={<ContactPage />} />  
        <Route path="resources" element={<Resources />} />
        <Route path="ourteam" element={<OurTeam />} />
        <Route path="eventdetails" element={<EventDetails />} />
        <Route path="eventregistration" element={<EventRegistrationPage />} />
        <Route path="login" element={<AuthForm />} />
        <Route path="/EventRegistrationSuccess" element={<EventRegistrationSuccess />} />
        <Route path="programdetail" element={<ProgramDetail />} />
        <Route path="resetpassword" element={<ResetPassword />} />
        <Route path="postdetail" element={<PostDetail/>} />
        <Route path="partner-agents" element={<PartnerAgents />} />
        <Route path="partner-tutors" element={<PartnerTutors />} />
        <Route path="partner-schools" element={<PartnerSchools />} />
        <Route path="partner-vendors" element={<PartnerVendor/>} />
        {/* Private routes */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="profile" element={<Profile />} />  

        {/* Public extras used by Layout */}
        <Route path="fairandevents" element={<FairAndEvents />} />
        <Route path="tutors" element={<Tutors />} />
        <Route path="programdetails" element={<ProgramDetails />} />
        <Route path="termsOfService" element={<TermsOfService />} />
        <Route path="privacypolicy" element={<PrivacyPolicy />} />
        <Route path="agentagreement" element={<AgentAgreement />} />

        {/* Events utilities */}
        <Route path="eventcheckin" element={<EventCheckIn />} />
        <Route path="reservationstatus" element={<ReservationStatus />} />

        {/* Agent / Student discovery */}
        <Route path="findagent" element={<FindAgent />} />
        <Route path="myagent" element={<MyAgent />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="mysessions" element={<MySessions />} />

        {/* Visa flows */}
        <Route path="visapackages" element={<VisaPackages />} />
        <Route path="visarequests" element={<VisaRequests />} />
        <Route path="visacases" element={<VisaCases />} />
        <Route path="visadocuments" element={<VisaDocuments />} />

        {/* Agent dashboard pages */}
        <Route path="agentleads" element={<AgentLeads />} />
        <Route path="agentearnings" element={<AgentEarnings />} />
        <Route path="agentpackages" element={<AgentPackages />} />

        {/* Tutor dashboard pages */}
        <Route path="tutorstudents" element={<TutorStudents />} />
        <Route path="tutorsessions" element={<TutorSessions />} />
        <Route path="tutoravailability" element={<TutorAvailability />} />
        <Route path="tutorearnings" element={<TutorEarnings />} />
        <Route path="tutorpackages" element={<TutorPackages />} />
        <Route path="tutordetails" element={<TutorDetails />} />
        <Route path="mystudents" element={<MyStudents />} />

        {/* School dashboard pages */}
        <Route path="schoolprofile" element={<SchoolProfile />} />
        <Route path="schoolprograms" element={<SchoolPrograms />} />
        <Route path="schoolleads" element={<SchoolLeads />} />
        <Route path="schooldetails" element={<SchoolDetails />} />

        {/* Vendor dashboard pages */}
        <Route path="myservices" element={<MyServices />} />
        <Route path="myorders" element={<MyOrders />} />
        <Route path="vendoranalytics" element={<VendorAnalytics />} />
        <Route path="vendorearnings" element={<VendorEarnings />} />

        {/* Admin pages */}
        <Route path="usermanagement" element={<UserManagement />} />
        <Route path="adminschools" element={<AdminSchools />} />
        <Route path="admininstitutions" element={<AdminInstitutions />} />
        <Route path="adminagentassignments" element={<AdminAgentAssignments />} />
        <Route path="verification" element={<Verification />} />
        <Route path="adminpaymentverification" element={<AdminPaymentVerification />} />
        <Route path="adminpayments" element={<AdminPayments />} />
        <Route path="adminwalletmanagement" element={<AdminWalletManagement />} />
        <Route path="adminevents" element={<AdminEvents />} />
        <Route path="adminhomeeditor" element={<AdminHomeEditor />} />
        <Route path="adminblog" element={<AdminBlog />} />
        <Route path="adminabouteditor" element={<AdminAboutEditor />} />
        <Route path="admincontacteditor" element={<AdminContactEditor />} />
        <Route path="adminfaq" element={<AdminFAQ />} />
        <Route path="adminourteameditor" element={<AdminOurTeamEditor />} />
        <Route path="adminbrandsettings" element={<AdminBrandSettings />} />
        <Route path="adminchatsettings" element={<AdminChatSettings />} />
        <Route path="marketplaceadmin" element={<MarketplaceAdmin />} />
        <Route path="adminpackages" element={<AdminPackages />} />
        <Route path="adminbanksettings" element={<AdminBankSettings />} />
        <Route path="adminreports" element={<AdminReports />} />
        <Route path="adminvisarequests" element={<AdminVisaRequests />} />

        {/* Payments / orders */}
        <Route path="checkout" element={<Checkout />} />

        {/* User utilities */}
        <Route path="userdetails" element={<UserDetails />} />

      </Route>
    </Routes>
  );
}
