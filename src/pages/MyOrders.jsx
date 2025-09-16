import React, { useState, useEffect, useCallback } from 'react';
import { MarketplaceOrder } from '@/api/entities';
import { User } from '@/api/entities';
import { Service } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';

const StatusBadge = ({ status }) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    disputed: "bg-orange-100 text-orange-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return <Badge className={`${colors[status] || "bg-gray-100 text-gray-800"} capitalize`}>{status.replace('_', ' ')}</Badge>;
};

export default function MyOrders() { 
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState({});
  const [students, setStudents] = useState({});

  const loadOrderData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      const orderData = await MarketplaceOrder.filter({ vendor_id: currentUser.id }, '-created_date');
      setOrders(orderData);

      if (orderData.length > 0) {
        // Fetch related services and students
        const serviceIds = [...new Set(orderData.map(o => o.service_id))];
        const studentIds = [...new Set(orderData.map(o => o.student_id))];

        const [servicesData, studentsData] = await Promise.all([
          Service.filter({ id: { $in: serviceIds } }),
          User.filter({ id: { $in: studentIds } })
        ]);

        const servicesMap = servicesData.reduce((acc, s) => {
          acc[s.id] = s;
          return acc;
        }, {});
        setServices(servicesMap);

        const studentsMap = studentsData.reduce((acc, s) => {
          acc[s.id] = s;
          return acc;
        }, {});
        setStudents(studentsMap);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await MarketplaceOrder.update(orderId, { status: newStatus });
      // Refresh data to show the update
      await loadOrderData();
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    completedOrders: orders.filter(o => o.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <ShoppingCart className="w-8 h-8 text-orange-700" />
          <h1 className="text-4xl font-bold text-gray-800">
            My Orders
          </h1>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle>Total Orders</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-orange-600">{stats.totalOrders}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Pending Orders</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Completed Orders</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-600">{stats.completedOrders}</div></CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Incoming Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Update Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => {
                    const service = services[order.service_id];
                    const student = students[order.student_id];
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{service?.name || 'Service not found'}</TableCell>
                        <TableCell>{student?.full_name || 'Customer not found'}</TableCell>
                        <TableCell>{format(new Date(order.created_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>${order.amount_usd.toFixed(2)}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Update status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Info className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Orders Yet</h3>
                <p className="text-gray-600">When students purchase your services, their orders will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}