// src/components/profile/TutorProfileForm.jsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* ---------- Firebase ---------- */
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

/* ---------- helpers ---------- */
// handle both arrays and strings for comma-separated inputs
const toCSV = (v) =>
  Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";

const fromCSV = (s) =>
  (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const toNumber = (v, def = "") => {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const normalizeTutor = (doc = {}) => ({
  bio: doc.bio || "",
  experience_years: toNumber(doc.experience_years, ""),
  hourly_rate: toNumber(doc.hourly_rate, ""),
  paypal_email: doc.paypal_email || "",
  specializations: Array.isArray(doc.specializations)
    ? doc.specializations
    : fromCSV(doc.specializations),
  qualifications: Array.isArray(doc.qualifications)
    ? doc.qualifications
    : fromCSV(doc.qualifications),
});

/* ---------- component ---------- */
export default function TutorProfileForm({
  formData,
  handleInputChange,
  autoLoadFromFirestore = true, // set to false if Profile.jsx already loaded the doc
  onLoaded, // optional: ({ docId, data }) => void
}) {
  const usingParentState = typeof handleInputChange === "function";
  const [localData, setLocalData] = useState(() => normalizeTutor(formData));
  const [loading, setLoading] = useState(!!autoLoadFromFirestore);
  const [docId, setDocId] = useState(null);

  // keep local state in sync with parent if provided
  useEffect(() => {
    if (usingParentState) return;
    setLocalData(normalizeTutor(formData));
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  // auto-load tutors doc by current user's uid
  useEffect(() => {
    if (!autoLoadFromFirestore) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (!user) {
          setLoading(false);
          return;
        }
        const qRef = query(
          collection(db, "tutors"),
          where("user_id", "==", user.uid),
          limit(1)
        );
        const qs = await getDocs(qRef);

        if (!qs.empty) {
          const snap = qs.docs[0];
          const data = normalizeTutor(snap.data());
          setDocId(snap.id);

          if (usingParentState) {
            Object.entries(data).forEach(([k, v]) => handleInputChange(k, v));
          } else {
            setLocalData(data);
          }

          onLoaded && onLoaded({ docId: snap.id, data });
        } else {
          const empty = normalizeTutor({});
          if (usingParentState) {
            Object.entries(empty).forEach(([k, v]) => handleInputChange(k, v));
          } else {
            setLocalData(empty);
          }
          onLoaded && onLoaded({ docId: null, data: empty });
        }
      } catch (err) {
        console.error("Failed to load tutor profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub && unsub();
  }, [autoLoadFromFirestore, usingParentState, handleInputChange, onLoaded]);

  const data = usingParentState ? formData || {} : localData;
  const onChange = (key, val) => {
    if (usingParentState) return handleInputChange(key, val);
    setLocalData((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
        Tutor Information {docId ? <span className="text-xs text-gray-500">({docId})</span> : null}
      </h3>

      {loading ? (
        <div className="text-sm text-gray-500">Loading tutor profile…</div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="experience_years">Years of Experience *</Label>
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  placeholder="5"
                  value={data?.experience_years ?? ""}
                  onChange={(e) =>
                    onChange("experience_years", toNumber(e.target.value, ""))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="hourly_rate">Hourly Rate (USD) *</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                  value={data?.hourly_rate ?? ""}
                  onChange={(e) =>
                    onChange("hourly_rate", toNumber(e.target.value, ""))
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="specializations">Specializations *</Label>
              <Input
                id="specializations"
                placeholder="IELTS, TOEFL, General English (comma separated)"
                value={toCSV(data?.specializations)}
                onChange={(e) =>
                  onChange("specializations", fromCSV(e.target.value))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="qualifications">Qualifications</Label>
              <Input
                id="qualifications"
                placeholder="TESOL, CELTA, Masters in Education (comma separated)"
                value={toCSV(data?.qualifications)}
                onChange={(e) =>
                  onChange("qualifications", fromCSV(e.target.value))
                }
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about your teaching experience and approach..."
                value={data?.bio ?? ""}
                onChange={(e) => onChange("bio", e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
              Payout Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="paypal_email">PayPal Email *</Label>
                <Input
                  id="paypal_email"
                  type="email"
                  placeholder="payouts@example.com"
                  value={data?.paypal_email ?? ""}
                  onChange={(e) => onChange("paypal_email", e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your PayPal email to receive session payouts. This is required.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
