// src/pages/EventRegistrationPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';

import {
  Event,
  EventRegistration,
  User,
  BankSettings,
  Payment,
} from '@/api/entities';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar, MapPin, CheckCircle, Info, ChevronLeft } from "lucide-react";
import { format } from 'date-fns';

import DynamicRegistrationForm from '@/components/events/DynamicRegistrationForm';
import SharedPaymentGateway from '@/components/payments/SharedPaymentGateway';

import { createPageUrl } from '@/components/URLRedirect';
import { getText } from '@/pages/Layout';
import { sendEventRegistrationInvoice } from '@/components/utils/invoiceSender';
import { sendEventRegistrationConfirmation } from '@/components/utils/eventEmailSender';

// Coerce Firestore strings/Timestamps into JS Date
const toDate = (v) => (v instanceof Date ? v : new Date(v || 0));

/** Remove undefined/null, empty objects/arrays, and strip File/Blob anywhere */
const prune = (val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof File !== 'undefined' && (val instanceof File || val instanceof Blob)) return undefined;

  if (Array.isArray(val)) {
    const arr = val.map(prune).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      const c = prune(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return val;
};

// Build a lightweight, guest-safe payload to show on Success page without Firestore reads
const makeSuccessPayload = ({ event, registration, tier }) => ({
  event_id: event?.event_id || event?.id,
  event_title: event?.title,
  starts_at: event?.start,
  location: event?.location,
  registration_id: registration?.id,
  reservation_code: registration?.reservation_code,
  contact_name: registration?.contact_name,
  contact_email: registration?.contact_email,
  role: tier?.role,
  tier_name: tier?.name,
  amount_usd: Number(tier?.price_usd ?? 0),
  payment_method: Number(tier?.price_usd ?? 0) > 0 ? 'paypal' : 'free',
});

export default function EventRegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageBusy, setPageBusy] = useState(false);
  const [error, setError] = useState(null);

  const [selectedTier, setSelectedTier] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Tier → 2: Form → 3: Payment
  const [currentUser, setCurrentUser] = useState(null);

  const [registrationError, setRegistrationError] = useState(null);
  const [createdRegistration, setCreatedRegistration] = useState(null);
  const [createdPayment, setCreatedPayment] = useState(null);

  // Default FX (overridden by BankSettings if available)
  const [fxRate, setFxRate] = useState(1.35);

  const fetchEventDetails = useCallback(async (eventId) => {
    setLoading(true);
    setError(null);

    try {
      // 1) Event (prefers natural key event_id via entities.js)
      const [eventData] = await Event.filter({ event_id: eventId });
      if (!eventData) {
        setError(getText('Event not found.'));
        navigate(createPageUrl('Events'));
        return;
      }
      setEvent(eventData);

      // 2) Current user (optional)
      try {
        const user = await User.me();
        setCurrentUser(user || null);
      } catch {
        setCurrentUser(null);
      }

      // 3) FX rate (from BankSettings)
      try {
        const rows = await BankSettings.filter({ key: 'CAD_USD_FX_RATE' });
        if (Array.isArray(rows) && rows.length > 0) {
          const v = parseFloat(rows[0].value);
          if (!Number.isNaN(v)) setFxRate(v);
        }
      } catch (fxErr) {
        console.warn('FX rate fetch failed, using default.', fxErr);
      }

      // 4) Preselect tier (URL ?tierKey=...) or single-tier default
      const tierKey = searchParams.get('tierKey');
      if (tierKey && Array.isArray(eventData.registration_tiers)) {
        const t = eventData.registration_tiers.find(x => x.key === tierKey);
        if (t) setSelectedTier(t);
      } else if (eventData.registration_tiers?.length === 1) {
        setSelectedTier(eventData.registration_tiers[0]);
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError(getText('Failed to load event details. Please try again.'));
      navigate(createPageUrl('Events'));
    } finally {
      setLoading(false);
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    // Accept multiple casings/keys to match inbound links
    const eventId =
      searchParams.get('eventId') ||
      searchParams.get('eventid') ||
      searchParams.get('id');

    if (eventId) {
      fetchEventDetails(eventId);
    } else {
      if (location.pathname.toLowerCase().includes('/eventregistration')) {
        setError(getText('Event ID is missing.'));
      }
      setLoading(false);
    }
  }, [searchParams, fetchEventDetails, location.pathname]);

  // ---------- Payment helpers ----------
  const createPaymentRecord = async (registration, method, status, transactionId, receiptUrl, paymentDetails) => {
    const payload = prune({
      related_entity_id: registration.id,
      related_entity_type: 'event_registration',
      provider: method, // 'paypal' | 'bank_transfer' | 'etransfer' | 'free'
      amount_usd: registration.amount_usd,
      amount_cad: registration.amount_cad,
      fx_rate: registration.fx_rate,
      status,                            // 'successful' | 'pending_verification' | 'failed'
      transaction_id: transactionId || null,
      receipt_url: receiptUrl || null,
      payer_name: registration.contact_name,
      payer_email: registration.contact_email,
      payment_details: paymentDetails || null,
      ...(currentUser && { user_id: currentUser.id }),
    });

    const newPayment = await Payment.create(payload); // entities.js adds timestamps
    await EventRegistration.update(registration.id, { payment_id: newPayment.id });
    setCreatedPayment(newPayment);
    return newPayment;
  };

  const handlePaymentSuccess = async (paymentMethod, transactionId, paymentDetails) => {
    setPageBusy(true);
    setRegistrationError(null);

    try {
      if (!createdRegistration) throw new Error('No registration found to update.');

      const newPayment = await createPaymentRecord(
        createdRegistration,
        paymentMethod,           // 'paypal'
        'successful',
        transactionId,
        null,
        prune(paymentDetails)
      );

      const finalReg = await EventRegistration.update(createdRegistration.id, {
        status: 'paid',
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        transaction_id: transactionId,
        payment_id: newPayment.id,
      });

      // Email: confirmation/invoice
      try {
        const sent = await sendEventRegistrationInvoice(finalReg, event, newPayment);
        if (sent?.success) {
          await EventRegistration.update(finalReg.id, { invoice_sent: true, qr_email_sent: true });
        }
      } catch (e) {
        console.warn('Invoice email failed:', e);
      }

      navigate(createPageUrl(`EventRegistrationSuccess?registrationId=${createdRegistration.id}`));
    } catch (err) {
      console.error('Error processing payment success:', err);
      setRegistrationError(err.message || getText('Payment was successful but there was an error updating your registration. Please contact support.'));
    } finally {
      setPageBusy(false);
    }
  };

  const handleBankTransferSubmit = async (paymentMethod, receiptUrl, referenceCode, details, bankInfo) => {
    setPageBusy(true);
    setRegistrationError(null);

    try {
      if (!createdRegistration) throw new Error('No registration found to update.');

      const paymentDetails = prune({
        additional_info: details || '',
        bank_account_used: bankInfo ? prune({
          nickname: bankInfo.account_nickname,
          bank_name: bankInfo.bank_name,
          currency: bankInfo.currency,
        }) : undefined,
      });

      const newPayment = await createPaymentRecord(
        createdRegistration,
        paymentMethod,          // 'bank_transfer' | 'etransfer'
        'pending_verification',
        referenceCode,
        receiptUrl,
        paymentDetails
      );

      const finalReg = await EventRegistration.update(createdRegistration.id, {
        status: 'pending_verification',
        payment_method: paymentMethod,
        proof_url: receiptUrl || null,
        transaction_id: referenceCode || null,
        payment_date: new Date().toISOString(),
        payment_id: newPayment.id,
      });

      // Simple holding email (optional)
      try {
        await sendEventRegistrationConfirmation(finalReg, event, {
          amount_usd: finalReg.amount_usd,
          provider: paymentMethod,
        });
        await EventRegistration.update(finalReg.id, { pending_email_sent: true });
      } catch (e) {
        console.warn('Pending verification email failed:', e);
      }

      navigate(createPageUrl(`EventRegistrationSuccess?registrationId=${createdRegistration.id}`));
    } catch (err) {
      console.error('Error processing bank transfer:', err);
      setRegistrationError(err.message || getText('Failed to submit payment. Please try again.'));
    } finally {
      setPageBusy(false);
    }
  };

  // ---------- FREE TIER: auto-confirm (skip payment), email, and go to Success ----------
  const finalizeFreeRegistration = async (registration, tier) => {
    setPageBusy(true);
    setRegistrationError(null);

    try {
      // Mark as paid with "free" method
      const finalReg = await EventRegistration.update(registration.id, {
        status: 'paid',
        payment_method: 'free',
        payment_date: new Date().toISOString(),
        transaction_id: null,
      });

      // Optional: also create a zero-amount payment record for audit trails
      try {
        await createPaymentRecord(
          { ...finalReg, amount_usd: 0, amount_cad: 0 },
          'free',
          'successful',
          null,
          null,
          { note: 'Auto-confirmed free registration' }
        );
      } catch (e) {
        // Not fatal; keep going
        console.warn('Free payment record creation failed:', e);
      }

      // Send confirmation email (no invoice for free)
      try {
        await sendEventRegistrationConfirmation(finalReg, event, {
          amount_usd: 0,
          provider: 'free'
        });
        await EventRegistration.update(finalReg.id, { qr_email_sent: true });
      } catch (e) {
        console.warn('Free confirmation email failed:', e);
      }

      // Build a guest-safe payload and pass via both router state and base64 query (?p=...) so refresh still shows details
      const payload = makeSuccessPayload({ event, registration: finalReg, tier });
      let encoded = '';
      try {
        encoded = btoa(JSON.stringify(payload));
      } catch {
        // if window.btoa fails for any reason, just skip adding p=
      }

      const successUrlBase = createPageUrl('EventRegistrationSuccess');
      const successUrl = encoded
        ? `${successUrlBase}?registrationId=${finalReg.id}&p=${encodeURIComponent(encoded)}`
        : `${successUrlBase}?registrationId=${finalReg.id}`;

      navigate(successUrl, { state: { payload } });
    } catch (err) {
      console.error('Error finalizing free registration:', err);
      setRegistrationError(err.message || getText('Failed to finalize your free registration. Please contact support.'));
    } finally {
      setPageBusy(false);
    }
  };

  // ---------- Loading & Guards ----------
  if (loading && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-700">{getText('Loading event details...')}</span>
      </div>
    );
  }

  // If loading is done but we still have no event, show a friendly error
  if (!loading && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">{getText('Event not found')}</h2>
          <p className="text-gray-700 mb-6">{error || getText('Please check your link and try again.')}</p>
          <Link to={createPageUrl('Events')}>
            <Button>{getText('Back to Events')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const isPastEvent = toDate(event.start) < now;
  if (isPastEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">{getText('Registration Closed')}</h2>
          <p className="text-gray-600 mb-4">{getText('Registration for this event has closed.')}</p>
          <Link to={createPageUrl('Events')}>
            <Button>{getText('Back to Events')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pt-8">
        <div className="bg-white rounded-2xl shadow-lg">
          <div className="p-6 sm:p-8 border-b">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{event.title}</h2>
            <div className="flex items-center gap-4 text-gray-600 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(toDate(event.start), 'PPP')}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            </div>

            {registrationError && (
              <Alert variant="destructive" className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>{registrationError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Step 1: Tier Selection */}
          {currentStep === 1 && (
            <div className="p-6 sm:p-8">
              <h3 className="text-xl font-semibold mb-4">{getText('Select Registration Type')}</h3>
              <RadioGroup
                value={selectedTier?.key || ''}
                onValueChange={(value) =>
                  setSelectedTier(event.registration_tiers.find((t) => t.key === value))
                }
                className="space-y-4"
              >
                {Array.isArray(event.registration_tiers) && event.registration_tiers.length > 0 ? (
                  event.registration_tiers.map((tier) => (
                    <div
                      key={tier.key}
                      className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-50"
                    >
                      <RadioGroupItem value={tier.key} id={tier.key} className="flex-shrink-0" />
                      <Label htmlFor={tier.key} className="flex flex-col flex-grow cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{tier.name}</h3>
                            {tier.description && (
                              <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">${tier.price_usd}</div>
                            <div className="text-sm text-gray-500">{getText('USD')}</div>
                          </div>
                        </div>
                        {Array.isArray(tier.benefits) && tier.benefits.length > 0 && (
                          <ul className="mt-3 space-y-1 text-sm text-gray-700">
                            {tier.benefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Label>
                    </div>
                  ))
                ) : (
                  <Alert>
                    <AlertDescription>
                      {getText('Registration options are not available for this event.')}
                    </AlertDescription>
                  </Alert>
                )}
              </RadioGroup>

              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedTier || loading}
                className="w-full mt-6"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : getText('Next')}
              </Button>
            </div>
          )}

          {/* Step 2: Registration Form (Dynamic) */}
          {currentStep === 2 && selectedTier && (
            <div className="p-6 sm:p-8">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <ChevronLeft className="w-4 h-4" /> {getText('Back to options')}
              </button>

              <h3 className="text-xl font-semibold mb-4">{getText('Your Information')}</h3>

              <DynamicRegistrationForm
                event={event}
                selectedTier={selectedTier}
                currentUser={currentUser}
                fxRate={fxRate}
                onRegistrationComplete={async (registration) => {
                  setCreatedRegistration(registration);

                  const price = Number(selectedTier?.price_usd ?? 0);
                  if (price <= 0) {
                    // FREE TIER: auto-confirm, email, and go to success (guest-friendly)
                    await finalizeFreeRegistration(registration, selectedTier);
                    return;
                  }

                  // PAID TIER: continue to payment step
                  setCurrentStep(3);
                }}
              />
            </div>
          )}

          {/* Step 3: Payment (SharedPaymentGateway ONLY for paid tiers) */}
          {currentStep === 3 && createdRegistration && Number(selectedTier?.price_usd ?? 0) > 0 && (
            <div className="p-6 sm:p-8">
              <h3 className="text-xl font-semibold mb-4">{getText('Complete Your Payment')}</h3>
              <p className="text-gray-600 mb-6">
                {getText('Your registration for')}{' '}
                <span className="font-semibold">
                  {createdRegistration.contact_name ||
                    createdRegistration.organization_name ||
                    getText('this event')}
                </span>{' '}
                {getText('is being held. Please complete the payment to confirm your spot.')}
              </p>

              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800">
                    <Info className="w-5 h-5 mr-2" />
                    {getText('Payment Summary')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-lg font-semibold text-gray-800 mb-2">
                    <span>{getText('Amount Due (USD):')}</span>
                    <span>${Number(selectedTier.price_usd).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{getText('Amount Due (CAD Approx.):')}</span>
                    <span>${(Number(selectedTier.price_usd) * Number(fxRate)).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <SharedPaymentGateway
                amountUSD={Number(selectedTier.price_usd)}
                amountCAD={Number(selectedTier.price_usd) * Number(fxRate)}
                itemDescription={`${event.title} - ${selectedTier.name} Registration`}
                relatedEntityId={createdRegistration.id}
                relatedEntityType="event_registration"
                payerName={createdRegistration.contact_name}
                payerEmail={createdRegistration.contact_email}
                onCardPaymentSuccess={handlePaymentSuccess}
                onBankTransferInitiated={handleBankTransferSubmit}
                onProcessing={() => setPageBusy(true)}
                onDoneProcessing={() => setPageBusy(false)}
                onError={(e) => setRegistrationError(e?.message || 'Payment error')}
              />

              <Button
                variant="ghost"
                onClick={() => setCurrentStep(2)}
                className="w-full mt-4 flex items-center justify-center text-gray-600"
                disabled={pageBusy}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {getText('Back to Information')}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
