import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/* ---------- Firebase ---------- */
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

/* ---------- UI ---------- */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  DollarSign,
  Clock,
  BookOpen,
  Languages,
  User as UserIcon,
  Check,
  Award,
  Rocket,
  Target,
  Users as UsersIcon,
} from "lucide-react";
import BookingModal from "../components/tutors/BookingModal";

/* =========================
   Data helpers
========================= */
async function tryGetDoc(path, id) {
  if (!id) return null;
  try {
    const snap = await getDoc(doc(db, path, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.warn(`[TutorDetails] tryGetDoc(${path}/${id})`, err);
    return null;
  }
}

async function getTutorByIdOrUid({ id, uid }) {
  // 1) Try exact doc id in snake_case
  let rec = await tryGetDoc("tutors", id);
  if (rec) return rec;

  // 2) Try legacy PascalCase
  rec = await tryGetDoc("Tutor", id);
  if (rec) return rec;

  // 3) Fallback by user_id but only for public/verified docs
  const userIdToUse = uid || id;
  if (!userIdToUse) return null;

  try {
    let q1 = query(
      collection(db, "tutors"),
      where("user_id", "==", userIdToUse),
      where("is_visible", "==", true),
      limit(1)
    );
    let qs = await getDocs(q1);
    if (!qs.empty) {
      const d = qs.docs[0];
      return { id: d.id, ...d.data() };
    }

    let q2 = query(
      collection(db, "tutors"),
      where("user_id", "==", userIdToUse),
      where("verification_status", "==", "verified"),
      limit(1)
    );
    qs = await getDocs(q2);
    if (!qs.empty) {
      const d = qs.docs[0];
      return { id: d.id, ...d.data() };
    }
  } catch (err) {
    console.warn("[TutorDetails] fallback user_id lookup failed:", err);
  }

  return null;
}

function extractUserBasics(u) {
  if (!u) return null;
  const first = u.first_name || "";
  const last = u.last_name || "";
  const full_name =
    u.full_name ||
    (first || last ? (first + " " + last).trim() : "") ||
    u.display_name ||
    u.name ||
    "";

  const profile_picture =
    u.photo_url || u.profile_picture || u.photoURL || u.avatar_url || "";

  return {
    ...u,
    full_name,
    profile_picture,
    languages: Array.isArray(u.languages) ? u.languages : [],
    qualifications: Array.isArray(u.qualifications) ? u.qualifications : [],
  };
}

async function getUserDocById(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return extractUserBasics({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.warn("[TutorDetails] getUserDocById blocked by rules or error:", err);
    return null;
  }
}

async function fetchStudentPackages() {
  try {
    const col = await getDocs(collection(db, "student_tutor_packages"));
    return col.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[TutorDetails] fetchStudentPackages error:", err);
    return [];
  }
}

function hydrateTutorView(tutorDoc, userDoc) {
  const fullName =
    tutorDoc.full_name || (userDoc && userDoc.full_name) || "Professional Tutor";

  const profile_picture =
    tutorDoc.profile_picture ||
    (userDoc && userDoc.profile_picture) ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      fullName
    )}`;

  return {
    ...tutorDoc,
    user: userDoc || null,
    full_name: fullName,
    profile_picture,
    languages: Array.isArray(tutorDoc.languages)
      ? tutorDoc.languages
      : userDoc && Array.isArray(userDoc.languages)
      ? userDoc.languages
      : [],
    qualifications: Array.isArray(tutorDoc.qualifications)
      ? tutorDoc.qualifications
      : userDoc && Array.isArray(userDoc.qualifications)
      ? userDoc.qualifications
      : [],
  };
}

/* =========================
   Small component
========================= */
const StudentPackageCard = ({ pkg, onSelect }) => {
  const ICONS = { Book: BookOpen, Rocket, Target, Users: UsersIcon };
  const Icon = ICONS[pkg.icon] || Award;

  return (
    <Card className="bg-white/95 backdrop-blur-sm hover:shadow-lg transition-all duration-300 border rounded-xl flex flex-col">
      <CardContent className="p-6 flex flex-col flex-grow">
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
          {pkg.target_user ? (
            <p className="text-sm text-gray-500">{pkg.target_user}</p>
          ) : null}
          {pkg.price_display ? (
            <p className="text-2xl font-bold text-green-600 my-2">
              {pkg.price_display}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 mb-4 flex-grow">
          {(pkg.key_benefits || []).map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={() => onSelect(pkg)}
          className="w-full mt-4 font-semibold bg-green-600 hover:bg-green-700 text-white"
          disabled={pkg.price_usd === 0}
        >
          {pkg.price_usd === 0 ? "Free Trial" : "Purchase Package"}
        </Button>
      </CardContent>
    </Card>
  );
};

/* =========================
   Page
========================= */
export default function TutorDetails() {
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get("id");  // doc id (case-sensitive)
  const uidParam = searchParams.get("uid"); // user_id (optional)

  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState(null);
  const [tutorUser, setTutorUser] = useState(null);
  const [studentPackages, setStudentPackages] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!idParam && !uidParam) {
        setError("No tutor ID provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const tDoc = await getTutorByIdOrUid({ id: idParam, uid: uidParam });
        if (!tDoc) {
          if (mounted) setError("Tutor not found or not publicly available");
          return;
        }

        const isVisible =
          tDoc.is_visible === true || tDoc.isVisible === true || tDoc.public === true;
        const verified =
          String(tDoc.verification_status || tDoc.status || "").toLowerCase() ===
          "verified";

        if (!isVisible && !verified) {
          if (mounted) setError("Tutor not found or not publicly available");
          return;
        }

        const uDoc = await getUserDocById(tDoc.user_id || tDoc.userId);
        const hydrated = hydrateTutorView(tDoc, uDoc);

        if (mounted) {
          setTutor(hydrated);
          setTutorUser(uDoc || null);
        }

        const pkgs = await fetchStudentPackages();
        if (mounted) setStudentPackages(pkgs || []);
      } catch (e) {
        console.error("[TutorDetails] run error:", e);
        if (mounted) {
          setError(
            e && e.code === "permission-denied"
              ? "This tutor profile is private or awaiting verification."
              : "Failed to load tutor details"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [idParam, uidParam]);

  const handleSelectStudentPackage = (pkg) => {
    if (pkg.price_usd === 0) {
      alert("Free trial will be available soon!");
      return;
    }
    const packageId = pkg.id || pkg.name || "student_tutor";
    const url = `/checkout?type=student_tutor&packageId=${encodeURIComponent(
      packageId
    )}`;
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Tutor
          </h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Tutor Not Found
          </h2>
          <p className="text-gray-600">
            The tutor you’re looking for doesn’t exist or isn’t publicly available.
          </p>
        </div>
      </div>
    );
  }

  const displayName = tutor.full_name || tutor.name || "Professional Tutor";
  const profileImage = tutor.profile_picture;

  return (
    <>
      <BookingModal
        open={showBookingModal}
        onOpenChange={setShowBookingModal}
        tutor={tutor}
        tutorUser={tutorUser}
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <img
                  src={profileImage}
                  alt={displayName}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                />

                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {displayName}
                  </h1>

                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="font-semibold text-lg">
                      {typeof tutor.rating === "number" ? tutor.rating : 4.5}
                    </span>
                    <span className="text-gray-500">
                      ({tutor.total_students || 0} students)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(tutor.specializations || ["IELTS"]).map((spec) => (
                      <Badge key={spec} className="bg-purple-100 text-purple-800">
                        {spec}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-gray-600 mb-6">
                    {tutor.bio ||
                      "Experienced tutor ready to help you achieve your language learning goals."}
                  </p>

                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">
                        ${tutor.hourly_rate || 25}/hr
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-600">
                        {tutor.experience_years || 0} years experience
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowBookingModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 text-lg"
                  >
                    Book a Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(tutor.qualifications) &&
                tutor.qualifications.length > 0 ? (
                  <ul className="space-y-2">
                    {tutor.qualifications.map((qual, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full" />
                        <span>{qual}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No qualifications listed</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-blue-600" />
                  Languages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(tutor.languages) && tutor.languages.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tutor.languages.map((lang) => (
                      <Badge
                        key={lang}
                        variant="outline"
                        className="border-blue-200 text-blue-800"
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No languages listed</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Need more than one session?
              </h2>
              <p className="text-lg text-gray-600">
                Purchase a package to save on fees and get extra benefits.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentPackages.map((pkg) => (
                <StudentPackageCard
                  key={pkg.id || pkg.name}
                  pkg={pkg}
                  onSelect={handleSelectStudentPackage}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
