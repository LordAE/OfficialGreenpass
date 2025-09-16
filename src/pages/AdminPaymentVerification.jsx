
import React, { useState, useEffect, useCallback } from 'react';
import { Payment } from '@/api/entities';
import { EventRegistration } from '@/api/entities';
import { Event } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, CheckCircle, XCircle, Clock, FileText, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns'; // Corrected syntax here
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { sendEventRegistrationInvoice } from '../components/utils/invoiceSender';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function AdminPaymentVerification() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const loadPendingPayments = useCallback(async () => {
    setLoading(true);
    try {
      const pendingPayments = await Payment.filter({ status: 'pending_verification' });
      
      const populatedPayments = await Promise.all(pendingPayments.map(async (payment) => {
        try {
          const [registration] = await EventRegistration.filter({ id: payment.related_entity_id });
          const [event] = registration ? await Event.filter({ event_id: registration.event_id }) : [null];
          const [user] = payment.user_id ? await User.filter({ id: payment.user_id }) : [null];
          
          return {
            ...payment,
            registration,
            event,
            user,
          };
        } catch (e) {
          console.error(`Failed to populate data for payment ${payment.id}`, e);
          return payment; // Return payment without populated data on error
        }
      }));

      setPayments(populatedPayments);
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
      const newStatus = action === 'approve' ? 'successful' : 'failed';
      await Payment.update(payment.id, { 
        status: newStatus,
        receipt_verified: action === 'approve',
        verified_at: new Date().toISOString(),
        // verified_by: currentUser.id - would need to fetch admin user
      });

      if (action === 'approve') {
        if (payment.registration) {
          await EventRegistration.update(payment.registration.id, { status: 'paid' });
          if (payment.event) {
            const invoiceResult = await sendEventRegistrationInvoice(
              payment.registration,
              payment.event,
              { ...payment, status: newStatus }
            );

            if (invoiceResult.success) {
              await EventRegistration.update(payment.registration.id, { invoice_sent: true });
            } else if (invoiceResult.skipped) {
              console.log("Invoice skipped for guest registration:", invoiceResult.reason);
              // Don't show error for skipped guest emails
            } else if (invoiceResult.isRestrictionError) {
              console.log("Email restriction for guest registration:", invoiceResult.error);
              setActionError(`Payment approved successfully. Note: ${invoiceResult.error}`);
            } else {
              console.error("Invoice failed to send:", invoiceResult.error);
              setActionError(`Payment approved, but failed to send invoice to ${payment.registration.contact_email}. Reason: ${invoiceResult.error}. Please send manually.`);
            }
          }
        }
      }
      
      setPayments(prev => prev.filter(p => p.id !== payment.id));
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
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
                  {payments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.created_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{payment.payer_name}</div>
                        <div className="text-sm text-gray-500">{payment.payer_email}</div>
                        <Badge variant="outline" className="mt-1">{payment.user_id ? 'Registered' : 'Guest'}</Badge>
                      </TableCell>
                      <TableCell>{payment.event?.title || 'N/A'}</TableCell>
                      <TableCell className="font-medium">${payment.amount_usd.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={payment.provider === 'Bank Transfer' ? 'default' : 'secondary'}>
                          {payment.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2"/> View
                          </Button>
                        </a>
                      </TableCell>
                      <TableCell>
                        {processingId === payment.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(payment, 'approve')}>
                              <CheckCircle className="w-4 h-4 mr-2" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleAction(payment, 'reject')}>
                              <XCircle className="w-4 h-4 mr-2" /> Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
