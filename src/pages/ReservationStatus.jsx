import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, Info } from "lucide-react";
import { Reservation } from "@/api/entities";

export default function ReservationStatus() {
  const [query] = useSearchParams();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Support both styles: ?code=... and/or ?reservationId=...
  const reservationCode = query.get("code");
  const reservationId = query.get("reservationId");

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        if (reservationId) {
          const r = await Reservation.get(reservationId);
          if (alive) setReservation(r || null);
        } else if (reservationCode) {
          const rows = await Reservation.filter({ reservation_code: reservationCode });
          if (alive) setReservation(rows?.[0] || null);
        } else {
          if (alive) setReservation(null);
        }
      } catch (err) {
        console.error("[ReservationStatus] fetch failed:", err);
        if (alive) setReservation(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [reservationCode, reservationId]);

  const now = Date.now();

  const current = useMemo(() => {
    if (!reservation) {
      return {
        title: "Reservation Not Found",
        badge: "Not Found",
        color: "red",
        icon: XCircle,
        note: "We couldn’t find a reservation with the provided information.",
      };
    }
    const status = (reservation.status || "").toLowerCase();
    const holdExpiresAt = reservation.hold_expires_at
      ? new Date(reservation.hold_expires_at).getTime()
      : null;
    const expired = holdExpiresAt ? now > holdExpiresAt && status !== "paid" : false;

    if (status === "paid") {
      return {
        title: "Payment Confirmed",
        badge: "Confirmed",
        color: "emerald",
        icon: CheckCircle,
        note: "Your seat has been confirmed. Check your email for the receipt and next steps.",
      };
    }
    if (expired || status === "expired" || status === "cancelled") {
      return {
        title: "Reservation Expired",
        badge: "Expired",
        color: "red",
        icon: XCircle,
        note: "This reservation has expired. You can make a new reservation to secure a seat.",
      };
    }
    if (status === "pending" || status === "pending_payment") {
      return {
        title: "Pending Payment",
        badge: "Pending",
        color: "yellow",
        icon: Clock,
        note: "We created your reservation. Please complete the payment before the hold expires.",
      };
    }
    return {
      title: "Reservation Status",
      badge: "Info",
      color: "blue",
      icon: Info,
      note: "Review the details below.",
    };
  }, [reservation, now]);

  // Avoid dynamic Tailwind class names
  const colorClass =
    {
      emerald: "text-emerald-600",
      yellow: "text-yellow-600",
      red: "text-red-600",
      blue: "text-blue-600",
    }[current.color] || "text-gray-700";

  const Icon = current.icon;
  const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icon className={`${colorClass} h-6 w-6`} />
            <CardTitle className="text-2xl">Reservation Status</CardTitle>
          </div>
          <Badge variant="outline">{current.badge}</Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <h2 className={`text-3xl font-bold ${colorClass} mt-2`}>{current.title}</h2>
          <p className="text-sm text-muted-foreground">{current.note}</p>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reservation…
            </div>
          )}

          {!loading && !reservation && (
            <div className="text-sm text-muted-foreground">
              Double-check the link you followed or your reservation code.
            </div>
          )}

          {!loading && reservation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Reservation Code</div>
                <div className="font-medium">{reservation.reservation_code || "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Amount</div>
                <div className="font-medium">
                  {typeof reservation.amount_usd === "number" ? fmtUSD.format(reservation.amount_usd) : "—"}
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Program</div>
                <div className="font-medium">{reservation.program_name || "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">School</div>
                <div className="font-medium">{reservation.school_name || "—"}</div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-medium capitalize">{reservation.status || "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Hold Expires</div>
                <div className="font-medium">
                  {reservation.hold_expires_at
                    ? new Date(reservation.hold_expires_at).toLocaleString()
                    : "—"}
                </div>
              </div>

              {reservation.qr_image_url && (
                <div className="rounded-md border p-3 sm:col-span-2">
                  <div className="text-xs text-muted-foreground mb-2">Reservation QR</div>
                  <img
                    src={reservation.qr_image_url}
                    alt="Reservation QR Code"
                    className="h-36 w-36 rounded-md border"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
