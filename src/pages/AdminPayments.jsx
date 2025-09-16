
import React, { useState, useEffect } from 'react';
import { Payment } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Search, 
  Download, 
  Filter,
  CreditCard,
  Building,
  Globe,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const [paymentData, userData] = await Promise.all([
        Payment.list('-created_date'),
        User.list()
      ]);
      
      setPayments(paymentData);
      
      const usersMap = userData.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      setUsers(usersMap);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'successful':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'pending':
      case 'pending_verification':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'PayPal':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'Bank Transfer':
        return <Building className="w-4 h-4 text-gray-500" />;
      case 'E-Transfer':
        return <Globe className="w-4 h-4 text-purple-500" />;
      default:
        return <DollarSign className="w-4 h-4 text-green-500" />;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const user = users[payment.user_id];
    const matchesSearch = !searchTerm || 
      user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const paypalPayments = filteredPayments.filter(p => p.provider === 'PayPal');
  const bankPayments = filteredPayments.filter(p => p.provider === 'Bank Transfer' || p.provider === 'E-Transfer');

  const totalPayments = payments.length;
  const successfulPayments = payments.filter(p => p.status === 'successful').length;
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'pending_verification').length;
  const totalRevenue = payments.filter(p => p.status === 'successful').reduce((sum, p) => sum + (p.amount_usd || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              Payment Monitoring
            </h1>
          </div>
          <Button onClick={loadPayments} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Payment Statistics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{totalPayments}</div>
                  <p className="text-gray-600">Total Payments</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{successfulPayments}</div>
                  <p className="text-gray-600">Successful</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{pendingPayments}</div>
                  <p className="text-gray-600">Pending</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">${totalRevenue.toFixed(2)}</div>
                  <p className="text-gray-600">Total Revenue</p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by user name, email, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="successful">Successful</option>
                <option value="pending">Pending</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Payments</TabsTrigger>
            <TabsTrigger value="paypal">PayPal <Badge className="ml-2">{paypalPayments.length}</Badge></TabsTrigger>
            <TabsTrigger value="transfers">Bank/E-Transfer <Badge className="ml-2">{bankPayments.length}</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <PaymentTable payments={filteredPayments} users={users} />
          </TabsContent>

          <TabsContent value="paypal">
            <PaymentTable payments={paypalPayments} users={users} />
          </TabsContent>

          <TabsContent value="transfers">
            <PaymentTable payments={bankPayments} users={users} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const PaymentTable = ({ payments, users }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'successful':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'pending':
      case 'pending_verification':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'PayPal':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'Bank Transfer':
        return <Building className="w-4 h-4 text-gray-500" />;
      case 'E-Transfer':
        return <Globe className="w-4 h-4 text-purple-500" />;
      default:
        return <DollarSign className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <Card>
      <CardContent>
        {payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(payment => {
                const user = users[payment.user_id];
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user?.full_name || 'Unknown User'}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                        {payment.payer_email && payment.payer_email !== user?.email && (
                          <p className="text-xs text-blue-600">Paid by: {payment.payer_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getProviderIcon(payment.provider)}
                        <span>{payment.provider}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">${payment.amount_usd?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.related_entity_type?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.transaction_id || payment.paypal_order_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.status)}
                        <Badge className={
                          payment.status === 'successful' ? 'bg-green-100 text-green-800' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                          payment.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {payment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(payment.created_date), 'MMM dd, yyyy HH:mm')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payments Found</h3>
            <p className="text-gray-600">No payments match your current filters.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
