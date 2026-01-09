import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Case, TutoringSession, Reservation } from "@/api/entities";
import {
  GraduationCap,
  BookOpen,
  FileText,
  Calendar,
  Users,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

import ProfileCompletionBanner from "../profile/ProfileCompletionBanner";
import ActionBlocker from "../profile/ActionBlocker";
import { getProfileCompletionData } from "../profile/ProfileCompletionBanner";

/* -------------------- SAFE HELPERS (date & arrays) -------------------- */
const toValidDate = (v) => {
  // Firestore Timestamp?
  if (v && typeof v === "object") {
    if (typeof v.toDate === "function") {
      const d = v.toDate();
      return isNaN(d?.getTime()) ? null : d;
    }
    if (typeof v.seconds === "number") {
      const d = new Date(v.seconds * 1000);
      return isNaN(d?.getTime()) ? null : d;
    }
  }
  // number (epoch ms or seconds)
  if (typeof v === "number") {
    const d = new Date(v > 1e12 ? v : v * 1000);
    return isNaN(d?.getTime()) ? null : d;
  }
  // string (ISO or epoch-in-string)
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      const d = new Date(n > 1e12 ? n : n * 1000);
      return isNaN(d?.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d?.getTime()) ? null : d;
  }
  return null;
};

const fmt = (v, fmtStr = "MMM dd, h:mm a") => {
  const d = toValidDate(v);
  if (!d) return "—";
  try {
    return format(d, fmtStr);
  } catch {
    return d.toLocaleString();
  }
};

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
/* --------------------------------------------------------------------- */

/* ✅ SUBSCRIPTION LOGIC (based on your real user doc fields)
   - subscription_active (boolean)
   - subscription_status (string e.g. "skipped", "active")
*/
function isSubscribedUser(u) {
  if (!u) return false;
  if (u.subscription_active === true) return true;

  const status = String(u.subscription_status || "").toLowerCase().trim();
  const ok = new Set(["active", "paid", "trialing"]);
  return ok.has(status);
}

const SubscribeBanner = ({ to, user }) => {
  const status = String(user?.subscription_status || "").toLowerCase().trim();
  const message =
    status === "skipped"
      ? "You skipped subscription. Subscribe to unlock full student features and premium access."
      : status === "expired"
      ? "Your subscription expired. Renew to regain full student features and premium access."
      : "You’re not subscribed yet. Subscribe to unlock full student features and premium access.";

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <CreditCard className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-red-800">Subscription required</p>
          <p className="text-sm text-red-700">{message}</p>
        </div>
      </div>

      <Link to={to}>
        <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
          Subscribe Now
        </Button>
      </Link>
    </div>
  );
};

