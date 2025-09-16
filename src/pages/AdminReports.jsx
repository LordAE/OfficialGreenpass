
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, DollarSign, TrendingUp, Download, Calendar, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { User } from '@/api/entities';
import { Payment } from '@/api/entities';
import { Case } from '@/api/entities';
import { TutoringSession } from '@/api/entities';
import { MarketplaceOrder } from '@/api/entities';
import { Reservation } from '@/api/entities';

// Helper function to convert array of objects to CSV
const convertToCSV = (data, headers) => {
  const headerRow = headers.map(h => h.label).join(',');
  const rows = data.map(row => {
    return headers.map(header => {
      const cell = row[header.key];
      // Convert cell to string, then escape double quotes by replacing them with two double quotes
      // and wrap the entire cell in double quotes to handle commas and other special characters.
      const escaped = ('' + (cell === null || cell === undefined ? '' : cell)).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });
  return [headerRow, ...rows].join('\n');
};

// Helper function to download CSV string as a file
const downloadCSV = (csvString, filename) => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export default function AdminReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, verify user is an admin
        const currentUser = await User.me();
        if (currentUser.user_type !== 'admin') {
          setError("You do not have permission to view this page.");
          setLoading(false);
          return;
        }

        // If admin, proceed to fetch all data
        const [
          users,
          payments,
          cases,
          tutoringSessions,
          marketplaceOrders,
          schoolReservations,
        ] = await Promise.all([
          User.list(),
          Payment.list(),
          Case.list(),
          TutoringSession.list(),
          MarketplaceOrder.list(),
          Reservation.list(),
        ]);

        // Process Users
        const userCounts = users.reduce((acc, user) => {
          const type = user.user_type || 'user';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        // Process Payments
        const successfulPayments = payments.filter(p => p.status === 'successful');
        const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount_usd || 0), 0);
        
        const revenueByType = successfulPayments.reduce((acc, p) => {
            const type = p.related_entity_type || 'unknown';
            acc[type] = (acc[type] || 0) + (p.amount_usd || 0);
            return acc;
        }, {});


        setReportData({
          users: {
            total: users.length,
            students: userCounts.student || 0,
            agents: userCounts.agent || 0,
            tutors: userCounts.tutor || 0,
            vendors: userCounts.vendor || 0,
            schools: userCounts.school || 0,
          },
          revenue: {
            total: totalRevenue,
            events: revenueByType.event_registration || 0,
            packages: (revenueByType.visa_package_purchase || 0) + (revenueByType.tutor_subscription || 0) + (revenueByType.agent_subscription || 0),
            marketplace: revenueByType.marketplace_order || 0,
          },
          platform: {
            visaCases: cases.length,
            tutoringSessions: tutoringSessions.length,
            marketplaceOrders: marketplaceOrders.length,
            schoolReservations: schoolReservations.length,
          }
        });

      } catch (err) {
        console.error("Failed to fetch report data:", err);
        if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError("Could not load report data. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const handleExportUserData = () => {
    if (!reportData) {
      alert("No data to export.");
      return;
    }
    try {
      // Sample export data based on reportData structure
      const exportData = [
        { metric: 'Total Users', value: reportData?.users?.total || 0 },
        { metric: 'Students', value: reportData?.users?.students || 0 },
        { metric: 'Agents', value: reportData?.users?.agents || 0 },
        { metric: 'Tutors', value: reportData?.users?.tutors || 0 },
        { metric: 'Schools', value: reportData?.users?.schools || 0 },
        { metric: 'Vendors', value: reportData?.users?.vendors || 0 },
        { metric: 'Total Revenue', value: reportData?.revenue?.total || 0 },
        { metric: 'Events Revenue', value: reportData?.revenue?.events || 0 },
        { metric: 'Packages Revenue', value: reportData?.revenue?.packages || 0 },
        { metric: 'Marketplace Revenue', value: reportData?.revenue?.marketplace || 0 },
        { metric: 'Visa Cases', value: reportData?.platform?.visaCases || 0 },
        { metric: 'Tutoring Sessions', value: reportData?.platform?.tutoringSessions || 0 },
        { metric: 'Marketplace Orders', value: reportData?.platform?.marketplaceOrders || 0 },
        { metric: 'School Reservations', value: reportData?.platform?.schoolReservations || 0 }
      ];
      
      // Define headers for the exportData array
      const headers = [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ];

      const csvData = convertToCSV(exportData, headers);
      downloadCSV(csvData, `greenpass-report-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, color, format = "number" }) => {
    const formatValue = (val) => {
      if (typeof val !== 'number') return val;
      if (format === 'currency') {
        return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
      }
      return val.toLocaleString('en-US');
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-bold ${color}`}>{formatValue(value)}</div>
              <p className="text-gray-600">{title}</p>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
            <Icon className={`w-8 h-8 text-gray-300`} />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !reportData) {
    const isPermissionError = error?.includes("permission");
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-red-600">
            {isPermissionError ? <ShieldAlert className="w-16 h-16 mb-4" /> : <AlertCircle className="w-12 h-12 mb-4" />}
            <h2 className="text-2xl font-semibold mb-2">
              {isPermissionError ? "Access Denied" : "Error Loading Reports"}
            </h2>
            <p>{error || "An unexpected error occurred."}</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-blue-600" />
              Admin Reports
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive analytics and insights</p>
          </div>
          {reportData && (
            <Button onClick={handleExportUserData} variant="outline" disabled={loading}>
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <MetricCard 
                title="Total Users"
                value={reportData.users.total}
                icon={Users}
                color="text-blue-600"
              />
              <MetricCard 
                title="Total Revenue"
                value={reportData.revenue.total}
                format="currency"
                icon={DollarSign}
                color="text-green-600"
              />
              <MetricCard 
                title="Visa Cases"
                value={reportData.platform.visaCases}
                icon={TrendingUp}
                color="text-purple-600"
              />
              <MetricCard 
                title="Total Activities"
                value={reportData.platform.tutoringSessions + reportData.platform.marketplaceOrders + reportData.platform.schoolReservations}
                icon={BarChart3}
                color="text-orange-600"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                      <span>Visa Cases</span>
                      <span className="font-semibold">{reportData.platform.visaCases.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                      <span>Tutoring Sessions</span>
                      <span className="font-semibold">{reportData.platform.tutoringSessions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <span>School Reservations</span>
                      <span className="font-semibold">{reportData.platform.schoolReservations.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                      <span>Marketplace Orders</span>
                      <span className="font-semibold">{reportData.platform.marketplaceOrders.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <p className="font-medium">Event Registrations</p>
                      <span className="font-semibold">{reportData.revenue.events.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                       <p className="font-medium">Package & Subscriptions</p>
                      <span className="font-semibold">{reportData.revenue.packages.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                    </div>
                     <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                       <p className="font-medium">Marketplace Fees</p>
                      <span className="font-semibold">{reportData.revenue.marketplace.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard 
                title="Total Users"
                value={reportData.users.total}
                icon={Users}
                color="text-gray-600"
              />
              <MetricCard 
                title="Students"
                value={reportData.users.students}
                icon={Users}
                color="text-blue-600"
              />
              <MetricCard 
                title="Agents"
                value={reportData.users.agents}
                icon={Users}
                color="text-green-600"
              />
              <MetricCard 
                title="Tutors"
                value={reportData.users.tutors}
                icon={Users}
                color="text-purple-600"
              />
              <MetricCard 
                title="Vendors"
                value={reportData.users.vendors}
                icon={Users}
                color="text-orange-600"
              />
               <MetricCard 
                title="Schools"
                value={reportData.users.schools}
                icon={Users}
                color="text-red-600"
              />
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <MetricCard 
                title="Total Revenue"
                value={reportData.revenue.total}
                format="currency"
                icon={DollarSign}
                color="text-green-600"
              />
              <MetricCard 
                title="Event Registrations"
                value={reportData.revenue.events}
                format="currency"
                icon={DollarSign}
                color="text-blue-600"
              />
              <MetricCard 
                title="Packages & Subs"
                value={reportData.revenue.packages}
                format="currency"
                icon={DollarSign}
                color="text-purple-600"
              />
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard 
                title="Visa Cases"
                value={reportData.platform.visaCases}
                subtitle="All time"
                icon={Calendar}
                color="text-purple-600"
              />
              <MetricCard 
                title="Tutoring Sessions"
                value={reportData.platform.tutoringSessions}
                subtitle="All time"
                icon={Calendar}
                color="text-blue-600"
              />
              <MetricCard 
                title="School Reservations"
                value={reportData.platform.schoolReservations}
                subtitle="All time"
                icon={Calendar}
                color="text-green-600"
              />
              <MetricCard 
                title="Marketplace Orders"
                value={reportData.platform.marketplaceOrders}
                subtitle="All time"
                icon={Calendar}
                color="text-orange-600"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
