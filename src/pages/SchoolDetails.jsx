// src/pages/SchoolDetails.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Globe,
  Calendar,
  Star,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Building
} from "lucide-react";
import { createPageUrl } from "@/utils";

/* ---------- Firestore ---------- */
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  limit
} from "firebase/firestore";

/* ---------- helpers ---------- */
const pickFirst = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && (`${v}`.trim?.() ?? `${v}`) !== "") ?? undefined;

const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const money = (amount) => {
  if (amount === undefined || amount === null) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(amount));
  } catch {
    return `$${Number(amount || 0).toLocaleString()}`;
  }
};

/* ---------- safe Firestore get (swallow permission-denied) ---------- */
async function safeGetDoc(path, id) {
  try {
    return await getDoc(doc(db, path, id));
  } catch (e) {
    const msg = (e?.code || e?.message || "").toString().toLowerCase();
    if (msg.includes("permission") || msg.includes("insufficient")) {
      // Treat like a non-existent doc so we can fall back gracefully
      return { exists: () => false };
    }
    // Fail soft on any other error too
    return { exists: () => false };
  }
}

export default function SchoolDetails() {
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get("id");

  const [school, setSchool] = useState(null);   // header card data (from school_profiles or fallback)
  const [programs, setPrograms] = useState([]); // programs from `schools` collection
  const [loading, setLoading] = useState(true);
  const [programsPage, setProgramsPage] = useState(1);
  const programsPerPage = 10;

  const formatLocation = (s) => {
    const parts = [s?.location, s?.province, s?.country].filter(Boolean);
    return parts.join(", ");
  };

  // Map a Firestore `schools` doc to the program card shape
  const mapProgramFromSchoolDoc = (snap) => {
    const d = { id: snap.id, ...snap.data() };
    return {
      id: snap.id,
      name: pickFirst(d.program_title, d.title, d.program_name, "Program"),
      level: pickFirst(d.program_level, d.level, ""),
      duration: pickFirst(d.duration_display, d.duration, "Contact School"),
      tuition_per_year: Number(
        pickFirst(d.tuition_per_year_cad, d.tuition_fee_cad, d.tuition, 0)
      ),
      intakes: ensureArray(pickFirst(d.intake_dates, d.intakes, [])),
      available_seats: d.available_seats
    };
  };

  // Normalize a `school_profiles` doc into the header object
  // ❗Annual Tuition comes **strictly** from school_profiles.tuition_fees
  const buildHeaderFromProfile = (p) => ({
    id: p.id,
    name: pickFirst(
      p.institution_name,
      p.school_name,
      p.name,
      p.title,
      "Institution"
    ),
    image_url: pickFirst(p.logoUrl, p.logo_url, p.institution_logo_url, p.image_url),
    verification_status: pickFirst(p.verification_status, p.verified && "verified"),
    account_type: pickFirst(p.account_type, "real"),
    address: pickFirst(p.address, p.street_address),
    website: pickFirst(p.website, p.url, p.homepage),
    founded_year: pickFirst(p.founded_year, p.established),
    tuition_fees: Number(p.tuition_fees ?? 0) || 0, // <-- only school_profiles.tuition_fees
    application_fee: Number(p.application_fee ?? 0) || 0,
    rating: Number(p.rating ?? 0) || undefined,
    acceptance_rate: Number(p.acceptance_rate ?? 0) || undefined,
    location: pickFirst(p.city, p.location),
    province: pickFirst(p.province, p.state),
    country: pickFirst(p.country, "Canada"),
    about: pickFirst(p.about, p.description)
  });

  // Fallback: build header from a single `schools` doc (if id was a school row)
  // (We do NOT set tuition_fees here to keep Annual Tuition sourced from school_profiles only.)
  const buildHeaderFromSchoolDoc = (s) => ({
    id: s.id,
    name: pickFirst(s.institution_name, s.school_name, s.name, "Institution"),
    image_url: pickFirst(s.institution_logo_url, s.school_image_url, s.logo_url, s.image_url),
    verification_status: pickFirst(s.verification_status, s.verified && "verified"),
    account_type: pickFirst(s.account_type, "real"),
    address: pickFirst(s.address, s.school_address),
    website: s.website,
    founded_year: pickFirst(s.founded_year, s.established),
    tuition_fees: undefined,
    application_fee: Number(pickFirst(s.application_fee, 0)) || 0,
    rating: Number(pickFirst(s.rating, 0)) || undefined,
    acceptance_rate: Number(pickFirst(s.acceptance_rate, 0)) || undefined,
    location: pickFirst(s.city, s.school_city, s.location),
    province: pickFirst(s.province, s.school_province, s.state),
    country: pickFirst(s.country, s.school_country, "Canada"),
    about: pickFirst(s.institution_about, s.about)
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        /* 1) Try to load a school profile by id (may be permission-restricted) */
        let profileSnap = await safeGetDoc("school_profiles", schoolId);
        if (!profileSnap.exists()) {
          // optional casing fallback
          profileSnap = await safeGetDoc("SchoolProfiles", schoolId);
        }

        let header = null;
        let nameForMatch = null;

        if (profileSnap.exists()) {
          const profile = { id: profileSnap.id, ...profileSnap.data() };
          header = buildHeaderFromProfile(profile);
          nameForMatch = header.name;
        } else {
          /* 2) If not a profile id, try a school doc by id */
          let sSnap = await safeGetDoc("schools", schoolId);
          if (!sSnap.exists()) {
            sSnap = await safeGetDoc("Schools", schoolId);
          }

          if (sSnap.exists()) {
            const s = { id: sSnap.id, ...sSnap.data() };
            header = buildHeaderFromSchoolDoc(s);
            nameForMatch = pickFirst(s.institution_name, s.school_name, header?.name);
          }
        }

        if (!header) {
          if (!cancelled) {
            setSchool(null);
            setPrograms([]);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) setSchool(header);

        /* 3) Programs:
              - Query by school_id == {id} (in case programs link to a profile id)
              - Then by institution_name == name(profile)
              - Then by school_name == name(profile)
        */
        const programsFound = [];

        // Try school_id link first
        try {
          const qId = query(
            collection(db, "schools"),
            where("school_id", "==", schoolId),
            limit(500)
          );
          const resId = await getDocs(qId);
          resId.forEach((snap) => {
            const id = snap.id;
            if (!programsFound.find((p) => p.id === id)) {
              programsFound.push(mapProgramFromSchoolDoc(snap));
            }
          });
        } catch (_) {
          // ignore (index not required for simple equality, but fail-soft anyway)
        }

        // Name-based queries
        if (nameForMatch) {
          const q1 = query(
            collection(db, "schools"),
            where("institution_name", "==", nameForMatch),
            limit(500)
          );
          const res1 = await getDocs(q1);
          res1.forEach((snap) => {
            const id = snap.id;
            if (!programsFound.find((p) => p.id === id)) {
              programsFound.push(mapProgramFromSchoolDoc(snap));
            }
          });

          const q2 = query(
            collection(db, "schools"),
            where("school_name", "==", nameForMatch),
            limit(500)
          );
          const res2 = await getDocs(q2);
          res2.forEach((snap) => {
            const id = snap.id;
            if (!programsFound.find((p) => p.id === id)) {
              programsFound.push(mapProgramFromSchoolDoc(snap));
            }
          });
        }

        if (!cancelled) {
          setPrograms(programsFound);
          // Reset to first page when list changes
          setProgramsPage(1);
        }
      } catch (err) {
        console.error("Error fetching SchoolDetails:", err);
        if (!cancelled) {
          setSchool(null);
          setPrograms([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  /* ---------- Average Tuition (fallback) ---------- */
  const avgTuition = useMemo(() => {
    const vals = programs
      .map((p) => Number(p.tuition_per_year))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round(sum / vals.length);
  }, [programs]);

  /* ---------- UI (unchanged) ---------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">School Not Found</h2>
          <p className="text-gray-600">The school you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const totalPrograms = programs.length;
  const startIndex = (programsPage - 1) * programsPerPage;
  const endIndex = startIndex + programsPerPage;
  const currentPrograms = programs.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(totalPrograms / programsPerPage));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Navigation */}
        <Link
          to={createPageUrl("Schools")}
          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Schools
        </Link>

        {/* School Header Card */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-shrink-0">
                {school.image_url ? (
                  <img
                    src={school.image_url}
                    alt={school.name}
                    className="w-48 h-32 object-cover rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-48 h-32 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-grow space-y-4">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h1 className="text-4xl font-bold text-gray-900">{school.name}</h1>
                  <div className="flex gap-2">
                    {school.verification_status && (
                      <Badge
                        className={
                          school.verification_status === "verified"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {school.verification_status === "verified" ? "✓ Verified" : "Pending"}
                      </Badge>
                    )}
                    {school.account_type && (
                      <Badge
                        className={
                          school.account_type === "real"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {school.account_type === "real" ? "Real" : "Demo"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
                      <span>{formatLocation(school)}</span>
                    </div>
                    {school.address && (
                      <div className="flex items-start text-gray-600">
                        <Building className="w-5 h-5 mr-2 text-emerald-600 mt-0.5" />
                        <span>{school.address}</span>
                      </div>
                    )}
                    {school.website && (
                      <div className="flex items-center text-gray-600">
                        <Globe className="w-5 h-5 mr-2 text-emerald-600" />
                        <a
                          href={school.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {school.website}
                        </a>
                      </div>
                    )}
                    {school.founded_year && (
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
                        <span>Founded {school.founded_year}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {(school.tuition_fees !== undefined && school.tuition_fees !== null) ? (
                      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <span className="text-gray-700">Annual Tuition</span>
                        <span className="font-bold text-emerald-600">
                          {money(school.tuition_fees)}
                        </span>
                      </div>
                    ) : (
                      avgTuition !== null && (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                          <span className="text-gray-700">Average Tuition</span>
                          <span className="font-bold text-emerald-600">
                            {money(avgTuition)}
                          </span>
                        </div>
                      )
                    )}

                    {Number.isFinite(school.application_fee) && school.application_fee > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">Application Fee</span>
                        <span className="font-bold text-blue-600">
                          {money(school.application_fee)}
                        </span>
                      </div>
                    )}
                    {Number.isFinite(school.rating) && (
                      <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                        <Star className="w-5 h-5 text-yellow-400 fill-current mr-2" />
                        <span className="font-bold text-yellow-600">{school.rating}/5</span>
                      </div>
                    )}
                    {Number.isFinite(school.acceptance_rate) && (
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-gray-700">Acceptance Rate</span>
                        <span className="font-bold text-purple-600">
                          {school.acceptance_rate}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {school.about && (
                  <div className="border-t pt-4 mt-6">
                    <h3 className="font-semibold text-gray-900 mb-2">About {school.name}</h3>
                    <p className="text-gray-700 leading-relaxed">{school.about}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programs Section */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">Available Programs</CardTitle>
              <span className="text-gray-600">
                Showing {totalPrograms === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalPrograms)} of {totalPrograms} programs
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Programs Available</h3>
                <p className="text-gray-600">This school hasn't listed any programs yet.</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {currentPrograms.map((program) => (
                    <Card key={program.id} className="border hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">{program.name}</h4>
                            <div className="flex gap-2 mb-2">
                              {program.level && <Badge variant="secondary">{program.level}</Badge>}
                              {program.duration && <Badge variant="outline">{program.duration}</Badge>}
                            </div>
                          </div>
                          {Number.isFinite(program.available_seats) && (
                            <Badge
                              className={
                                program.available_seats > 0
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {program.available_seats} seats
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-3 mb-4">
                          {Number.isFinite(program.tuition_per_year) && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tuition per year</span>
                              <span className="font-bold text-emerald-600">
                                {money(program.tuition_per_year)}
                              </span>
                            </div>
                          )}
                          {program.intakes && program.intakes.length > 0 && (
                            <div>
                              <span className="text-gray-600">Intakes: </span>
                              <span className="text-gray-900">{program.intakes.join(", ")}</span>
                            </div>
                          )}
                        </div>

                        <Link
                          to={createPageUrl(
                            `ProgramDetails?schoolId=${encodeURIComponent(school.id)}&programId=${encodeURIComponent(program.id)}`
                          )}
                        >
                          <Button className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
                            View Program Details
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setProgramsPage((prev) => Math.max(1, prev - 1))}
                      disabled={programsPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <span className="text-gray-600">
                      Page {programsPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setProgramsPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={programsPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
