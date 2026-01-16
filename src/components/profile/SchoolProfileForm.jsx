// src/components/profile/SchoolProfileForm.jsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* Firebase */
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";

const normalizeSchool = (d = {}) => ({
  name: d.name || "",
  school_level: d.school_level || "",
  location: d.location || "",
  website: d.website || "",
  // ✅ unify: UI uses "about"
  about: d.about || d.description || "",
  // keep description too (optional)
  description: d.description || d.about || "",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  useEffect(() => {
    if (!autoLoadFromFirestore) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (!user) return setLoading(false);

        // ✅ 1) Prefer single source of truth: doc id = uid
        const byIdRef = doc(db, "school_profiles", user.uid);
        const byIdSnap = await getDoc(byIdRef);

        if (byIdSnap.exists()) {
          const data = normalizeSchool(byIdSnap.data());
          setDocId(byIdSnap.id);

          if (usingParentState) {
            Object.entries(data).forEach(([k, v]) => handleInputChange(k, v));
          } else {
            setLocalData(data);
          }
          onLoaded && onLoaded({ docId: byIdSnap.id, data });
          return;
        }

        // ✅ 2) Fallback: query by user_id (for legacy docs)
        const qRef = query(
          collection(db, "school_profiles"),
          where("user_id", "==", user.uid),
          limit(1)
        );
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
          setDocId(null);
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
    usingParentState
      ? handleInputChange(k, v)
      : setLocalData((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      {/* (Optional) keep small helper text only */}
      <div className="text-sm text-gray-500">
        {docId ? `School profile doc: ${docId}` : "School profile not created yet."}
      </div>

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
            <Label htmlFor="about">About</Label>
            <Textarea
              id="about"
              placeholder="Describe the institution..."
              value={data.about || ""}
              onChange={(e) => {
                // ✅ write both keys so old pages stay consistent
                onChange("about", e.target.value);
                onChange("description", e.target.value);
              }}
              rows={4}
            />
          </div>
        </>
      )}
    </div>
  );
}
