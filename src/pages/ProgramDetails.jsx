// src/pages/ProgramDetails.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Program, School } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Building, DollarSign, Calendar, Info, MapPin } from 'lucide-react';
import { createPageUrl } from '@/utils';
import ReserveSeatModal from '@/components/schools/ReserveSeatModal';

/* ---------- Firestore ---------- */
import { db } from '@/firebase';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';

/* ---------- helpers ---------- */
const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));

const normalizeProgram = (id, d = {}) => ({
  id,
  programTitle: d.programTitle || d.program_title || d.title || 'Program',
  programLevel: d.programLevel || d.program_level || d.level || '',
  duration: d.duration || d.duration_display || d.program_duration || '',
  tuitionFee: num(d.tuitionFee ?? d.tuition_per_year_cad ?? d.tuition_fee_cad ?? d.tuition),
  costOfLiving: num(d.costOfLiving),
  intakeDates: ensureArray(d.intakeDates || d.intake_dates || d.intakes),
  overview: d.overview || d.description || d.program_overview || '',
  schoolId: d.schoolId || d.school_id,
  schoolName: d.schoolName || d.school_name || d.institution_name
});

const buildSchoolHeaderFromProfile = (id, p) => ({
  id,
  name: p?.name || p?.title || 'Institution',
  image_url: p?.logoUrl || p?.logo_url || p?.institution_logo_url || p?.image_url,
  verification_status: p?.verification_status || (p?.verified && 'verified'),
  account_type: p?.account_type || 'real',
  address: p?.address || p?.street_address,
  website: p?.website || p?.url || p?.homepage,
  founded_year: p?.founded_year || p?.established,
  tuition_fees: num(p?.tuition_fees),
  application_fee: num(p?.application_fee),
  rating: num(p?.rating),
  acceptance_rate: num(p?.acceptance_rate),
  location: p?.city || p?.location,
  province: p?.province || p?.state,
  country: p?.country || 'Canada',
  about: p?.about || p?.description
});

const buildSchoolHeaderFromSchoolDoc = (id, s) => ({
  id,
  name: s?.institution_name || s?.school_name || s?.name || 'Institution',
  image_url: s?.institution_logo_url || s?.school_image_url || s?.logo_url || s?.image_url,
  verification_status: s?.verification_status || (s?.verified && 'verified'),
  account_type: s?.account_type || 'real',
  address: s?.address || s?.school_address,
  website: s?.website,
  founded_year: s?.founded_year || s?.established,
  tuition_fees: undefined, // keep “Annual Tuition” only from profiles
  application_fee: num(s?.application_fee),
  rating: num(s?.rating),
  acceptance_rate: num(s?.acceptance_rate),
  location: s?.city || s?.school_city || s?.location,
  province: s?.province || s?.school_province || s?.state,
  country: s?.country || s?.school_country || 'Canada',
  about: s?.institution_about || s?.about
});

