// src/pages/EventDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  MapPin,
  CheckSquare,
  ArrowLeft,
  Users,
  Loader2,
  ChevronLeft,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import YouTubeEmbed from "../components/YouTubeEmbed";
import Countdown from "../components/events/Countdown";
import DynamicRegistrationForm from "@/components/events/DynamicRegistrationForm";
import SharedPaymentGateway from "@/components/payments/SharedPaymentGateway"; // PayPal-only component
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";

/* ---------- Entities / Emails ---------- */
import { User, BankSettings, EventRegistration, Payment } from "@/api/entities";
import { sendEventRegistrationInvoice } from "@/components/utils/invoiceSender";
import { sendEventRegistrationConfirmation } from "@/components/utils/eventEmailSender";

/* ---------- Firebase ---------- */
import { db } from "@/firebase";
import { collection, query, where, limit, getDocs } from "firebase/firestore";

/* ---------- Helpers ---------- */
const toJsDate = (v) =>
  v && typeof v?.toDate === "function" ? v.toDate() : new Date(v || Date.now());
const toDate = (v) => (v instanceof Date ? v : new Date(v || 0));

/** Remove undefined/null, empty objects/arrays, and strip File/Blob anywhere */
const prune = (val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof File !== "undefined" && (val instanceof File || val instanceof Blob)) return undefined;

  if (Array.isArray(val)) {
    const arr = val.map(prune).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      const c = prune(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return val;
};

/** Fetch a single event by its event_id (string). */
const fetchEventByEventId = async (eventId) => {
  const q = query(collection(db, "events"), where("event_id", "==", eventId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

/* ---- Timezone-aware parsing (same logic as in Countdown) ---- */
function parseZonedLocalToDate(raw, timeZone) {
  if (!raw || !timeZone) return null;
  const norm = String(raw).trim().replace(" ", "T");
  const [datePart, timePart = "00:00:00"] = norm.split("T");

  const [y, m, d] = datePart.split("-").map((x) => parseInt(x, 10));
  const [hh, mm = "00", ss = "00"] = timePart.split(":");

  const asUTC = new Date(
    Date.UTC(
      y,
      (m || 1) - 1,
      d || 1,
      parseInt(hh ?? "0", 10),
      parseInt(mm ?? "0", 10),
      parseInt(ss ?? "0", 10)
    )
  );

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(asUTC);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const tzAsUTC = Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    parseInt(map.hour, 10),
    parseInt(map.minute, 10),
    parseInt(map.second, 10)
  );
  const offsetMinutes = (tzAsUTC - asUTC.getTime()) / 60000;
  return new Date(asUTC.getTime() - offsetMinutes * 60 * 1000);
}
function toTargetInstant(targetDate, timeZone) {
  if (!targetDate) return null;
  if (targetDate instanceof Date) return targetDate;
  if (typeof targetDate === "number") return new Date(targetDate);
  if (typeof targetDate === "string") {
    const s = targetDate.trim().replace(/\s+/, "T");
    const hasExplicitOffset = /Z|[+\-]\d{2}:\d{2}$/.test(s);
    if (hasExplicitOffset) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    if (timeZone) {
      const d = parseZonedLocalToDate(s, timeZone);
      return d && !isNaN(d.getTime()) ? d : null;
    }
    const d = new Date(s); // fallback: local
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
const normalizeTs = (v) => (v && typeof v.toDate === "function" ? v.toDate() : v);

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
  payment_method: Number(tier?.price_usd ?? 0) > 0 ? "paypal" : "free",
});

export default function EventDetails() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Registration state
  const [selectedTier, setSelectedTier] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [fxRate, setFxRate] = useState(1.35);

  // Payment popup state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdRegistration, setCreatedRegistration] = useState(null);
  const [pageBusy, setPageBusy] = useState(false);
  const [registrationError, setRegistrationError] = useState(null);

  const navigate = useNavigate();

  // Load event
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const url = new URL(window.location.href);
        const eventId =
          url.searchParams.get("id") ||
          url.searchParams.get("eventId") ||
          url.searchParams.get("eventid");

        if (!eventId) {
          setEvent(null);
        } else {
          const ev = await fetchEventByEventId(eventId);
          setEvent(ev);
        }
      } catch (e) {
        console.error("Error loading event:", e);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load current user + FX (same behavior as registration page)
  useEffect(() => {
    const loadUserAndFx = async () => {
      try {
        const u = await User.me();
        setCurrentUser(u || null);
      } catch {
        setCurrentUser(null);
      }
      try {
        const rows = await BankSettings.filter({ key: "CAD_USD_FX_RATE" });
        if (Array.isArray(rows) && rows.length > 0) {
          const v = parseFloat(rows[0].value);
          if (!Number.isNaN(v)) setFxRate(v);
        }
      } catch (fxErr) {
        console.warn("FX rate fetch failed, using default.", fxErr);
      }
    };
    loadUserAndFx();
  }, []);

  const handleBackClick = () => navigate(-1);

  // Button path: select → scroll to the form
  const handleSelectTierAndScroll = (tier) => {
    setSelectedTier(tier);
    const el = document.getElementById("registration-start");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Lock body scroll while modal open; close on Esc
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (showPaymentModal) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showPaymentModal]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !pageBusy && setShowPaymentModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageBusy]);

  // ---------- Auto-select single tier (NO auto scroll; options panel still visible) ----------
  useEffect(() => {
    if (!event) return;
    const tiers = Array.isArray(event.registration_tiers) ? event.registration_tiers : [];
    if (tiers.length === 1 && !selectedTier) {
      setSelectedTier(tiers[0]);
      // no auto-scroll
    }
  }, [event, selectedTier]);

  // === Timezone-aware instants ===
  const startInstant = useMemo(
    () => toTargetInstant(normalizeTs(event?.start), event?.timezone),
    [event?.start, event?.timezone]
  );
  const endInstant = useMemo(
    () => toTargetInstant(normalizeTs(event?.end), event?.timezone),
    [event?.end, event?.timezone]
  );

  // For display fallbacks (date-fns formats in viewer's local TZ)
  const startDate = startInstant || (event ? toJsDate(event.start) : null);
  const endDate = endInstant || (event ? toJsDate(event.end) : null);

  const isUpcomingEvent = !!startInstant && startInstant > new Date();
  const now = new Date();
  const isPastEvent = !!startInstant && startInstant < now;

  // ---------- Payment helpers (popup, PayPal-only) ----------
  const createPaymentRecord = async (
    registration,
    method,
    status,
    transactionId,
    receiptUrl,
    paymentDetails
  ) => {
    const payload = prune({
      related_entity_id: registration.id,
      related_entity_type: "event_registration",
      provider: method, // 'paypal' | 'free'
      amount_usd: registration.amount_usd,
      amount_cad: registration.amount_cad,
      fx_rate: registration.fx_rate,
      status, // 'successful' | 'pending_verification' | 'failed'
      transaction_id: transactionId || null,
      receipt_url: receiptUrl || null,
      payer_name: registration.contact_name,
      payer_email: registration.contact_email,
      ...(paymentDetails ? { payment_details: paymentDetails } : {}),
      ...(currentUser && { user_id: currentUser.id }),
    });

    const newPayment = await Payment.create(payload);
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
        paymentMethod, // 'paypal'
        "successful",
        transactionId,
        null,
        prune(paymentDetails)
      );

      const finalReg = await EventRegistration.update(createdRegistration.id, {
        status: "paid",
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        transaction_id: transactionId,
        payment_id: newPayment.id,
        is_verified: true, 
      });

      try {
        const sent = await sendEventRegistrationInvoice(finalReg, event, newPayment);
        if (sent?.success) {
          await EventRegistration.update(finalReg.id, { invoice_sent: true, qr_email_sent: true });
        }
      } catch (e) {
        console.warn("Invoice email failed:", e);
      }

      setShowPaymentModal(false);
      navigate(createPageUrl(`EventRegistrationSuccess?registrationId=${createdRegistration.id}`));
    } catch (err) {
      console.error("Error processing payment success:", err);
      setRegistrationError(
        "Payment was successful but there was an error updating your registration. Please contact support."
      );
    } finally {
      setPageBusy(false);
    }
  };

  // ---------- FREE TIER: auto-confirm (skip payment), email, and go to Success ----------
  const finalizeFreeRegistration = async (registration, tier) => {
    // This is now a fallback. Ideally the form already created a PAID/FREE registration.
    try {
      const finalReg = await EventRegistration.update(registration.id, {
        status: "paid",
        payment_method: "free",
        payment_date: new Date().toISOString(),
        transaction_id: null,
        amount_usd: 0,
        amount_cad: 0,
      });

      try {
        await createPaymentRecord(
          { ...finalReg, amount_usd: 0, amount_cad: 0 },
          "free",
          "successful",
          null,
          null,
          { note: "Auto-confirmed free registration (fallback)" }
        );
      } catch (e) {
        console.warn("Free payment record creation failed:", e);
      }

      try {
        await sendEventRegistrationConfirmation(finalReg, event, {
          amount_usd: 0,
          provider: "free",
        });
        await EventRegistration.update(finalReg.id, { qr_email_sent: true });
      } catch (e) {
        console.warn("Free confirmation email failed:", e);
      }

      const payload = makeSuccessPayload({ event, registration: finalReg, tier });
      let encoded = "";
      try { encoded = btoa(JSON.stringify(payload)); } catch {}
      const successUrlBase = createPageUrl("EventRegistrationSuccess");
      const successUrl = encoded
        ? `${successUrlBase}?registrationId=${finalReg.id}&p=${encodeURIComponent(encoded)}`
        : `${successUrlBase}?registrationId=${finalReg.id}`;
      navigate(successUrl, { state: { payload } });
    } catch (err) {
      console.error("Error finalizing free registration:", err);
      setRegistrationError(err.message || "Failed to finalize your free registration. Please contact support.");
    }
  };

  // ---------- Guards ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
          <Link to={createPageUrl("Events")}>
            <Button>Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const registrationTiers = Array.isArray(event.registration_tiers) ? event.registration_tiers : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={handleBackClick}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event Details
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {event.cover_image ? (
                <div className="relative h-64 md:h-80">
                  <img
                    src={event.cover_image}
                    alt={`${event.title} cover`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 text-white">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
                    {startDate && (
                      <div className="flex items-center gap-4 text-lg">
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          {format(startDate, "MMMM dd, yyyy")}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          {event.location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8">
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>
                  {startDate && (
                    <div className="flex items-center gap-6 text-gray-600">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {format(startDate, "MMMM dd, yyyy")}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {event.location}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Countdown (timezone-aware) */}
            {isUpcomingEvent && startInstant && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Event Countdown</h3>
                  <Countdown
                    targetDate={normalizeTs(event.start)} // Date | string | timestamp
                    timeZone={event.timezone} // e.g., "Asia/Ho_Chi_Minh"
                  />
                </div>
              </div>
            )}

            {/* About This Event */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-2xl">About This Event</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                {event.introduction ? (
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {event.introduction}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No description provided for this event.</p>
                )}
              </CardContent>
            </Card>

            {/* Anchor: scroll here when a tier is selected */}
            <div id="registration-start" />

            {/* === Embedded Registration (form only; payment opens in modal) === */}
            {!isUpcomingEvent || isPastEvent ? (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-2xl">Registration Closed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Registration for this event has closed.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg border-0">
                <div className="p-6 sm:p-8 border-b">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{event.title}</h2>
                  {startDate && endDate && (
                    <div className="flex items-center gap-4 text-gray-600 mt-2 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(startDate, "PPP")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6 sm:p-8">
                  {(!selectedTier && registrationTiers.length > 1) && (
                    <p className="text-gray-600 mb-2">
                      Please select a registration option on the right to continue.
                    </p>
                  )}

                  {selectedTier && (
                    <>
                      {registrationTiers.length > 1 && (
                        <button
                          onClick={() => setSelectedTier(null)}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
                        >
                          <ChevronLeft className="w-4 h-4" /> Back to options
                        </button>
                      )}

                      <h3 className="text-xl font-semibold mb-4">Your Information</h3>

                      <DynamicRegistrationForm
                        event={event}
                        selectedTier={selectedTier}
                        currentUser={currentUser}
                        fxRate={fxRate}
                        onRegistrationComplete={async (registration) => {
                        setCreatedRegistration(registration);
                        const price = Number(selectedTier?.price_usd ?? 0);

                        if (price <= 0) {
                        // Registration was created as paid/free in a single write; just go to success.
                        const payload = makeSuccessPayload({ event, registration, tier: selectedTier });
                        let encoded = '';
                        try { encoded = btoa(JSON.stringify(payload)); } catch {}
                        const base = createPageUrl('EventRegistrationSuccess');
                        const url = encoded
                        ? `${base}?registrationId=${registration.id}&p=${encodeURIComponent(encoded)}`
                        : `${base}?registrationId=${registration.id}`;
                        navigate(url, { state: { payload } });
                        return;
                        }

                        // Paid tiers go to payment
                        setShowPaymentModal(true);
                        }}
                      />
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Promo Video */}
            {event.promo_video_url && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-2xl">Event Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <YouTubeEmbed
                    url={event.promo_video_url}
                    className="w-full aspect-video rounded-lg shadow-md"
                  />
                </CardContent>
              </Card>
            )}

            {/* Event Inclusions */}
            {Array.isArray(event.fair_inclusions) && event.fair_inclusions.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-2xl">What's Included</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid md:grid-cols-2 gap-3">
                    {event.fair_inclusions.map((inclusion, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckSquare className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-gray-700">{inclusion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {Array.isArray(event.gallery_images) && event.gallery_images.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-2xl">Event Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {event.gallery_images.map((img, index) => (
                      <a
                        key={index}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <img
                          src={img}
                          alt={`Gallery image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform duration-200"
                        />
                      </a>
                    ))}
                  </div>
                  {event.media_attribution && (
                    <p className="text-sm text-gray-500 mt-4 italic">{event.media_attribution}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Event Info + Registration Options (always visible) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Event Information */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Event Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {startDate && endDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">{format(startDate, "EEEE, MMMM dd, yyyy")}</p>
                      <p className="text-sm text-gray-600">
                        {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{event.location}</p>
                  </div>
                </div>

                {event.contact_details?.email && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm">Contact: {event.contact_details.email}</p>
                      {event.contact_details.phone && (
                        <p className="text-sm">{event.contact_details.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Registration Options */}
            {registrationTiers.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-xl">Registration Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {registrationTiers.map((tier) => (
                    <div
                      key={tier.key}
                      className={`border rounded-lg p-4 transition-colors ${
                        selectedTier?.key === tier.key
                          ? "border-green-500 ring-1 ring-green-200"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-lg">{tier.name}</h4>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            ${Number(tier.price_usd).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">USD</div>
                        </div>
                      </div>

                      {tier.description && (
                        <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                          {tier.description}
                        </p>
                      )}

                      {Array.isArray(tier.benefits) && tier.benefits.length > 0 && (
                        <ul className="space-y-1 mb-3">
                          {tier.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button className="w-full" onClick={() => handleSelectTierAndScroll(tier)}>
                        {selectedTier?.key === tier.key ? "Selected" : "Select & Register"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ===== Payment Popup Modal (contains PayPal component; PayPal opens its own popup) ===== */}
      {showPaymentModal && createdRegistration && Number(selectedTier?.price_usd ?? 0) > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => (!pageBusy ? setShowPaymentModal(false) : null)}
          />
          {/* Modal Card */}
          <div className="relative bg-white w-full max-w-2xl mx-4 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Complete Your Payment</h3>
              <Button variant="ghost" onClick={() => setShowPaymentModal(false)} disabled={pageBusy}>
                Close
              </Button>
            </div>

            <div className="p-6">
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center text-blue-800 text-base">
                    <Info className="w-5 h-5 mr-2" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center text-lg font-semibold text-gray-800 mb-2">
                    <span>Amount Due (USD):</span>
                    <span>${Number(selectedTier?.price_usd || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Amount Due (CAD Approx.):</span>
                    <span>${(Number(selectedTier?.price_usd || 0) * Number(fxRate)).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {registrationError && (
                <Alert variant="destructive" className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>{registrationError}</AlertDescription>
                </Alert>
              )}

              <SharedPaymentGateway
                amountUSD={Number(selectedTier?.price_usd || 0)}
                amountCAD={Number(selectedTier?.price_usd || 0) * Number(fxRate)}
                itemDescription={`${event.title} - ${selectedTier?.name || "Registration"}`}
                payerName={createdRegistration.contact_name}
                payerEmail={createdRegistration.contact_email}
                onCardPaymentSuccess={handlePaymentSuccess}
                onProcessing={() => setPageBusy(true)}
                onDoneProcessing={() => setPageBusy(false)}
                onError={(e) => setRegistrationError(e?.message || "Payment error")}
              />
            </div>
          </div>
        </div>
      )}
      {/* ===== End Payment Popup Modal ===== */}
    </div>
  );
}
