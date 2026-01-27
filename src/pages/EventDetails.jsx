// src/pages/EventDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ExternalLink, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useTr } from "@/i18n/useTr";

import BoostEventDialog from "@/components/events/BoostEventDialog";

import { auth, db } from "@/firebase";
import { doc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { createPageUrl } from "@/components/URLRedirect";
import { onAuthStateChanged } from "firebase/auth";

/* ---------- helpers ---------- */
const toJsDate = (v) =>
  v && typeof v?.toDate === "function"
    ? v.toDate()
    : v?.seconds
    ? new Date(v.seconds * 1000)
    : new Date(v || Date.now());

const PLATFORM = {
  nasio: { label: "Nas.io", badge: "bg-emerald-600 text-white", ctaKey: "register_nasio", ctaDef: "Register on Nas.io" },
  eventbrite: { label: "Eventbrite", badge: "bg-orange-600 text-white", ctaKey: "register_eventbrite", ctaDef: "Register on Eventbrite" },
};

export default function EventDetails() {
  const { tr } = useTr("events");
  const [searchParams] = useSearchParams();
  const id = (searchParams.get("id") || "").trim();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);
  const [boostOpen, setBoostOpen] = useState(false);

  const platformKey = useMemo(() => String(event?.platform || "").toLowerCase().trim(), [event]);
  const plat = PLATFORM[platformKey] || { label: tr("platform", "Platform"), badge: "bg-gray-900 text-white", ctaKey: "open_external", ctaDef: "Open registration" };

  // Resolve current user (for owner-only actions like Boost)
  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          if (!cancelled) setMe(null);
          return;
        }
        // Read the user's profile doc (if available) for name/email
        const us = await getDoc(doc(db, "users", u.uid));
        const profile = us.exists() ? us.data() : {};
        if (!cancelled) {
          setMe({ uid: u.uid, email: u.email || profile?.email || profile?.user_email || "", ...profile });
        }
      } catch (e) {
        console.error("EventDetails auth/profile load error:", e);
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    });
    return () => {
      cancelled = true;
      try { unsub && unsub(); } catch {}
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setEvent(null);
        if (!id) return;

        // 1) Try as docId
        const ref = doc(db, "events", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          if (!cancelled) setEvent({ id: snap.id, ...data });
          return;
        }

        // 2) Fallback: event_id match (legacy)
        const q = query(collection(db, "events"), where("event_id", "==", id), limit(1));
        const qs = await getDocs(q);
        if (!qs.empty) {
          const d = qs.docs[0];
          if (!cancelled) setEvent({ id: d.id, ...d.data() });
        }
      } catch (e) {
        console.error("EventDetails load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const cover = event?.cover_image || "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1170&q=80";
  const title = event?.title || tr("fallback_title", "Event");
  const desc = event?.description || "";
  const when = event?.start ? format(toJsDate(event.start), "MMMM dd, yyyy • h:mm a") : "—";
  const whereText = event?.location || tr("online", "Online");
  const priceType = String(event?.price_type || "free").toLowerCase();

  const isBoostActive = useMemo(() => {
    const until = event?.boosted_until;
    if (!until) return false;
    const d = typeof until?.toDate === "function" ? until.toDate() : until?.seconds ? new Date(until.seconds * 1000) : new Date(until);
    return d > new Date();
  }, [event]);

  const isOwner = useMemo(() => {
    const uid = me?.uid;
    const host = event?.host_uid;
    return Boolean(uid && host && uid === host);
  }, [me, event]);

  const goExternal = () => {
    const url = String(event?.external_url || "").trim();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        {tr("loading", "Loading...")}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-lg font-semibold">{tr("event_not_found", "Event not found")}</div>
            <div className="text-sm text-gray-600 mt-1">{tr("event_not_found_body", "This event may have been removed or the link is invalid.")}</div>
            <Link to={createPageUrl("Events")} className="inline-block mt-4">
              <Button type="button" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {tr("back_to_events", "Back to events")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <Link to={createPageUrl("Events")} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {tr("back_to_events", "Back to events")}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden rounded-2xl">
            <div className="h-56 w-full overflow-hidden bg-gray-100">
              <img src={cover} alt={title} className="h-56 w-full object-cover" />
            </div>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={plat.badge}>{tr(platformKey === "nasio" ? "hosted_on_nasio" : platformKey === "eventbrite" ? "hosted_on_eventbrite" : "platform", plat.label)}</Badge>
                <Badge variant="secondary" className="border">
                  {priceType === "paid" ? tr("paid", "Paid") : tr("free", "Free")}
                </Badge>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mt-3">{title}</h1>

              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {when}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {whereText}
                </div>
              </div>

              {desc ? <div className="mt-4 text-sm text-gray-800 whitespace-pre-line">{desc}</div> : null}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="text-sm font-semibold text-gray-900">{tr("registration", "Registration")}</div>
              <div className="text-xs text-gray-600 mt-1">{tr("platform_note", "Registration and payments (if any) happen on the external platform.")}</div>

              <Button type="button" className="w-full mt-4" onClick={goExternal} disabled={!String(event?.external_url || "").trim()}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {tr(plat.ctaKey, plat.ctaDef)}
              </Button>

              {!String(event?.external_url || "").trim() ? (
                <div className="mt-2 text-xs text-red-600">{tr("registration_unavailable", "Registration link is unavailable.")}</div>
              ) : null}

              <div className="mt-4 text-xs text-gray-500">
                {tr("host", "Host")}: <span className="text-gray-700">{event?.host_name || tr("host_unknown", "Unknown")}</span>
              </div>

              {!meLoading && isOwner ? (
                <div className="mt-6">
                  <div className="text-sm font-semibold text-gray-900">{tr("boost", "Boost")}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {tr("boost_note", "Boosting puts your event higher in the Events list for a limited time.")}
                  </div>

                  {isBoostActive ? (
                    <div className="mt-2 text-xs text-emerald-700">
                      {tr("boost_active", "Boost is active")}
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    className="w-full mt-3"
                    variant={isBoostActive ? "outline" : "default"}
                    onClick={() => setBoostOpen(true)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isBoostActive ? tr("boost_manage", "Manage Boost") : tr("boost_event", "Boost Event")}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {isOwner ? (
        <BoostEventDialog
          open={boostOpen}
          onOpenChange={setBoostOpen}
          eventId={event?.id}
          eventTitle={title}
          me={me}
        />
      ) : null}
    </div>
  );
}
