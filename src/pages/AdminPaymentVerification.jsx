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
  limit,
} from "firebase/firestore";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import {
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { sendEventRegistrationInvoice } from "../components/utils/invoiceSender";

// ----- small utils -----
function toDate(val) {
  try {
    if (!val) return null;
    if (typeof val?.toDate === "function") return val.toDate();
    if (typeof val === "string" || typeof val === "number") return new Date(val);
    return null;
  } catch {
    return null;
  }
}

async function getRegistration(regId) {
  if (!regId) return null;
  try {
    const snap = await getDoc(doc(db, "eventRegistrations", regId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch {
    return null;
  }
}

async function getEventByIdOrField(eventId) {
  if (!eventId) return null;
  // Try direct doc first
  const direct = await getDoc(doc(db, "events", eventId));
  if (direct.exists()) return { id: direct.id, ...direct.data() };

  // Fallback: some schemas store a field "event_id" equal to the id
  const q = query(collection(db, "events"), where("event_id", "==", eventId), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
}

async function getUser(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch {
    return null;
  }
}

export default function AdminPaymentVerification() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const loadPendingPayments = useCallback(async () => {
    setLoading(true);
    try {
      // equality filter + orderBy (may prompt Firestore to suggest an index, which is fine)
      const payQ = query(
        collection(db, "payments"),
        where("status", "==", "pending_verification"),
        orderBy("created_date", "desc")
      );
      const paySnap = await getDocs(payQ);
      const base = paySnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const populated = await Promise.all(
        base.map(async (payment) => {
          try {
            const registration = await getRegistration(payment.related_entity_id);
            const event = registration ? await getEventByIdOrField(registration.event_id) : null;
            const user = payment.user_id ? await getUser(payment.user_id) : null;
            return { ...payment, registration, event, user };
          } catch (e) {
            console.error(`Failed to populate payment ${payment.id}`, e);
            return payment;
          }
        })
      );

      setPayments(populated);
    } catch (error) {
      console.error("Error loading pending payments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingPayments();
  }, [loadPendingPayments]);

  const handleAction = async (payment, action) => {
    setProcessingId(payment.id);
    setActionError(null);
    try {
      const newStatus = action === "approve" ? "successful" : "failed";

      // 1) Update payment
      await updateDoc(doc(db, "payments", payment.id), {
        status: newStatus,
        receipt_verified: action === "approve",
        verified_at: serverTimestamp(),
        // verified_by: currentUserId (wire this if/when you have auth context)
      });

      // 2) If approved, update registration + send invoice
      if (action === "approve" && payment.registration) {
        await updateDoc(doc(db, "eventRegistrations", payment.registration.id), {
          status: "paid",
          updated_at: serverTimestamp(),
        });

        if (payment.event) {
          const invoiceResult = await sendEventRegistrationInvoice(
            payment.registration,
            payment.event,
            { ...payment, status: newStatus }
          );

          if (invoiceResult?.success) {
            await updateDoc(doc(db, "eventRegistrations", payment.registration.id), {
              invoice_sent: true,
              updated_at: serverTimestamp(),
            });
          } else if (invoiceResult?.skipped) {
            // Guest registrations with no email, etc. — benign
            console.log("Invoice skipped:", invoiceResult.reason);
          } else if (invoiceResult?.isRestrictionError) {
            console.log("Email restriction:", invoiceResult.error);
            setActionError(`Payment approved. Note: ${invoiceResult.error}`);
          } else if (invoiceResult && invoiceResult.error) {
            console.error("Invoice failed:", invoiceResult.error);
            setActionError(
              `Payment approved, but failed to send invoice to ${
                payment.registration.contact_email || "recipient"
              }. Reason: ${invoiceResult.error}. Please send manually.`
            );
          }
        }
      }

      // 3) Remove from local list
      setPayments((prev) => prev.filter((p) => p.id !== payment.id));
    } catch (error) {
      console.error(`Error ${action}ing payment:`, error);
      setActionError(`Failed to ${action} payment. Please check console for details.`);
    } finally {
      setProcessingId(null);
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
          <Button onClick={loadPendingPayments} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {actionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Action Warning</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
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
            ) : payments.length > 0 ? (
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
                  {payments.map((payment) => {
                    const created = toDate(payment.created_date);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {created ? format(created, "MMM dd, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{payment.payer_name || payment.user?.full_name || "—"}</div>
                          <div className="text-sm text-gray-500">
                            {payment.payer_email || payment.user?.email || "—"}
                          </div>
                          <Badge variant="outline" className="mt-1">
                            {payment.user_id ? "Registered" : "Guest"}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.event?.title || "N/A"}</TableCell>
                        <TableCell className="font-medium">
                          ${Number(payment.amount_usd || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.provider === "Bank Transfer" ? "default" : "secondary"}>
                            {payment.provider || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.receipt_url ? (
                            <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" /> View
                              </Button>
                            </a>
                          ) : (
                            <span className="text-gray-400">No receipt</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {processingId === payment.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleAction(payment, "approve")}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(payment, "reject")}
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
