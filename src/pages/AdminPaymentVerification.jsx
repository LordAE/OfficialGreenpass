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

const getRegistration = async (id) => {
  if (!id) return null;
  const snap = await getDoc(doc(db, "event_registrations", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

const getEvent = async (eventId) => {
  if (!eventId) return null;
  // try direct document id
  const direct = await getDoc(doc(db, "events", eventId));
  if (direct.exists()) return { id: direct.id, ...direct.data() };
  // fallback: match natural key in events.event_id
  const qEvt = query(collection(db, "events"), where("event_id", "==", eventId));
  const s = await getDocs(qEvt);
  if (!s.empty) {
    const d = s.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
};

const norm = (s) => (s || "").toString().trim().toLowerCase();
const providerLabel = (key) => (key || "—").replaceAll("_", " ");
const toMs = (v) => {
  if (!v) return 0;
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};

/* ------------------------------ component ---------------------------- */
export default function AdminPaymentVerification() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const hydrateRows = async (payments) => {
    return Promise.all(
      payments.map(async (p) => {
        const registration = await getRegistration(p.related_entity_id);
        const event = registration ? await getEvent(registration.event_id) : null;

        return {
          id: p.id, // payment id
          created_date: p.created_date || registration?.created_date || registration?.created_at || null,
          payer_name: p.payer_name || registration?.contact_name || "—",
          payer_email: p.payer_email || registration?.contact_email || "—",
          amount_usd: p.amount_usd ?? 0,
          provider: p.provider || "—", // "bank_transfer" | "etransfer" | ...
          receipt_url: p.receipt_url || registration?.proof_url || null,
          registration,
          event,
        };
      })
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      // Preferred: with orderBy(created_date desc) — requires a composite index.
      const qPay = query(
        collection(db, "payments"),
        where("status", "==", "pending_verification"),
        orderBy("created_date", "desc")
      );
      const snap = await getDocs(qPay);
      const base = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const hydrated = await hydrateRows(base);
      setRows(hydrated);
    } catch (orderedErr) {
      console.warn("Ordered payments query failed, falling back to client-side sort:", orderedErr?.message || orderedErr);

      try {
        // Fallback: read without orderBy and sort in-memory by created_date.
        const qPayNoOrder = query(
          collection(db, "payments"),
          where("status", "==", "pending_verification")
        );
        const snap2 = await getDocs(qPayNoOrder);
        const base2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
        base2.sort((a, b) => toMs(b.created_date) - toMs(a.created_date));

        const hydrated2 = await hydrateRows(base2);
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

  useEffect(() => {
    load();
  }, [load]);

  const act = async (row, action) => {
    setProcessing(row.id);
    setActionError(null);

    const approve = action === "approve";
    const newPaymentStatus = approve ? "successful" : "failed";

    try {
      // 1) Update the payment document
      await updateDoc(doc(db, "payments", row.id), {
        status: newPaymentStatus,
        verified_at: serverTimestamp(),
        receipt_verified: approve,
      });

      // 2) Update the related registration (if present)
      if (row.registration?.id) {
        await updateDoc(doc(db, "event_registrations", row.registration.id), {
          status: approve ? "paid" : "rejected",
          payment_method: providerLabel(row.provider),
          updated_at: serverTimestamp(),
          verified_at: approve ? serverTimestamp() : null,
          verification_note: approve ? "Verified by admin" : "Rejected by admin",
        });
      }

      // 3) Email the invoice if approved
      if (approve && row.registration && row.event) {
        try {
          const invoiceRes = await sendEventRegistrationInvoice(
            { ...row.registration, status: "paid" },
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
          setActionError("Invoice sent failed (but payment was updated).");
        }
      }

      // 4) Remove from table
      setRows((prev) => prev.filter((p) => p.id !== row.id));
    } catch (e) {
      console.error("Action error:", e);
      setActionError(`Failed to ${action} payment.`);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              Payment Verification
            </h1>
          </div>
          <Button onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {actionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Action Notice</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {loadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Load Error</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Pending Bank & E-Transfer Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : rows.length ? (
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
                                onClick={() => act(p, "approve")}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => act(p, "reject")}
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
            ) : (
              <div className="text-center py-16">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-600">There are no pending payments to verify.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
