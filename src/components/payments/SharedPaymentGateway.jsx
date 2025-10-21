// src/components/payments/SharedPaymentGateway.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Info } from "lucide-react";
import { PaymentSetting } from "@/api/entities";

export default function SharedPaymentGateway({
  amountUSD,
  amountCAD,
  itemDescription,
  payerName,
  payerEmail,
  paypalClientId,       // optional override
  onCardPaymentSuccess,
  onProcessing,
  onDoneProcessing,
  onError,
}) {
  const finalAmountUSD = Number(amountUSD || 0);
  const finalAmountCAD = Number(
    amountCAD !== undefined ? amountCAD : Math.round((Number(amountUSD || 0) * 1.35) * 100) / 100
  );
  const finalDescription = itemDescription || "Payment";

  const hasWindow = typeof window !== "undefined";
  const containerRef = useRef(null);
  const buttonRenderedRef = useRef(false);

  const [adminPaypalId, setAdminPaypalId] = useState(null);
  const [configStatus, setConfigStatus] = useState("loading"); // loading | ok | missing | error
  const [sdkStatus, setSdkStatus] = useState("idle");          // idle | loading | ready | failed

  // 1) Resolve client id: prop -> .env -> Firestore(Admin)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Prop wins
      if (paypalClientId) {
        if (!cancelled) {
          setAdminPaypalId(null);
          setConfigStatus("ok");
        }
        return;
      }

      // .env next
      const envId = String(import.meta?.env?.VITE_PAYPAL_CLIENT_ID || "").trim();
      if (envId) {
        if (!cancelled) {
          setAdminPaypalId(envId);
          setConfigStatus("ok");
        }
        return;
      }

      // Fallback: Admin Payment Settings in Firestore
      try {
        const trySets = async () => {
          let rows = await PaymentSetting.filter({ provider: "paypal", active: true });
          if (!rows?.length) rows = await PaymentSetting.filter({ type: "paypal", active: true });
          if (!rows?.length) rows = await PaymentSetting.filter({ payment_type: "paypal", active: true });
          if (!rows?.length) rows = await PaymentSetting.filter({ key: "PAYPAL_CLIENT_ID", active: true });
          return rows || [];
        };

        const rows = await trySets();
        const s = rows?.[0] || null;
        const id =
          s?.client_id ||
          s?.paypal_client_id ||
          s?.public_key ||
          s?.merchant_id ||
          s?.value ||
          s?.config?.client_id ||
          s?.settings?.client_id ||
          null;

        if (!cancelled) {
          if (id) {
            setAdminPaypalId(String(id));
            setConfigStatus("ok");
          } else {
            setConfigStatus("missing");
          }
        }
      } catch (err) {
        console.error("PaymentSetting (paypal) read failed:", err);
        if (!cancelled) {
          // Permission errors: behave like "missing" so checkout stays usable with .env/prop
          setConfigStatus(err?.code === "permission-denied" ? "missing" : "error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paypalClientId]);

  // Effective client id (prop > admin/env)
  const clientId = useMemo(
    () => (paypalClientId && String(paypalClientId).trim()) || adminPaypalId || null,
    [paypalClientId, adminPaypalId]
  );

  // 2) Load PayPal SDK when we have a client id
  useEffect(() => {
    if (!hasWindow) return;
    if (!clientId) return;
    if (window.paypal) {
      setSdkStatus("ready");
      return;
    }

    setSdkStatus("loading");
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => setSdkStatus("ready");
    script.onerror = () => setSdkStatus("failed");
    document.body.appendChild(script);

    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [clientId, hasWindow]);

  // 3) Render the PayPal button once SDK is ready
  useEffect(() => {
    if (!hasWindow) return;
    if (sdkStatus !== "ready") return;
    if (!containerRef.current) return;
    if (buttonRenderedRef.current) return;

    try {
      window.paypal
        .Buttons({
          createOrder: (_data, actions) =>
            actions.order.create({
              purchase_units: [
                { description: finalDescription, amount: { value: String(finalAmountUSD.toFixed(2)) } },
              ],
            }),
          onApprove: async (_data, actions) => {
            try {
              onProcessing && onProcessing();
              const details = await actions.order.capture();
              onCardPaymentSuccess &&
                onCardPaymentSuccess("paypal", details?.id, { details, payerName, payerEmail });
            } catch (err) {
              console.error("PayPal onApprove error:", err);
              onError && onError(err);
            } finally {
              onDoneProcessing && onDoneProcessing();
            }
          },
          onError: (err) => {
            console.error("PayPal error:", err);
            onError && onError(err);
          },
        })
        .render(containerRef.current);

      buttonRenderedRef.current = true;
    } catch (e) {
      console.error("Failed to render PayPal buttons:", e);
      onError && onError(e);
      setSdkStatus("failed");
    }
  }, [
    sdkStatus,
    finalAmountUSD,
    finalDescription,
    payerName,
    payerEmail,
    onCardPaymentSuccess,
    onProcessing,
    onDoneProcessing,
    onError,
    hasWindow,
  ]);

  const showMissingConfig = configStatus === "missing" && !clientId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pay securely with PayPal or your credit/debit card.
        </CardTitle>
        <CardDescription>
          You will be charged <strong>${finalAmountUSD.toFixed(2)} USD</strong>
          {finalAmountCAD ? ` (≈ $${finalAmountCAD} CAD)` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {configStatus === "loading" && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading payment settings…
          </div>
        )}

        {showMissingConfig && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No PayPal Client ID was found. Add <code>VITE_PAYPAL_CLIENT_ID</code> to your <code>.env</code> or create
              an active PayPal entry in <em>Admin → Payments</em> (fields like <code>provider: "paypal"</code> and
              <code>client_id</code>/<code>value</code>).
            </AlertDescription>
          </Alert>
        )}

        {configStatus === "ok" && clientId && sdkStatus === "loading" && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading PayPal…
          </div>
        )}

        {configStatus === "ok" && clientId && sdkStatus === "failed" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              PayPal SDK failed to load. Check your network/ad-blockers and try again.
            </AlertDescription>
          </Alert>
        )}

        {configStatus === "ok" && clientId && sdkStatus === "ready" && <div ref={containerRef} />}
      </CardContent>
    </Card>
  );
}
