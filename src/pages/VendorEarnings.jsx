import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Download, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { User } from '@/api/entities';
import { Wallet } from '@/api/entities';
import { WalletTransaction } from '@/api/entities';

// Helper function to convert array of objects to CSV
const convertToCSV = (data, headers) => {
  const headerRow = headers.map(h => h.label).join(',');
  const rows = data.map(row => {
    return headers.map(header => {
      const cell = row[header.key];
      const escaped = ('' + cell).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });
  return [headerRow, ...rows].join('\n');
};

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

export default function VendorEarnings() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    try {
      const user = await User.me();
      const [walletData] = await Wallet.filter({ user_id: user.id });
      setWallet(walletData);
      
      if (walletData) {
        const transactionData = await WalletTransaction.filter({ wallet_id: walletData.id }, '-created_date');
        setTransactions(transactionData);
      }
    } catch (err) {
      console.error("Error fetching earnings data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestPayout = async () => {
    if (!wallet || wallet.balance_usd <= 0) {
        alert("You have no balance to withdraw.");
        return;
    }
    setProcessing(true);
    try {
        const amountToRequest = wallet.balance_usd;
        await WalletTransaction.create({
            wallet_id: wallet.id,
            user_id: wallet.user_id,
            transaction_type: 'payout_request',
            amount_usd: -amountToRequest, // Negative as it's a debit from balance
            description: `Payout request for $${amountToRequest.toFixed(2)}`,
            status: 'pending'
        });

        // Update wallet state locally for immediate feedback
        await Wallet.update(wallet.id, {
            balance_usd: 0,
            pending_payout: wallet.pending_payout + amountToRequest,
        });
        alert('Payout request submitted successfully!');
        await fetchData(); // Refresh data
    } catch (err) {
        console.error("Payout request failed:", err);
        alert('Failed to submit payout request. Please try again.');
    } finally {
        setProcessing(false);
    }
  };
  
  const handleExport = () => {
    if (transactions.length === 0) return;
    const headers = [
      { key: 'created_date', label: 'Date' },
      { key: 'description', label: 'Description' },
      { key: 'amount_usd', label: 'Amount (USD)' },
      { key: 'status', label: 'Status' },
    ];
    const csvData = convertToCSV(transactions, headers);
    downloadCSV(csvData, `vendor-earnings-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      approved: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      earning: "bg-green-100 text-green-800"
    };
    return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
  };
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const earningTransactions = transactions.filter(t => t.transaction_type === 'earning');
  const stats = {
    totalEarnings: wallet?.total_earned || 0,
    pendingPayout: wallet?.pending_payout || 0,
    currentBalance: wallet?.balance_usd || 0,
    totalOrders: earningTransactions.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <DollarSign className="w-8 h-8 text-orange-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
            Vendor Earnings
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">${stats.currentBalance.toFixed(2)}</div>
                  <p className="text-gray-600">Available Balance</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">${stats.pendingPayout.toFixed(2)}</div>
                  <p className="text-gray-600">Pending Payout</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">${stats.totalEarnings.toFixed(2)}</div>
                  <p className="text-gray-600">Lifetime Earnings</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.totalOrders}</div>
                  <p className="text-gray-600">Total Orders</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout Info */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Platform Fee: 10%</h3>
                <p className="text-blue-700">You keep 90% of each transaction. Payouts are processed weekly after request.</p>
              </div>
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleRequestPayout}
                disabled={processing || !wallet || wallet.balance_usd <= 0}
              >
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Request Payout (${stats.currentBalance.toFixed(2)})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Transaction History</CardTitle>
              <Button variant="outline" onClick={handleExport} disabled={transactions.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount (USD)</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell className={`font-semibold ${t.amount_usd > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.amount_usd > 0 ? '+' : ''}${t.amount_usd.toFixed(2)}
                    </TableCell>
                    <TableCell><Badge variant="outline">{t.transaction_type}</Badge></TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan="5" className="text-center py-8">No transactions found.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}