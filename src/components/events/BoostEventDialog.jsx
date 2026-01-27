// src/components/events/BoostEventDialog.jsx
import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import SharedPaymentGateway from "@/components/payments/SharedPaymentGateway";
import { useTr } from "@/i18n/useTr";

import { db } from "@/firebase";
import { Timestamp, doc, updateDoc, serverTimestamp } from "firebase/firestore";

const PLANS = [
  { days: 7, price: 1.99 },
  { days: 15, price: 2.99 },
  { days: 30, price: 3.99 },
];

function calcBoostUntil(days) {
  const ms = Number(days || 0) * 24 * 60 * 60 * 1000;
  return Timestamp.fromDate(new Date(Date.now() + ms));
}

export default function BoostEventDialog({ open, onOpenChange, eventId, eventTitle, me }) {
  const { tr } = useTr("events");
  const [selectedDays, setSelectedDays] = useState(7);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const plan = useMemo(() => PLANS.find((p) => p.days === selectedDays) || PLANS[0], [selectedDays]);

  const payerName =
    (me && (me.full_name || me.name || me.displayName)) ||
    tr("host_unknown", "Unknown");
  const payerEmail = (me && (me.email || me.user_email)) || "";

  const reset = () => {
    setProcessing(false);
    setDone(false);
    setError(null);
    setSelectedDays(7);
  };

  const close = (v) => {
    if (!v) reset();
    onOpenChange && onOpenChange(v);
  };

  const onPaymentSuccess = async (provider, transactionId, payload) => {
    if (!eventId) return;
    try {
      setProcessing(true);
      setError(null);

      const boosted_until = calcBoostUntil(plan.days);
      await updateDoc(doc(db, "events", eventId), {
        boosted: true,
        boost_days: plan.days,
        boost_price_usd: plan.price,
        boost_currency: "USD",
        boost_provider: String(provider || "paypal"),
        boost_transaction_id: String(transactionId || ""),
        boost_details: payload || null,
        boosted_at: serverTimestamp(),
        boosted_until,
      });

      setDone(true);
    } catch (e) {
      console.error("Boost event update error:", e);
      setError(tr("boost_failed", "Boost failed. Please try again."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {tr("boost_event", "Boost Event")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            {tr(
              "boost_event_desc",
              "Boosting puts your event higher in the Events list for the selected duration."
            )}
          </div>

          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {tr("event", "Event")}: <span className="font-semibold">{eventTitle || tr("fallback_title", "Event")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {PLANS.map((p) => {
              const active = p.days === selectedDays;
              return (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setSelectedDays(p.days)}
                  className={`px-3 py-2 rounded-xl border text-sm transition ${
                    active ? "border-emerald-600 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                  disabled={processing || done}
                >
                  <div className="font-semibold">{p.days} {tr("days", "days")}</div>
                  <div className="text-xs text-gray-600">${p.price.toFixed(2)} USD</div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-gray-900 text-white">{tr("boost_selected", "Selected")}: {plan.days} {tr("days", "days")}</Badge>
            <Badge variant="secondary" className="border">${plan.price.toFixed(2)} USD</Badge>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          {done ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
              <div>
                <div className="font-semibold">{tr("boost_success", "Boost activated!")}</div>
                <div className="text-sm">
                  {tr("boost_success_body", "Your event will be prioritized in the Events list during the boost period.")}
                </div>
              </div>
            </div>
          ) : (
            <SharedPaymentGateway
              amountUSD={plan.price}
              itemDescription={tr(
                "boost_item_desc",
                "Boost event: {{title}} ({{days}} days)",
                { title: eventTitle || tr("fallback_title", "Event"), days: plan.days }
              )}
              payerName={payerName}
              payerEmail={payerEmail}
              onProcessing={() => setProcessing(true)}
              onDoneProcessing={() => setProcessing(false)}
              onError={() => setError(tr("boost_failed", "Boost failed. Please try again."))}
              onCardPaymentSuccess={onPaymentSuccess}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={processing}>
              {tr("close", "Close")}
            </Button>
            {!done ? (
              <Button type="button" onClick={() => {}} disabled className="opacity-0 pointer-events-none">
                {/* spacer to keep layout stable */}
              </Button>
            ) : null}
          </div>

          {processing ? (
            <div className="flex items-center text-sm text-gray-600">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {tr("processing", "Processing...")}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
