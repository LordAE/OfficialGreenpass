// src/components/events/CreateEventDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Loader2 } from "lucide-react";
import { useTr } from "@/i18n/useTr";

import { db } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

/* ---------- helpers ---------- */
const cleanStr = (v) => (typeof v === "string" ? v.trim() : "");
const isHttpsUrl = (u) => /^https:\/\/\S+/i.test(cleanStr(u));

function roleLabel(role) {
  const r = String(role || "").toLowerCase().trim();
  if (r === "school") return "school";
  if (r === "tutor") return "tutor";
  if (r === "agent") return "agent";
  return "user";
}

function inferHostName(user, role) {
  // Try to match your Profile.jsx fields that are used around the repo.
  const r = roleLabel(role);
  const candidates = [
    user?.full_name,
    user?.displayName,
    user?.name,
  ];

  if (r === "school") {
    candidates.unshift(
      user?.school_profile?.school_name,
      user?.school_profile?.name,
      user?.school_profile?.institution_name
    );
  } else if (r === "tutor") {
    candidates.unshift(
      user?.tutor_profile?.full_name,
      user?.tutor_profile?.name,
      user?.tutor_profile?.tutor_name
    );
  } else if (r === "agent") {
    candidates.unshift(
      user?.agent_profile?.agency_name,
      user?.agent_profile?.name,
      user?.agent_profile?.full_name
    );
  }

  const v = candidates.find((x) => typeof x === "string" && x.trim().length);
  return (v || "GreenPass").trim();
}

const PLATFORM_META = {
  nasio: { label: "Nas.io", badge: "bg-emerald-600 text-white" },
  eventbrite: { label: "Eventbrite", badge: "bg-orange-600 text-white" },
};

export default function CreateEventDialog({
  open,
  onOpenChange,
  user,
  role,
  allowedPlatforms = ["nasio", "eventbrite"],
  disabledReason = null,
}) {
  const { tr } = useTr("events");

  const userId = user?.id || user?.uid || user?.user_id || null;
  const hostRole = roleLabel(role || user?.role);
  const hostName = useMemo(() => inferHostName(user, hostRole), [user, hostRole]);

  const platformDefault = useMemo(() => {
    const a = Array.isArray(allowedPlatforms) ? allowedPlatforms : [];
    // sensible default
    if (a.includes("eventbrite") && hostRole === "school") return "eventbrite";
    if (a.includes("nasio") && hostRole === "tutor") return "nasio";
    return a[0] || "nasio";
  }, [allowedPlatforms, hostRole]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState(tr("online", "Online"));
  const [priceType, setPriceType] = useState("free"); // free|paid
  const [platform, setPlatform] = useState(platformDefault);
  const [externalUrl, setExternalUrl] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    // reset when opened, but keep platform default
    setTitle("");
    setDescription("");
    setStart("");
    setEnd("");
    setLocation(tr("online", "Online"));
    setPriceType("free");
    setPlatform(platformDefault);
    setExternalUrl("");
    setCoverImage("");
    setErr("");
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, platformDefault]);

  const platformAllowed = useMemo(() => {
    const a = Array.isArray(allowedPlatforms) ? allowedPlatforms : [];
    return a.includes(platform);
  }, [allowedPlatforms, platform]);

  const formOk = useMemo(() => {
    if (!userId) return false;
    if (!cleanStr(title)) return false;
    if (!start) return false;
    if (!platformAllowed) return false;
    if (!isHttpsUrl(externalUrl)) return false;
    return true;
  }, [userId, title, start, platformAllowed, externalUrl]);

  const platformOptions = (Array.isArray(allowedPlatforms) ? allowedPlatforms : []).filter(Boolean);

  const doCreate = async () => {
    if (disabledReason) {
      setErr(disabledReason);
      return;
    }
    if (!formOk) {
      setErr(tr("fix_form", "Please complete the form correctly."));
      return;
    }

    setSaving(true);
    setErr("");
    try {
      const payload = {
        // display
        title: cleanStr(title),
        description: cleanStr(description) || null,
        location: cleanStr(location) || tr("online", "Online"),
        cover_image: cleanStr(coverImage) || null,

        // schedule
        start: new Date(start),
        end: end ? new Date(end) : null,

        // external
        platform: platform,
        external_url: cleanStr(externalUrl),

        // pricing label only (payments stay external)
        price_type: priceType === "paid" ? "paid" : "free",

        // host
        host_uid: userId,
        host_role: hostRole,
        host_name: hostName,

        // status
        status: "upcoming",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "events"), payload);
      onOpenChange?.(false);
    } catch (e) {
      console.error("create event failed:", e);
      setErr(tr("create_failed", "Could not create event. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const meta = PLATFORM_META[platform] || { label: String(platform || "Platform") };

  return (
    <Dialog open={open} onOpenChange={(v) => (saving ? null : onOpenChange?.(v))}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tr("create_event", "Create Event")}</DialogTitle>
        </DialogHeader>

        {disabledReason ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {disabledReason}
          </div>
        ) : null}

        <div className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">{tr("platform", "Platform")}</div>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((p) => {
                  const active = p === platform;
                  const m = PLATFORM_META[p] || { label: p };
                  return (
                    <Button
                      key={p}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => setPlatform(p)}
                      disabled={saving}
                    >
                      {m.label}
                    </Button>
                  );
                })}
                <Badge className={meta.badge || "bg-gray-900 text-white"}>{meta.label}</Badge>
              </div>
              {!platformAllowed ? (
                <div className="mt-2 text-xs text-red-600">{tr("platform_not_allowed", "Platform not allowed for this role.")}</div>
              ) : null}
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">{tr("price", "Price")}</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={priceType === "free" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setPriceType("free")}
                  disabled={saving}
                >
                  {tr("free", "Free")}
                </Button>
                <Button
                  type="button"
                  variant={priceType === "paid" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setPriceType("paid")}
                  disabled={saving}
                >
                  {tr("paid", "Paid")}
                </Button>
              </div>
              <div className="mt-1 text-xs text-gray-500">{tr("paid_note", "Payments happen on the external platform.")}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">{tr("title", "Title")}</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("title_ph", "Event title")} disabled={saving} />
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">{tr("description", "Description")}</div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr("description_ph", "What is this event about?")}
              className="min-h-[90px]"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">{tr("start", "Start")}</div>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} disabled={saving} />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">{tr("end", "End")}</div>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} disabled={saving} />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">{tr("location", "Location")}</div>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={tr("location_ph", "Online or venue")} disabled={saving} />
            <div className="mt-1 text-xs text-gray-500">{tr("location_hint", "Tip: use “Online” for webinars.")}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">{tr("external_url", "External registration URL")}</div>
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder={tr("external_url_ph", "https://nas.io/... or https://eventbrite.com/...")}
              disabled={saving}
            />
            <div className="mt-1 text-xs text-gray-500">
              <ExternalLink className="inline h-3.5 w-3.5 mr-1" />
              {isHttpsUrl(externalUrl) ? tr("url_ok", "Looks good.") : tr("url_https", "Must start with https://")}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">{tr("cover_image", "Cover image (optional)")}</div>
            <Input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder={tr("cover_image_ph", "https://...jpg")}
              disabled={saving}
            />
          </div>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={saving}>
              {tr("cancel", "Cancel")}
            </Button>
            <Button type="button" onClick={doCreate} disabled={saving || !formOk}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {saving ? tr("creating", "Creating...") : tr("create", "Create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
