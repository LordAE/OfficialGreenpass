
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet } from '@/api/entities';
import { WalletTransaction } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet as WalletIcon, DollarSign, TrendingUp, Users, Clock, CheckCircle, XCircle, PauseCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TutoringSession } from '@/api/entities';
import { Case } from '@/api/entities';
import { Reservation } from '@/api/entities';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminWalletManagement() {
  const [wallets, setWallets] = useState([]);
  const [earningTransactions, setEarningTransactions] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [users, setUsers] = useState({});
  const [relatedEntities, setRelatedEntities] = useState({});
  const [loading, setLoading] = useState(true);
  const [holdModalState, setHoldModalState] = useState({ isOpen: false, request: null });
  const [holdReason, setHoldReason] = useState('');
  const [isSubmittingHold, setIsSubmittingHold] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletData, earningData, requestData] = await Promise.all([
        Wallet.list('-balance_usd'),
        WalletTransaction.filter({ transaction_type: 'earning' }, '-created_date'), // Fetch all earnings to filter later
        WalletTransaction.filter({ transaction_type: 'payout_request' }, '-created_date'), // Fetch all requests to filter later
      ]);

      const pendingEarnings = earningData.filter(t => t.status === 'pending');
      setWallets(walletData);
      setEarningTransactions(pendingEarnings);
      setPayoutRequests(requestData.filter(r => r.status === 'pending' || r.status === 'hold')); // Display pending and on-hold requests

      const userIds = [...new Set([
        ...walletData.map(w => w.user_id), 
        ...earningData.map(t => t.user_id), // Use all earning data for user IDs
        ...requestData.map(r => r.user_id) // Use all request data for user IDs
      ])];
      
      const allUsers = await User.list(); // Fetch all users at once
      const usersMap = allUsers.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      setUsers(usersMap);

      // Fetch related entities for earnings that are pending approval
      const sessionIds = pendingEarnings
        .filter(t => t.related_entity_type === 'tutoring_session' && t.related_entity_id)
        .map(t => t.related_entity_id);
      const caseIds = pendingEarnings
        .filter(t => t.related_entity_type === 'visa_commission' && t.related_entity_id)
        .map(t => t.related_entity_id);
      const reservationIds = pendingEarnings
        .filter(t => t.related_entity_type === 'school_commission' && t.related_entity_id)
        .map(t => t.related_entity_id);

      const [sessions, cases, reservations] = await Promise.all([
        sessionIds.length ? TutoringSession.filter({ id: { $in: sessionIds } }) : Promise.resolve([]),
        caseIds.length ? Case.filter({ id: { $in: caseIds } }) : Promise.resolve([]),
        reservationIds.length ? Reservation.filter({ id: { $in: reservationIds } }) : Promise.resolve([]),
      ]);
      
      const entitiesMap = {};
      sessions.forEach(s => entitiesMap[s.id] = { ...s, type: 'Tutoring Session', studentId: s.student_id });
      cases.forEach(c => entitiesMap[c.id] = { ...c, type: 'Visa Commission', studentId: c.student_id });
      reservations.forEach(r => entitiesMap[r.id] = { ...r, type: 'School Commission', studentId: r.student_id });
      setRelatedEntities(entitiesMap);

    } catch (error) {
      console.error("Error loading wallet data:", error);
    }
    setLoading(false);
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handlePayoutRequest = async (request, newStatus) => {
    const isApproved = newStatus === 'approved';
    try {
        const currentUser = await User.me();
        
        // Update the transaction status
        await WalletTransaction.update(request.id, {
            status: newStatus,
            approved_by: currentUser.id,
            approved_at: new Date().toISOString()
        });

        // Find the wallet and update balances
        const wallet = await Wallet.get(request.wallet_id);
        if (wallet) {
            const payoutAmount = Math.abs(request.amount_usd);
            const newWalletData = {
                pending_payout: (wallet.pending_payout || 0) - payoutAmount,
            };

            if (isApproved) {
                newWalletData.total_paid_out = (wallet.total_paid_out || 0) + payoutAmount;
                newWalletData.last_payout_date = new Date().toISOString();
            } else { // Rejected or Hold released (if applicable, though hold has its own flow)
                newWalletData.balance_usd = (wallet.balance_usd || 0) + payoutAmount; // Return funds to balance
            }
            
            await Wallet.update(wallet.id, newWalletData);
        }
        
        alert(`Payout request ${newStatus}.`);
        fetchData(); // Refresh all data
    } catch (error) {
        console.error(`Error ${newStatus}ing payout request:`, error);
        alert(`Failed to ${newStatus} payout request.`);
    }
  };

  const openHoldModal = (request) => {
    setHoldModalState({ isOpen: true, request: request });
    setHoldReason(''); // Reset reason
  };

  const handleConfirmHold = async () => {
    if (!holdModalState.request || !holdReason.trim()) { // Use trim() to ensure not just whitespace
      alert("Please provide a reason for holding the payout.");
      return;
    }
    setIsSubmittingHold(true);
    try {
      const currentUser = await User.me();
      await WalletTransaction.update(holdModalState.request.id, {
        status: 'hold',
        notes: `HOLD: ${holdReason}`, // Append hold reason to notes
        approved_by: currentUser.id, // Log who put it on hold
        approved_at: new Date().toISOString() // And when
      });

      alert('Payout request has been put on hold.');
      setHoldModalState({ isOpen: false, request: null }); // Close modal
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error holding payout request:", error);
      alert("Failed to hold payout request.");
    }
    setIsSubmittingHold(false);
  };


  const handleApproveEarning = async (transaction) => {
    try {
      const currentUser = await User.me();
      await WalletTransaction.update(transaction.id, {
        status: 'approved',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString()
      });

      const wallet = wallets.find(w => w.id === transaction.wallet_id);
      if (wallet) {
        await Wallet.update(wallet.id, {
          balance_usd: (wallet.balance_usd || 0) + transaction.amount_usd,
          total_earned: (wallet.total_earned || 0) + (transaction.amount_usd > 0 ? transaction.amount_usd : 0)
        });
      }

      await fetchData();
      alert("Earning approved successfully!");
    } catch (error) {
      console.error("Error approving earning:", error);
      alert("Failed to approve earning.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <WalletIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
            Wallet Management
          </h1>
        </div>

        <Tabs defaultValue="wallets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wallets">Wallets Overview</TabsTrigger>
            <TabsTrigger value="payouts">Payout Requests <Badge className="ml-2">{payoutRequests.length}</Badge></TabsTrigger>
            <TabsTrigger value="earnings">Pending Earnings <Badge className="ml-2">{earningTransactions.length}</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value="wallets">
            <Card>
              <CardHeader>
                  <CardTitle>Wallets Overview</CardTitle>
                  <CardDescription>A summary of all user wallets.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {wallets.map(wallet => {
                    const user = users[wallet.user_id];
                    return (
                      <Card key={wallet.id}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                              <WalletIcon className="w-5 h-5" />
                              {user?.full_name} - {wallet.user_type}
                            </CardTitle>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">${(wallet.balance_usd || 0).toFixed(2)}</div>
                              <div className="text-sm text-gray-500">Current Balance</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Total Earned:</span>
                              <div className="font-semibold">${(wallet.total_earned || 0).toFixed(2)}</div>
                            </div>
                             <div>
                              <span className="text-gray-500">Pending Payout:</span>
                              <div className="font-semibold">${(wallet.pending_payout || 0).toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Total Paid Out:</span>
                              <div className="font-semibold">${(wallet.total_paid_out || 0).toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Last Payout:</span>
                              <div className="font-semibold">
                                {wallet.last_payout_date ? format(new Date(wallet.last_payout_date), 'MMM dd, yyyy') : 'Never'}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Pending Payout Requests</CardTitle>
                <CardDescription>Review, approve, or reject payout requests from users. Requests on hold are also shown here.</CardDescription>
              </CardHeader>
              <CardContent>
                {payoutRequests.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Details / Notes</TableHead>
                        <TableHead>Date Requested</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payoutRequests.map(request => {
                        const user = users[request.user_id];
                        const wallet = wallets.find(w => w.id === request.wallet_id);
                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                               <div>
                                <p className="font-medium">{user?.full_name}</p>
                                <Badge variant="outline" className="text-xs capitalize">{wallet?.user_type}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-red-600">
                              {request.status === 'hold' && <Badge variant="destructive" className="mr-2">HOLD</Badge>}
                              -${Math.abs(request.amount_usd).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {wallet?.payment_details?.paypal_email ? `PayPal: ${wallet.payment_details.paypal_email}` : "No Payment Details Set"}
                              </div>
                              {request.notes && <div className="text-xs text-gray-500">{request.notes}</div>}
                            </TableCell>
                            <TableCell>{format(new Date(request.created_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="flex gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handlePayoutRequest(request, 'approved')}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handlePayoutRequest(request, 'rejected')}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openHoldModal(request)}
                                    className="text-yellow-600 border-yellow-500 hover:bg-yellow-50 hover:text-yellow-700"
                                  >
                                    <PauseCircle className="w-4 h-4 mr-1" />
                                    Hold
                                  </Button>
                                </>
                              )}
                              {request.status === 'hold' && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePayoutRequest(request, 'pending')} // Option to release hold back to pending
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Release Hold
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Payouts</h3>
                    <p className="text-gray-600">All user payout requests have been processed or are on hold.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Pending Earnings Approval</CardTitle>
                <CardDescription>Approve earnings to make them available in user wallets. Earnings can come from various sources.</CardDescription>
              </CardHeader>
              <CardContent>
                {earningTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earningTransactions.map(transaction => {
                        const user = users[transaction.user_id];
                        const relatedEntity = relatedEntities[transaction.related_entity_id];
                        const student = relatedEntity && relatedEntity.studentId ? users[relatedEntity.studentId] : null;

                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user?.full_name}</p>
                                <Badge variant="outline" className="text-xs capitalize">{wallets.find(w => w.id === transaction.wallet_id)?.user_type}</Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge>{relatedEntity?.type || transaction.related_entity_type.replace(/_/g, ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                              {student && (
                                <Link to={createPageUrl(`UserDetails?id=${student.id}`)} className="text-blue-600 hover:underline">
                                  {student.full_name}
                                </Link>
                              )}
                              <p className="text-xs text-gray-500">{transaction.description}</p>
                            </TableCell>
                            <TableCell className="font-medium text-green-600">+${(transaction.amount_usd || 0).toFixed(2)}</TableCell>
                            <TableCell>{format(new Date(transaction.created_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => handleApproveEarning(transaction)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Earnings</h3>
                    <p className="text-gray-600">All earnings have been processed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={holdModalState.isOpen} onOpenChange={(isOpen) => setHoldModalState({ ...holdModalState, isOpen })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Hold Payout Request</DialogTitle>
                <DialogDescription>
                    Provide a reason for temporarily holding this payout. The funds will remain in "Pending Payout" and will not be returned to the user's available balance until the hold is released.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <div>
                    <Label htmlFor="hold-reason">Reason for Hold</Label>
                    <Textarea
                        id="hold-reason"
                        value={holdReason}
                        onChange={(e) => setHoldReason(e.target.value)}
                        placeholder="e.g., Verifying student enrollment, Awaiting payment details, Fraud suspicion"
                        rows={4}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setHoldModalState({ isOpen: false, request: null })}>Cancel</Button>
                <Button onClick={handleConfirmHold} disabled={isSubmittingHold || !holdReason.trim()}>
                    {isSubmittingHold ? "Holding..." : "Confirm Hold"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
