
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BarChart3, Calendar, Building, DollarSign, UserCheck, Loader2, Bell, TrendingUp, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

// Import the Master Seeder
import MasterDataSeeder from '../admin/MasterDataSeeder';

// Import entities properly
import { User } from '@/api/entities';
import { Payment } from '@/api/entities';
import { Event } from '@/api/entities';
import { School } from '@/api/entities';

// Modified StatCard component: removed 'to', 'color', 'trend' props, added 'linkTo'
const StatCard = ({ title, value, icon, linkTo }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <Link to={createPageUrl(linkTo)}>
        <p className="text-xs text-muted-foreground underline hover:text-primary">View details</p>
      </Link>
    </CardContent>
  </Card>
);

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: '$0',
    activeEvents: 0,
    pendingVerifications: 0,
    pendingPayments: 0,
    recentRegistrations: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user.user_type !== 'admin') {
          setError("Access denied. Admin privileges required.");
          setLoading(false);
          return;
        }

        let users = [];
        try {
          const usersResponse = await User.list();
          users = Array.isArray(usersResponse) ? usersResponse : [];
        } catch (err) {
          console.warn('Failed to fetch users:', err);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        let payments = [];
        try {
          const paymentsResponse = await Payment.list('-created_date', 50);
          payments = Array.isArray(paymentsResponse) ? paymentsResponse : [];
        } catch (err) {
          console.warn('Failed to fetch payments:', err);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        let events = [];
        try {
          const eventsResponse = await Event.list();
          events = Array.isArray(eventsResponse) ? eventsResponse : [];
        } catch (err) {
          console.warn('Failed to fetch events:', err);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        let verifications = [];
        try {
          const verificationsResponse = await School.filter({ verification_status: 'pending' });
          verifications = Array.isArray(verificationsResponse) ? verificationsResponse : [];
        } catch (err) {
          console.warn('Failed to fetch verifications:', err);
        }

        const totalRevenue = payments.filter(p => p.status === 'successful').reduce((sum, p) => sum + (p.amount_usd || 0), 0);
        const pendingPayments = payments.filter(p => p.status === 'pending_verification').length;
        
        setStats({
          totalUsers: users.length,
          totalRevenue: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
          activeEvents: events.length,
          pendingVerifications: verifications.length,
          pendingPayments: pendingPayments,
          recentRegistrations: 0
        });

      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
        setError("Failed to load dashboard data. Please refresh the page.");
        setStats({
          totalUsers: 0,
          totalRevenue: '$0',
          activeEvents: 0,
          pendingVerifications: 0,
          pendingPayments: 0,
          recentRegistrations: 0
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchStats();
    }
  }, [user]);

  const statCards = [
    { title: "Total Revenue", value: stats.totalRevenue, icon: <DollarSign className="h-4 w-4 text-muted-foreground" />, linkTo: 'AdminPayments' },
    { title: "Total Users", value: stats.totalUsers, icon: <Users className="h-4 w-4 text-muted-foreground" />, linkTo: 'UserManagement' },
    { title: "Active Events", value: stats.activeEvents, icon: <Calendar className="h-4 w-4 text-muted-foreground" />, linkTo: 'AdminEvents' },
    { title: "Pending Verifications", value: stats.pendingVerifications + stats.pendingPayments, icon: <UserCheck className="h-4 w-4 text-muted-foreground" />, linkTo: 'Verification' }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">
          <UserCheck className="w-12 h-12 mx-auto mb-2" />
          <h2 className="text-xl font-semibold">{error}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground text-sm sm:text-base">Welcome back, {user.full_name}. Here's your platform overview.</p>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Navigate to key admin sections.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button asChild variant="outline"><Link to={createPageUrl('UserManagement')}>User Management</Link></Button>
            <Button asChild variant="outline"><Link to={createPageUrl('AdminSchools')}>Schools</Link></Button>
            <Button asChild variant="outline"><Link to={createPageUrl('AdminPackages')}>Packages</Link></Button>
            <Button asChild variant="outline"><Link to={createPageUrl('AdminEvents')}>Events</Link></Button>
            <Button asChild variant="outline"><Link to={createPageUrl('Verification')}>Verification</Link></Button>
            <Button asChild variant="outline"><Link to={createPageUrl('AdminPayments')}>Payments</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Overview of recent platform events.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Recent activity feed coming soon.</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Master Data Seeder - The Only Seeder */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Educational Data System</h2>
          <p className="text-gray-600">Create a comprehensive, synchronized educational database with institutions, programs, and school profiles.</p>
        </div>
        
        {/* Master Seeder - Only one needed */}
        <MasterDataSeeder />
      </div>
    </div>
  );
}
