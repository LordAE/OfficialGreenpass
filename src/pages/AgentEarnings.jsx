
import React, { useState, useEffect, useCallback } from 'react';
import { Agent } from '@/api/entities';
import { Case } from '@/api/entities';
import { User } from '@/api/entities';
import { Reservation } from '@/api/entities';
import { WalletTransaction } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, Users, FileText, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const PayoutRequestModal = ({ agent, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState(agent?.pending_payout || 0);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amount > agent.pending_payout) {
      alert("Payout amount cannot exceed pending amount.");
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
          max={agent?.pending_payout || 0}
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Available for payout: ${agent?.pending_payout?.toFixed(2) || '0.00'}
        </p>
      </div>
      
      <div>
        <Label htmlFor="paypal">PayPal Email</Label>
        <Input
          id="paypal"
          type="email"
          value={agent?.paypal_email || ''}
          readOnly
          className="bg-gray-50"
        />
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

export default function AgentEarnings() { 
  const [agent, setAgent] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [cases, setCases] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const loadEarningsData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      const agentData = await Agent.filter({ user_id: currentUser.id });
      
      if (agentData.length > 0) {
        const agentRecord = agentData[0];
        setAgent(agentRecord);

        // Load cases for commission calculation
        const caseData = await Case.filter({ agent_id: currentUser.id }, '-created_date');
        setCases(caseData);

        // Load reservations for students referred by this agent
        const students = await User.filter({ referred_by_agent_id: currentUser.id });
        let reservationData = []; // Initialize to empty array
        if (students.length > 0) {
          const studentIds = students.map(s => s.id);
          reservationData = await Reservation.filter({ 
            student_id: { $in: studentIds },
            status: 'confirmed'
          }, '-created_date');
          setReservations(reservationData); // Update state here
        }

        // Calculate earnings from cases and reservations
        const caseEarnings = caseData.map(c => ({
          type: 'visa_case',
          description: `${c.case_type} for Case #${c.id?.slice(-6)}`,
          amount: 500, // Base commission for visa cases
          date: c.created_date,
          status: c.status === 'Approved' ? 'paid' : 'pending'
        }));

        const reservationEarnings = reservationData.map(r => ({ // FIX: Changed 'reservations.map' to 'reservationData.map'
          type: 'school_commission',
          description: `School reservation: ${r.program_name}`,
          amount: r.amount_usd * (agentRecord.commission_rate || 0.1),
          date: r.created_date,
          status: 'paid'
        }));

        setEarnings([...caseEarnings, ...reservationEarnings]);
      }
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
      if (!agent) return;
      
      // Update agent record to request payout
      await Agent.update(agent.id, {
        payout_status: 'pending',
        pending_payout: agent.pending_payout - payoutData.amount,
        last_payout_date: new Date().toISOString()
      });

      setIsPayoutModalOpen(false);
      await loadEarningsData();
      alert("Payout request submitted successfully!");
    } catch (error) {
      console.error("Error submitting payout request:", error);
      alert("Failed to submit payout request. Please try again.");
    }
  };

  const totalEarned = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
  const paidEarnings = earnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0);

  const thisMonthEarnings = earnings
    .filter(e => {
      const earningDate = new Date(e.date);
      const now = new Date();
      return earningDate.getMonth() === now.getMonth() && earningDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <DollarSign className="w-8 h-8 text-emerald-700" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            My Earnings
          </h1>
        </div>

        {/* Earnings Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">
                    ${agent?.total_earned?.toFixed(2) || totalEarned.toFixed(2)}
                  </div>
                  <p className="text-gray-600">Total Earned</p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    ${agent?.pending_payout?.toFixed(2) || pendingEarnings.toFixed(2)}
                  </div>
                  <p className="text-gray-600">Pending Payout</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-200" />
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
                    {((agent?.commission_rate || 0.1) * 100).toFixed(1)}%
                  </div>
                  <p className="text-gray-600">Commission Rate</p>
                </div>
                <FileText className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout Management */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Payout Management</h3>
                <p className="text-gray-600">Request payouts for your earned commissions</p>
                {agent?.paypal_email ? (
                  <p className="text-sm text-gray-500 mt-1">Payouts sent to: {agent.paypal_email}</p>
                ) : (
                  <p className="text-sm text-red-500 mt-1">Please add your PayPal email in your profile</p>
                )}
              </div>
              <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={!agent || !agent.pending_payout || agent.pending_payout <= 0 || !agent.paypal_email}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Request Payout
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Commission Payout</DialogTitle>
                  </DialogHeader>
                  <PayoutRequestModal
                    agent={agent}
                    onSubmit={handlePayoutRequest}
                    onCancel={() => setIsPayoutModalOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Performance Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle>Visa Cases</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{cases.length}</div>
              <p className="text-gray-600">Total Cases Handled</p>
              <div className="mt-2 text-sm">
                <span className="text-green-600">{cases.filter(c => c.status === 'Approved').length} Approved</span>
                <span className="mx-2">•</span>
                <span className="text-yellow-600">{cases.filter(c => !['Approved', 'Rejected'].includes(c.status)).length} Active</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>School Referrals</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reservations.length}</div>
              <p className="text-gray-600">Confirmed Reservations</p>
              <div className="mt-2 text-sm text-gray-600">
                Revenue Generated: ${reservations.reduce((sum, r) => sum + (r.amount_usd || 0), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Success Rate</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {cases.length > 0 ? ((cases.filter(c => c.status === 'Approved').length / cases.length) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-gray-600">Visa Approval Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings History */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
          </CardHeader>
          <CardContent>
            {earnings.length > 0 ? (
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
                  {earnings.map((earning, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(new Date(earning.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="capitalize">{earning.type.replace('_', ' ')}</TableCell>
                      <TableCell>{earning.description}</TableCell>
                      <TableCell className="font-medium text-emerald-600">
                        +${earning.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          earning.status === 'paid' ? 'bg-green-100 text-green-800' :
                          earning.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {earning.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Earnings Yet</h3>
                <p className="text-gray-600">Start referring students to earn commissions.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
