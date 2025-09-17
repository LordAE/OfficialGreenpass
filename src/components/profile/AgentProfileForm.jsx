// src/components/profile/AgentProfileForm.jsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* Firebase */
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

const toNumber = (v, def = "") => {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const normalizeAgent = (doc = {}) => ({
  company_name: doc.company_name || "",
  business_license_mst: doc.business_license_mst || "",
  paypal_email: doc.paypal_email || "",
  year_established: toNumber(doc.year_established, ""),
  website: doc.website || "",
  phone: doc.phone || "",
  address: doc.address || "",
});

export default function AgentProfileForm({
  formData,
  handleInputChange,
  autoLoadFromFirestore = true,
  onLoaded, // optional: ({ docId, data }) => void
}) {
  const usingParentState = typeof handleInputChange === "function";
  const [localData, setLocalData] = useState(() => normalizeAgent(formData));
  const [loading, setLoading] = useState(!!autoLoadFromFirestore);
  const [docId, setDocId] = useState(null);

  useEffect(() => {
    if (usingParentState) return;
    setLocalData(normalizeAgent(formData));
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoLoadFromFirestore) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (!user) return setLoading(false);
        const qRef = query(collection(db, "agents"), where("user_id", "==", user.uid), limit(1));
        const qs = await getDocs(qRef);
        if (!qs.empty) {
          const snap = qs.docs[0];
          const data = normalizeAgent(snap.data());
          setDocId(snap.id);
          if (usingParentState) {
            Object.entries(data).forEach(([k, v]) => handleInputChange(k, v));
          } else {
            setLocalData(data);
          }
          onLoaded && onLoaded({ docId: snap.id, data });
        } else {
          const empty = normalizeAgent({});
          if (usingParentState) {
            Object.entries(empty).forEach(([k, v]) => handleInputChange(k, v));
          } else {
            setLocalData(empty);
          }
          onLoaded && onLoaded({ docId: null, data: empty });
        }
      } catch (e) {
        console.error("Agent load failed:", e);
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
        Agent Information {docId ? <span className="text-xs text-gray-500">({docId})</span> : null}
      </h3>

      {loading ? (
        <div className="text-sm text-gray-500">Loading agent profile…</div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={data.company_name || ""}
                onChange={(e) => onChange("company_name", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="business_license_mst">Business License / MST *</Label>
              <Input
                id="business_license_mst"
                value={data.business_license_mst || ""}
                onChange={(e) => onChange("business_license_mst", e.target.value)}
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
              <Label htmlFor="year_established">Year Established</Label>
              <Input
                id="year_established"
                type="number"
                min="1900"
                max="2100"
                value={data.year_established ?? ""}
                onChange={(e) => onChange("year_established", toNumber(e.target.value, ""))}
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

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+1 555-555-5555"
                value={data.phone || ""}
                onChange={(e) => onChange("phone", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Street, City, Province, Postal Code, Country"
              value={data.address || ""}
              onChange={(e) => onChange("address", e.target.value)}
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  );
}
