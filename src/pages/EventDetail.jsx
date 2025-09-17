// src/pages/EventDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, School as SchoolIcon, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format, isSameDay } from 'date-fns';

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

const normalizeEvent = (raw = {}, id = '') => {
  const start = toDate(raw.start || raw.startDate || Date.now());
  const end = toDate(raw.end || raw.endDate || start);

  return {
    id,
    event_id: raw.event_id || id,
    title: raw.title || 'Untitled Event',
    description: raw.description || '',
    cover_image: raw.cover_image || raw.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (notFound || !event) {
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

  const sameDay = isSameDay(event.start, event.end);

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
                {fmtDate(event.start)}
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
                    <p className="font-semibold text-blue-800">{fmtDate(event.start)}</p>
                    {!sameDay && <p className="font-semibold text-blue-800">{fmtDate(event.end)}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800">
                      {fmtTime(event.start)} — {fmtTime(event.end)}
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
