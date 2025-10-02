import React, { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Info } from "lucide-react";
import { PaymentSetting } from "@/api/entities";

/**
 * PayPal-only Gateway
 * - If `paypalClientId` prop not provided, fetches from Admin Payments (PaymentSetting).
 * - Shows clear messages if config is missing or SDK fails to load.
 */
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
  const finalAmountCAD = Number(amountCAD !== undefined ? amountCAD : finalAmountUSD * 1.35);
  const finalDescription = itemDescription || "Payment";

  const hasWindow = typeof window !== "undefined";
  const containerRef = useRef(null);
  const buttonRenderedRef = useRef(false);

  const [adminPaypalId, setAdminPaypalId] = useState(null);
  const [configStatus, setConfigStatus] = useState("loading"); // 'loading' | 'ok' | 'missing' | 'error'
  const [sdkStatus, setSdkStatus] = useState("idle"); // 'idle' | 'loading' | 'ready' | 'failed'

  // 1) Pull PayPal client id from Admin Payments
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (paypalClientId) {
        setConfigStatus("ok");
        setAdminPaypalId(null);
        return;
      }

      try {
        // Prefer rows where paypal is the provider/type
        const trySets = async () => {
          let rows = await PaymentSetting.filter({ provider: "paypal", active: true });
          if (!rows?.length) rows = await PaymentSetting.filter({ type: "paypal", active: true });
          if (!rows?.length) rows = await PaymentSetting.filter({ payment_type: "paypal", active: true });
          // Fallback: a single key-value style row
          if (!rows?.length) rows = await PaymentSetting.filter({ key: "PAYPAL_CLIENT_ID", active: true });
          return rows || [];
        };

        const rows = await trySets();
        const s = rows?.[0] || null;

        // Extract likely fields
        const id =
          s?.client_id ||
          s?.paypal_client_id ||
          s?.public_key ||
          s?.merchant_id ||
          s?.value ||                    // if key/value style
          s?.config?.client_id ||
          s?.settings?.client_id ||
          s?.credentials?.client_id ||
          null;

        if (cancelled) return;

        if (id && String(id).trim()) {
          setAdminPaypalId(String(id).trim());
          setConfigStatus("ok");
        } else {
          setConfigStatus("missing");
        }
      } catch (e) {
        console.warn("PaymentSetting (paypal) read failed:", e);
        if (!cancelled) setConfigStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [paypalClientId]);

  // Effective client id (prop wins)
  const clientId = useMemo(
    () => (paypalClientId && String(paypalClientId).trim()) || adminPaypalId || null,
    [paypalClientId, adminPaypalId]
  );

  // 2) Load PayPal SDK when we have a client id
  useEffect(() => {
    if (!hasWindow) return;
    if (!clientId) return; // wait for config
    if (window.paypal) {
      setSdkStatus("ready");
      return;
    }

    setSdkStatus("loading");
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
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

  // 3) Render buttons once SDK ready
  useEffect(() => {
    if (sdkStatus !== "ready" || !containerRef.current || buttonRenderedRef.current) return;

    try {
      buttonRenderedRef.current = true;

      window.paypal
        .Buttons({
          createOrder: (data, actions) => actions.order.create({
            purchase_units: [{ description: finalDescription, amount: { value: String(finalAmountUSD.toFixed(2)) } }],
          }),
          onApprove: async (data, actions) => {
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
    } catch (e) {
      console.error("Failed to render PayPal buttons:", e);
      onError && onError(e);
      setSdkStatus("failed");
    }
  }, [
    sdkStatus,
    finalAmountUSD,
    finalDescription,
    onCardPaymentSuccess,
    onProcessing,
    onDoneProcessing,
    onError,
    payerName,
    payerEmail,
  ]);

  const showMissingConfig =
    configStatus === "missing" || (configStatus === "ok" && !clientId);

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>Payment Summary</CardTitle>
        {finalDescription ? <CardDescription>{finalDescription}</CardDescription> : null}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <span className="text-lg">{finalDescription}</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">${finalAmountUSD.toFixed(2)} USD</div>
            <div className="text-sm text-gray-500">CAD Equivalent: ${finalAmountCAD.toFixed(2)}</div>
          </div>
        </div>

        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>Pay securely with PayPal or your credit/debit card.</AlertDescription>
        </Alert>

        {/* Status UI */}
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
              No PayPal Client ID found in Admin Payments. Please open your Admin Payments page and ensure a PayPal
              setting exists with a <strong>client_id</strong> (or <em>paypal_client_id</em>/<em>value</em>).
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

        {configStatus === "ok" && clientId && sdkStatus === "ready" && (
          <div ref={containerRef} />
        )}
      </CardContent>
    </Card>
  );
}
