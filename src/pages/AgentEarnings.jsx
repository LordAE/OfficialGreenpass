// src/pages/AgentEarnings.jsx
import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "@/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, FileText, Calendar, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";

const toJsDate = (v) => {
  if (!v) return null;
  try {
    if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
    return new Date(v);
  } catch {
    return null;
  }
};

// chunked fetch by ids (Firestore "in" limit = 10)
async function fetchDocsByIds(collName, ids) {
  if (!ids?.length) return [];
  const uniq = Array.from(new Set(ids));
  const chunks = [];
  for (let i = 0; i < uniq.length; i += 10) chunks.push(uniq.slice(i, i + 10));
  const results = [];
  for (const chunk of chunks) {
    const q = query(collection(db, collName), where("__name__", "in", chunk));
    const snap = await getDocs(q);
    results.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  return results;
}

const PayoutRequestModal = ({ wallet, paypalEmail, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState(wallet ? Number(wallet.balance_usd || 0) : 0);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const bal = Number(wallet?.balance_usd || 0);
    const amt = Number(amount || 0);
    if (amt <= 0) {
      alert("Please enter a positive amount.");
      return;
    }
    if (amt > bal) {
      alert("Payout amount cannot exceed available balance.");
      return;
    }
    onSubmit({ amount: amt, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Payout Amount (USD)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min={0}
          max={wallet?.balance_usd || 0}
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Available balance: ${Number(wallet?.balance_usd || 0).toFixed(2)}
        </p>
      </div>

      <div>
        <Label htmlFor="paypal">PayPal Email</Label>
        <Input id="paypal" type="email" value={paypalEmail || ""} readOnly className="bg-gray-50" />
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
  const [wallet, setWallet] = useState(null);
  const [earningsTxns, setEarningsTxns] = useState([]); // from walletTransactions (transaction_type = "earning")
  const [cases, setCases] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("No authenticated user.");

      // Load agent profile
      const agentQ = query(collection(db, "agents"), where("user_id", "==", uid));
      const agentSnap = await getDocs(agentQ);
      const agentDoc = agentSnap.docs[0]?.data() ? { id: agentSnap.docs[0].id, ...agentSnap.docs[0].data() } : null;
      setAgent(agentDoc);

      // Load wallet for this agent
      let walletDoc = null;
      const wq = query(collection(db, "wallets"), where("user_id", "==", uid), where("user_type", "==", "agent"));
      const wsnap = await getDocs(wq);
      if (wsnap.empty) {
        // Optional: create a wallet if you want auto-provisioning
        // For now: just show zeros if no wallet exists
        walletDoc = null;
      } else {
        walletDoc = { id: wsnap.docs[0].id, ...wsnap.docs[0].data() };
      }
      setWallet(walletDoc);

      // Load earning transactions for this agent (pending/approved)
      const etQ = query(
        collection(db, "walletTransactions"),
        where("user_id", "==", uid),
        where("transaction_type", "==", "earning"),
        orderBy("created_date", "desc")
      );
      const etSnap = await getDocs(etQ);
      const et = etSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEarningsTxns(et);

      // Load cases for performance metrics
      const casesQ = query(collection(db, "cases"), where("agent_id", "==", uid));
      const casesSnap = await getDocs(casesQ);
      setCases(casesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Students referred by this agent
      const studentsQ = query(collection(db, "users"), where("referred_by_agent_id", "==", uid));
      const studentsSnap = await getDocs(studentsQ);
      const studentIds = studentsSnap.docs.map((d) => d.id);

      // Reservations for these students with status 'confirmed'
      let res = [];
      if (studentIds.length) {
        res = await fetchDocsByIds("reservations", studentIds); // if reservation ids == student ids (often not)
        // If reservations aren't keyed by student id, query by student_id (but watch index limits)
        // Fallback: chunked "in" query on student_id
        res = [];
        const chunks = [];
        for (let i = 0; i < studentIds.length; i += 10) chunks.push(studentIds.slice(i, i + 10));
        for (const ch of chunks) {
          const rq = query(collection(db, "reservations"), where("student_id", "in", ch), where("status", "==", "confirmed"));
          const rs = await getDocs(rq);
          res.push(...rs.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      }
      setReservations(res);
    } catch (e) {
      console.error("Error loading agent earnings:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived stats from wallet + transactions
  const totalEarned =
    Number(wallet?.total_earned || 0) ||
    earningsTxns.reduce((sum, t) => sum + (Number(t.amount_usd) || 0), 0);

  const pendingPayout = Number(wallet?.pending_payout || 0);

  const thisMonthEarnings = earningsTxns
    .filter((t) => {
      const d = toJsDate(t.created_date);
      if (!d) return false;
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, t) => sum + (Number(t.amount_usd) || 0), 0);

  const commissionRate = Number(agent?.commission_rate ?? 0.1);

  // Build UI-friendly earning rows from transactions
  const earningRows = earningsTxns.map((t) => ({
    date: toJsDate(t.created_date) || new Date(),
    type: (t.related_entity_type || "earning").toString(),
    description: t.description || (t.related_entity_type || "earning").replace(/_/g, " "),
    amount: Number(t.amount_usd || 0),
    status: t.status === "approved" ? "paid" : "pending",
  }));

  const handlePayoutRequest = async ({ amount, notes }) => {
    try {
      if (!wallet) {
        alert("Wallet not found for this agent.");
        return;
      }
      const uid = auth.currentUser?.uid;
      if (!uid) {
        alert("Not authenticated.");
        return;
      }

      const currentBalance = Number(wallet.balance_usd || 0);
      if (amount <= 0 || amount > currentBalance) {
        alert("Invalid amount. Check available balance.");
        return;
      }

      // 1) Create a payout request transaction (negative amount)
      await addDoc(collection(db, "walletTransactions"), {
        transaction_type: "payout_request",
        status: "pending",
        amount_usd: -Math.abs(amount),
        notes: notes || "",
        user_id: uid,
        wallet_id: wallet.id,
        created_date: serverTimestamp(),
      });

      // 2) Move funds from available balance to pending_payout
      await updateDoc(doc(db, "wallets", wallet.id), {
        balance_usd: Number(wallet.balance_usd || 0) - amount,
        pending_payout: Number(wallet.pending_payout || 0) + amount,
        // Keep last_payout_date for completed payouts; it's set by admins on approve
      });

      setIsPayoutModalOpen(false);
      await loadData();
      alert("Payout request submitted successfully!");
    } catch (e) {
      console.error("Error submitting payout request:", e);
      alert("Failed to submit payout request. Please try again.");
    }
  };

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
                    ${Number(totalEarned).toFixed(2)}
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
                    ${Number(pendingPayout).toFixed(2)}
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
                    ${Number(thisMonthEarnings).toFixed(2)}
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
                    {(commissionRate * 100).toFixed(1)}%
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
                {agent?.paypal_email || wallet?.payment_details?.paypal_email ? (
                  <p className="text-sm text-gray-500 mt-1">
                    Payouts sent to: {agent?.paypal_email || wallet?.payment_details?.paypal_email}
                  </p>
                ) : (
                  <p className="text-sm text-red-500 mt-1">Please add your PayPal email in your profile</p>
                )}
              </div>
              <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={
                      !wallet ||
                      Number(wallet.balance_usd || 0) <= 0 ||
                      !(agent?.paypal_email || wallet?.payment_details?.paypal_email)
                    }
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
                    wallet={wallet || { balance_usd: 0 }}
                    paypalEmail={agent?.paypal_email || wallet?.payment_details?.paypal_email}
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
                <span className="text-green-600">{cases.filter((c) => c.status === "Approved").length} Approved</span>
                <span className="mx-2">•</span>
                <span className="text-yellow-600">
                  {cases.filter((c) => !["Approved", "Rejected"].includes(c.status)).length} Active
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>School Referrals</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reservations.length}</div>
              <p className="text-gray-600">Confirmed Reservations</p>
              <div className="mt-2 text-sm text-gray-600">
                Revenue Generated: ${reservations.reduce((s, r) => s + (Number(r.amount_usd) || 0), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Success Rate</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {cases.length > 0
                  ? ((cases.filter((c) => c.status === "Approved").length / cases.length) * 100).toFixed(1)
                  : 0}
                %
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
            {earningRows.length > 0 ? (
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
                  {earningRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(row.date, "MMM dd, yyyy")}</TableCell>
                      <TableCell className="capitalize">{row.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell className="font-medium text-emerald-600">
                        +${Number(row.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            row.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : row.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {row.status}
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