const StatCard = ({ title, value, icon, to, color = "text-blue-600", subtitle }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <p className="text-gray-600">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon}
      </div>
      {to && (
        <Link to={to}>
          <Button variant="ghost" size="sm" className="w-full mt-3">
            View Details <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
    </CardContent>
  </Card>
);

const QuickLink = ({ title, description, to, icon }) => (
  <Link to={to}>
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div>{icon}</div>
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

export default function StudentDashboard({ user }) {
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    visaApplications: 0,
    schoolReservations: 0,
    sessionCredits: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [visaCases, setVisaCases] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAgent, setHasAgent] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState({ isComplete: true });

  // ✅ subscription based on your user doc fields
  const isSubscribed = useMemo(() => isSubscribedUser(user), [user]);
  // ✅ change this if your actual page name is different
  const subscribeUrl = useMemo(() => createPageUrl("Pricing"), []);

  useEffect(() => {
    let alive = true;

    const loadDashboardData = async () => {
      // 🔑 Use uid (auth), with fallbacks
      const userId = user?.uid || user?.id || user?.user_id;

      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const [sessions, casesByStudent, casesByUser, userReservations] =
          await Promise.all([
            TutoringSession.filter({ student_id: userId }),
            Case.filter({ student_id: userId }),
            Case.filter({ user_id: userId }),
            Reservation.filter({ student_id: userId }),
          ]);

        const completion = getProfileCompletionData(user, null);
        if (!alive) return;
        setProfileCompletion(completion);

        const now = Date.now();
        const upcoming = arr(sessions)
          .filter((s) => s?.status === "scheduled")
          .filter((s) => {
            const d = toValidDate(s?.scheduled_date);
            return d ? d.getTime() > now : false;
          })
          .slice(0, 5);

        // Merge cases from both queries and dedupe by id
        const mergedCases = [...arr(casesByStudent), ...arr(casesByUser)]
          .filter((c) => !!c?.id)
          .reduce((acc, c) => {
            if (!acc.find((x) => x.id === c.id)) acc.push(c);
            return acc;
          }, []);

        if (!alive) return;

        setStats({
          totalSessions: arr(sessions).length,
          upcomingSessions: arr(upcoming).length,
          visaApplications: mergedCases.length,
          schoolReservations: arr(userReservations).length,
          sessionCredits: user.session_credits || 0,
        });

        setUpcomingSessions(upcoming);
        setVisaCases(mergedCases.slice(0, 3));
        setReservations(arr(userReservations).slice(0, 3));

        setHasAgent(!!(user.assigned_agent_id || user.agent_id));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      alive = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  const getVisaProgress = (caseData) => {
    const list = arr(caseData?.checklist);
    if (list.length === 0) return 0;
    const completed = list.filter((item) => item?.status === "verified").length;
    return (completed / list.length) * 100;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome, {user?.full_name?.split(" ")[0] || "Student"}
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Your study abroad journey dashboard
          </p>
        </div>
        <Badge
          variant={user?.onboarding_completed ? "default" : "secondary"}
          className={`self-start sm:self-center ${
            user?.onboarding_completed
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {user?.onboarding_completed ? "Verified" : "Pending Verification"}
        </Badge>
      </div>

      {/* ✅ Subscribe signage (only if NOT subscribed) */}
      {!isSubscribed && <SubscribeBanner to={subscribeUrl} user={user} />}

      {/* Profile Completion Banner */}
      <ProfileCompletionBanner user={user} relatedEntity={null} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tutoring"
          value={stats.totalSessions}
          icon={<BookOpen className="h-6 w-6 text-purple-200" />}
          to={createPageUrl("MySessions")}
          color="text-purple-600"
          subtitle={`${stats.sessionCredits} credits`}
        />
        <StatCard
          title="Applications"
          value={stats.schoolReservations}
          icon={<GraduationCap className="h-6 w-6 text-blue-200" />}
          to={createPageUrl("Schools")}
          color="text-blue-600"
          subtitle="School reservations"
        />
        <StatCard
          title="Visa Cases"
          value={stats.visaApplications}
          icon={<FileText className="h-6 w-6 text-emerald-200" />}
          to={createPageUrl("VisaRequests")}
          color="text-emerald-600"
        />
        <StatCard
          title="Upcoming"
          value={stats.upcomingSessions}
          icon={<Calendar className="h-6 w-6 text-orange-200" />}
          to={createPageUrl("MySessions")}
          color="text-orange-600"
          subtitle="Sessions"
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Upcoming Sessions - Block if profile incomplete */}
        <ActionBlocker
          isBlocked={!profileCompletion.isComplete}
          title="Complete Profile to Book Sessions"
          message="Finish your profile to start booking tutoring sessions."
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {arr(upcomingSessions).length > 0 ? (
                <div className="space-y-3">
                  {arr(upcomingSessions).map((session) => (
                    <div
                      key={session?.id || Math.random()}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{session?.subject || "Session"}</p>
                        <p className="text-sm text-gray-600">{fmt(session?.scheduled_date)}</p>
                      </div>
                      <Badge variant="outline">{session?.duration ?? "—"} min</Badge>
                    </div>
                  ))}
                  <Link to={createPageUrl("MySessions")}>
                    <Button variant="outline" className="w-full mt-2">
                      View All <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No upcoming sessions</p>
                  <Link to={createPageUrl("Tutors")}>
                    <Button size="sm" className="mt-2">
                      Find a Tutor
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </ActionBlocker>

        {/* Visa Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Visa Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {arr(visaCases).length > 0 ? (
              <div className="space-y-4">
                {arr(visaCases).map((caseData) => {
                  const progress = getVisaProgress(caseData);
                  return (
                    <div key={caseData?.id || Math.random()} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{caseData?.case_type || "Visa Case"}</p>
                        <Badge
                          variant={caseData?.status === "Approved" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {caseData?.status || "—"}
                        </Badge>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-gray-500">{Math.round(progress)}% complete</p>
                    </div>
                  );
                })}
                <Link to={createPageUrl("VisaRequests")}>
                  <Button variant="outline" className="w-full">
                    View All <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No visa applications</p>
                <Link to={createPageUrl("VisaPackages")}>
                  <Button variant="outline" size="sm" className="mt-2">
                    Explore Packages
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActionBlocker
              isBlocked={!profileCompletion.isComplete}
              title="Profile Required"
              message="Complete your profile to access all features."
            >
              <QuickLink
                title="Find Schools"
                description="Discover programs that match your goals"
                to={createPageUrl("Schools")}
                icon={<GraduationCap className="w-5 h-5 text-blue-500" />}
              />
              <QuickLink
                title="Book Tutoring"
                description="Get help with test preparation"
                to={createPageUrl("Tutors")}
                icon={<BookOpen className="w-5 h-5 text-purple-500" />}
              />
              <QuickLink
                title="Apply for Visa"
                description="Get professional visa assistance"
                to={createPageUrl("VisaPackages")}
                icon={<FileText className="w-5 h-5 text-emerald-500" />}
              />
            </ActionBlocker>

            {hasAgent ? (
              <QuickLink
                title="Contact My Agent"
                description="Speak with your assigned agent"
                to={createPageUrl("MyAgent")}
                icon={<Users className="w-5 h-5 text-orange-500" />}
              />
            ) : (
              <QuickLink
                title="Find an Agent"
                description="Get expert guidance"
                to={createPageUrl("FindAgent")}
                icon={<Users className="w-5 h-5 text-orange-500" />}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent School Reservations */}
      {arr(reservations).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent School Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {arr(reservations).map((reservation) => (
                <div
                  key={reservation?.id || Math.random()}
                  className="p-4 border rounded-lg bg-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{reservation?.school_name || "School"}</h4>
                    <Badge
                      variant={reservation?.status === "confirmed" ? "default" : "secondary"}
                    >
                      {reservation?.status || "—"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {reservation?.program_name || "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fmt(reservation?.created_date, "MMM dd, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps Guidance */}
      {Array.isArray(user?.purchased_packages) && user.purchased_packages.length === 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-500 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Ready to start your journey?
                </h3>
                <p className="text-gray-600 mb-4">
                  Complete these steps to make the most of GreenPass:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Account created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-600">Choose a visa package</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-600">Reserve school programs</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link to={createPageUrl("VisaPackages")}>
                    <Button size="sm">Explore Visa Packages</Button>
                  </Link>
                  <Link to={createPageUrl("Schools")}>
                    <Button variant="outline" size="sm">
                      Browse Schools
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
