// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Layout from "@/pages/Layout.jsx";
import Welcome from "@/pages/Welcome.jsx";
import Directory from "@/pages/Directory";
import Dashboard from "@/pages/Dashboard";
import EventsPage from "@/pages/Events";
import Onboarding from "./pages/Onboarding";
import FindAgent from "@/pages/FindAgent";
import MyAgent from "@/pages/MyAgent";
import Tutors from "@/pages/Tutors";
import MySessions from "@/pages/MySessions";
import AgentLeads from "@/pages/AgentLeads";
import TutorStudents from "@/pages/TutorStudents";
import TutorSessions from "@/pages/TutorSessions";
import TutorAvailability from "@/pages/TutorAvailability";
import TutorDetails from "@/pages/TutorDetails";
import SchoolProfile from "@/pages/SchoolProfile";
import SchoolLeads from "@/pages/SchoolLeads";
import SchoolDetails from "@/pages/SchoolDetails";
import MyServices from "@/pages/MyServices";
import UserManagement from "@/pages/UserManagement";
import AdminSchools from "@/pages/AdminSchools";
import AdminInstitutions from "@/pages/AdminInstitutions";
import AdminAgentAssignments from "@/pages/AdminAgentAssignments";
import Verification from "@/pages/Verification";
import AdminPaymentVerification from "@/pages/AdminPaymentVerification";
import AdminPayments from "@/pages/AdminPayments";
import AdminWalletManagement from "@/pages/AdminWalletManagement";
import AdminEvents from "@/pages/AdminEvents";
import AdminBrandSettings from "@/pages/AdminBrandSettings";
import AdminChatSettings from "@/pages/AdminChatSettings";
import AdminBankSettings from "@/pages/AdminBankSettings";
import AdminReports from "@/pages/AdminReports";
import AgentAgreement from "@/pages/AgentAgreement";
import Checkout from "@/pages/Checkout";
import ReservationStatus from "@/pages/ReservationStatus";
import UserDetails from "@/pages/UserDetails";
import MyStudents from "./pages/MyStudents";
import Profile from "./pages/Profile";
import AuthForm from "./pages/AuthForm";
import ResetPassword from "./pages/ResetPassword.jsx";
import PostDetail from "./pages/PostDetail";
import StudyCanada from "@/pages/countries/StudyCanada";
import StudyNewZealand from "@/pages/countries/StudyNewZealand";
import StudyAustralia from "@/pages/countries/StudyAustralia";
import StudyIreland from "@/pages/countries/StudyIreland";
import StudyGermany from "@/pages/countries/StudyGermany";
import StudyUnitedKingdom from "@/pages/countries/StudyUnitedKingdom";
import StudyUnitedStates from "@/pages/countries/StudyUnitedStates";
import Messages from "@/pages/Messages";


// --- Safe import of createPageUrl (with fallback if not exported) ---
import * as Utils from "@/utils";
const createPageUrl =
  (Utils && Utils.createPageUrl) ||
  ((label = "") =>
    label
      .toString()
      .trim()
      .replace(/\s+/g, "")         
      .replace(/[^\w/]/g, "")
      .toLowerCase()
  );



export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Index → Home */}
        <Route index element={<Directory />} />
        <Route path="welcome" element={<Welcome />} />
        <Route path="messages" element={<Messages />} />

        {/* Public site */}
        <Route path="directory" element={<Directory />} />
        <Route path="events" element={<EventsPage />} />


        <Route path="login" element={<AuthForm />} />
        {/* normalized to relative (no leading slash) */}
        <Route path="resetpassword" element={<ResetPassword />} />
        <Route path="postdetail" element={<PostDetail />} />

        {/* Countries (MSM-style) */}
        <Route path={createPageUrl("StudyCanada")} element={<StudyCanada />} />
        <Route path={createPageUrl("StudyNewZealand")} element={<StudyNewZealand />} />
        <Route path={createPageUrl("StudyAustralia")} element={<StudyAustralia />} />
        <Route path={createPageUrl("StudyIreland")} element={<StudyIreland />} />
        <Route path={createPageUrl("StudyGermany")} element={<StudyGermany />} />
        <Route path={createPageUrl("StudyUnitedKingdom")} element={<StudyUnitedKingdom />} />
        <Route path={createPageUrl("StudyUnitedStates")} element={<StudyUnitedStates />} />

        {/* Authenticated shell entry points */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="profile" element={<Profile />} />

        {/* Public extras used by Layout */}
        <Route path="tutors" element={<Tutors />} />
        <Route path="agentagreement" element={<AgentAgreement />} />

        {/* Events utilities */}
        <Route path="reservationstatus" element={<ReservationStatus />} />

        {/* Agent / Student discovery */}
        <Route path="findagent" element={<FindAgent />} />
        <Route path="myagent" element={<MyAgent />} />
        <Route path="mysessions" element={<MySessions />} />

        {/* Agent dashboard pages */}
        <Route path="agentleads" element={<AgentLeads />} />

        {/* Tutor dashboard pages */}
        <Route path="tutorstudents" element={<TutorStudents />} />
        <Route path="tutorsessions" element={<TutorSessions />} />
        <Route path="tutoravailability" element={<TutorAvailability />} />
        <Route path="tutordetails" element={<TutorDetails />} />
        <Route path="mystudents" element={<MyStudents />} />

        {/* School dashboard pages */}
        <Route path="schoolprofile" element={<SchoolProfile />} />
        <Route path="schoolleads" element={<SchoolLeads />} />
        <Route path="schooldetails" element={<SchoolDetails />} />

        {/* Vendor dashboard pages */}
        <Route path="myservices" element={<MyServices />} />

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
        <Route path="adminbrandsettings" element={<AdminBrandSettings />} />
        <Route path="adminchatsettings" element={<AdminChatSettings />} />
        <Route path="adminbanksettings" element={<AdminBankSettings />} />
        <Route path="adminreports" element={<AdminReports />} />
        {/* Payments / orders */}
        <Route path="checkout" element={<Checkout />} />

        {/* User utilities */}
        <Route path="userdetails" element={<UserDetails />} />
      </Route>
    </Routes>
  );
}
