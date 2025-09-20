// src/components/payments/SharedPaymentGateway.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard, Building, Send, Upload, FileText, Loader2, CheckCircle,
} from "lucide-react";

import { BankAccount, PaymentSetting } from "@/api/entities";

// Firebase
import { storage, db } from "@/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, doc, updateDoc, serverTimestamp } from "firebase/firestore";

/* ----------------------- Utils ----------------------- */

// Recursively remove undefined/null, File/Blob, and empty objects
const deepClean = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof File !== "undefined" && (val instanceof File || val instanceof Blob)) return undefined;
  if (Array.isArray(val)) {
    const cleaned = val.map(deepClean).filter((v) => v !== undefined);
    return cleaned.length ? cleaned : undefined;
  }
  if (typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      const c = deepClean(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return val;
};

const normalizeProviderKey = (label) => {
  const s = (label || "").toLowerCase();
  if (s.includes("bank")) return "bank_transfer";
  if (s.includes("e-") || s.includes("e transfer") || s.includes("etransfer")) return "etransfer";
  if (s.includes("paypal")) return "paypal";
  return s || "other";
};

async function uploadProofToFirebase({ file, relatedEntityId, provider, payerEmail }) {
  if (!file) throw new Error("No file selected.");
  const ts = Date.now();
  const cleanName = (file.name || "proof").replace(/[^\w.\-]+/g, "_");

  const base = "event-payment-receipts";
  const emailPart = (payerEmail || "anonymous").replace(/[^a-zA-Z0-9_.\-@]/g, "_");
  const relPart = (relatedEntityId || "unknown").toString().replace(/[^\w.\-]/g, "_");
  const provPart = provider === "etransfer" ? "etransfer" : "bank";

  const path = `${base}/${provPart}/${relPart}/${emailPart}-${ts}-${cleanName}`;
  const ref = storageRef(storage, path);

  await uploadBytes(ref, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(ref);
  return { url, path };
}

/* ----------------------- PayPal Button Wrapper ----------------------- */

const PayPalPayment = ({ amount, onSuccess, onError }) => {
  const [paypalLoaded, setPaypalLoaded] = useState(!!window.paypal);

  useEffect(() => {
    if (window.paypal) return;
    const script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=sandbox&currency=USD";
    script.onload = () => setPaypalLoaded(true);
    script.onerror = () => setPaypalLoaded(false);
    document.body.appendChild(script);
    return () => { if (script && document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (!window.paypal || !paypalLoaded) return;
    try {
      window.paypal.Buttons({
        createOrder: (data, actions) =>
          actions.order.create({ purchase_units: [{ amount: { value: String(amount ?? 0) } }] }),
        onApprove: async (data, actions) => {
          const details = await actions.order.capture();
          onSuccess?.(details);
        },
        onError: (err) => { console.error("PayPal error:", err); onError?.(err); },
      }).render("#paypal-button-container");
    } catch (e) {
      console.error("PayPal render failed:", e);
      onError?.(e);
    }
  }, [paypalLoaded, amount, onSuccess, onError]);

  return (
    <div className="space-y-4">
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertDescription>
          Pay securely with PayPal or your credit/debit card. You’ll be redirected to complete the payment.
        </AlertDescription>
      </Alert>
      {paypalLoaded ? (
        <div id="paypal-button-container" />
      ) : (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading PayPal…
        </div>
      )}
    </div>
  );
};

/* ----------------------- Bank Transfer Details Card ----------------------- */

const BankTransferDetails = ({ bankDetails }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <Building className="w-5 h-5 text-gray-600" />
        Bank Transfer Instructions
      </CardTitle>
      <CardDescription>Please use the following details to complete your transfer.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3 text-sm">
        {bankDetails.beneficiary_name && (<p><strong>Beneficiary Name:</strong> {bankDetails.beneficiary_name}</p>)}
        {bankDetails.beneficiary_address && (<p><strong>Beneficiary Address:</strong> {bankDetails.beneficiary_address}</p>)}
        {bankDetails.bank_name && (<p><strong>Bank Name:</strong> {bankDetails.bank_name}</p>)}
        {bankDetails.branch_address && (<p><strong>Bank Address:</strong> {bankDetails.branch_address}</p>)}
        {bankDetails.account_number && (<p><strong>Account Number:</strong> {bankDetails.account_number}</p>)}
        {bankDetails.institution_number && (<p><strong>Institution Number:</strong> {bankDetails.institution_number}</p>)}
        {bankDetails.branch_transit && (<p><strong>Branch/Transit Number:</strong> {bankDetails.branch_transit}</p>)}
        {bankDetails.swift_bic && (<p><strong>SWIFT/BIC Code:</strong> {bankDetails.swift_bic}</p>)}
        {bankDetails.currency && (<p><strong>Currency:</strong> {bankDetails.currency}</p>)}
        {bankDetails.charges_option && (<p><strong>Charges:</strong> {bankDetails.charges_option} (sender pays all fees)</p>)}
        <p className="font-bold text-red-600">
          Important: Include reservation code <strong>{bankDetails.reservationCode}</strong> in the transfer notes.
        </p>
        {bankDetails.instructions && (<p className="mt-2 text-xs text-gray-500">{bankDetails.instructions}</p>)}
      </div>
    </CardContent>
  </Card>
);

/* ----------------------- Main Component ----------------------- */

export default function SharedPaymentGateway({
  amountUSD,
  amountCAD,
  itemDescription,
  relatedEntityId,
  relatedEntityType = "event_registration",
  payerName,
  payerEmail,
  onCardPaymentSuccess,           // PayPal success callback (parent navigates)
  onBankTransferInitiated,        // ✅ RE-ADDED: parent callback to navigate after bank/e-transfer
  onProcessing,
  onDoneProcessing,
  onError,
}) {
  const finalAmountUSD = Number(amountUSD || 0);
  const finalAmountCAD = Number(amountCAD || finalAmountUSD * 1.35);
  const finalDescription = itemDescription || "Payment";

  const [tab, setTab] = useState("paypal");

  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState([]);
  const [paypalSetting, setPaypalSetting] = useState(null);
  const [etransferSetting, setEtransferSetting] = useState(null);

  const [selectedBankId, setSelectedBankId] = useState(null);

  const [bankForm, setBankForm] = useState({ receipt: null, referenceCode: "", additionalInfo: "" });
  const [eForm, setEForm] = useState({ receipt: null, additionalInfo: "" });

  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankError, setBankError] = useState("");
  const [eSubmitting, setESubmitting] = useState(false);
  const [eError, setEError] = useState("");

  const bankFileRef = useRef(null);
  const eFileRef = useRef(null);

  // Load config (bank accounts + payment settings)
  useEffect(() => {
    (async () => {
      try {
        const bankRows = await BankAccount.filter({ active: true });
        setBanks(Array.isArray(bankRows) ? bankRows : []);
        if (bankRows?.length) setSelectedBankId(bankRows[0].id);

        const findSettings = async (kind) => {
          let rows = await PaymentSetting.filter({ type: kind, active: true });
          if (!rows?.length) rows = await PaymentSetting.filter({ payment_type: kind, active: true });
          if (!rows?.length) rows = await PaymentSetting.filter({ provider: kind, active: true });
          return rows || [];
        };

        const pp = (await findSettings("paypal"))[0] || null;
        const etr = (await findSettings("etransfer"))[0] || null;

        const normalizedEtr = etr
          ? {
              recipient: etr.recipient || etr.etransfer_email || etr.email || etr.to || "",
              security_question: etr.security_question || etr.etransfer_security_question || "",
              security_answer: etr.security_answer || etr.etransfer_security_answer || "",
              instructions: etr.instructions || "",
              currency: etr.currency || "",
              country: etr.country || "",
              raw: etr,
            }
          : null;

        setPaypalSetting(pp);
        setEtransferSetting(normalizedEtr);
        setBankForm((s) => ({ ...s, referenceCode: `BANK_${Date.now()}` }));

        if (pp) setTab("paypal");
        else if (bankRows?.length) setTab("bank_transfer");
        else if (normalizedEtr) setTab("etransfer");
      } catch (e) {
        console.error("Failed to load payment config:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- Firestore writes (hardened) ---------- */

  async function createPaymentAndFlagRegistration({
    providerLabel, proofUrl, referenceCode, notes, meta,
  }) {
    const providerKey = normalizeProviderKey(providerLabel);

    // Build nested details carefully (omit undefined keys entirely)
    let payment_details;
    if (providerKey === "bank_transfer") {
      const bank_used = deepClean({
        id: meta?.id,
        nickname: meta?.account_nickname,
        bank_name: meta?.bank_name,
        currency: meta?.currency,
        last4: meta?.last4,
      });
      payment_details = deepClean(bank_used ? { bank_account_used: bank_used } : undefined);
    } else if (providerKey === "etransfer") {
      const et = deepClean({
        recipient: meta?.recipient,
        security_question: meta?.security_question,
        security_answer: meta?.security_answer,
      });
      payment_details = deepClean(et ? { etransfer: et } : undefined);
    } else {
      payment_details = undefined;
    }

    const paymentDoc = deepClean({
      status: "pending_verification",
      provider: providerKey,
      amount_usd: Number(finalAmountUSD || 0),
      created_date: serverTimestamp(),
      payer_name: payerName || "",
      payer_email: payerEmail || "",
      related_entity_id: relatedEntityId,
      related_entity_type: relatedEntityType,
      receipt_url: proofUrl,
      reference_code: referenceCode || "",
      notes: notes || "",
      payment_details,
    });

    const ref = await addDoc(collection(db, "payments"), paymentDoc);

    // Update registration (and store payer contact if present)
    await updateDoc(doc(db, "event_registrations", relatedEntityId), deepClean({
      status: "pending_verification",
      proof_url: proofUrl,
      payment_method: providerKey === "etransfer" ? "E-Transfer" : "Bank Transfer",
      updated_at: serverTimestamp(),
      last_payment_id: ref.id,
      contact_name: payerName || undefined,
      contact_email: payerEmail || undefined,
    }));

    return ref.id;
  }

  /* ---------- Handlers ---------- */

  const uploadFileWithRetry = async (file, { provider }) => {
    let attempt = 0;
    let lastErr;
    const maxRetries = 2;
    while (attempt <= maxRetries) {
      try {
        const res = await uploadProofToFirebase({
          file,
          relatedEntityId,
          provider,
          payerEmail,
        });
        return res; // { url, path }
      } catch (err) {
        lastErr = err;
        attempt += 1;
        if (attempt > maxRetries) break;
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
    throw lastErr || new Error("Upload failed");
  };

  const handlePayPalSuccess = async (details) => {
    try {
      onProcessing?.();
      onCardPaymentSuccess?.("paypal", details.id, { details });
    } catch (error) {
      console.error("PayPal success handling error:", error);
      onError?.(error);
    } finally {
      onDoneProcessing?.();
    }
  };

  const handleBankSubmit = async () => {
    if (!selectedBankId) { setBankError("Please select a bank account to transfer to."); return; }
    if (!bankForm.receipt) { setBankError("Please upload your payment receipt."); return; }
    if (!bankForm.referenceCode.trim()) { setBankError("A reference code could not be generated."); return; }

    setBankSubmitting(true); setBankError(""); onProcessing?.();

    try {
      const up = await uploadFileWithRetry(bankForm.receipt, { provider: "bank" });
      const fileUrl = up?.url || "";
      if (!fileUrl) throw new Error("Failed to get file URL from upload");

      const bankInfo = banks.find((b) => b.id === selectedBankId) || null;

      const paymentId = await createPaymentAndFlagRegistration({
        providerLabel: "Bank Transfer",
        proofUrl: fileUrl,
        referenceCode: bankForm.referenceCode,
        notes: bankForm.additionalInfo || "",
        meta: bankInfo
          ? {
              id: bankInfo.id,
              account_nickname: bankInfo.account_nickname,
              bank_name: bankInfo.bank_name,
              currency: bankInfo.currency,
              last4: (bankInfo.account_number || "").slice(-4),
            }
          : null,
      });

      // ✅ Notify parent so it can navigate to success page
      onBankTransferInitiated?.(
        "bank_transfer",
        fileUrl,
        bankForm.referenceCode,
        bankForm.additionalInfo || "",
        bankInfo || null
      );

      setBankForm({ receipt: null, referenceCode: "", additionalInfo: "" });
      setBankError("Bank transfer submitted successfully.");
    } catch (e) {
      console.error("Bank transfer submission error:", e);
      setBankError(e?.message || "Failed to submit bank transfer. Please try again or contact support.");
    } finally {
      setBankSubmitting(false); onDoneProcessing?.();
    }
  };

  const handleETransferSubmit = async () => {
    if (!eForm.receipt) { setEError("Please upload your e-transfer confirmation screenshot."); return; }
    if (!eForm.additionalInfo.trim()) { setEError("Please provide details about your e-transfer."); return; }

    setESubmitting(true); setEError(""); onProcessing?.();

    try {
      const up = await uploadFileWithRetry(eForm.receipt, { provider: "etransfer" });
      const fileUrl = up?.url || "";
      if (!fileUrl) throw new Error("Failed to get file URL from upload");

      const referenceCode = `ETRANSFER_${Date.now()}`;

      const paymentId = await createPaymentAndFlagRegistration({
        providerLabel: "E-Transfer",
        proofUrl: fileUrl,
        referenceCode,
        notes: eForm.additionalInfo || "",
        meta: etransferSetting?.raw || etransferSetting || null,
      });

      // ✅ Notify parent so it can navigate to success page
      onBankTransferInitiated?.(
        "etransfer",
        fileUrl,
        referenceCode,
        eForm.additionalInfo || "",
        etransferSetting?.raw || etransferSetting || null
      );

      setEForm({ receipt: null, additionalInfo: "" });
      setEError("E-Transfer submitted successfully.");
    } catch (e) {
      console.error("E-transfer submission error:", e);
      setEError(e?.message || "Failed to submit e-transfer. Please try again or contact support.");
    } finally {
      setESubmitting(false); onDoneProcessing?.();
    }
  };

  const onPickFile = (e, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (kind === "bank") setBankForm((s) => ({ ...s, receipt: file }));
    if (kind === "etransfer") setEForm((s) => ({ ...s, receipt: file }));
  };

  /* ---------- UI ---------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2">Loading payment options…</span>
      </div>
    );
  }

  const selectedBank = banks.find((b) => b.id === selectedBankId) || null;

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>Payment Summary</CardTitle>
        {finalDescription && <CardDescription>{finalDescription}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <span className="text-lg">{finalDescription}</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">${finalAmountUSD.toFixed(2)} USD</div>
            <div className="text-sm text-gray-500">CAD Equivalent: ${finalAmountCAD.toFixed(2)}</div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Select Payment Method</h3>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="paypal" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                PayPal
              </TabsTrigger>

              <TabsTrigger value="bank_transfer" className="flex items-center gap-2" disabled={!banks.length}>
                <Building className="w-4 h-4" />
                Bank Transfer
              </TabsTrigger>

              <TabsTrigger value="etransfer" className="flex items-center gap-2" disabled={!etransferSetting}>
                <Send className="w-4 h-4" />
                E-Transfer
              </TabsTrigger>
            </TabsList>

            {/* PayPal */}
            <TabsContent value="paypal" className="space-y-4">
              <PayPalPayment
                amount={finalAmountUSD}
                onSuccess={handlePayPalSuccess}
                onError={(err) => onError?.(err)}
              />
              {!paypalSetting && (
                <Alert>
                  <AlertDescription>
                    PayPal is enabled here for checkout. Configure credentials in
                    <code className="px-1">payment_settings</code> to connect your real account.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Bank Transfer */}
            <TabsContent value="bank_transfer" className="space-y-4">
              {banks.length ? (
                <>
                  <Alert>
                    <Building className="h-4 w-4" />
                    <AlertDescription>
                      Select an account, transfer the exact amount, and upload your receipt for verification.
                    </AlertDescription>
                  </Alert>

                  <RadioGroup value={selectedBankId || ""} onValueChange={setSelectedBankId} className="space-y-4">
                    <Label className="font-semibold">Select Bank Account to Transfer To:</Label>
                    {banks.map((bank) => (
                      <div
                        key={bank.id}
                        className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-50"
                      >
                        <RadioGroupItem value={bank.id} id={bank.id} />
                        <Label htmlFor={bank.id} className="flex-grow cursor-pointer">
                          <div className="font-semibold text-base">
                            {bank.account_nickname} ({bank.currency})
                          </div>
                          <div className="text-sm text-gray-600">
                            {bank.bank_name} – *********{(bank.account_number || "").slice(-4)}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {selectedBank && (
                    <BankTransferDetails bankDetails={{ ...selectedBank, reservationCode: bankForm.referenceCode }} />
                  )}

                  <div className="space-y-4 pt-2">
                    <Label htmlFor="bank-notes">Transfer Details (reference, notes)</Label>
                    <Textarea
                      id="bank-notes"
                      value={bankForm.additionalInfo}
                      onChange={(e) => setBankForm((s) => ({ ...s, additionalInfo: e.target.value }))}
                      placeholder="Reference code, date, and any notes from your bank transfer"
                    />

                    <Label htmlFor="bank-receipt">Upload Payment Receipt</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        ref={bankFileRef}
                        type="file"
                        id="bank-receipt"
                        accept="image/*,.pdf"
                        onChange={(e) => onPickFile(e, "bank")}
                        className="hidden"
                      />
                      {bankForm.receipt ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span>Receipt selected: {bankForm.receipt.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-2">Click button to upload your receipt</p>
                          <p className="text-sm text-gray-500">Supports JPG, PNG, PDF files</p>
                        </div>
                      )}
                    </div>
                    <Button type="button" variant="outline" className="w-full" onClick={() => bankFileRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      {bankForm.receipt ? "Change Receipt" : "Select Receipt File"}
                    </Button>

                    {bankError && (
                      <div
                        className={`mt-2 p-3 rounded-md ${
                          bankError.includes("success")
                            ? "bg-green-50 border border-green-200 text-green-700"
                            : "bg-red-50 border border-red-200 text-red-700"
                        }`}
                      >
                        <p className="text-sm">{bankError}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleBankSubmit}
                      disabled={!bankForm.receipt || bankSubmitting || !selectedBankId || !bankForm.referenceCode}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {bankSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit Bank Transfer
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Bank transfer is not currently available. Please contact support or choose another payment method.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* E-Transfer */}
            <TabsContent value="etransfer" className="space-y-4">
              {etransferSetting ? (
                <>
                  <Alert>
                    <Send className="h-4 w-4" />
                    <AlertDescription>
                      Follow the instructions below to send an e-transfer and upload your confirmation screenshot.
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">E-Transfer Details</CardTitle>
                      <CardDescription>Send your Interac e-Transfer using the info below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {etransferSetting.recipient && (<p><strong>Recipient:</strong> {etransferSetting.recipient}</p>)}
                      {etransferSetting.security_question && (<p><strong>Security Question:</strong> {etransferSetting.security_question}</p>)}
                      {etransferSetting.security_answer && (<p><strong>Security Answer:</strong> {etransferSetting.security_answer}</p>)}
                      {etransferSetting.currency && (<p><strong>Currency:</strong> {etransferSetting.currency}</p>)}
                      {etransferSetting.country && (<p><strong>Country:</strong> {etransferSetting.country}</p>)}
                      {etransferSetting.instructions && (
                        <div
                          className="prose prose-sm max-w-none mt-2"
                          dangerouslySetInnerHTML={{ __html: etransferSetting.instructions }}
                        />
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="etransfer-details">E-Transfer Notes</Label>
                      <Textarea
                        id="etransfer-details"
                        value={eForm.additionalInfo}
                        onChange={(e) => setEForm((s) => ({ ...s, additionalInfo: e.target.value }))}
                        placeholder="Reference/confirmation number, date, and any notes"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="etransfer-receipt">Upload Confirmation Screenshot</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          ref={eFileRef}
                          type="file"
                          id="etransfer-receipt"
                          accept="image/*,.pdf"
                          onChange={(e) => onPickFile(e, "etransfer")}
                          className="hidden"
                        />
                        {eForm.receipt ? (
                          <div className="flex items-center justify-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span>Screenshot selected: {eForm.receipt.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-2">Click button to upload confirmation</p>
                            <p className="text-sm text-gray-500">Screenshot from your banking app or email</p>
                          </div>
                        )}
                      </div>
                      <Button type="button" variant="outline" className="w-full mt-2" onClick={() => eFileRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        {eForm.receipt ? "Change Screenshot" : "Select Screenshot"}
                      </Button>
                    </div>

                    {eError && (
                      <div
                        className={`mt-2 p-3 rounded-md ${
                          eError.includes("success")
                            ? "bg-green-50 border border-green-200 text-green-700"
                            : "bg-red-50 border border-red-200 text-red-700"
                        }`}
                      >
                        <p className="text-sm">{eError}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleETransferSubmit}
                      disabled={!eForm.receipt || eSubmitting}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {eSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit E-Transfer
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    E-Transfer is not currently available. Please contact support or choose another payment method.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
