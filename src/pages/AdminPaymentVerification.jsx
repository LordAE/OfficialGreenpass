// src/pages/AdminPaymentVerification.jsx
import React, { useState, useEffect, useCallback } from "react";
import { db } from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Eye, CheckCircle, XCircle, FileText, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { sendEventRegistrationInvoice } from "@/components/utils/invoiceSender";

/* ------------------------------ helpers ------------------------------ */
const toDate = (v) => {
  try {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (typeof v === "string" || typeof v === "number") return new Date(v);
    return null;
  } catch {
    return null;
  }
};
const toMs = (v) => {
  if (!v) return 0;
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};
const norm = (s) => (s || "").toString().trim().toLowerCase();
const providerLabel = (key) => (key || "—").replaceAll("_", " ");

const getRegistration = async (id) => {
  if (!id) return null;
  const snap = await getDoc(doc(db, "event_registrations", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

const getEvent = async (eventId) => {
  if (!eventId) return null;
  const direct = await getDoc(doc(db, "events", eventId));
  if (direct.exists()) return { id: direct.id, ...direct.data() };
  const s = await getDocs(query(collection(db, "events"), where("event_id", "==", eventId)));
  if (!s.empty) {
    const d = s.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
};

/* ------------------------------ component ---------------------------- */
export default function AdminPaymentVerification() {
  const [activeTab, setActiveTab] = useState("payments"); // "payments" | "free"

  // payments tab state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // free tab state
  const [freeRows, setFreeRows] = useState([]);
  const [freeLoading, setFreeLoading] = useState(true);
  const [freeProcessing, setFreeProcessing] = useState(null);
  const [freeActionError, setFreeActionError] = useState(null);
  const [freeLoadError, setFreeLoadError] = useState(null);

  /* ---------- hydrate helpers ---------- */
  const hydratePayments = async (payments) => {
    const items = await Promise.all(
      payments.map(async (p) => {
        const registration = await getRegistration(p.related_entity_id);
        const event = registration ? await getEvent(registration.event_id) : null;
        return {
          id: p.id, // payment id
          created_date: p.created_date || registration?.created_date || registration?.created_at || null,
          payer_name: p.payer_name || registration?.contact_name || "—",
          payer_email: p.payer_email || registration?.contact_email || "—",
          amount_usd: p.amount_usd ?? 0,
          provider: p.provider || "—",
          receipt_url: p.receipt_url || registration?.proof_url || null,
          registration,
          event,
        };
      })
    );
    // only show those still not verified
    return items.filter((i) => i.registration && i.registration.is_verified !== true);
  };

  const hydrateFreeRegs = async (regs) => {
    // only show not-verified free regs
    regs = regs.filter((r) => (r.payment_method || "").toLowerCase() === "free");
    return Promise.all(
      regs.map(async (r) => {
        const event = await getEvent(r.event_id);
        return {
          id: r.id, // registration id
          created_date: r.created_date || r.created_at || null,
          payer_name: r.contact_name || "—",
          payer_email: r.contact_email || "—",
          amount_usd: 0,
          provider: "free",
          receipt_url: null,
          registration: r,
          event,
        };
      })
    );
  };

  /* ---------------- payments tab load ---------------- */
  const loadPayments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      // Typical pending manual methods (bank/e-transfer)
      const qPay = query(
        collection(db, "payments"),
        where("status", "==", "pending_verification"),
        orderBy("created_date", "desc")
      );
      const snap = await getDocs(qPay);
      const base = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const hydrated = await hydratePayments(base);
      setRows(hydrated);
    } catch (orderedErr) {
      console.warn("Ordered payments query failed, falling back to client-side sort:", orderedErr?.message || orderedErr);
      try {
        const qPayNoOrder = query(collection(db, "payments"), where("status", "==", "pending_verification"));
        const snap2 = await getDocs(qPayNoOrder);
        const base2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
        base2.sort((a, b) => toMs(b.created_date) - toMs(a.created_date));
        const hydrated2 = await hydratePayments(base2);
        setRows(hydrated2);
      } catch (fallbackErr) {
        console.error("Fallback payments query failed:", fallbackErr);
        setRows([]);
        setLoadError("Failed to load pending payments.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------- free tab load ---------------- */
  const loadFree = useCallback(async () => {
    setFreeLoading(true);
    setFreeLoadError(null);

    try {
      // Single filter to avoid index: take not-verified, then refine in memory
      const qFreeBase = query(collection(db, "event_registrations"), where("is_verified", "==", false));
      const s1 = await getDocs(qFreeBase);
      let regs = s1.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Keep reasonable candidates: free & already "paid"
      regs = regs.filter(
        (r) => (r.payment_method || "").toLowerCase() === "free" && (r.status || "").toLowerCase() === "paid"
      );
      regs.sort((a, b) => toMs(b.created_date || b.created_at) - toMs(a.created_date || a.created_at));

      const hydrated = await hydrateFreeRegs(regs);
      setFreeRows(hydrated);
    } catch (e) {
      console.error("Free registrations query failed:", e);
      setFreeRows([]);
      setFreeLoadError("Failed to load free registrations.");
    } finally {
      setFreeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
    loadFree();
  }, [loadPayments, loadFree]);

  /* ---------------- actions (payments tab) ---------------- */
  const actPayment = async (row, action) => {
    setProcessing(row.id);
    setActionError(null);

    const approve = action === "approve";
    const newPaymentStatus = approve ? "successful" : "failed";

    try {
      await updateDoc(doc(db, "payments", row.id), {
        status: newPaymentStatus,
        verified_at: serverTimestamp(),
        receipt_verified: approve,
      });

      if (row.registration?.id) {
        await updateDoc(doc(db, "event_registrations", row.registration.id), {
          status: approve ? "paid" : "rejected",
          payment_method: providerLabel(row.provider),
          updated_at: serverTimestamp(),
          verified_at: approve ? serverTimestamp() : null,
          is_verified: approve, // flip to true on approve
          verification_note: approve ? "Verified by admin" : "Rejected by admin",
        });
      }

      if (approve && row.registration && row.event) {
        try {
          const invoiceRes = await sendEventRegistrationInvoice(
            { ...row.registration, status: "paid", is_verified: true },
            row.event,
            {
              id: row.id,
              status: newPaymentStatus,
              provider: row.provider,
              amount_usd: row.amount_usd,
              receipt_url: row.receipt_url,
              verified_at: new Date().toISOString(),
            }
          );
          if (!invoiceRes?.success && !invoiceRes?.skipped) {
            setActionError(invoiceRes?.error || "Failed to send invoice email.");
          }
        } catch (mailErr) {
          console.warn("Invoice email failed:", mailErr);
          setActionError("Invoice send failed (but payment was updated).");
        }
      }

      setRows((prev) => prev.filter((p) => p.id !== row.id));
    } catch (e) {
      console.error("Action error:", e);
      setActionError(`Failed to ${action} payment.`);
    } finally {
      setProcessing(null);
    }
  };

  /* ---------------- actions (free tab) ---------------- */
  const actFree = async (row, action) => {
    setFreeProcessing(row.id);
    setFreeActionError(null);

    const approve = action === "approve";

    try {
      await updateDoc(doc(db, "event_registrations", row.registration.id), {
        status: approve ? "paid" : "rejected",
        payment_method: "free",
        updated_at: serverTimestamp(),
        verified_at: approve ? serverTimestamp() : null,
        is_verified: approve, // flip to true on approve
        verification_note: approve ? "Verified by admin (free)" : "Rejected by admin (free)",
      });

      if (approve && row.registration && row.event) {
        try {
          const invoiceRes = await sendEventRegistrationInvoice(
            {
              ...row.registration,
              status: "paid",
              payment_method: "free",
              amount_usd: 0,
              amount_cad: 0,
              is_verified: true,
            },
            row.event,
            {
              id: `FREE-${row.registration.id}`,
              status: "successful",
              provider: "free",
              amount_usd: 0,
              receipt_url: null,
              verified_at: new Date().toISOString(),
            }
          );
          if (!invoiceRes?.success && !invoiceRes?.skipped) {
            setFreeActionError(
              invoiceRes?.error || "Failed to send invoice email for free registration."
            );
          }
        } catch (mailErr) {
          console.warn("Free invoice email failed:", mailErr);
          setFreeActionError("Invoice send failed (free registration updated).");
        }
      }

      setFreeRows((prev) => prev.filter((p) => p.id !== row.id));
    } catch (e) {
      console.error("Free action error:", e);
      setFreeActionError(`Failed to ${action} free registration.`);
    } finally {
      setFreeProcessing(null);
    }
  };

  /* ---------------- shared table renderers ---------------- */
  const renderPaymentRows = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      );
    }
    if (!rows.length) {
      return (
        <div className="text-center py-16">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">There are no pending payments to verify.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Payer</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => {
            const when = toDate(p.created_date);
            return (
              <TableRow key={p.id}>
                <TableCell>{when ? format(when, "MMM dd, yyyy") : "—"}</TableCell>
                <TableCell>
                  <div className="font-medium">{p.payer_name || "—"}</div>
                  <div className="text-sm text-gray-500">{p.payer_email || "—"}</div>
                </TableCell>
                <TableCell>{p.event?.title || "—"}</TableCell>
                <TableCell className="font-medium">
                  ${Number(p.amount_usd || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant={norm(p.provider) === "bank_transfer" ? "default" : "secondary"}>
                    {providerLabel(p.provider)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.receipt_url ? (
                    <a href={p.receipt_url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                    </a>
                  ) : (
                    <span className="text-gray-400">No receipt</span>
                  )}
                </TableCell>
                <TableCell>
                  {processing === p.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => actPayment(p, "approve")}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => actPayment(p, "reject")}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderFreeRows = () => {
    if (freeLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      );
    }
    if (!freeRows.length) {
      return (
        <div className="text-center py-16">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">There are no free registrations to verify.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Registrant</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {freeRows.map((p) => {
            const when = toDate(p.created_date);
            return (
              <TableRow key={p.id}>
                <TableCell>{when ? format(when, "MMM dd, yyyy") : "—"}</TableCell>
                <TableCell>
                  <div className="font-medium">{p.payer_name || "—"}</div>
                  <div className="text-sm text-gray-500">{p.payer_email || "—"}</div>
                </TableCell>
                <TableCell>{p.event?.title || "—"}</TableCell>
                <TableCell className="font-medium">$0.00</TableCell>
                <TableCell><Badge variant="secondary">free</Badge></TableCell>
                <TableCell><span className="text-gray-400">No receipt</span></TableCell>
                <TableCell>
                  {freeProcessing === p.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => actFree(p, "approve")}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Verify & Send Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => actFree(p, "reject")}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  /* ---------------- render ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              Payment Verification
            </h1>
          </div>

          <div className="flex gap-2">
            <Button variant={activeTab === "payments" ? "default" : "outline"} onClick={() => setActiveTab("payments")}>
              Payments
            </Button>
            <Button variant={activeTab === "free" ? "default" : "outline"} onClick={() => setActiveTab("free")}>
              Free Registrations
            </Button>
          </div>

          <Button
            onClick={() => (activeTab === "payments" ? loadPayments() : loadFree())}
            disabled={activeTab === "payments" ? loading : freeLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(activeTab === "payments" ? loading : freeLoading) ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {activeTab === "payments" && actionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Action Notice</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}
        {activeTab === "payments" && loadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Load Error</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {activeTab === "free" && freeActionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Action Notice</AlertTitle>
            <AlertDescription>{freeActionError}</AlertDescription>
          </Alert>
        )}
        {activeTab === "free" && freeLoadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Load Error</AlertTitle>
            <AlertDescription>{freeLoadError}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>
              {activeTab === "payments"
                ? "Pending Bank & E-Transfer Verifications"
                : "Pending Free Registration Verifications"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === "payments" ? renderPaymentRows() : renderFreeRows()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
