// src/pages/AdminWalletManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
} from "firebase/firestore";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet as WalletIcon,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ---------- helpers ----------
const toDate = (v) => {
  if (!v) return null;
  try {
    if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
    return new Date(v);
  } catch {
    return null;
  }
};

// Firestore can query up to 10 ids with "in"; chunk for larger arrays
async function fetchDocsByIds(coll, ids) {
  if (!ids?.length) return [];
  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
  const results = [];
  for (const chunk of chunks) {
    const q = query(collection(db, coll), where("__name__", "in", chunk));
    const snap = await getDocs(q);
    results.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  return results;
}

export default function AdminWalletManagement() {
  const [wallets, setWallets] = useState([]);
  const [earningTransactions, setEarningTransactions] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [users, setUsers] = useState({});
  const [relatedEntities, setRelatedEntities] = useState({});
  const [loading, setLoading] = useState(true);

  const [holdModalState, setHoldModalState] = useState({
    isOpen: false,
    request: null,
  });
  const [holdReason, setHoldReason] = useState("");
  const [isSubmittingHold, setIsSubmittingHold] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ---- wallets (ordered by balance if you keep a "balance_usd" numeric field) ----
      // Fallback to unordered read if index not available.
      let walletDocs = [];
      try {
        const wq = query(collection(db, "wallets"), orderBy("balance_usd", "desc"));
        const wsnap = await getDocs(wq);
        walletDocs = wsnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {
        const wsnap = await getDocs(collection(db, "wallets"));
        walletDocs = wsnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      setWallets(walletDocs);

      // ---- earnings (transaction_type=earning) ----
      // To minimize index needs, query by type then filter by status client-side.
      const earnQ = query(
        collection(db, "walletTransactions"),
        where("transaction_type", "==", "earning")
      );
      const earnSnap = await getDocs(earnQ);
      const allEarnings = earnSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pendingEarnings = allEarnings.filter((t) => t.status === "pending");

      // ---- payout requests (transaction_type=payout_request) ----
      const reqQ = query(
        collection(db, "walletTransactions"),
        where("transaction_type", "==", "payout_request")
      );
      const reqSnap = await getDocs(reqQ);
      const allRequests = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pendingOrHold = allRequests.filter(
        (r) => r.status === "pending" || r.status === "hold"
      );

      setEarningTransactions(pendingEarnings);
      setPayoutRequests(pendingOrHold);

      // ---- users map ----
      const usnap = await getDocs(collection(db, "users"));
      const usersMap = {};
      usnap.docs.forEach((d) => (usersMap[d.id] = { id: d.id, ...d.data() }));
      setUsers(usersMap);

      // ---- related entities for pending earnings (tutoring session / visa commission / school commission) ----
      const sessionIds = pendingEarnings
        .filter((t) => t.related_entity_type === "tutoring_session" && t.related_entity_id)
        .map((t) => t.related_entity_id);
      const caseIds = pendingEarnings
        .filter((t) => t.related_entity_type === "visa_commission" && t.related_entity_id)
        .map((t) => t.related_entity_id);
      const reservationIds = pendingEarnings
        .filter((t) => t.related_entity_type === "school_commission" && t.related_entity_id)
        .map((t) => t.related_entity_id);

      const [sessions, cases, reservations] = await Promise.all([
        fetchDocsByIds("tutoringSessions", Array.from(new Set(sessionIds))),
        fetchDocsByIds("cases", Array.from(new Set(caseIds))),
        fetchDocsByIds("reservations", Array.from(new Set(reservationIds))),
      ]);

      const entitiesMap = {};
      sessions.forEach(
        (s) => (entitiesMap[s.id] = { ...s, type: "Tutoring Session", studentId: s.student_id })
      );
      cases.forEach(
        (c) => (entitiesMap[c.id] = { ...c, type: "Visa Commission", studentId: c.student_id })
      );
      reservations.forEach(
        (r) => (entitiesMap[r.id] = { ...r, type: "School Commission", studentId: r.student_id })
      );
      setRelatedEntities(entitiesMap);
    } catch (e) {
      console.error("Error loading wallet data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- actions ----

  const getWalletById = async (walletId) => {
    if (!walletId) return null;
    const snap = await getDoc(doc(db, "wallets", walletId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  const handlePayoutRequest = async (request, newStatus) => {
    // newStatus: 'approved' | 'rejected' | 'pending' (used for release hold)
    const isApproved = newStatus === "approved";
    try {
      const currentUserId = auth.currentUser?.uid || "admin";

      // 1) update the payout request transaction
      await updateDoc(doc(db, "walletTransactions", request.id), {
        status: newStatus,
        approved_by: currentUserId,
        approved_at: new Date().toISOString(),
      });

      // 2) adjust wallet balances
      const wallet = await getWalletById(request.wallet_id);
      if (wallet) {
        const payoutAmount = Math.abs(Number(request.amount_usd) || 0);
        const patch = {
          pending_payout: (Number(wallet.pending_payout) || 0) - payoutAmount,
        };

        if (isApproved) {
          patch.total_paid_out = (Number(wallet.total_paid_out) || 0) + payoutAmount;
          patch.last_payout_date = new Date().toISOString();
        } else if (newStatus === "rejected" || newStatus === "pending") {
          // "pending" here is used when releasing a hold; funds stay in pending_payout if you want.
          // In the original logic, releasing hold moved status back to 'pending' without balance change.
          // We'll mirror original behavior exactly:
          // - For rejected: return to available balance
          // - For pending (release hold): do NOT change balance_usd here (funds remain pending payout)
          if (newStatus === "rejected") {
            patch.balance_usd = (Number(wallet.balance_usd) || 0) + payoutAmount;
          } else {
            // release hold => revert the transaction status only; do nothing to balances
            delete patch.pending_payout; // keep pending_payout unchanged
          }
        }

        if (Object.keys(patch).length > 0) {
          await updateDoc(doc(db, "wallets", wallet.id), patch);
        }
      }

      alert(`Payout request ${newStatus}.`);
      fetchData();
    } catch (e) {
      console.error(`Error ${newStatus} payout request:`, e);
      alert(`Failed to ${newStatus} payout request.`);
    }
  };

  const openHoldModal = (request) => {
    setHoldModalState({ isOpen: true, request });
    setHoldReason("");
  };

  const handleConfirmHold = async () => {
    if (!holdModalState.request || !holdReason.trim()) {
      alert("Please provide a reason for holding the payout.");
      return;
    }
    setIsSubmittingHold(true);
    try {
      const currentUserId = auth.currentUser?.uid || "admin";
      await updateDoc(doc(db, "walletTransactions", holdModalState.request.id), {
        status: "hold",
        notes: `HOLD: ${holdReason}`,
        approved_by: currentUserId,
        approved_at: new Date().toISOString(),
      });

      alert("Payout request has been put on hold.");
      setHoldModalState({ isOpen: false, request: null });
      fetchData();
    } catch (e) {
      console.error("Error holding payout request:", e);
      alert("Failed to hold payout request.");
    }
    setIsSubmittingHold(false);
  };

  const handleApproveEarning = async (transaction) => {
    try {
      const currentUserId = auth.currentUser?.uid || "admin";

      // 1) mark earning as approved
      await updateDoc(doc(db, "walletTransactions", transaction.id), {
        status: "approved",
        approved_by: currentUserId,
        approved_at: new Date().toISOString(),
      });

      // 2) credit wallet
      const wallet = wallets.find((w) => w.id === transaction.wallet_id) || (await getWalletById(transaction.wallet_id));
      if (wallet) {
        const amt = Number(transaction.amount_usd) || 0;
        await updateDoc(doc(db, "wallets", wallet.id), {
          balance_usd: (Number(wallet.balance_usd) || 0) + amt,
          total_earned:
            (Number(wallet.total_earned) || 0) + (amt > 0 ? amt : 0),
        });
      }

      await fetchData();
      alert("Earning approved successfully!");
    } catch (e) {
      console.error("Error approving earning:", e);
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
            <TabsTrigger value="payouts">
              Payout Requests <Badge className="ml-2">{payoutRequests.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="earnings">
              Pending Earnings <Badge className="ml-2">{earningTransactions.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Wallets */}
          <TabsContent value="wallets">
            <Card>
              <CardHeader>
                <CardTitle>Wallets Overview</CardTitle>
                <CardDescription>A summary of all user wallets.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {wallets.map((wallet) => {
                    const user = users[wallet.user_id];
                    const last = toDate(wallet.last_payout_date);
                    return (
                      <Card key={wallet.id}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                              <WalletIcon className="w-5 h-5" />
                              {user?.full_name} - {wallet.user_type}
                            </CardTitle>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">
                                ${Number(wallet.balance_usd || 0).toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">Current Balance</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Total Earned:</span>
                              <div className="font-semibold">
                                ${Number(wallet.total_earned || 0).toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Pending Payout:</span>
                              <div className="font-semibold">
                                ${Number(wallet.pending_payout || 0).toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Total Paid Out:</span>
                              <div className="font-semibold">
                                ${Number(wallet.total_paid_out || 0).toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Last Payout:</span>
                              <div className="font-semibold">
                                {last ? format(last, "MMM dd, yyyy") : "Never"}
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

          {/* Payout Requests */}
          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Pending Payout Requests</CardTitle>
                <CardDescription>
                  Review, approve, or reject payout requests from users. Requests on hold are also shown here.
                </CardDescription>
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
                      {payoutRequests.map((request) => {
                        const user = users[request.user_id];
                        const wallet = wallets.find((w) => w.id === request.wallet_id);
                        const created = toDate(request.created_date);
                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user?.full_name}</p>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {wallet?.user_type}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-red-600">
                              {request.status === "hold" && (
                                <Badge variant="destructive" className="mr-2">
                                  HOLD
                                </Badge>
                              )}
                              -${Math.abs(Number(request.amount_usd) || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {wallet?.payment_details?.paypal_email
                                  ? `PayPal: ${wallet.payment_details.paypal_email}`
                                  : "No Payment Details Set"}
                              </div>
                              {request.notes && (
                                <div className="text-xs text-gray-500">{request.notes}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {created ? format(created, "MMM dd, yyyy") : "—"}
                            </TableCell>
                            <TableCell className="flex gap-2">
                              {request.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handlePayoutRequest(request, "approved")}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handlePayoutRequest(request, "rejected")}
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
                              {request.status === "hold" && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePayoutRequest(request, "pending")}
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Pending Payouts
                    </h3>
                    <p className="text-gray-600">
                      All user payout requests have been processed or are on hold.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings */}
          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Pending Earnings Approval</CardTitle>
                <CardDescription>
                  Approve earnings to make them available in user wallets. Earnings can come from various sources.
                </CardDescription>
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
                      {earningTransactions.map((t) => {
                        const user = users[t.user_id];
                        const related = relatedEntities[t.related_entity_id];
                        const student =
                          related && related.studentId ? users[related.studentId] : null;
                        const created = toDate(t.created_date);
                        const wallet = wallets.find((w) => w.id === t.wallet_id);

                        return (
                          <TableRow key={t.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user?.full_name}</p>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {wallet?.user_type}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge>
                                {related?.type || (t.related_entity_type || "").replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {student && (
                                <Link
                                  to={createPageUrl(`UserDetails?id=${student.id}`)}
                                  className="text-blue-600 hover:underline"
                                >
                                  {student.full_name}
                                </Link>
                              )}
                              {t.description && (
                                <p className="text-xs text-gray-500">{t.description}</p>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              +${Number(t.amount_usd || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {created ? format(created, "MMM dd, yyyy") : "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => handleApproveEarning(t)}
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Pending Earnings
                    </h3>
                    <p className="text-gray-600">All earnings have been processed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Hold Dialog */}
      <Dialog
        open={holdModalState.isOpen}
        onOpenChange={(isOpen) => setHoldModalState({ ...holdModalState, isOpen })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold Payout Request</DialogTitle>
            <DialogDescription>
              Provide a reason for temporarily holding this payout. The funds will remain in
              &quot;Pending Payout&quot; and will not be returned to the user&apos;s available
              balance until the hold is released.
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
            <Button
              variant="outline"
              onClick={() => setHoldModalState({ isOpen: false, request: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmHold} disabled={isSubmittingHold || !holdReason.trim()}>
              {isSubmittingHold ? "Holding..." : "Confirm Hold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
