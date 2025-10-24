// src/pages/EventRegistrationSuccess.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { EventRegistration, Event } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Loader2,
  Clock,
  Info,
  Download,
  Home,
} from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/components/URLRedirect';

function decodePayloadParam(p) {
  if (!p) return null;
  try {
    return JSON.parse(atob(p));
  } catch {
    return null;
  }
}

export default function EventRegistrationSuccess() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState(null);
  const [event, setEvent] = useState(null);
  const [payload, setPayload] = useState(null); // guest-safe info passed from the registration page
  const [error, setError] = useState(null);

  useEffect(() => {
    const registrationId = searchParams.get('registrationId');
    const encoded = searchParams.get('p');
    const statePayload = location?.state?.payload || null;
    const queryPayload = decodePayloadParam(encoded);

    const effectivePayload = statePayload || queryPayload || null;
    if (effectivePayload) setPayload(effectivePayload);

    const loadData = async () => {
      try {
        // If we have a payload (guest flow), we can render immediately without reading the registration.
        // We still try to fetch the public event doc to enrich the title/time, but it's optional.
        if (effectivePayload) {
          try {
            if (effectivePayload.event_id) {
              const [evt] = await Event.filter({ event_id: effectivePayload.event_id });
              if (evt) setEvent(evt);
            }
          } catch {
            // Non-fatal; keep going with payload only
          }
          setLoading(false);

          // If also given a registrationId, attempt a best-effort read (works for signed-in owners/admins).
          // If rules block it (guest), it's fine—we already rendered from payload.
          if (registrationId) {
            try {
              const [reg] = await EventRegistration.filter({ id: registrationId });
              if (reg) setRegistration(reg);
            } catch {
              // ignore—guest read likely blocked
            }
          }
          return;
        }

        // No payload: fall back to Firestore reads (works for signed-in owners/admins)
        if (!registrationId) {
          setError('No registration ID found.');
          setLoading(false);
          return;
        }

        const [regData] = await EventRegistration.filter({ id: registrationId });
        if (!regData) throw new Error('Registration not found.');
        setRegistration(regData);

        const [eventData] = await Event.filter({ event_id: regData.event_id });
        if (!eventData) throw new Error('Event not found.');
        setEvent(eventData);
      } catch (err) {
        setError(err.message || 'Failed to load registration.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, location?.state]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Only show the error card if we have NEITHER Firestore data nor payload to render from
  if (error && !payload && !registration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md text-center bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button asChild className="mt-4">
              <Link to={createPageUrl('Home')}>Go to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prefer Firestore registration when available; otherwise fall back to payload
  const source = registration || payload || {};
  const eventTitle = event?.title || payload?.event_title || 'Your Registration';
  const startDate = event?.start || payload?.starts_at || null;

  // Derive paid/pending states
  const isPaid =
    (registration?.status === 'paid') ||
    (!!payload && (payload.payment_method === 'free' || Number(payload.amount_usd ?? 0) === 0));

  const isPending = registration?.status === 'pending_verification';

  const amountUsd = Number(
    registration?.amount_usd ??
    payload?.amount_usd ??
    0
  );

  const reservationCode = source.reservation_code || '—';
  const contactName = source.contact_name || '—';
  const contactEmail = source.contact_email || '—';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          {isPaid ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold">Registration Confirmed!</CardTitle>
            </>
          ) : (
            <>
              <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold">Registration Pending</CardTitle>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          {isPaid && (
            <p className="text-gray-600">
              Thank you, <span className="font-semibold">{contactName}</span>. Your spot for{' '}
              <span className="font-semibold">{eventTitle}</span> is secured. A confirmation email
              {registration?.invoice_sent || registration?.qr_email_sent ? ' has been sent' : ' will be sent shortly'} to{' '}
              <span className="font-semibold">{contactEmail}</span>.
            </p>
          )}

          {isPending && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-md text-left">
              <div className="flex">
                <div className="py-1">
                  <Info className="h-5 w-5 text-yellow-400 mr-3" />
                </div>
                <div>
                  <p className="font-bold">Action Required</p>
                  <p className="text-sm">
                    Your registration is pending until we verify your payment. You will receive a final confirmation
                    email with your invoice and QR code once your payment is approved.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-2 text-left text-sm">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">Registration Summary</h3>
            <p>
              <strong>Event:</strong> {eventTitle}
            </p>
            <p>
              <strong>Date:</strong>{' '}
              {startDate ? format(new Date(startDate), 'PPP') : '—'}
            </p>
            <p>
              <strong>Registration Code:</strong> {reservationCode}
            </p>
            <p>
              <strong>Name:</strong> {contactName}
            </p>
            <p>
              <strong>Email:</strong> {contactEmail}
            </p>
            <p>
              <strong>Amount:</strong> ${amountUsd.toFixed(2)} USD
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <Badge variant={isPaid ? 'default' : 'secondary'}>
                {registration?.status
                  ? registration.status.replace(/_/g, ' ').toUpperCase()
                  : isPaid
                    ? 'PAID'
                    : 'PENDING'}
              </Badge>
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {isPaid && registration?.qr_code_url && (
            <a
              href={registration.qr_code_url}
              download={`QRCode-${reservationCode}.png`}
              className="w-full"
            >
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            </a>
          )}

          <Button variant="outline" asChild className="w-full">
            <Link to={createPageUrl('Home')}>
              <Home className="w-4 h-4 mr-2" />
              Back to Homepage
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
