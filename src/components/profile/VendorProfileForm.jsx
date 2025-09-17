// src/components/profile/VendorProfileForm.jsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* Firebase */
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

// CSV helpers
const toCSV = (v) => (Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "");
const fromCSV = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

const normalizeVendor = (doc = {}) => ({
  business_name: doc.business_name || "",
  service_categories: Array.isArray(doc.service_categories)
    ? doc.service_categories
    : fromCSV(doc.service_categories),
  paypal_email: doc.paypal_email || "",
  website: doc.website || "",
  description: doc.description || "",
});

export default function VendorProfileForm({
  formData,
  handleInputChange,
  autoLoadFromFirestore = true,
  onLoaded,
}) {
  const usingParentState = typeof handleInputChange === "function";
  const [localData, setLocalData] = useState(() => normalizeVendor(formData));
  const [loading, setLoading] = useState(!!autoLoadFromFirestore);
  const [docId, setDocId] = useState(null);

  useEffect(() => {
    if (usingParentState) return;
    setLocalData(normalizeVendor(formData));
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoLoadFromFirestore) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (!user) return setLoading(false);
        const qRef = query(collection(db, "vendors"), where("user_id", "==", user.uid), limit(1));
        const qs = await getDocs(qRef);
        if (!qs.empty) {
          const snap = qs.docs[0];
          const data = normalizeVendor(snap.data());
          setDocId(snap.id);
          if (usingParentState) {
            Object.entries(data).forEach(([k, v]) => handleInputChange(k, v));
          } else {
            setLocalData(data);
          }
          onLoaded && onLoaded({ docId: snap.id, data });
        } else {
          const empty = normalizeVendor({});
          if (usingParentState) {
            Object.entries(empty).forEach(([k, v]) => handleInputChange(k, v));
          } else {
            setLocalData(empty);
          }
          onLoaded && onLoaded({ docId: null, data: empty });
        }
      } catch (e) {
        console.error("Vendor load failed:", e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub && unsub();
  }, [autoLoadFromFirestore, usingParentState, handleInputChange, onLoaded]);

  const data = usingParentState ? formData || {} : localData;
  const onChange = (k, v) =>
    usingParentState ? handleInputChange(k, v) : setLocalData((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
        Vendor Information {docId ? <span className="text-xs text-gray-500">({docId})</span> : null}
      </h3>

      {loading ? (
        <div className="text-sm text-gray-500">Loading vendor profile…</div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={data.business_name || ""}
                onChange={(e) => onChange("business_name", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="paypal_email">PayPal Email *</Label>
              <Input
                id="paypal_email"
                type="email"
                value={data.paypal_email || ""}
                onChange={(e) => onChange("paypal_email", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                value={data.website || ""}
                onChange={(e) => onChange("website", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="service_categories">Service Categories *</Label>
            <Input
              id="service_categories"
              placeholder="e.g., Editing, Coaching, Accommodation (comma separated)"
              value={toCSV(data.service_categories)}
              onChange={(e) => onChange("service_categories", fromCSV(e.target.value))}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">About</Label>
            <Textarea
              id="description"
              placeholder="Describe your services..."
              value={data.description || ""}
              onChange={(e) => onChange("description", e.target.value)}
              rows={4}
            />
          </div>
        </>
      )}
    </div>
  );
}
