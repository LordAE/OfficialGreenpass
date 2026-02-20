// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import ProgramDetails from "@/pages/ProgramDetails";
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
import AdminSubscription from "./pages/AdminSubscription";
import EventDetailsPage from "./pages/EventDetails";
import Connections from "./pages/Connections";
import ViewProfile from "./pages/ViewProfile";
import AuthBridge from "./pages/AuthBridge";

/* ---------- Firebase auth/profile (lightweight for route-guards) ---------- */
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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

/* =========================
   ✅ Auth + Role Guards
========================= */

function normalizeRole(u) {
  return String(u?.user_type || u?.role || "student").toLowerCase();
}

function useCurrentUser() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setCurrentUser({ uid: fbUser.uid, ...snap.data() });
        } else {
          // If profile doc doesn't exist yet, still treat as authenticated (role defaults to student)
          setCurrentUser({ uid: fbUser.uid, user_type: "student" });
        }
      } catch (e) {
        // Fail safe: still allow auth shell, but role defaults
        setCurrentUser({ uid: fbUser.uid, user_type: "student" });
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { currentUser, loading };
}

function RequireAuth({ currentUser, loading, children }) {
  const location = useLocation();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function RequireRole({ currentUser, loading, allow, children }) {
  const location = useLocation();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location }} />;

  const role = normalizeRole(currentUser);
  const allowed = Array.isArray(allow) ? allow : [allow];

  if (!allowed.includes(role)) {
    // Prevent cross-role route access
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const { currentUser, loading } = useCurrentUser();

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Index → Home */}
        <Route index element={<Welcome />} />
        <Route path="welcome" element={<Welcome />} />

        {/* Public site */}
        <Route path="directory" element={<Directory />} />
        <Route path="auth-bridge" element={<AuthBridge />} />
        <Route path="events" element={<EventsPage />} />
        <Route path={createPageUrl("StudyCanada")} element={<StudyCanada />} />
        <Route path={createPageUrl("StudyNewZealand")} element={<StudyNewZealand />} />
        <Route path={createPageUrl("StudyAustralia")} element={<StudyAustralia />} />
        <Route path={createPageUrl("StudyIreland")} element={<StudyIreland />} />
        <Route path={createPageUrl("StudyGermany")} element={<StudyGermany />} />
        <Route path={createPageUrl("StudyUnitedKingdom")} element={<StudyUnitedKingdom />} />
        <Route path={createPageUrl("StudyUnitedStates")} element={<StudyUnitedStates />} />

        {/* Auth pages */}
        <Route path="login" element={<AuthForm />} />
        <Route path="resetpassword" element={<ResetPassword />} />

        {/* Public content */}
        <Route path="postdetail" element={<PostDetail />} />
        <Route path="eventdetails" element={<EventDetailsPage />} />
        <Route path="tutors" element={<Tutors />} />
        <Route path="tutordetails" element={<TutorDetails />} />

        {/* Authenticated (all roles) */}
        <Route
          path="dashboard"
          element={
            <RequireAuth currentUser={currentUser} loading={loading}>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="connections"
          element={
            <RequireAuth currentUser={currentUser} loading={loading}>
              <Connections />
            </RequireAuth>
          }
        />
        <Route
          path="view-profile/:uid"
          element={
            <RequireAuth currentUser={currentUser} loading={loading}>
              <ViewProfile />
            </RequireAuth>
          }
        />
        <Route
          path="messages"
          element={
            <RequireAuth currentUser={currentUser} loading={loading}>
              <Messages />
            </RequireAuth>
          }
        />
        <Route
          path="onboarding"
          element={
            <RequireAuth currentUser={currentUser} loading={loading}>
              <Onboarding />
            </RequireAuth>
          }
        />
        <Route
          path="profile"
          element={
            <RequireAuth currentUser={currentUser} loading={loading}>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="checkout"
          element={
            <RequireAuth currentUser={currentUser} loading={loading}>
              <Checkout />
            </RequireAuth>
          }
        />

        {/* Student-only */}
        <Route
          path="findagent"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["student"]}>
              <FindAgent />
            </RequireRole>
          }
        />
        <Route
          path="myagent"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["student"]}>
              <MyAgent />
            </RequireRole>
          }
        />
        <Route
          path="mysessions"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["student"]}>
              <MySessions />
            </RequireRole>
          }
        />
        <Route
          path="reservationstatus"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["student"]}>
              <ReservationStatus />
            </RequireRole>
          }
        />

        {/* Agent-only */}
        <Route
          path="agentagreement"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["agent"]}>
              <AgentAgreement />
            </RequireRole>
          }
        />
        <Route
          path="agentleads"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["agent"]}>
              <AgentLeads />
            </RequireRole>
          }
        />
        <Route
          path="mystudents"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["agent"]}>
              <MyStudents />
            </RequireRole>
          }
        />

        {/* Tutor-only */}
        <Route
          path="tutorstudents"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["tutor"]}>
              <TutorStudents />
            </RequireRole>
          }
        />
        <Route
          path="tutorsessions"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["tutor"]}>
              <TutorSessions />
            </RequireRole>
          }
        />
        <Route
          path="tutoravailability"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["tutor"]}>
              <TutorAvailability />
            </RequireRole>
          }
        />

        {/* School-only */}
        <Route
          path="schoolprofile"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["school"]}>
              <SchoolProfile />
            </RequireRole>
          }
        />
        <Route
          path="schoolleads"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["school"]}>
              <SchoolLeads />
            </RequireRole>
          }
        />
        <Route
          path="schooldetails"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["school"]}>
              <SchoolDetails />
            </RequireRole>
          }
        />

        <Route
          path="programdetails"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["school"]}>
              <ProgramDetails />
            </RequireRole>
          }
        />

{/* Vendor-only (kept for future; blocks student/tutor/agent/school/admin) */}
        <Route
          path="myservices"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["vendor"]}>
              <MyServices />
            </RequireRole>
          }
        />

        {/* Admin-only */}
        <Route
          path="usermanagement"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <UserManagement />
            </RequireRole>
          }
        />
        <Route
          path="adminschools"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminSchools />
            </RequireRole>
          }
        />
        <Route
          path="admininstitutions"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminInstitutions />
            </RequireRole>
          }
        />
        <Route
          path="adminagentassignments"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminAgentAssignments />
            </RequireRole>
          }
        />
        <Route
          path="verification"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <Verification />
            </RequireRole>
          }
        />
        <Route
          path="adminpaymentverification"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminPaymentVerification />
            </RequireRole>
          }
        />
        <Route
          path="adminpayments"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminPayments />
            </RequireRole>
          }
        />
        <Route
          path="adminwalletmanagement"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminWalletManagement />
            </RequireRole>
          }
        />
        <Route
          path="adminevents"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminEvents />
            </RequireRole>
          }
        />
        <Route
          path="adminbrandsettings"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminBrandSettings />
            </RequireRole>
          }
        />
        <Route
          path="adminchatsettings"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminChatSettings />
            </RequireRole>
          }
        />
        <Route
          path="adminbanksettings"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminBankSettings />
            </RequireRole>
          }
        />
        <Route
          path="adminreports"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminReports />
            </RequireRole>
          }
        />
        <Route
          path="subscriptions"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <AdminSubscription />
            </RequireRole>
          }
        />
        <Route
          path="userdetails"
          element={
            <RequireRole currentUser={currentUser} loading={loading} allow={["admin"]}>
              <UserDetails />
            </RequireRole>
          }
        />
      </Route>
    </Routes>
  );
}
