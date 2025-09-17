// src/pages/EventRegistrationPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Event, EventRegistration, User, BankSettings, Payment } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar, MapPin, CheckCircle, Info, ChevronLeft } from "lucide-react";
import { format } from 'date-fns';
import DynamicRegistrationForm from '../components/events/DynamicRegistrationForm';
import SharedPaymentGateway from '../components/payments/SharedPaymentGateway';
import PayPalCheckout from '@/components/payments/PayPalCheckout';
import { createPageUrl } from '@/components/URLRedirect';
import { getText } from '@/pages/Layout';

const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function EventRegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageBusy, setPageBusy] = useState(false); // for “Next/Back/Pay” spinners
  const [error, setError] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Tier, 2: Form, 3: Payment
  const [currentUser, setCurrentUser] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);
  const [createdRegistration, setCreatedRegistration] = useState(null);
  const [fxRate, setFxRate] = useState(1.35); // CAD per USD (fallback)

  const getParamEventId = () =>
    searchParams.get('eventid') ||
    searchParams.get('eventId') ||
    searchParams.get('id');

  const safeNormalizeEvent = (e) => ({
    ...e,
    title: e?.title || getText('Untitled Event'),
    location: e?.location || (e?.is_online ? getText('Online Event') : '-'),
    start: e?.start || e?.startDate,
    end: e?.end || e?.endDate,
    registration_tiers: Array.isArray(e?.registration_tiers) ? e.registration_tiers : [],
  });

  const fetchEventDetails = useCallback(async (rawId) => {
    setLoading(true);
    setError(null);
    try {
      if (!rawId) {
        setError(getText('Event ID is missing.'));
        return;
      }

      // Try by event_id first
      let e = null;
      try {
        const [byEventId] = await Event.filter({ event_id: rawId });
        if (byEventId) e = byEventId;
      } catch {}

      // Fallback: try direct get by doc id (if your entities layer supports it)
      if (!e && typeof Event.get === 'function') {
        try {
          const byDoc = await Event.get(rawId);
          if (byDoc) e = byDoc;
        } catch {}
      }

      // Last fallback: brute force (avoid if your dataset is huge)
      if (!e) {
        try {
          const all = await Event.list();
          e = all.find(x => String(x.id) === String(rawId) || String(x.event_id) === String(rawId));
        } catch {}
      }

      if (!e) {
        setError(getText('Event not found.'));
        return;
      }

      const normalized = safeNormalizeEvent(e);
      setEvent(normalized);

      // Load current user (optional)
      try {
        const me = await User.me();
        setCurrentUser(me || null);
      } catch {
        setCurrentUser(null);
      }

      // FX rate (optional)
      try {
        const bankSettings = await BankSettings.filter({ key: 'CAD_USD_FX_RATE' });
        if (bankSettings?.length) setFxRate(toNumber(bankSettings[0].value, 1.35));
      } catch {}

      // Preselect tier: URL > single-tier > cheapest paid tier
      const tiers = normalized.registration_tiers;
      const tierKey = searchParams.get('tierKey');
      if (tierKey && tiers?.length) {
        const t = tiers.find(t => t.key === tierKey);
        if (t) setSelectedTier(t);
      } else if (tiers?.length === 1) {
        setSelectedTier(tiers[0]);
      } else if (tiers?.length > 1) {
        const cheapest = [...tiers].sort((a, b) => toNumber(a.price_usd) - toNumber(b.price_usd))[0];
        setSelectedTier(cheapest || null);
      }
    } catch (err) {
      console.error("Error fetching event details:", err);
      setError(getText('Failed to load event details. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEventDetails(getParamEventId());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Legacy direct submit handler (kept for compatibility)
  const handleRegistrationSubmit = async (formData) => {
    if (!event || !selectedTier) return;
    setPageBusy(true);
    setRegistrationError(null);

    const eventId = event.event_id || event.id;

    try {
      const priceUSD = toNumber(selectedTier.price_usd, 0);
      const registrationPayload = {
        event_id: eventId,
        role: selectedTier.key,
        contact_name: formData.contact_name || '',
        contact_email: formData.contact_email || '',
        phone: formData.phone || '',
        organization_name: formData.organization_name || '',
        guest_country: formData.guest_country || '',
        amount_usd: priceUSD,
        amount_cad: priceUSD * fxRate,
        fx_rate: fxRate,
        is_guest_registration: !currentUser,
        ...formData,
        reservation_code: `EVT-${String(eventId).slice(-4)}-${Date.now().toString().slice(-6)}`,
        ...(currentUser && { user_id: currentUser.id }),
        status: priceUSD > 0 ? 'pending_payment' : 'free',
      };

      const newRegistration = await EventRegistration.create(registrationPayload);

      // Generate QR for check-in
      const qrDataString = JSON.stringify({
        reservation_code: newRegistration.reservation_code,
        event_id: eventId,
        registration_id: newRegistration.id,
        attendee_name: registrationPayload.contact_name,
        organization: registrationPayload.organization_name,
        tier: selectedTier.name
      });
      const qr_code_url = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrDataString)}`;

      const finalRegistration = await EventRegistration.update(newRegistration.id, {
        qr_data: qrDataString,
        qr_code_url
      });

      // If free tier, skip payment step
      if (priceUSD <= 0) {
        await EventRegistration.update(finalRegistration.id, {
          status: 'paid',
          payment_method: 'free',
          payment_date: new Date().toISOString(),
        });
        navigate(createPageUrl(`EventRegistrationSuccess?registrationId=${finalRegistration.id}`));
        return;
      }

      setCreatedRegistration(finalRegistration);
      setCurrentStep(3);
    } catch (err) {
      console.error("Registration failed:", err);
      setRegistrationError(err.message || getText("An unexpected error occurred during registration."));
    } finally {
      setPageBusy(false);
    }
  };

  const createPaymentRecord = async (registration, method, status, transactionId, receiptUrl, paymentDetails) => {
    const paymentPayload = {
      related_entity_id: registration.id,
      related_entity_type: 'event_registration',
      provider: method,
      amount_usd: toNumber(registration.amount_usd),
      amount_cad: toNumber(registration.amount_cad),
      fx_rate: toNumber(registration.fx_rate, fxRate),
      status,
      transaction_id: transactionId,
      receipt_url: receiptUrl || null,
      payer_name: registration.contact_name,
      payer_email: registration.contact_email,
      payment_details: paymentDetails || {},
      ...(currentUser && { user_id: currentUser.id }),
    };

    const newPayment = await Payment.create(paymentPayload);
    await EventRegistration.update(registration.id, { payment_id: newPayment.id });
    return newPayment;
  };

  const handlePaymentSuccess = async (paymentMethod, transactionId, paymentDetails) => {
    setPageBusy(true);
    setRegistrationError(null);
    try {
      if (!createdRegistration) throw new Error("No registration found to update.");

      const newPayment = await createPaymentRecord(
        createdRegistration,
        paymentMethod,            // "paypal" | "card" | "bank_transfer" (card/bank come from SharedPaymentGateway)
        'successful',
        transactionId,
        null,
        paymentDetails
      );

      await EventRegistration.update(createdRegistration.id, {
        status: 'paid',
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        transaction_id: transactionId,
        payment_id: newPayment.id,
      });

      navigate(createPageUrl(`EventRegistrationSuccess?registrationId=${createdRegistration.id}`));
    } catch (err) {
      console.error("Error processing payment success:", err);
      setRegistrationError(err.message || getText("Payment was successful but there was an error updating your registration. Please contact support."));
    } finally {
      setPageBusy(false);
    }
  };

  const handleBankTransferSubmit = async (paymentMethod, receiptUrl, referenceCode, details, bankInfo) => {
    setPageBusy(true);
    setRegistrationError(null);
    try {
      if (!createdRegistration) throw new Error("No registration found to update.");

      const paymentDetails = {
        additional_info: details,
        bank_account_used: bankInfo
          ? {
              nickname: bankInfo.account_nickname,
              bank_name: bankInfo.bank_name,
              currency: bankInfo.currency
            }
          : null
      };

      const newPayment = await createPaymentRecord(
        createdRegistration,
        paymentMethod, // "bank_transfer"
        'pending_verification',
        referenceCode,
        receiptUrl,
        paymentDetails
      );

      await EventRegistration.update(createdRegistration.id, {
        status: 'pending_verification',
        payment_method: paymentMethod,
        proof_url: receiptUrl,
        transaction_id: referenceCode,
        payment_date: new Date().toISOString(),
        payment_id: newPayment.id,
      });

      navigate(createPageUrl(`EventRegistrationSuccess?registrationId=${createdRegistration.id}`));
    } catch (err) {
      console.error("Error processing bank transfer:", err);
      setRegistrationError(err.message || getText("Failed to submit payment. Please try again."));
    } finally {
      setPageBusy(false);
    }
  };

  // ---- RENDER GUARDS ----
  if (loading && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-700">{getText('Loading event details...')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">{getText('Error Loading Event')}</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link to={createPageUrl('Events')}>
            <Button>{getText('Back to Events')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">{getText('Event unavailable')}</h2>
          <p className="text-gray-600 mb-6">{getText('We could not load this event.')}</p>
          <Link to={createPageUrl('Events')}>
            <Button>{getText('Back to Events')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Past-event lockout (safe)
  const now = new Date();
  const eventStart = event?.start ? new Date(event.start) : null;
  const isPastEvent = eventStart ? eventStart < now : false;

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

  // ---- MAIN VIEW ----
  const priceUSD = toNumber(selectedTier?.price_usd, 0);
  const approxCAD = (priceUSD * fxRate).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pt-8">
        <div className="bg-white rounded-2xl shadow-lg">
          <div className="p-6 sm:p-8 border-b">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{event.title}</h2>
            <div className="flex items-center gap-4 text-gray-600 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{event.start ? format(new Date(event.start), 'PPP') : '-'}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{event.location || '-'}</span>
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
                onValueChange={(value) => setSelectedTier(event.registration_tiers?.find(t => t.key === value))}
                className="space-y-4"
              >
                {event.registration_tiers?.length ? (
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
                            <div className="text-2xl font-bold text-green-600">
                              ${toNumber(tier.price_usd, 0)}
                            </div>
                            <div className="text-sm text-gray-500">{getText('USD')}</div>
                          </div>
                        </div>
                        {tier.benefits?.length > 0 && (
                          <ul className="mt-3 space-y-1 text-sm text-gray-700">
                            {tier.benefits.map((benefit, bIndex) => (
                              <li key={bIndex} className="flex items-start gap-2">
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
                    <AlertDescription>{getText('Registration options are not available for this event.')}</AlertDescription>
                  </Alert>
                )}
              </RadioGroup>
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedTier || pageBusy}
                className="w-full mt-6"
              >
                {pageBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : getText('Next')}
              </Button>
            </div>
          )}

          {/* Step 2: Registration Form */}
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
                onRegistrationComplete={(registration) => {
                  // If DynamicRegistrationForm already created the registration, go straight to payment
                  setCreatedRegistration(registration);
                  setCurrentStep(toNumber(selectedTier.price_usd, 0) > 0 ? 3 : 2);
                  setPageBusy(false);
                }}
                // If you want to keep the legacy “submit” path:
                onLegacySubmit={handleRegistrationSubmit}
              />
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && createdRegistration && toNumber(selectedTier?.price_usd, 0) > 0 && (
            <div className="p-6 sm:p-8">
              <h3 className="text-xl font-semibold mb-4">{getText('Complete Your Payment')}</h3>
              <p className="text-gray-600 mb-6">
                {getText('Your registration for')}{' '}
                <span className="font-semibold">
                  {createdRegistration.contact_name || createdRegistration.organization_name || getText('this event')}
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
                    <span>${toNumber(selectedTier.price_usd, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{getText('Amount Due (CAD Approx.):')}</span>
                    <span>${approxCAD}</span>
                  </div>
                </CardContent>
              </Card>

              {/* PayPal */}
              <div className="mb-6">
                <PayPalCheckout
                  amountUSD={toNumber(selectedTier.price_usd, 0)}
                  itemDescription={`${event.title} - ${selectedTier.name} Registration`}
                  registrationId={createdRegistration.id}
                  payerName={createdRegistration.contact_name}
                  payerEmail={createdRegistration.contact_email}
                  onProcessing={() => setPageBusy(true)}
                  onSuccess={handlePaymentSuccess} // ("paypal", captureId, details)
                  onError={(msg) => setRegistrationError(msg)}
                />
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="border-t" />
                <div className="absolute inset-0 -top-3 flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-500">{getText('or')}</span>
                </div>
              </div>

              {/* Cards / Bank transfer */}
              <SharedPaymentGateway
                amountUSD={toNumber(selectedTier.price_usd, 0)}
                amountCAD={toNumber(selectedTier.price_usd, 0) * fxRate}
                itemDescription={`${event.title} - ${selectedTier.name} Registration`}
                relatedEntityId={createdRegistration.id}
                relatedEntityType="event_registration"
                payerName={createdRegistration.contact_name}
                payerEmail={createdRegistration.contact_email}
                onCardPaymentSuccess={handlePaymentSuccess}
                onBankTransferInitiated={handleBankTransferSubmit}
                onProcessing={() => setPageBusy(true)}
              />

              <Button
                variant="ghost"
                onClick={() => setCurrentStep(2)}
                className="w-full mt-4 flex items-center justify-center text-gray-600"
                disabled={pageBusy}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> {getText('Back to Information')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
