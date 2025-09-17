// src/pages/Events.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/URLRedirect";

/* ---------- Firebase ---------- */
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

/* ---------- Helpers ---------- */
const toJsDate = (v) =>
  v && typeof v?.toDate === "function" ? v.toDate() : new Date(v || Date.now());

/* ---------- Small components ---------- */
const EventCard = ({ event }) => (
  <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col group">
    <div className="overflow-hidden rounded-t-lg h-48">
      <img
        src={
          event.cover_image ||
          "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1170&q=80"
        }
        alt={event.title}
        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
      />
    </div>
    <CardContent className="p-6 flex flex-col flex-grow">
      <h3 className="font-bold text-lg text-gray-900 mb-2 h-14 overflow-hidden">
        {event.title}
      </h3>
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <Calendar className="w-4 h-4 mr-2" />
        {format(toJsDate(event.start), "MMMM dd, yyyy")}
      </div>
      <div className="flex items-center text-sm text-gray-500 mb-4">
        <MapPin className="w-4 h-4 mr-2" />
        {event.location}
      </div>
      <div className="mt-auto">
        <Link to={createPageUrl(`EventDetails?id=${event.event_id}`)}>
          <Button
            variant="outline"
            className="w-full group-hover:bg-green-600 group-hover:text-white transition-colors"
          >
            View Details <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </CardContent>
  </Card>
);

const PageSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 bg-gray-200" />
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-96 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

/* ---------- Page ---------- */
export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [pageContent, setPageContent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load events from Firestore
  const fetchEvents = async () => {
    const snap = await getDocs(collection(db, "events"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  // Load page header content from Firestore (singleton)
  const fetchHeaderContent = async () => {
    try {
      const q = query(
        collection(db, "home_page_content"),
        where("singleton_key", "==", "SINGLETON"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const data = snap.docs[0].data();
      return data?.events_page_section || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [evs, header] = await Promise.all([
          fetchEvents(),
          fetchHeaderContent(),
        ]);

        // sort by sort_order then start
        const sorted = [...evs].sort((a, b) => {
          const aOrder = a.sort_order ?? 999;
          const bOrder = b.sort_order ?? 999;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return toJsDate(a.start) - toJsDate(b.start);
        });

        setEvents(sorted);
        setPageContent(
          header || {
            title: "Fairs and Events",
            subtitle:
              "Join our premier international education fairs, workshops, and seminars.",
            header_image_url:
              "https://images.unsplash.com/photo-1560439514-4e280ea57c89?w=1920&h=400&fit=crop&q=80",
          }
        );
      } catch (e) {
        console.error("Error loading events:", e);
        setPageContent({
          title: "Fairs and Events",
          subtitle:
            "Join our premier international education fairs, workshops, and seminars.",
          header_image_url:
            "https://images.unsplash.com/photo-1560439514-4e280ea57c89?w=1920&h=400&fit=crop&q=80",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <PageSkeleton />;

  const now = new Date();

  const upcomingEvents = events.filter((e) => {
    const end = toJsDate(e.end);
    const archived =
      e.archive_at && toJsDate(e.archive_at) < now;
    return end >= now && !archived;
  });

  const pastEvents = events
    .filter((e) => {
      const end = toJsDate(e.end);
      const archived =
        e.archive_at && toJsDate(e.archive_at) < now;
      return end < now || archived;
    })
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50">
      {pageContent && (
        <div className="relative bg-gray-800">
          <img
            src={pageContent.header_image_url}
            alt="Events background"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 text-center text-white">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              {pageContent.title}
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl">
              {pageContent.subtitle}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-12 px-6">
        {upcomingEvents.length > 0 ? (
          <div className="space-y-16">
            <div>
              <h2 className="text-3xl font-bold text-center mb-10">
                Upcoming Events
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>

            {pastEvents.length > 0 && (
              <div>
                <h2 className="text-3xl font-bold text-center mb-10">
                  Past Events
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pastEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-gray-600">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Upcoming Events
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                There are no upcoming events at this time. Please check back
                later.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
