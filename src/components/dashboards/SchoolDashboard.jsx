// src/pages/SchoolDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { School, Reservation, User } from '@/api/entities';
import { Building, Users, BookOpen, DollarSign, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
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

export default function SchoolDashboard({ user }) {
  const ownerId = user?.id || user?.uid || null;

  const [stats, setStats] = useState({
    totalPrograms: 0,
    totalLeads: 0,
    confirmedReservations: 0,
    totalRevenue: 0,
    availableSeats: 0,
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permError, setPermError] = useState(false);

  useEffect(() => {
    if (!ownerId) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        // 1) Find the school owned by this user
        const schoolRows = await School.filter({ user_id: ownerId });
        if (!schoolRows?.length) {
          if (!cancelled) setLoading(false);
          return;
        }
        const s = schoolRows[0];
        if (cancelled) return;
        setSchool(s);

        // 2) Programs are often embedded on the school record
        const programs = Array.isArray(s.programs) ? s.programs : [];
        const availableSeats = programs.reduce(
          (sum, p) => sum + (p.available_seats ?? p.open_seats ?? 0),
          0
        );

        // 3) Get reservations/leads for this school
        let reservations = [];
        try {
          reservations = await Reservation.filter({ school_id: s.id });
        } catch (e) {
          // If rules block us, show a friendly note on the page
          console.error("Reservations read error:", e);
          setPermError(true);
          reservations = [];
        }

        // Sort newest first and keep just a few for the widget
        const sorted = [...reservations].sort((a, b) => {
          const da = new Date(a.created_at || a.created_date || 0).getTime();
          const db = new Date(b.created_at || b.created_date || 0).getTime();
          return db - da;
        });
        const recent = sorted.slice(0, 5);

        // Try to enrich with student names, but ignore failures
        try {
          const studentIds = [...new Set(recent.map(r => r.student_id).filter(Boolean))];
          if (studentIds.length) {
            // Your entity helper may support "in" queries; if not, do nothing.
            const users = await User.filter({ id: { $in: studentIds } });
            const map = Object.fromEntries(users.map(u => [u.id, u]));
            recent.forEach(r => { r.student = map[r.student_id]; });
          }
        } catch (e) {
          // Not fatal; we can still render using contact_name / student_name
          console.warn("User lookup skipped:", e);
        }

        const confirmed = reservations.filter(r => r.status === 'confirmed');
        if (cancelled) return;
        setRecentLeads(recent);
        setStats({
          totalPrograms: programs.length,
          totalLeads: reservations.length,
          confirmedReservations: confirmed.length,
          totalRevenue: confirmed.reduce((sum, r) => sum + (r.amount_usd ?? r.amount ?? 0), 0),
          availableSeats,
        });
      } catch (e) {
        console.error("Error loading dashboard data:", e);
        if (e?.code === 'permission-denied') setPermError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ownerId]);

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">School Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Welcome to {school?.name || 'your school'}
          </p>
        </div>
        <Badge
          variant={school?.verification_status === 'verified' ? 'default' : 'secondary'}
          className={`self-start sm:self-center ${
            school?.verification_status === 'verified'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {school?.verification_status || 'pending'}
        </Badge>
      </div>

      {permError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800">
          Heads up, some data couldn’t be loaded due to Firestore permissions. Apply the rule
          changes I listed above and refresh.
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Programs"
          value={stats.totalPrograms}
          icon={<BookOpen className="h-6 w-6 text-blue-200" />}
          to={createPageUrl('SchoolPrograms')}
          color="text-blue-600"
        />
        <StatCard
          title="Leads"
          value={stats.totalLeads}
          icon={<Users className="h-6 w-6 text-green-200" />}
          to={createPageUrl('SchoolLeads')}
          color="text-green-600"
        />
        <StatCard
          title="Reservations"
          value={stats.confirmedReservations}
          icon={<Calendar className="h-6 w-6 text-purple-200" />}
          to={createPageUrl('SchoolLeads')}
          color="text-purple-600"
        />
        <StatCard
          title="Open Seats"
          value={stats.availableSeats}
          icon={<TrendingUp className="h-6 w-6 text-orange-200" />}
          to={createPageUrl('SchoolPrograms')}
          color="text-orange-600"
        />
        <StatCard
          title="Revenue"
          value={`$${Number(stats.totalRevenue || 0).toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6 text-emerald-200" />}
          color="text-emerald-600"
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Student Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeads.length > 0 ? (
              <div className="space-y-3">
                {recentLeads.map((lead) => {
                  const created = lead.created_at || lead.created_date;
                  const when = created ? format(new Date(created), 'MMM dd, yyyy') : '';
                  const name =
                    lead.student?.full_name || lead.contact_name || lead.student_name || 'Unknown Student';
                  return (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-gray-600">{lead.program_name}</p>
                        {when && <p className="text-xs text-gray-500">{when}</p>}
                      </div>
                      <Badge variant={lead.status === 'confirmed' ? 'default' : 'secondary'}>
                        {lead.status || 'pending'}
                      </Badge>
                    </div>
                  );
                })}
                <Link to={createPageUrl('SchoolLeads')}>
                  <Button variant="outline" className="w-full">
                    View All Leads <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No leads yet</p>
                <p className="text-sm text-gray-500">Student interest will appear here</p>
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
              title="Manage Programs"
              description="Add, edit, or remove academic programs"
              to={createPageUrl('SchoolPrograms')}
              icon={<BookOpen className="w-5 h-5 text-blue-500" />}
            />
            <QuickLink
              title="Update Profile"
              description="Edit school information and media"
              to={createPageUrl('SchoolProfile')}
              icon={<Building className="w-5 h-5 text-purple-500" />}
            />
            <QuickLink
              title="View Leads"
              description="See all student inquiries and reservations"
              to={createPageUrl('SchoolLeads')}
              icon={<Users className="w-5 h-5 text-green-500" />}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
