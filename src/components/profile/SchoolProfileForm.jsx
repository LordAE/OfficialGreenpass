// src/components/profile/SchoolProfileForm.jsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* Firebase */
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

const normalizeSchool = (doc = {}) => ({
  name: doc.name || "",
  school_level: doc.school_level || "",
  location: doc.location || "",
  website: doc.website || "",
  description: doc.description || "",
});

export default function SchoolProfileForm({
  formData,
  handleInputChange,
  autoLoadFromFirestore = true,
  onLoaded,
}) {
  const usingParentState = typeof handleInputChange === "function";
  const [localData, setLocalData] = useState(() => normalizeSchool(formData));
  const [loading, setLoading] = useState(!!autoLoadFromFirestore);
  const [docId, setDocId] = useState(null);

  useEffect(() => {
    if (usingParentState) return;
    setLocalData(normalizeSchool(formData));
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoLoadFromFirestore) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (!user) return setLoading(false);
        // Prefer school_profiles; if you store in "schools" instead, change below
        const qRef = query(collection(db, "school_profiles"), where("user_id", "==", user.uid), limit(1));
        const qs = await getDocs(qRef);
        if (!qs.empty) {
          const snap = qs.docs[0];
          const data = normalizeSchool(snap.data());
          setDocId(snap.id);
          if (usingParentState) {
            Object.entries(data).forEach(([k, v]) => handleInputChange(k, v));
          } else {
            setLocalData(data);
          }
          onLoaded && onLoaded({ docId: snap.id, data });
        } else {
          const empty = normalizeSchool({});
          if (usingParentState) {
            Object.entries(empty).forEach(([k, v]) => handleInputChange(k, v));
          } else {
            setLocalData(empty);
          }
          onLoaded && onLoaded({ docId: null, data: empty });
        }
      } catch (e) {
        console.error("School load failed:", e);
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
        School Profile {docId ? <span className="text-xs text-gray-500">({docId})</span> : null}
      </h3>

      {loading ? (
        <div className="text-sm text-gray-500">Loading school profile…</div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Institution Name *</Label>
              <Input
                id="name"
                value={data.name || ""}
                onChange={(e) => onChange("name", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="school_level">School Level *</Label>
              <Input
                id="school_level"
                placeholder="University / College / High School"
                value={data.school_level || ""}
                onChange={(e) => onChange("school_level", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="City, Country"
                value={data.location || ""}
                onChange={(e) => onChange("location", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://example.edu"
                value={data.website || ""}
                onChange={(e) => onChange("website", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">About</Label>
            <Textarea
              id="description"
              placeholder="Describe the institution..."
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
