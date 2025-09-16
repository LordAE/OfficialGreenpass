
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { EventRegistration } from '@/api/entities';
import { Event } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Added this import
import { Loader2, CheckCircle, Clock, FileText, Download, Home, Info } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/components/URLRedirect';

export default function EventRegistrationSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const registrationId = searchParams.get('registrationId');
    if (!registrationId) {
      setError("No registration ID found.");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [regData] = await EventRegistration.filter({ id: registrationId });
        if (!regData) {
          throw new Error("Registration not found.");
        }
        setRegistration(regData);

        const [eventData] = await Event.filter({ event_id: regData.event_id });
        if (!eventData) {
          throw new Error("Event not found.");
        }
        setEvent(eventData);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
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

  const isPaid = registration.status === 'paid';
  const isPending = registration.status === 'pending_verification';

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
              Thank you, <span className="font-semibold">{registration.contact_name}</span>. Your spot for <span className="font-semibold">{event.title}</span> is secured. A confirmation email with your invoice and QR code has been sent to <span className="font-semibold">{registration.contact_email}</span>.
            </p>
          )}
          {isPending && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-md text-left">
                <div className="flex">
                    <div className="py-1"><Info className="h-5 w-5 text-yellow-400 mr-3"/></div>
                    <div>
                        <p className="font-bold">Action Required</p>
                        <p className="text-sm">Your registration is pending until we verify your payment. This usually takes 1-2 business days. You will receive a final confirmation email with your invoice and QR code once your payment is approved.</p>
                    </div>
                </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-2 text-left text-sm">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">Registration Summary</h3>
            <p><strong>Event:</strong> {event.title}</p>
            <p><strong>Date:</strong> {format(new Date(event.start), 'PPP')}</p>
            <p><strong>Registration ID:</strong> {registration.reservation_code}</p>
            <p><strong>Name:</strong> {registration.contact_name}</p>
            <p><strong>Email:</strong> {registration.contact_email}</p>
            <p><strong>Amount:</strong> ${registration.amount_usd.toFixed(2)} USD</p>
            <p><strong>Status:</strong> <Badge variant={isPaid ? "default" : "secondary"}>{registration.status.replace('_', ' ').toUpperCase()}</Badge></p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {isPaid && registration.qr_code_url && (
            <a href={registration.qr_code_url} download={`QRCode-${registration.reservation_code}.png`} className="w-full">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2"/> Download QR Code
              </Button>
            </a>
          )}
          <Button variant="outline" asChild className="w-full">
            <Link to={createPageUrl('Home')}>
              <Home className="w-4 h-4 mr-2"/> Back to Homepage
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
