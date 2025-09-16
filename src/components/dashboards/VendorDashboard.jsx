import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Store, ShoppingCart, BarChart3, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function VendorDashboard({ user }) {
  // Placeholder stats
  const stats = {
    listedServices: 0,
    newOrders: 0,
    totalSales: '$0.00'
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Vendor Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Listed Services" value={stats.listedServices} icon={<Store className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="New Orders" value={stats.newOrders} icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Total Sales" value={stats.totalSales} icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} />
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickLink to={createPageUrl('MyServices')} title="Manage Services" />
          <QuickLink to={createPageUrl('MyOrders')} title="View Orders" />
          <QuickLink to={createPageUrl('VendorAnalytics')} title="View Analytics" />
          <QuickLink to={createPageUrl('VendorEarnings')} title="Check Payouts" />
          <QuickLink to={createPageUrl('Profile')} title="Update Profile" />
        </CardContent>
      </Card>
    </div>
  );
}

const StatCard = ({ title, value, icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const QuickLink = ({ to, title }) => (
  <Link to={to} className="block group">
    <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
      <span className="font-semibold">{title}</span>
      <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </div>
  </Link>
);