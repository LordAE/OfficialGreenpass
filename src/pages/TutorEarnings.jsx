import React, { useState, useEffect, useCallback } from 'react';
import { Wallet } from '@/api/entities';
import { WalletTransaction } from '@/api/entities';
import { TutoringSession } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, Download, Calendar, Users, Clock, Loader2, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

const PayoutRequestModal = ({ wallet, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState(wallet?.balance_usd || 0);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amount > wallet.balance_usd) {
      alert("Payout amount cannot exceed available balance.");
      return;
    }
    onSubmit({ amount, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Payout Amount (USD)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          max={wallet?.balance_usd || 0}
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Available balance: ${wallet?.balance_usd?.toFixed(2) || '0.00'}
        </p>
      </div>
      
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes for this payout request..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Request Payout</Button>
      </div>
    </form>
  );
};

export default function TutorEarnings() { 
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const loadEarningsData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      
      // Load wallet data
      const walletData = await Wallet.filter({ user_id: currentUser.id });
      if (walletData.length > 0) {
        setWallet(walletData[0]);
        
        // Load transactions
        const transactionData = await WalletTransaction.filter({ 
          wallet_id: walletData[0].id 
        }, '-created_date');
        setTransactions(transactionData);
      }

      // Load sessions for earnings breakdown
      const sessionData = await TutoringSession.filter({ 
        tutor_id: currentUser.id,
        status: 'completed'
      }, '-scheduled_date');
      setSessions(sessionData);

    } catch (error) {
      console.error("Error loading earnings data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEarningsData();
  }, [loadEarningsData]);

  const handlePayoutRequest = async (payoutData) => {
    try {
      if (!wallet) return;
      
      // Create a payout request transaction
      await WalletTransaction.create({
        wallet_id: wallet.id,
        user_id: wallet.user_id,
        transaction_type: 'payout_request',
        amount_usd: -payoutData.amount, // Negative for payout
        description: `Payout request: ${payoutData.notes || 'No notes'}`,
        status: 'pending'
      });

      // Update wallet pending payout
      await Wallet.update(wallet.id, {
        pending_payout: (wallet.pending_payout || 0) + payoutData.amount,
        balance_usd: wallet.balance_usd - payoutData.amount
      });

      setIsPayoutModalOpen(false);
      await loadEarningsData();
      alert("Payout request submitted successfully!");
    } catch (error) {
      console.error("Error submitting payout request:", error);
      alert("Failed to submit payout request. Please try again.");
    }
  };

  const thisMonthEarnings = sessions
    .filter(s => {
      const sessionDate = new Date(s.scheduled_date);
      const now = new Date();
      return sessionDate.getMonth() === now.getMonth() && sessionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, s) => sum + (s.price || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <DollarSign className="w-8 h-8 text-green-700" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            My Earnings
          </h1>
        </div>

        {/* Wallet Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    ${wallet?.balance_usd?.toFixed(2) || '0.00'}
                  </div>
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
                  <div className="text-2xl font-bold text-blue-600">
                    ${wallet?.total_earned?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-gray-600">Total Earned</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    ${thisMonthEarnings.toFixed(2)}
                  </div>
                  <p className="text-gray-600">This Month</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    ${wallet?.pending_payout?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-gray-600">Pending Payout</p>
                </div>
                <Clock className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout Actions */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Payout Management</h3>
                <p className="text-gray-600">Request payouts when you have available balance</p>
              </div>
              <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={!wallet || wallet.balance_usd <= 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Request Payout
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Payout</DialogTitle>
                  </DialogHeader>
                  <PayoutRequestModal
                    wallet={wallet}
                    onSubmit={handlePayoutRequest}
                    onCancel={() => setIsPayoutModalOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Completed Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.slice(0, 10).map(session => (
                    <TableRow key={session.id}>
                      <TableCell>{format(new Date(session.scheduled_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{session.subject}</TableCell>
                      <TableCell>{session.duration} min</TableCell>
                      <TableCell className="font-medium">${session.price}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Yet</h3>
                <p className="text-gray-600">Your completed sessions will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(transaction => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.created_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="capitalize">{transaction.transaction_type.replace('_', ' ')}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={`font-medium ${transaction.amount_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount_usd >= 0 ? '+' : ''}${transaction.amount_usd?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          transaction.status === 'approved' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          transaction.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions</h3>
                <p className="text-gray-600">Your earnings transactions will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}