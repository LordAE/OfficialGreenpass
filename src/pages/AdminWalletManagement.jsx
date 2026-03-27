import React, { useCallback, useEffect, useMemo, useState } from "react";
import { auth, db, storage } from "@/firebase";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  DollarSign,
  Clock3,
  CheckCircle2,
  Search,
  Trophy,
  TrendingUp,
  Upload,
  FileText,
} from "lucide-react";

const MIN_PAYOUT_THRESHOLD = 50;

function normalizeRole(user = {}) {
  return String(
    user?.user_type ||
      user?.role ||
      user?.selected_role ||
      user?.userType ||
      ""
  ).toLowerCase();
}

function isCollaboratorUser(user = {}) {
  const role = normalizeRole(user);
  const roles = Array.isArray(user?.roles)
    ? user.roles.map((r) => String(r).toLowerCase())
    : [];

  return (
    role === "collaborator" ||
    roles.includes("collaborator") ||
    user?.is_collaborator === true ||
    !!user?.collaborator_referral_code ||
    !!user?.collaborator_status
  );
}

function toDate(value) {
  try {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function formatDate(value) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString();
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getTierPriority(tier) {
  const t = String(tier || "bronze").toLowerCase();
  if (t === "gold") return 3;
  if (t === "silver") return 2;
  return 1;
}

function StatCard({ title, value, hint, icon: Icon }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
            {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
          </div>
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getCommissionStatusBadge(status) {
  const normalized = String(status || "not_due").toLowerCase();

  if (normalized === "paid") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        Paid
      </Badge>
    );
  }

  if (normalized === "pending_payment") {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
        Pending Commission
      </Badge>
    );
  }

  return <Badge variant="secondary">Not Due</Badge>;
}

export default function AdminWalletManagement() {
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState([]);
  const [search, setSearch] = useState("");

  const [paymentModal, setPaymentModal] = useState({
    open: false,
    collaborator: null,
    action: null, // "paid" | "unpaid"
  });

  const [paymentNotes, setPaymentNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCollaborators = useCallback(async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));

      const rows = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(isCollaboratorUser)
        .sort((a, b) => {
          const tierDiff =
            getTierPriority(b?.collaborator_tier) - getTierPriority(a?.collaborator_tier);
          if (tierDiff !== 0) return tierDiff;

          return (
            Number(b?.collaborator_estimated_rewards || 0) -
            Number(a?.collaborator_estimated_rewards || 0)
          );
        });

      setCollaborators(rows);
    } catch (error) {
      console.error("Failed to load collaborators:", error);
      alert("Failed to load collaborator progress.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const collaboratorRows = useMemo(() => {
    return collaborators.map((user) => {
      const invited = Number(user?.collaborator_invited_total || 0);
      const completed = Number(user?.collaborator_completed_profiles || 0);
      const verified = Number(user?.collaborator_verified_users || 0);
      const estimatedRewards = Number(user?.collaborator_estimated_rewards || 0);
      const paidOutTotal = Number(user?.collaborator_paid_out_total || 0);

      const availableDue = Math.max(0, estimatedRewards - paidOutTotal);
      const isDue = availableDue >= MIN_PAYOUT_THRESHOLD;

      const commissionStatus = isDue
        ? String(user?.collaborator_commission_status || "pending_payment").toLowerCase()
        : "not_due";

      return {
        ...user,
        invited,
        completed,
        verified,
        estimatedRewards,
        paidOutTotal,
        availableDue,
        isDue,
        commissionStatus,
      };
    });
  }, [collaborators]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collaboratorRows;

    return collaboratorRows.filter((row) => {
      const haystack = [
        row?.full_name,
        row?.email,
        row?.collaborator_referral_code,
        row?.collaborator_tier,
        row?.collaborator_status,
        row?.collaborator_commission_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [collaboratorRows, search]);

  const stats = useMemo(() => {
    const totalCollaborators = collaboratorRows.length;
    const dueCount = collaboratorRows.filter((r) => r.isDue).length;
    const pendingCommissionCount = collaboratorRows.filter(
      (r) => r.isDue && r.commissionStatus !== "paid"
    ).length;
    const totalDueAmount = collaboratorRows.reduce(
      (sum, r) => sum + Number(r.availableDue || 0),
      0
    );
    const totalPaidOut = collaboratorRows.reduce(
      (sum, r) => sum + Number(r.paidOutTotal || 0),
      0
    );

    return {
      totalCollaborators,
      dueCount,
      pendingCommissionCount,
      totalDueAmount,
      totalPaidOut,
    };
  }, [collaboratorRows]);

  const openPaymentModal = (collaborator, action) => {
    setPaymentModal({
      open: true,
      collaborator,
      action,
    });
    setPaymentNotes("");
    setReceiptFile(null);
    setPaidAmount(
      action === "paid" ? String(Number(collaborator?.availableDue || 0).toFixed(2)) : ""
    );
  };

  const closePaymentModal = () => {
    setPaymentModal({
      open: false,
      collaborator: null,
      action: null,
    });
    setPaymentNotes("");
    setReceiptFile(null);
    setPaidAmount("");
  };

  const uploadReceiptIfNeeded = async (collaborator, file) => {
    if (!file) {
      return { receiptUrl: "", receiptFileName: "" };
    }

    const safeName = `${Date.now()}-${file.name}`;
    const collaboratorUid = collaborator?.uid || collaborator?.id || "unknown";
    const storageRef = ref(
      storage,
      `collaborator_commission_receipts/${collaboratorUid}/${safeName}`
    );

    await uploadBytes(storageRef, file);
    const receiptUrl = await getDownloadURL(storageRef);

    return {
      receiptUrl,
      receiptFileName: file.name,
    };
  };

  const handleCommissionUpdate = async () => {
    const collaborator = paymentModal.collaborator;
    const action = paymentModal.action;

    if (!collaborator || !action) return;

    setSubmitting(true);
    try {
      const adminUid = auth.currentUser?.uid || "admin";
      const now = new Date().toISOString();

      if (action === "paid") {
        const amount = Number(paidAmount || 0);

        if (!amount || amount <= 0) {
          alert("Please enter a valid paid amount.");
          setSubmitting(false);
          return;
        }

        const { receiptUrl, receiptFileName } = await uploadReceiptIfNeeded(
          collaborator,
          receiptFile
        );

        await updateDoc(doc(db, "users", collaborator.id), {
          collaborator_commission_status: "paid",
          collaborator_paid_out_total: Number(
            (Number(collaborator.paidOutTotal || 0) + amount).toFixed(2)
          ),
          collaborator_last_payout_amount: Number(amount.toFixed(2)),
          collaborator_last_payout_date: now,
          collaborator_last_payout_notes: paymentNotes.trim(),
          collaborator_last_payout_marked_by: adminUid,
          collaborator_last_payout_reviewed_at: now,
          collaborator_last_receipt_url: receiptUrl || "",
          collaborator_last_receipt_file_name: receiptFileName || "",
        });
      } else {
        await updateDoc(doc(db, "users", collaborator.id), {
          collaborator_commission_status: collaborator.isDue ? "pending_payment" : "not_due",
          collaborator_last_payout_notes: paymentNotes.trim(),
          collaborator_last_payout_marked_by: adminUid,
          collaborator_last_payout_reviewed_at: now,
        });
      }

      closePaymentModal();
      await fetchCollaborators();
      alert("Collaborator commission status updated.");
    } catch (error) {
      console.error("Failed to update collaborator commission status:", error);
      alert("Failed to update collaborator commission status.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              <TrendingUp className="h-4 w-4" />
              Admin view
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Collaborator Progress
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track each collaborator’s referral progress and manually update
              commission payments done outside the app.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search collaborator, email, code, tier..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total collaborators"
            value={stats.totalCollaborators}
            hint="All collaborator accounts"
            icon={Users}
          />
          <StatCard
            title="Due for commission"
            value={stats.dueCount}
            hint={`At least ${money(MIN_PAYOUT_THRESHOLD)} available`}
            icon={DollarSign}
          />
          <StatCard
            title="Pending commission"
            value={stats.pendingCommissionCount}
            hint="Due but not yet marked paid"
            icon={Clock3}
          />
          <StatCard
            title="Total amount due"
            value={money(stats.totalDueAmount)}
            hint="Still unpaid"
            icon={TrendingUp}
          />
          <StatCard
            title="Total paid out"
            value={money(stats.totalPaidOut)}
            hint="Marked manually by admin"
            icon={CheckCircle2}
          />
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Collaborator commission tracker</CardTitle>
            <CardDescription>
              Monitor collaborator progress, pending commissions, and third-party payment proof.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {filteredRows.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collaborator</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Estimated Commission</TableHead>
                      <TableHead>Paid Out</TableHead>
                      <TableHead>Pending Commission</TableHead>
                      <TableHead>Last Paid</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead className="min-w-[260px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-slate-900">
                              {row?.full_name || "Unnamed collaborator"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {row?.email || "No email"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Code: {row?.collaborator_referral_code || "—"}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            className={
                              String(row?.collaborator_tier || "bronze").toLowerCase() === "gold"
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                : String(row?.collaborator_tier || "bronze").toLowerCase() === "silver"
                                ? "bg-slate-200 text-slate-700 hover:bg-slate-200"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                            }
                          >
                            <Trophy className="mr-1 h-3.5 w-3.5" />
                            {String(row?.collaborator_tier || "bronze").toLowerCase()}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {String(row?.collaborator_status || "pending").toLowerCase()}
                          </Badge>
                        </TableCell>

                        <TableCell>{row.invited}</TableCell>
                        <TableCell>{row.completed}</TableCell>
                        <TableCell>{row.verified}</TableCell>
                        <TableCell>{money(row.estimatedRewards)}</TableCell>
                        <TableCell>{money(row.paidOutTotal)}</TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-900">
                              {money(row.availableDue)}
                            </div>
                            <div>{getCommissionStatusBadge(row.commissionStatus)}</div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm text-slate-700">
                            {formatDate(row?.collaborator_last_payout_date)}
                          </div>
                          {row?.collaborator_last_payout_amount ? (
                            <div className="text-xs text-slate-500">
                              {money(row?.collaborator_last_payout_amount)}
                            </div>
                          ) : null}
                        </TableCell>

                        <TableCell>
                          {row?.collaborator_last_receipt_url ? (
                            <a
                              href={row.collaborator_last_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              {row?.collaborator_last_receipt_file_name || "View receipt"}
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              disabled={!row.isDue}
                              onClick={() => openPaymentModal(row, "paid")}
                            >
                              Mark as Paid
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPaymentModal(row, "unpaid")}
                            >
                              Mark as Not Yet Paid
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500">
                No collaborators found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={paymentModal.open} onOpenChange={(open) => !open && closePaymentModal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {paymentModal.action === "paid"
                ? "Mark commission as paid"
                : "Mark commission as not yet paid"}
            </DialogTitle>
            <DialogDescription>
              This is a manual admin update only. Actual payment can be processed outside the app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <div>
                <strong>Collaborator:</strong>{" "}
                {paymentModal.collaborator?.full_name || "—"}
              </div>
              <div>
                <strong>Pending commission:</strong>{" "}
                {money(paymentModal.collaborator?.availableDue || 0)}
              </div>
            </div>

            {paymentModal.action === "paid" ? (
              <>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    Amount paid
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="Enter actual amount paid"
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    Upload receipt / proof document
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    <span>{receiptFile ? receiptFile.name : "Choose file"}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </>
            ) : null}

            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">
                Admin notes
              </div>
              <Textarea
                rows={4}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Optional note, reference number, payment channel, or reminder"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePaymentModal}>
              Cancel
            </Button>
            <Button
              onClick={handleCommissionUpdate}
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {submitting ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}