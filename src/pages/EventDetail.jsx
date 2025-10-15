// src/pages/EventDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, School as SchoolIcon, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format, isSameDay } from 'date-fns';
import Countdown from '@/components/events/Countdown';

/* ---------- Firebase ---------- */
import { db } from '@/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';

/* =========================
   Helpers
========================= */
const toDate = (v) => (v && typeof v?.toDate === 'function' ? v.toDate() : new Date(v));
const fmtDate = (d) => format(d, 'EEEE, MMMM dd, yyyy');
const fmtTime = (d) => format(d, 'p');

// Parse a naive "local wall time" in a specific IANA timezone into a UTC instant
function parseZonedLocalToDate(raw, timeZone) {
  if (!raw || !timeZone) return null;
  const norm = String(raw).trim().replace(' ', 'T');
  const [datePart, timePart = '00:00:00'] = norm.split('T');

  const [y, m, d] = datePart.split('-').map((x) => parseInt(x, 10));
  const [hh, mm = '00', ss = '00'] = timePart.split(':');

  const asUTC = new Date(Date.UTC(y, (m || 1) - 1, d || 1, parseInt(hh ?? '0', 10), parseInt(mm ?? '0', 10), parseInt(ss ?? '0', 10)));

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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

// Convert input into an absolute Date (UTC instant)
function toTargetInstant(targetDate, timeZone) {
  if (!targetDate) return null;
  if (targetDate instanceof Date) return targetDate;
  if (typeof targetDate === 'number') return new Date(targetDate);
  if (typeof targetDate === 'string') {
    const s = targetDate.trim().replace(/\s+/, 'T');
    const hasExplicitOffset = /Z|[+\-]\d{2}:\d{2}$/.test(s);
    if (hasExplicitOffset) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    if (timeZone) {
      const d = parseZonedLocalToDate(s, timeZone);
      return d && !isNaN(d.getTime()) ? d : null;
    }
    const d = new Date(s); // fallback: interpret as local
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const normalizeEvent = (raw = {}, id = '') => {
  // Keep original start/end (could be string/TS) and include timezone
  const start = raw.start ?? raw.startDate ?? Date.now();
  const end = raw.end ?? raw.endDate ?? start;

  return {
    id,
    event_id: raw.event_id || id,
    title: raw.title || 'Untitled Event',
    description: raw.description || '',
    cover_image:
      raw.cover_image ||
      raw.imageUrl ||
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop',
    venue: raw.venue || '',
    location:
      raw.location ||
      (raw.is_online || raw.isOnline ? 'Online Event' : [raw.city, raw.country].filter(Boolean).join(', ')),
    city: raw.city || '',
    country: raw.country || '',
    is_online: raw.is_online ?? raw.isOnline ?? false,
    is_free: raw.is_free ?? raw.isFree ?? true,
    highlight_tag: raw.highlight_tag || '',
    attendees: Array.isArray(raw.attendees) ? raw.attendees : [],
    timezone: raw.timezone || raw.time_zone || raw.tz || null,
    start,
    end,
  };
};

/* =========================
   Component
========================= */
export default function EventDetail() {
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const eventId = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        if (!eventId) {
          setNotFound(true);
          return;
        }

        // Try direct doc fetch first
        const byDoc = await getDoc(doc(db, 'events', eventId));
        if (byDoc.exists()) {
          setEvent(normalizeEvent(byDoc.data(), byDoc.id));
          return;
        }

        // Fallback: find by event_id field
        const qs = await getDocs(query(collection(db, 'events'), where('event_id', '==', eventId), limit(1)));
        if (!qs.empty) {
          const d = qs.docs[0];
          setEvent(normalizeEvent(d.data(), d.id));
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load event:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  // Build absolute instants (correct across all viewers)
  const startInstant = useMemo(
    () => toTargetInstant(event?.start, event?.timezone),
    [event?.start, event?.timezone]
  );
  const endInstant = useMemo(
    () => toTargetInstant(event?.end, event?.timezone),
    [event?.end, event?.timezone]
  );

  // Fallbacks if parsing failed
  const startDate = startInstant || (event?.start ? toDate(event.start) : null);
  const endDate = endInstant || (event?.end ? toDate(event.end) : null);

  const sameDay = startDate && endDate ? isSameDay(startDate, endDate) : true;
  const isUpcoming = startDate ? startDate > new Date() : false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (notFound || !event || !startDate || !endDate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Event not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              We couldn’t find this event. It may have been removed or the link is incorrect.
            </p>
            <Link to={createPageUrl('FairAndEvents')}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header image / hero */}
      <div className="relative">
        <img src={event.cover_image} alt={event.title} className="w-full h-64 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              to={createPageUrl('FairAndEvents')}
              className="inline-flex items-center gap-2 text-gray-200 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold">{event.title}</h1>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {fmtDate(startDate)}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {event.is_online ? 'Online Event' : event.location}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Countdown (timezone-aware) */}
            {isUpcoming && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">Event Countdown</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <Countdown
                    targetDate={event.start}       // string | Date | Timestamp
                    timeZone={event.timezone}      // e.g., "Asia/Ho_Chi_Minh"
                    className="py-2"
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>About this event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{event.description}</p>
              </CardContent>
            </Card>

            {event.attendees?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Who's Attending?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {event.attendees.map((att) => (
                      <Badge key={att} variant="outline" className="text-base p-2">
                        <SchoolIcon className="h-4 w-4 mr-2" />
                        {att}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800">{fmtDate(startDate)}</p>
                    {!sameDay && <p className="font-semibold text-blue-800">{fmtDate(endDate)}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800">
                      {fmtTime(startDate)} — {fmtTime(endDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800">
                      {event.is_online ? 'Online (link will be shared after registration)' : event.venue || event.location}
                    </p>
                    {!event.is_online && (event.city || event.country) && (
                      <p className="text-sm text-blue-700">
                        {[event.city, event.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{event.is_free ? 'Free Registration' : 'Register Now'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  {event.is_free
                    ? 'This event is free to attend. Register now to secure your spot!'
                    : 'Purchase your ticket to attend this event.'}
                </p>
                <Link to={createPageUrl(`EventRegistration?eventId=${event.event_id}`)}>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Register for Event
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
