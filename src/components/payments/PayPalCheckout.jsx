import React, { useMemo, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

/**
 * Props:
 *  - amountUSD: number
 *  - itemDescription: string
 *  - registrationId: string | number
 *  - payerName?: string
 *  - payerEmail?: string
 *  - onSuccess: (method: "paypal", transactionId: string, details: any) => void
 *  - onProcessing?: () => void
 *  - onError?: (msg: string) => void
 */
export default function PayPalCheckout({
  amountUSD,
  itemDescription,
  registrationId,
  payerName,
  payerEmail,
  onSuccess,
  onProcessing,
  onError,
}) {
  const [loading, setLoading] = useState(false);

  const options = useMemo(() => ({
    "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
    currency: "USD",
    intent: "capture",
    // You may also add "data-client-token" if you later enable advanced flows
  }), []);

  const createOrderOnServer = async () => {
    const res = await fetch("/src/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amountUSD).toFixed(2),
        currency: "USD",
        description: itemDescription,
        registrationId,
        payerName,
        payerEmail,
      }),
    });
    if (!res.ok) throw new Error("Failed to create PayPal order.");
    const data = await res.json();
    return data.id; // PayPal order ID
  };

  const captureOrderOnServer = async (orderID) => {
    const res = await fetch("/src/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderID }),
    });
    if (!res.ok) throw new Error("Failed to capture PayPal order.");
    return res.json();
  };

  return (
    <PayPalScriptProvider options={options}>
      <div className="p-4 border rounded-xl bg-white">
        <div className="text-sm text-gray-600 mb-3">
          Pay with PayPal (USD)
        </div>
        <PayPalButtons
          style={{ layout: "vertical" }}
          disabled={loading || !amountUSD}
          createOrder={async () => {
            try {
              setLoading(true);
              onProcessing && onProcessing();
              return await createOrderOnServer();
            } catch (e) {
              setLoading(false);
              onError && onError(e.message || "Could not start PayPal payment.");
              throw e;
            }
          }}
          onApprove={async (data) => {
            try {
              // data.orderID, data.payerID
              const capture = await captureOrderOnServer(data.orderID);

              // Typical capture id location:
              const captureId =
                capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
                capture?.id ||
                data.orderID;

              onSuccess &&
                onSuccess("paypal", String(captureId), {
                  orderID: data.orderID,
                  payerID: data.payerID,
                  capture,
                });
            } catch (e) {
              onError && onError(e.message || "Error finalizing PayPal payment.");
            } finally {
              setLoading(false);
            }
          }}
          onCancel={() => {
            setLoading(false);
          }}
          onError={(err) => {
            setLoading(false);
            onError && onError("PayPal error: " + (err?.message || "Unknown"));
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}
