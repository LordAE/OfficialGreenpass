
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TutoringSession } from '@/api/entities';
import { Wallet } from '@/api/entities';
import { User } from '@/api/entities';
import { Tutor } from '@/api/entities';
import { Calendar, Users, BarChart3, Clock, ArrowRight, DollarSign, BookOpen, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon, to, color = "text-blue-600" }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <p className="text-gray-600">{title}</p>
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
          {icon}
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

export default function TutorDashboard({ user }) {
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    totalEarnings: 0,
    totalStudents: 0,
    averageRating: 0,
    availableBalance: 0
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [sessions, wallet, tutorData] = await Promise.all([
          TutoringSession.filter({ tutor_id: user.id }, '-scheduled_date'),
          Wallet.filter({ user_id: user.id }),
          Tutor.filter({ user_id: user.id })
        ]);

        const now = new Date();
        const upcoming = sessions.filter(s => 
          s.status === 'scheduled' && new Date(s.scheduled_date) > now
        ).slice(0, 5);
        
        const uniqueStudents = [...new Set(sessions.map(s => s.student_id))];
        const completedWithRating = sessions.filter(s => s.status === 'completed' && s.student_rating);
        const avgRating = completedWithRating.length > 0 
          ? completedWithRating.reduce((sum, s) => sum + s.student_rating, 0) / completedWithRating.length 
          : 0;

        setStats({
          totalSessions: sessions.length,
          upcomingSessions: sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduled_date) > now).length,
          completedSessions: sessions.filter(s => s.status === 'completed').length,
          totalEarnings: wallet.length > 0 ? wallet[0].total_earned || 0 : 0,
          totalStudents: uniqueStudents.length,
          averageRating: avgRating,
          availableBalance: wallet.length > 0 ? wallet[0].balance_usd || 0 : 0
        });

        setUpcomingSessions(upcoming);
        setTutorProfile(tutorData.length > 0 ? tutorData[0] : null);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [user.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tutor Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Welcome back, {user.full_name}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge variant={tutorProfile?.verification_status === 'verified' ? 'default' : 'secondary'} className={
            tutorProfile?.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }>
            {tutorProfile?.verification_status || 'pending'}
          </Badge>
          {stats.averageRating > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
              {stats.averageRating.toFixed(1)}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Sessions" 
          value={stats.totalSessions} 
          icon={<Calendar className="h-6 w-6 text-purple-200" />} 
          to={createPageUrl('TutorSessions')}
          color="text-purple-600"
        />
        <StatCard 
          title="Students" 
          value={stats.totalStudents} 
          icon={<Users className="h-6 w-6 text-blue-200" />} 
          to={createPageUrl('TutorStudents')}
          color="text-blue-600"
        />
        <StatCard 
          title="Total Earnings" 
          value={`$${stats.totalEarnings.toFixed(2)}`} 
          icon={<DollarSign className="h-6 w-6 text-green-200" />} 
          to={createPageUrl('TutorEarnings')}
          color="text-green-600"
        />
        <StatCard 
          title="Available" 
          value={`$${stats.availableBalance.toFixed(2)}`} 
          icon={<TrendingUp className="h-6 w-6 text-emerald-200" />} 
          to={createPageUrl('TutorEarnings')}
          color="text-emerald-600"
        />
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{session.subject}</p>
                      <p className="text-sm text-gray-600">{format(new Date(session.scheduled_date), 'MMM dd, h:mm a')}</p>
                      <p className="text-xs text-gray-500">{session.duration} min • ${session.price}</p>
                    </div>
                    <Badge>Scheduled</Badge>
                  </div>
                ))}
                <Link to={createPageUrl('TutorSessions')}>
                  <Button variant="outline" className="w-full">
                    View All Sessions <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No upcoming sessions</p>
                <p className="text-sm text-gray-500">Sessions will appear here when students book</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickLink
              title="Set Availability"
              description="Update your teaching schedule"
              to={createPageUrl('TutorAvailability')}
              icon={<Clock className="w-5 h-5 text-purple-500" />}
            />
            <QuickLink
              title="View Earnings"
              description="Check your balance and request payouts"
              to={createPageUrl('TutorEarnings')}
              icon={<DollarSign className="w-5 h-5 text-green-500" />}
            />
            <QuickLink
              title="My Students"
              description="See all your current and past students"
              to={createPageUrl('TutorStudents')}
              icon={<Users className="w-5 h-5 text-blue-500" />}
            />
            <QuickLink
              title="Update Profile"
              description="Edit your professional profile"
              to={createPageUrl('Profile')}
              icon={<BookOpen className="w-5 h-5 text-orange-500" />}
            />
          </CardContent>
        </Card>
      </div>

      {stats.upcomingSessions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Focus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
              <Calendar className="w-8 h-8 text-purple-600 shrink-0" />
              <div className="flex-grow">
                <h3 className="font-semibold">You have {stats.upcomingSessions} upcoming sessions</h3>
                <p className="text-gray-600 text-sm">Prepare your materials and check your connection.</p>
              </div>
              <Link to={createPageUrl('TutorSessions')} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">View Sessions</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
