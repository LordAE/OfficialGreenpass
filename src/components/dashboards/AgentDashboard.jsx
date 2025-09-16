
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Agent } from '@/api/entities';
import { Case } from '@/api/entities';
import { User } from '@/api/entities';
import { Reservation } from '@/api/entities';
import { Briefcase, Users, FileText, DollarSign, TrendingUp, Clock, ArrowRight, MessageCircle, UserPlus } from 'lucide-react';
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

const QuickLink = ({ title, description, to, icon, color = "text-blue-500" }) => (
  <Link to={to}>
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={color}>{icon}</div>
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

export default function AgentDashboard({ user }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCases: 0,
    totalEarnings: 0,
    pendingPayout: 0,
    approvedCases: 0,
    thisMonthReferrals: 0,
    commissionRate: 10
  });
  const [recentCases, setRecentCases] = useState([]);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState({ isComplete: true });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [agentData, cases, students, reservations] = await Promise.all([
          Agent.filter({ user_id: user.id }),
          Case.filter({ agent_id: user.id }, '-created_date'),
          User.filter({ referred_by_agent_id: user.id }),
          Reservation.filter({ status: 'confirmed' })
        ]);

        const agentRecord = agentData.length > 0 ? agentData[0] : null;
        setAgent(agentRecord);

        // Check profile completion
        const completion = getProfileCompletionData(user, agentRecord);
        setProfileCompletion(completion);

        // Filter reservations for this agent's students
        const agentReservations = reservations.filter(r =>
          students.some(s => s.id === r.student_id)
        );

        const now = new Date();
        const thisMonth = students.filter(s => {
          const createdDate = new Date(s.created_date);
          return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
        });

        const totalEarnings = agentReservations.reduce((sum, r) =>
          sum + (r.amount_usd * (agentRecord?.commission_rate || 0.1)), 0
        ) + (cases.filter(c => c.status === 'Approved').length * 500); // Base visa commission

        setStats({
          totalStudents: students.length,
          activeCases: cases.filter(c => !['Approved', 'Rejected'].includes(c.status)).length,
          totalEarnings: totalEarnings,
          pendingPayout: agentRecord?.pending_payout || 0,
          approvedCases: cases.filter(c => c.status === 'Approved').length,
          thisMonthReferrals: thisMonth.length,
          commissionRate: (agentRecord?.commission_rate || 0.1) * 100
        });

        setRecentCases(cases.slice(0, 5));
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Your education agency portal</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge variant={agent?.verification_status === 'verified' ? 'default' : 'secondary'} className={
            agent?.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }>
            {agent?.verification_status || 'pending'}
          </Badge>
          <Badge variant="outline">
            {stats.commissionRate}% Commission
          </Badge>
        </div>
      </div>

      {/* Profile Completion Banner */}
      <ProfileCompletionBanner user={user} relatedEntity={agent} />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Students"
          value={stats.totalStudents}
          icon={<Users className="h-6 w-6 text-blue-200" />}
          to={createPageUrl('MyStudents')}
          color="text-blue-600"
          subtitle="Total referred students"
        />
        <StatCard
          title="Active Cases"
          value={stats.activeCases}
          icon={<FileText className="h-6 w-6 text-purple-200" />}
          to={createPageUrl('VisaCases')}
          color="text-purple-600"
          subtitle="Visa cases in progress"
        />
        <StatCard
          title="Total Earnings"
          value={`$${stats.totalEarnings.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6 text-green-200" />}
          to={createPageUrl('AgentEarnings')}
          color="text-green-600"
          subtitle="Lifetime commissions"
        />
        <StatCard
          title="Pending Payout"
          value={`$${stats.pendingPayout.toFixed(2)}`}
          icon={<TrendingUp className="h-6 w-6 text-emerald-200" />}
          to={createPageUrl('AgentEarnings')}
          color="text-emerald-600"
          subtitle="Ready for withdrawal"
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Visa Cases</CardTitle>
            </CardHeader>
            <CardContent>
              {recentCases.length > 0 ? (
                <div className="space-y-3">
                  {recentCases.map(caseData => (
                    <div key={caseData.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{caseData.case_type}</p>
                        <p className="text-sm text-gray-600">Case #{caseData.id?.slice(-6)}</p>
                        <p className="text-xs text-gray-500">{format(new Date(caseData.created_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <Badge variant={caseData.status === 'Approved' ? 'default' : 'secondary'}>
                        {caseData.status}
                      </Badge>
                    </div>
                  ))}
                  <Link to={createPageUrl('VisaCases')}>
                    <Button variant="outline" className="w-full">
                      View All Cases <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No active cases</p>
                  <p className="text-sm text-gray-500">Cases will appear when students purchase packages</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ActionBlocker
          isBlocked={!profileCompletion.isComplete}
          title="Complete Profile for Full Access"
          message="Finish your agent profile to access all commission features."
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickLink
                title="View My Students"
                description="See all referred students and their progress"
                to={createPageUrl('MyStudents')}
                icon={<Users className="w-5 h-5" />}
                color="text-blue-500"
              />
              <QuickLink
                title="Track Earnings"
                description="View commissions and request payouts"
                to={createPageUrl('AgentEarnings')}
                icon={<DollarSign className="w-5 h-5" />}
                color="text-green-500"
              />
              <QuickLink
                title="Manage Cases"
                description="Monitor visa application progress"
                to={createPageUrl('VisaCases')}
                icon={<FileText className="w-5 h-5" />}
                color="text-purple-500"
              />
              <QuickLink
                title="Find Leads"
                description="Discover new potential students"
                to={createPageUrl('AgentLeads')}
                icon={<UserPlus className="w-5 h-5" />}
                color="text-orange-500"
              />
            </CardContent>
          </Card>
        </ActionBlocker>
      </div>

      {/* Performance Highlights */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.thisMonthReferrals}</div>
            <p className="text-gray-600">New Referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {recentCases.length > 0 ? ((stats.approvedCases / recentCases.length) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-gray-600">Visa Approvals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <code className="text-xl sm:text-2xl font-bold bg-gray-100 px-4 py-2 rounded">
                {agent?.referral_code || 'AG2025001'}
              </code>
              <p className="text-sm text-gray-600 mt-2">Share this code with students</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