export default function ProgramDetails() {
  const [searchParams] = useSearchParams();
  const [program, setProgram] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);

      const programId =
        searchParams.get('id') ||
        searchParams.get('programId') ||
        searchParams.get('programid');

      const schoolIdFromQuery =
        searchParams.get('schoolId') ||
        searchParams.get('schoolid');

      try {
        let pr = null;

        // 1) Try entity list
        try {
          const allPrograms = await Program.list();
          const hit = allPrograms.find(p => p.id === programId || p.programId === programId);
          if (hit) pr = normalizeProgram(hit.id ?? programId, hit);
        } catch {}

        // 2) Firestore programs
        if (!pr) {
          let snap = await getDoc(doc(db, 'programs', programId));
          if (!snap.exists()) snap = await getDoc(doc(db, 'Programs', programId));
          if (snap.exists()) pr = normalizeProgram(snap.id, snap.data());
        }

        // 3) Firestore schools (many rows are stored here)
        if (!pr) {
          let snap = await getDoc(doc(db, 'schools', programId));
          if (!snap.exists()) snap = await getDoc(doc(db, 'Schools', programId));
          if (snap.exists()) pr = normalizeProgram(snap.id, snap.data());
        }

        if (!pr) throw new Error('We couldn’t find this program.');

        if (!alive) return;
        setProgram(pr);

        // ----- load school header -----
        let sh = null;

        // a) explicit school id from URL
        if (schoolIdFromQuery) {
          let s1 = await getDoc(doc(db, 'school_profiles', schoolIdFromQuery));
          if (!s1.exists()) s1 = await getDoc(doc(db, 'SchoolProfiles', schoolIdFromQuery));
          if (s1.exists()) {
            sh = buildSchoolHeaderFromProfile(s1.id, s1.data());
          } else {
            let s2 = await getDoc(doc(db, 'schools', schoolIdFromQuery));
            if (!s2.exists()) s2 = await getDoc(doc(db, 'Schools', schoolIdFromQuery));
            if (s2.exists()) sh = buildSchoolHeaderFromSchoolDoc(s2.id, s2.data());
          }
        }

        // b) from program.schoolId
        if (!sh && pr.schoolId) {
          let s1 = await getDoc(doc(db, 'school_profiles', pr.schoolId));
          if (!s1.exists()) s1 = await getDoc(doc(db, 'SchoolProfiles', pr.schoolId));
          if (s1.exists()) {
            sh = buildSchoolHeaderFromProfile(s1.id, s1.data());
          } else {
            let s2 = await getDoc(doc(db, 'schools', pr.schoolId));
            if (!s2.exists()) s2 = await getDoc(doc(db, 'Schools', pr.schoolId));
            if (s2.exists()) sh = buildSchoolHeaderFromSchoolDoc(s2.id, s2.data());
          }
        }

        // c) match by name
        if (!sh && pr.schoolName) {
          const q1 = query(
            collection(db, 'school_profiles'),
            where('name', '==', pr.schoolName),
            limit(1)
          );
          const r1 = await getDocs(q1);
          if (!r1.empty) {
            const d = r1.docs[0];
            sh = buildSchoolHeaderFromProfile(d.id, d.data());
          }
          if (!sh) {
            const q2 = query(
              collection(db, 'schools'),
              where('institution_name', '==', pr.schoolName),
              limit(1)
            );
            const r2 = await getDocs(q2);
            if (!r2.empty) {
              const d = r2.docs[0];
              sh = buildSchoolHeaderFromSchoolDoc(d.id, d.data());
            }
          }
        }

        // d) final: School entity
        if (!sh) {
          try {
            const allSchools = await School.list();
            const hit =
              allSchools.find(s => s.id === schoolIdFromQuery) ||
              allSchools.find(s => s.name === pr.schoolName);
            if (hit) {
              sh = {
                id: hit.id,
                name: hit.name,
                image_url: hit.logoUrl || hit.image_url,
                location: hit.city || hit.location,
                province: hit.province,
                country: hit.country || 'Canada',
                website: hit.website,
                about: hit.about
              };
            }
          } catch {}
        }

        if (!alive) return;
        setSchool(sh || null);
      } catch (e) {
        if (!alive) return;
        setError(e.message || 'An error occurred while fetching program details.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        <span className="sr-only">Loading program…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Program Not Found</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to={createPageUrl('Schools')}>
          <Button variant="outline">Back to Schools</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <Badge variant="secondary" className="mb-2">{program?.programLevel}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{program?.programTitle}</h1>
          {school && (
            <Link to={createPageUrl(`SchoolDetails?id=${school.id}`)} className="text-lg text-gray-600 hover:text-green-600 transition-colors flex items-center gap-2 mt-2">
              <Building className="w-5 h-5" />
              <span>{school.name}</span>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Program Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {program?.overview || 'No overview available for this program.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">Duration</p>
                    <p className="text-gray-600">{program?.duration || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Level</p>
                    <p className="text-gray-600">{program?.programLevel}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Tuition Fee</p>
                    <p className="text-gray-600">
                      {typeof program?.tuitionFee === 'number'
                        ? `$${program.tuitionFee.toLocaleString()}`
                        : 'Contact school'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Cost of Living</p>
                    <p className="text-gray-600">
                      {typeof program?.costOfLiving === 'number'
                        ? `$${program.costOfLiving.toLocaleString()}`
                        : 'Not specified'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {Array.isArray(program?.intakeDates) && program.intakeDates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Intake Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {program.intakeDates.map((date, index) => (
                      <Badge key={index} variant="outline">{date}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {school && (
              <Card>
                <CardHeader>
                  <CardTitle>School Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span>{school.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>
                      {[school.location, school.province, school.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <Link to={createPageUrl(`SchoolDetails?id=${school.id}`)}>
                    <Button variant="outline" className="w-full">
                      View School Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Quick Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => school && setIsModalOpen(true)}
                  className="w-full"
                  disabled={!school}
                >
                  Reserve Program Seat
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <ReserveSeatModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          school={school}
          program={program}
        />
      </div>
    </div>
  );
}
