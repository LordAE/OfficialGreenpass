// src/pages/MyOrders.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';

// --- Firebase ---
import { db } from '@/firebase';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, orderBy
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const StatusBadge = ({ status }) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    disputed: "bg-orange-100 text-orange-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return <Badge className={`${colors[status] || "bg-gray-100 text-gray-800"} capitalize`}>{String(status || '').replace('_', ' ')}</Badge>;
};

// Helper: batch fetch by ids (Firestore `in` supports up to 10)
async function fetchDocsByIds(colName, ids) {
  if (!ids || ids.length === 0) return {};
  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

  const results = {};
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, colName), where('__name__', 'in', chunk));
      const snap = await getDocs(q);
      snap.forEach((d) => (results[d.id] = { id: d.id, ...d.data() }));
    })
  );
  return results;
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState({});
  const [students, setStudents] = useState({});

  const loadOrderData = useCallback(async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setOrders([]);
        setServices({});
        setStudents({});
        setLoading(false);
        return;
      }

      // Orders for this vendor
      const ordersQ = query(
        collection(db, 'marketplace_orders'),
        where('vendor_id', '==', user.uid),
        orderBy('created_date', 'desc')
      );
      const ordersSnap = await getDocs(ordersQ);
      const orderData = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(orderData);

      if (orderData.length > 0) {
        // Related ids
        const serviceIds = [...new Set(orderData.map(o => o.service_id).filter(Boolean))];
        const studentIds = [...new Set(orderData.map(o => o.student_id).filter(Boolean))];

        // Batch fetch related docs
        const [servicesMap, studentsMap] = await Promise.all([
          fetchDocsByIds('services', serviceIds),
          fetchDocsByIds('users', studentIds)
        ]);

        setServices(servicesMap);
        setStudents(studentsMap);
      } else {
        setServices({});
        setStudents({});
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
      await updateDoc(doc(db, 'marketplace_orders', orderId), { status: newStatus });
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

                    // Handle Timestamp or string date
                    const dt = order.created_date?.toDate
                      ? order.created_date.toDate()
                      : order.created_date
                      ? new Date(order.created_date)
                      : null;

                    const amount =
                      typeof order.amount_usd === 'number'
                        ? order.amount_usd
                        : typeof order.amount === 'number'
                        ? order.amount
                        : 0;

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{service?.name || 'Service not found'}</TableCell>
                        <TableCell>{student?.full_name || student?.email || 'Customer not found'}</TableCell>
                        <TableCell>{dt ? format(dt, 'MMM dd, yyyy') : '-'}</TableCell>
                        <TableCell>${amount.toFixed(2)}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell>
                          <Select
                            value={order.status || 'pending'}
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
                              <SelectItem value="disputed">Disputed</SelectItem>
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
