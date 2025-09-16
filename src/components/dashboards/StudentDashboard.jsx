
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Case } from '@/api/entities';
import { TutoringSession } from '@/api/entities';
import { Reservation } from '@/api/entities';
import { User } from '@/api/entities';
import { GraduationCap, BookOpen, FileText, Calendar, Users, ArrowRight, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

import ProfileCompletionBanner from '../profile/ProfileCompletionBanner';
import ActionBlocker from '../profile/ActionBlocker';
import { getProfileCompletionData } from '../profile/ProfileCompletionBanner';

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
    sessionCredits: 0
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [visaCases, setVisaCases] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAgent, setHasAgent] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState({ isComplete: true });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [sessions, cases, userReservations] = await Promise.all([
          TutoringSession.filter({ student_id: user.id }, '-scheduled_date'),
          Case.filter({ student_id: user.id }, '-created_date'),
          Reservation.filter({ student_id: user.id }, '-created_date')
        ]);

        // Check profile completion
        const completion = getProfileCompletionData(user, null);
        setProfileCompletion(completion);

        const now = new Date();
        const upcoming = sessions.filter(s => 
          s.status === 'scheduled' && new Date(s.scheduled_date) > now
        ).slice(0, 5);

        setStats({
          totalSessions: sessions.length,
          upcomingSessions: upcoming.length,
          visaApplications: cases.length,
          schoolReservations: userReservations.length,
          sessionCredits: user.session_credits || 0
        });

        setUpcomingSessions(upcoming);
        setVisaCases(cases.slice(0, 3));
        setReservations(userReservations.slice(0, 3));
        setHasAgent(!!user.assigned_agent_id);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  const getVisaProgress = (caseData) => {
    if (!caseData.checklist || caseData.checklist.length === 0) return 0;
    const completed = caseData.checklist.filter(item => item.status === 'verified').length;
    return (completed / caseData.checklist.length) * 100;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome, {user.full_name?.split(' ')[0] || 'Student'}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Your study abroad journey dashboard</p>
        </div>
        <Badge variant={user.onboarding_completed ? 'default' : 'secondary'} className={
          `self-start sm:self-center ${user.onboarding_completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`
        }>
          {user.onboarding_completed ? 'Verified' : 'Pending Verification'}
        </Badge>
      </div>
      
      {/* Profile Completion Banner */}
      <ProfileCompletionBanner user={user} relatedEntity={null} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Tutoring" 
          value={stats.totalSessions} 
          icon={<BookOpen className="h-6 w-6 text-purple-200" />} 
          to={createPageUrl('MySessions')}
          color="text-purple-600"
          subtitle={`${stats.sessionCredits} credits`}
        />
        <StatCard 
          title="Applications" 
          value={stats.schoolReservations} 
          icon={<GraduationCap className="h-6 w-6 text-blue-200" />} 
          to={createPageUrl('Schools')}
          color="text-blue-600"
          subtitle="School reservations"
        />
        <StatCard 
          title="Visa Cases" 
          value={stats.visaApplications} 
          icon={<FileText className="h-6 w-6 text-emerald-200" />} 
          to={createPageUrl('VisaRequests')}
          color="text-emerald-600"
        />
        <StatCard 
          title="Upcoming" 
          value={stats.upcomingSessions} 
          icon={<Calendar className="h-6 w-6 text-orange-200" />} 
          to={createPageUrl('MySessions')}
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
              {upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{session.subject}</p>
                        <p className="text-sm text-gray-600">{format(new Date(session.scheduled_date), 'MMM dd, h:mm a')}</p>
                      </div>
                      <Badge variant="outline">{session.duration} min</Badge>
                    </div>
                  ))}
                  <Link to={createPageUrl('MySessions')}>
                    <Button variant="outline" className="w-full mt-2">
                      View All <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No upcoming sessions</p>
                  <Link to={createPageUrl('Tutors')}>
                    <Button size="sm" className="mt-2">Find a Tutor</Button>
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
            {visaCases.length > 0 ? (
              <div className="space-y-4">
                {visaCases.map(caseData => {
                  const progress = getVisaProgress(caseData);
                  return (
                    <div key={caseData.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{caseData.case_type}</p>
                        <Badge variant={caseData.status === 'Approved' ? 'default' : 'secondary'} className="text-xs">
                          {caseData.status}
                        </Badge>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-gray-500">{Math.round(progress)}% complete</p>
                    </div>
                  );
                })}
                <Link to={createPageUrl('VisaRequests')}>
                  <Button variant="outline" className="w-full">
                    View All <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No visa applications</p>
                <Link to={createPageUrl('VisaPackages')}>
                  <Button variant="outline" size="sm" className="mt-2">Explore Packages</Button>
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
                to={createPageUrl('Schools')}
                icon={<GraduationCap className="w-5 h-5 text-blue-500" />}
              />
              <QuickLink
                title="Book Tutoring"
                description="Get help with test preparation"
                to={createPageUrl('Tutors')}
                icon={<BookOpen className="w-5 h-5 text-purple-500" />}
              />
              <QuickLink
                title="Apply for Visa"
                description="Get professional visa assistance"
                to={createPageUrl('VisaPackages')}
                icon={<FileText className="w-5 h-5 text-emerald-500" />}
              />
            </ActionBlocker>
            {hasAgent ? (
              <QuickLink
                title="Contact My Agent"
                description="Speak with your assigned agent"
                to={createPageUrl('MyAgent')}
                icon={<Users className="w-5 h-5 text-orange-500" />}
              />
            ) : (
              <QuickLink
                title="Find an Agent"
                description="Get expert guidance"
                to={createPageUrl('FindAgent')}
                icon={<Users className="w-5 h-5 text-orange-500" />}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent School Reservations */}
      {reservations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent School Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {reservations.map(reservation => (
                <div key={reservation.id} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{reservation.school_name}</h4>
                    <Badge variant={reservation.status === 'confirmed' ? 'default' : 'secondary'}>
                      {reservation.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{reservation.program_name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(reservation.created_date), 'MMM dd, yyyy')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps Guidance */}
      {user.purchased_packages && user.purchased_packages.length === 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-500 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Ready to start your journey?</h3>
                <p className="text-gray-600 mb-4">Complete these steps to make the most of GreenPass:</p>
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
                  <Link to={createPageUrl('VisaPackages')}>
                    <Button size="sm">Explore Visa Packages</Button>
                  </Link>
                  <Link to={createPageUrl('Schools')}>
                    <Button variant="outline" size="sm">Browse Schools</Button>
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
