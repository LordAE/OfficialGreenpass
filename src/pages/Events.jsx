// src/pages/Events.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/components/URLRedirect";

/* ---------- Firebase ---------- */
import { db } from "@/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { useTr } from "@/i18n/useTr";

/* ---------- Helpers ---------- */
const toJsDate = (v) => {
  if (!v) return null;

  // Firestore Timestamp
  if (v && typeof v === "object") {
    if (typeof v.toDate === "function") {
      const d = v.toDate();
      return isNaN(d?.getTime()) ? null : d;
    }
    if (typeof v.seconds === "number") {
      const d = new Date(v.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // Numbers (ms or seconds)
  if (typeof v === "number") {
    const d = new Date(v > 1e12 ? v : v * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  // Numeric strings
  if (typeof v === "string") {
    const raw = v.trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) {
      const n = Number(raw);
      const d = new Date(n > 1e12 ? n : n * 1000);
      return isNaN(d.getTime()) ? null : d;
    }

    // Handle: "January 27, 2026 at 7:00:00 PM UTC+8"
    const cleaned = raw
      .replace(" at ", " ")
      .replace(/UTC\+(\d{1,2})\b/g, "+$1:00")
      .replace(/UTC\-(\d{1,2})\b/g, "-$1:00");

    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const safeFormat = (v, fmtStr = "MMMM dd, yyyy", fallback = "—") => {
  const d = toJsDate(v);
  if (!d) return fallback;
  try {
    return format(d, fmtStr);
  } catch {
    try {
      return d.toLocaleString();
    } catch {
      return fallback;
    }
  }
};

/* ---------- Small components ---------- */
const EventCard = ({ event, tr }) => {
  const now = new Date();
  const until = event?.boosted_until;

  const untilDate =
    typeof until?.toDate === "function"
      ? until.toDate()
      : until?.seconds
      ? new Date(until.seconds * 1000)
      : toJsDate(until);

  const boosted = !!(untilDate && untilDate > now);

  return (
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

        <div className="flex flex-wrap items-center gap-2 mb-2">
          {event?.platform ? (
            <Badge
              className={
                String(event.platform).toLowerCase().includes("event")
                  ? "bg-orange-600 text-white"
                  : "bg-emerald-600 text-white"
              }
            >
              {String(event.platform).toLowerCase().includes("event")
                ? tr("hosted_on_eventbrite", "Hosted on Eventbrite")
                : tr("hosted_on_nasio", "Hosted on Nas.io")}
            </Badge>
          ) : null}

          <Badge variant="secondary" className="border">
            {String(event?.price_type || "free").toLowerCase() === "paid"
              ? tr("paid", "Paid")
              : tr("free", "Free")}
          </Badge>

          {boosted ? <Badge className="bg-emerald-700 text-white">{tr("boosted", "Boosted")}</Badge> : null}
        </div>

        <div className="flex items-center text-sm text-gray-500 mb-2">
          <Calendar className="w-4 h-4 mr-2" />
          {safeFormat(event.start, "MMMM dd, yyyy")}
        </div>

        <div className="flex items-center text-sm text-gray-500 mb-4">
          <MapPin className="w-4 h-4 mr-2" />
          {event.location || "—"}
        </div>

        <div className="mt-auto">
          <Link to={createPageUrl("EventDetails", `id=${event.id || event.event_id}`)}>
            <Button
              variant="outline"
              className="w-full group-hover:bg-green-600 group-hover:text-white transition-colors"
            >
              {tr("view_details", "View Details")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

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
  const { tr } = useTr("events");
  const [searchParams] = useSearchParams();
  const lang = (searchParams.get("lang") || localStorage.getItem("gp_lang") || "en").trim();

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
      const q = query(collection(db, "home_page_content"), where("singleton_key", "==", "SINGLETON"), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const data = snap.docs[0].data();
      return data?.events_page_section || null;
    } catch {
      return null;
    }
  };

  function pickLocalized(header, baseKey) {
    if (!header) return null;

    // 1) i18n keys support
    const keyField = header[`${baseKey}_i18n_key`];
    if (keyField && typeof keyField === "string") {
      return tr(keyField, header[baseKey] || "");
    }

    // 2) translations map support: { title_translations: { en: "...", es: "..." } }
    const map = header[`${baseKey}_translations`];
    if (map && typeof map === "object") {
      const v = map[lang] || map[lang.toLowerCase()] || map[lang.split("-")[0]];
      if (v) return v;
    }

    // 3) suffixed fields: title_es, subtitle_fil, etc.
    const suffix = lang.replace("-", "_");
    const byLang =
      header[`${baseKey}_${lang}`] ||
      header[`${baseKey}_${suffix}`] ||
      header[`${baseKey}_${lang.split("-")[0]}`];
    if (byLang) return byLang;

    // 4) default field
    return header[baseKey] || null;
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [evs, header] = await Promise.all([fetchEvents(), fetchHeaderContent()]);

        const now = new Date();
        const isBoostActive = (e) => {
          const until = e?.boosted_until;
          if (!until) return false;
          const d =
            typeof until?.toDate === "function"
              ? until.toDate()
              : until?.seconds
              ? new Date(until.seconds * 1000)
              : toJsDate(until);
          return !!(d && d > now);
        };

        // sort: boosted (active) first, then sort_order, then start
        const sorted = [...evs].sort((a, b) => {
          const aBoost = isBoostActive(a);
          const bBoost = isBoostActive(b);
          if (aBoost !== bBoost) return aBoost ? -1 : 1;

          const aOrder = a.sort_order ?? 999;
          const bOrder = b.sort_order ?? 999;
          if (aOrder !== bOrder) return aOrder - bOrder;

          const at = toJsDate(a.start)?.getTime() ?? 0;
          const bt = toJsDate(b.start)?.getTime() ?? 0;
          return at - bt;
        });

        setEvents(sorted);

        setPageContent(
          header
            ? {
                title: pickLocalized(header, "title") || tr("fallback_title", "Fairs and Events"),
                subtitle:
                  pickLocalized(header, "subtitle") ||
                  tr("fallback_subtitle", "Join our premier international education fairs, workshops, and seminars."),
                header_image_url:
                  header.header_image_url ||
                  header.header_image ||
                  header.image ||
                  "https://images.unsplash.com/photo-1560439514-4e280ea57c89?w=1920&h=400&fit=crop&q=80",
              }
            : {
                title: tr("fallback_title", "Fairs and Events"),
                subtitle: tr(
                  "fallback_subtitle",
                  "Join our premier international education fairs, workshops, and seminars."
                ),
                header_image_url: "https://images.unsplash.com/photo-1560439514-4e280ea57c89?w=1920&h=400&fit=crop&q=80",
              }
        );
      } catch (e) {
        console.error("Error loading events:", e);
        setPageContent({
          title: tr("fallback_title", "Fairs and Events"),
          subtitle: tr("fallback_subtitle", "Join our premier international education fairs, workshops, and seminars."),
          header_image_url: "https://images.unsplash.com/photo-1560439514-4e280ea57c89?w=1920&h=400&fit=crop&q=80",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [lang, tr]);

  if (loading) return <PageSkeleton />;

  const now = new Date();

  const isArchived = (e) => {
    const a = toJsDate(e.archive_at);
    return !!(a && a < now);
  };

  // Only use end date if parseable; if missing/invalid, treat as past so it doesn't disappear.
  const upcomingEvents = events
    .filter((e) => {
      const end = toJsDate(e.end);
      return !!(end && end >= now && !isArchived(e));
    })
    .sort((a, b) => (toJsDate(a.start)?.getTime() ?? 0) - (toJsDate(b.start)?.getTime() ?? 0));

  const pastEvents = events
    .filter((e) => {
      const end = toJsDate(e.end);
      // Past if ended, archived, OR end is missing/invalid (so it still shows somewhere)
      return isArchived(e) || !end || end < now;
    })
    .sort((a, b) => (toJsDate(b.end)?.getTime() ?? 0) - (toJsDate(a.end)?.getTime() ?? 0))
    .slice(0, 12);

  return (
    <div className="min-h-screen bg-gray-50">
      {pageContent && (
        <div className="relative bg-gray-800">
          <img
            src={pageContent.header_image_url}
            alt={tr("events_bg_alt", "Events background")}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 text-center text-white">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{pageContent.title}</h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl">{pageContent.subtitle}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-12 px-6 space-y-16">
        {/* UPCOMING */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-10">{tr("upcoming", "Upcoming Events")}</h2>

          {upcomingEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} tr={tr} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-600">
                <Calendar className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-3 text-lg font-medium text-gray-900">
                  {tr("no_upcoming", "No Upcoming Events")}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {tr("no_upcoming_body", "There are no upcoming events yet. Please check back later.")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* PAST */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-10">{tr("past", "Past Events")}</h2>

          {pastEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} tr={tr} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-600">
                <h3 className="text-lg font-medium text-gray-900">{tr("no_past", "No Past Events")}</h3>
                <p className="mt-1 text-sm text-gray-500">{tr("no_past_body", "No past events to show yet.")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
