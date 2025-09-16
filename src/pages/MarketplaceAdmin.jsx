import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, ShoppingCart, DollarSign, Users, Eye, CheckCircle, XCircle, Star, ToggleLeft, Trash2 } from 'lucide-react';
import { Service } from '@/api/entities';
import { MarketplaceOrder } from '@/api/entities';
import { Vendor } from '@/api/entities';

export default function MarketplaceAdmin() {
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  const loadMarketplaceData = async () => {
    setLoading(true);
    try {
      const [servicesData, ordersData, vendorsData] = await Promise.all([
        Service.list(),
        MarketplaceOrder.list('-created_date'),
        Vendor.list()
      ]);

      setServices(servicesData);
      setOrders(ordersData);
      setVendors(vendorsData);
    } catch (error) {
      console.error("Error loading marketplace data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceStatusChange = async (serviceId, newStatus) => {
    try {
      await Service.update(serviceId, { status: newStatus });
      await loadMarketplaceData();
    } catch (error) {
      console.error("Error updating service:", error);
      alert('Failed to update service status.');
    }
  };

  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      await MarketplaceOrder.update(orderId, { status: newStatus });
      await loadMarketplaceData();
    } catch (error) {
      console.error("Error updating order:", error);
      alert('Failed to update order status.');
    }
  };

  const handleVendorAction = async (vendorId, action) => {
    try {
      if (action === 'verify') {
        await Vendor.update(vendorId, { verification_status: 'verified' });
      } else if (action === 'suspend') {
        await Vendor.update(vendorId, { verification_status: 'rejected' });
      }
      await loadMarketplaceData();
    } catch (error) {
      console.error("Error updating vendor:", error);
      alert('Failed to update vendor.');
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredOrders = orders;
  const filteredVendors = vendors;

  const stats = {
    totalServices: services.length,
    activeServices: services.filter(s => s.status === 'active').length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.amount || 0), 0),
    totalVendors: vendors.length,
    verifiedVendors: vendors.filter(v => v.verification_status === 'verified').length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Store className="w-8 h-8 text-indigo-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
            Marketplace Administration
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-indigo-600">{stats.totalServices}</div>
                  <p className="text-gray-600">Total Services</p>
                </div>
                <Store className="w-8 h-8 text-indigo-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.activeServices}</div>
                  <p className="text-gray-600">Active Services</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalOrders}</div>
                  <p className="text-gray-600">Total Orders</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">${stats.totalRevenue}</div>
                  <p className="text-gray-600">Total Revenue</p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        {loading ? (
          <div className="text-center text-gray-500 text-lg mt-10">Loading marketplace data...</div>
        ) : (
          <Tabs defaultValue="services" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="mt-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Service Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredServices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500">No services found.</TableCell>
                          </TableRow>
                        ) : (
                          filteredServices.map((service) => {
                            const vendor = vendors.find(v => v.id === service.vendor_id);
                            return (
                              <TableRow key={service.id}>
                                <TableCell className="font-medium">{service.name}</TableCell>
                                <TableCell>{vendor?.business_name || 'Unknown'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{service.category}</Badge>
                                </TableCell>
                                <TableCell>${service.price_usd}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    service.status === 'active' ? 'default' :
                                    service.status === 'pending' ? 'secondary' :
                                    service.status === 'inactive' ? 'destructive' : 'outline'
                                  }>
                                    {service.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleServiceStatusChange(service.id, service.status === 'active' ? 'inactive' : 'active')}
                                      title={`Toggle Status to ${service.status === 'active' ? 'Inactive' : 'Active'}`}
                                    >
                                      <ToggleLeft className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="mt-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Order Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500">No orders found.</TableCell>
                          </TableRow>
                        ) : (
                          filteredOrders.map(order => {
                            return (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.service_name}</TableCell>
                                <TableCell>{order.student_name}</TableCell>
                                <TableCell>${order.amount_usd || order.amount}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    order.status === 'completed' ? 'default' :
                                    order.status === 'in_progress' ? 'secondary' :
                                    order.status === 'cancelled' ? 'destructive' : 'outline'
                                  }>
                                    {order.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOrderStatusChange(order.id, 'completed')}
                                    title="Mark as Completed"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vendors" className="mt-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Vendor Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVendors.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500">No vendors found.</TableCell>
                          </TableRow>
                        ) : (
                          filteredVendors.map(vendor => (
                            <TableRow key={vendor.id}>
                              <TableCell className="font-medium">{vendor.business_name}</TableCell>
                              <TableCell>{vendor.email}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  vendor.verification_status === 'verified' ? 'default' :
                                  vendor.verification_status === 'pending' ? 'secondary' :
                                  vendor.verification_status === 'rejected' ? 'destructive' : 'outline'
                                }>
                                  {vendor.verification_status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleVendorAction(vendor.id, 'verify')}
                                  title="Verify Vendor"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}