// src/pages/TutorStudents.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  ScanLine,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Html5Qrcode } from "html5-qrcode";
import {
  endOfWeek,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  parseISO,
  startOfWeek,
} from "date-fns";

import { db } from "@/firebase";
import { createPageUrl } from "@/utils";
import { useSubscriptionMode } from "@/hooks/useSubscriptionMode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * TUTOR PAGE (Tutor Students)
 * Aligned with Tutor Planner:
 * - Student list comes from tutor_students
 * - Student profile details come from users
 * - Session schedule comes from tutoring_sessions
 * - This page focuses on tutoring schedule, next session, weekly sessions, and quick planner access
 */

const RELATION_COLLECTION = "tutor_students";
const ACCEPT_STUDENT_ENDPOINT = "acceptStudentReferralToTutor";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  booked: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  rescheduled: "bg-purple-100 text-purple-800 border-purple-200",
  default: "bg-slate-100 text-slate-800 border-slate-200",
};

const SUBSCRIPTION_REQUIRED_ROLES = new Set(["agent", "school", "tutor"]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "paid", "subscribed"]);
const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "",
  "none",
  "skipped",
  "inactive",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "unpaid",
  "canceled",
  "cancelled",
  "expired",
]);

const chunk = (arr, size = 10) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const makeRelId = (tutorId, studentId) => `${tutorId}_${studentId}`;

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (typeof value === "string") return parseISO(value);
  return new Date(value);
}

function safeDate(value) {
  const d = toDate(value);
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function getStudentName(student) {
  return (
    student?.full_name ||
    student?.fullName ||
    student?.displayName ||
    student?.name ||
    student?.email ||
    "Unnamed Student"
  );
}

function getStudentIdFromRelation(data = {}) {
  return (
    data.studentId ||
    data.student_id ||
    data.userId ||
    data.user_id ||
    data.clientId ||
    data.client_id ||
    null
  );
}

function getStudentIdFromSession(data = {}) {
  return (
    data.studentId ||
    data.student_id ||
    data.userId ||
    data.user_id ||
    data.clientId ||
    data.client_id ||
    null
  );
}

function normalizeRole(value) {
  const role = String(value || "").toLowerCase().trim();
  if (!role || role === "user" || role === "member" || role === "students") return "student";
  if (role === "agents") return "agent";
  if (role === "schools") return "school";
  if (role === "tutors") return "tutor";
  return role;
}

function resolveUserRole(userDoc, fallback = "student") {
  return normalizeRole(
    userDoc?.role ||
      userDoc?.selected_role ||
      userDoc?.user_type ||
      userDoc?.userType ||
      userDoc?.signup_entry_role ||
      fallback
  );
}

function hasActiveSubscription(userDoc) {
  if (!userDoc) return false;
  const status = String(userDoc?.subscription_status || userDoc?.subscriptionStatus || "")
    .toLowerCase()
    .trim();

  if (ACTIVE_SUBSCRIPTION_STATUSES.has(status)) return true;

  if (
    (userDoc?.subscription_active === true || userDoc?.subscriptionActive === true) &&
    !INACTIVE_SUBSCRIPTION_STATUSES.has(status)
  ) {
    return true;
  }

  return false;
}

function isSubscriptionLockedForRole(userDoc, subscriptionModeEnabled, expectedRole) {
  if (!subscriptionModeEnabled) return false;
  const role = resolveUserRole(userDoc, expectedRole);
  const finalRole = SUBSCRIPTION_REQUIRED_ROLES.has(role) ? role : expectedRole;
  if (!SUBSCRIPTION_REQUIRED_ROLES.has(finalRole)) return false;
  return !hasActiveSubscription(userDoc);
}

function buildSubscriptionCheckoutUrl(userDoc, expectedRole, fallbackPath) {
  const roleFromDoc = resolveUserRole(userDoc, expectedRole);
  const role = SUBSCRIPTION_REQUIRED_ROLES.has(roleFromDoc) ? roleFromDoc : expectedRole;
  const existingPlan = String(userDoc?.subscription_plan || userDoc?.subscriptionPlan || "").trim();
  const plan = existingPlan || `${role}_monthly`;
  const query = new URLSearchParams({
    type: "subscription",
    role,
    plan,
    lock: "1",
    returnTo: fallbackPath || window.location.pathname || "/dashboard",
  });

  return `${createPageUrl("Checkout")}?${query.toString()}`;
}

function getFunctionsBase() {
  const fromEnv =
    import.meta.env.VITE_FUNCTIONS_BASE ||
    import.meta.env.VITE_FUNCTIONS_HTTP_BASE ||
    import.meta.env.VITE_FUNCTIONS_BASE_URL ||
    import.meta.env.VITE_CLOUD_FUNCTIONS_BASE_URL ||
    "";

  if (fromEnv) return String(fromEnv).replace(/\/+$/, "");

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId) return `https://us-central1-${projectId}.cloudfunctions.net`;

  return "https://us-central1-greenpass-dc92d.cloudfunctions.net";
}

function extractStudentRefFromScannedText(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    return (url.searchParams.get("student_ref") || url.searchParams.get("ref") || "").trim();
  } catch {
    return text;
  }
}

function buildSuccessText(data) {
  if (data?.alreadyExists) return "Student is already in your student list.";
  if (data?.student?.full_name) return `${data.student.full_name} added to your student list.`;
  return "Student added successfully.";
}

function formatSessionDate(date) {
  if (!date) return "No date";
  if (isToday(date)) return `Today, ${format(date, "p")}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, "p")}`;
  return format(date, "MMM d, p");
}

function getStatusBadgeClass(status) {
  const key = String(status || "default").toLowerCase().trim();
  return STATUS_STYLES[key] || STATUS_STYLES.default;
}

function Modal({ open, title, onClose, children, maxWidth = "max-w-2xl" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-xl border`}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white rounded-t-2xl">
          <div className="font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon: Icon }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500">{title}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
            {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
          </div>
          <div className="rounded-xl bg-gray-100 p-2">
            <Icon className="h-5 w-5 text-gray-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionRow({ session, compact = false }) {
  const start = safeDate(session.start);
  const end = safeDate(session.end);
  const status = session.status || "booked";
  const title = session.title || session.subject || "Tutoring Session";

  return (
    <div className="rounded-xl border p-3 hover:bg-gray-50 transition">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <div className="font-medium text-gray-900">{title}</div>
          <div className="text-sm text-gray-500 mt-0.5">
            {start ? formatSessionDate(start) : "No start time"}
            {end ? ` - ${format(end, "p")}` : ""}
          </div>
          {!compact && session.studentName ? (
            <div className="text-sm text-gray-600 mt-1">{session.studentName}</div>
          ) : null}
          {session.notes ? <div className="text-xs text-gray-500 mt-1 line-clamp-2">{session.notes}</div> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.paymentStatus ? (
            <Badge variant="secondary" className="rounded-full capitalize">
              {session.paymentStatus}
            </Badge>
          ) : null}
          <Badge className={`rounded-full border capitalize ${getStatusBadgeClass(status)}`}>{status}</Badge>
        </div>
      </div>

      {session.meetingLink ? (
        <a
          href={session.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center text-sm font-medium text-green-700 hover:underline"
        >
          Open meeting link
          <ExternalLink className="h-3.5 w-3.5 ml-1" />
        </a>
      ) : null}
    </div>
  );
}

export default function TutorStudents() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscriptionModeEnabled, loading: subscriptionModeLoading } = useSubscriptionMode();

  const [students, setStudents] = useState([]);
  const [removableStudentIds, setRemovableStudentIds] = useState(new Set());
  const [sessions, setSessions] = useState([]);
  const [meDoc, setMeDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorText, setErrorText] = useState("");

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerSuccess, setScannerSuccess] = useState("");
  const [manualQrValue, setManualQrValue] = useState("");
  const [cameraSupported, setCameraSupported] = useState(true);

  const qrRegionIdRef = useRef(`tutor-student-qr-reader-${Math.random().toString(36).slice(2)}`);
  const qrScannerRef = useRef(null);
  const handledTokenRef = useRef("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const subscriptionLocked = useMemo(
    () => isSubscriptionLockedForRole(meDoc, subscriptionModeEnabled, "tutor"),
    [meDoc, subscriptionModeEnabled]
  );

  const subscriptionCheckoutUrl = useMemo(() => {
    const currentPath = `${window.location.pathname}${window.location.search || ""}`;
    return buildSubscriptionCheckoutUrl(meDoc, "tutor", currentPath);
  }, [meDoc]);

  const goToSubscription = () => navigate(subscriptionCheckoutUrl);

  const requireSubscription = (message = "Subscription required. Activate your tutor subscription to continue.") => {
    if (!subscriptionLocked) return false;
    setErrorText(message);
    return true;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorText("");

    try {
      const auth = getAuth();
      const me = auth.currentUser;

      if (!me) {
        setStudents([]);
        setSessions([]);
        setRemovableStudentIds(new Set());
        setLoading(false);
        return;
      }

      const meSnap = await getDoc(doc(db, "users", me.uid));
      if (isMountedRef.current) {
        setMeDoc(meSnap.exists() ? { id: meSnap.id, ...meSnap.data() } : null);
      }

      const relationQueries = [
        query(collection(db, RELATION_COLLECTION), where("tutorId", "==", me.uid)),
        query(collection(db, RELATION_COLLECTION), where("tutor_id", "==", me.uid)),
      ];

      const relationSnapshots = await Promise.all(
        relationQueries.map((qRef) =>
          getDocs(qRef).catch((err) => {
            console.error(`${RELATION_COLLECTION} query failed:`, err);
            return { docs: [] };
          })
        )
      );

      const relationDocs = relationSnapshots.flatMap((snap) => snap.docs || []);
      const seenRelationDocIds = new Set();
      const uniqueRelationDocs = relationDocs.filter((d) => {
        if (!d?.id || seenRelationDocIds.has(d.id)) return false;
        seenRelationDocIds.add(d.id);
        return true;
      });

      const studentIds = [];
      const removableIds = new Set();

      uniqueRelationDocs.forEach((d) => {
        const studentId = getStudentIdFromRelation(d.data() || {});
        if (!studentId) return;
        studentIds.push(studentId);
        removableIds.add(studentId);
      });

      const uniqueStudentIds = Array.from(new Set(studentIds));
      const studentProfiles = [];

      if (uniqueStudentIds.length) {
        for (const batch of chunk(uniqueStudentIds, 10)) {
          const usersQ = query(collection(db, "users"), where(documentId(), "in", batch));
          const usersSnap = await getDocs(usersQ);
          usersSnap.docs.forEach((u) => studentProfiles.push({ id: u.id, ...u.data() }));
        }
      }

      const sessionsQ = query(
        collection(db, "tutoring_sessions"),
        where("tutorId", "==", me.uid),
        orderBy("start", "asc")
      );

      const sessionsSnap = await getDocs(sessionsQ).catch((err) => {
        console.error("tutoring_sessions query failed:", err);
        return { docs: [] };
      });

      const sessionDocs = (sessionsSnap.docs || []).map((d) => ({ id: d.id, ...d.data() }));

      if (!isMountedRef.current) return;

      setStudents(studentProfiles);
      setRemovableStudentIds(removableIds);
      setSessions(sessionDocs);
    } catch (err) {
      console.error("Error fetching tutor students and schedules:", err);
      if (isMountedRef.current) setErrorText(err?.message || "Failed to load tutor students.");
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    try {
      const scanner = qrScannerRef.current;
      if (scanner) {
        const state = scanner.getState?.();
        if (state === 2 || state === 3) await scanner.stop().catch(() => {});
        await scanner.clear().catch(() => {});
      }
    } catch {}
    qrScannerRef.current = null;
  }, []);

  const closeScanner = useCallback(async () => {
    await stopScanner();
    if (!isMountedRef.current) return;

    setScannerOpen(false);
    setScannerStarting(false);
    setScannerBusy(false);
    setScannerError("");
    setScannerSuccess("");
    setManualQrValue("");
    handledTokenRef.current = "";
  }, [stopScanner]);

  const handleAcceptStudentQr = useCallback(
    async (rawValue) => {
      if (requireSubscription("QR scanning is locked. Activate your tutor subscription to add students.")) return;

      const token = extractStudentRefFromScannedText(rawValue);
      if (!token) {
        setScannerError("Could not read a valid student QR token.");
        return;
      }

      if (scannerBusy || handledTokenRef.current === token) return;

      handledTokenRef.current = token;
      setScannerBusy(true);
      setScannerError("");
      setScannerSuccess("");

      try {
        const auth = getAuth();
        const me = auth.currentUser;
        if (!me) throw new Error("You must be signed in.");

        const idToken = await me.getIdToken();
        const base = getFunctionsBase();

        const res = await fetch(`${base}/${ACCEPT_STUDENT_ENDPOINT}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ student_ref: token }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to add student.");

        if (!isMountedRef.current) return;

        setScannerSuccess(buildSuccessText(data));
        await fetchData();

        setTimeout(() => {
          closeScanner();
        }, 900);
      } catch (e) {
        console.error(`${ACCEPT_STUDENT_ENDPOINT} failed:`, e);
        handledTokenRef.current = "";
        if (isMountedRef.current) setScannerError(e?.message || "Failed to add student.");
      } finally {
        if (isMountedRef.current) setScannerBusy(false);
      }
    },
    [scannerBusy, fetchData, closeScanner, subscriptionLocked]
  );

  const startScanner = async () => {
    if (requireSubscription("QR scanning is locked. Activate your tutor subscription to add students.")) return;

    setScannerOpen(true);
    setScannerStarting(true);
    setScannerError("");
    setScannerSuccess("");
    handledTokenRef.current = "";

    setTimeout(async () => {
      try {
        const hasCamera =
          typeof navigator !== "undefined" &&
          !!navigator.mediaDevices &&
          typeof navigator.mediaDevices.getUserMedia === "function";

        if (!hasCamera) {
          setCameraSupported(false);
          setScannerError("Camera is not supported on this browser/device. Paste the QR token or link below.");
          return;
        }

        setCameraSupported(true);
        await stopScanner();

        const scanner = new Html5Qrcode(qrRegionIdRef.current);
        qrScannerRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.7778,
          rememberLastUsedCamera: true,
        };

        const onScan = async (decodedText) => {
          await handleAcceptStudentQr(decodedText);
        };

        try {
          await scanner.start({ facingMode: { exact: "environment" } }, config, onScan, () => {});
        } catch {
          try {
            await scanner.start({ facingMode: "user" }, config, onScan, () => {});
          } catch {
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || !cameras.length) throw new Error("No camera found on this device.");
            await scanner.start(cameras[0].id, config, onScan, () => {});
          }
        }
      } catch (e) {
        console.error("Scanner start failed:", e);
        setScannerError(e?.message || "Could not access the camera. You can paste the QR token or link below.");
      } finally {
        if (isMountedRef.current) setScannerStarting(false);
      }
    }, 250);
  };

  const handleRemoveStudent = async (student) => {
    if (requireSubscription("Removing students is locked. Activate your tutor subscription to manage your student list.")) return;

    const auth = getAuth();
    const me = auth.currentUser;
    if (!me || !student?.id) return;
    if (!removableStudentIds.has(student.id)) return;

    const ok = window.confirm(`Remove ${getStudentName(student)} from your student list?`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, RELATION_COLLECTION, makeRelId(me.uid, student.id)));

      if (!isMountedRef.current) return;

      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      setRemovableStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(student.id);
        return next;
      });
    } catch (e) {
      console.error("Remove student failed:", e);
      if (isMountedRef.current) setErrorText(e?.message || "Failed to remove student.");
    }
  };

  const handleMessage = (studentId) => {
    window.location.href = createPageUrl(`Messages?to=${studentId}`);
  };

  const openPlannerForStudent = (student) => {
    const params = new URLSearchParams({
      studentId: student.id,
      studentName: getStudentName(student),
    });

    navigate(`/planner?${params.toString()}`);
  };

  const openSchedule = (student) => {
    setActiveStudent(student);
    setScheduleOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const studentRef = searchParams.get("student_ref") || searchParams.get("ref");
    if (!studentRef) return;

    const process = async () => {
      await handleAcceptStudentQr(studentRef);
      window.history.replaceState({}, "", "/TutorStudents");
    };

    process();
  }, [searchParams, handleAcceptStudentQr]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const normalizedSessions = useMemo(() => {
    return sessions
      .map((session) => ({
        ...session,
        startDate: safeDate(session.start),
        endDate: safeDate(session.end),
        studentId: getStudentIdFromSession(session),
        normalizedStudentName: normalizeText(session.studentName || session.student_name),
      }))
      .filter((session) => session.startDate)
      .sort((a, b) => a.startDate - b.startDate);
  }, [sessions]);

  const getSessionsForStudent = useCallback(
    (student) => {
      const studentName = normalizeText(getStudentName(student));
      const studentEmail = normalizeText(student.email);

      return normalizedSessions.filter((session) => {
        if (session.studentId && session.studentId === student.id) return true;

        const sessionName = normalizeText(session.studentName || session.student_name);
        const sessionEmail = normalizeText(session.studentEmail || session.student_email || session.email);

        if (studentEmail && sessionEmail && studentEmail === sessionEmail) return true;
        if (studentName && sessionName && studentName === sessionName) return true;

        return false;
      });
    },
    [normalizedSessions]
  );

  const studentRows = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return students.map((student) => {
      const studentSessions = getSessionsForStudent(student);
      const upcoming = studentSessions.filter(
        (session) => session.startDate >= now && String(session.status || "").toLowerCase() !== "cancelled"
      );
      const weekSessions = studentSessions.filter(
        (session) => session.startDate >= weekStart && session.startDate <= weekEnd
      );
      const completed = studentSessions.filter(
        (session) => String(session.status || "").toLowerCase() === "completed"
      );

      return {
        student,
        sessions: studentSessions,
        nextSession: upcoming[0] || null,
        upcomingCount: upcoming.length,
        weekCount: weekSessions.length,
        completedCount: completed.length,
      };
    });
  }, [students, getSessionsForStudent]);

  const filteredStudentRows = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return studentRows;

    return studentRows.filter(({ student, sessions: studentSessions }) => {
      const matchesStudent =
        normalizeText(getStudentName(student)).includes(s) || normalizeText(student.email).includes(s);
      const matchesSession = studentSessions.some(
        (session) =>
          normalizeText(session.subject).includes(s) ||
          normalizeText(session.title).includes(s) ||
          normalizeText(session.status).includes(s)
      );

      return matchesStudent || matchesSession;
    });
  }, [studentRows, searchTerm]);

  const activeStudentSessions = useMemo(() => {
    if (!activeStudent) return [];
    return getSessionsForStudent(activeStudent);
  }, [activeStudent, getSessionsForStudent]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return normalizedSessions
      .filter((session) => session.startDate >= now && String(session.status || "").toLowerCase() !== "cancelled")
      .slice(0, 6);
  }, [normalizedSessions]);

  const todaySessions = useMemo(
    () => normalizedSessions.filter((session) => isSameDay(session.startDate, new Date())),
    [normalizedSessions]
  );

  const sessionsThisWeek = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return normalizedSessions.filter((session) => session.startDate >= weekStart && session.startDate <= weekEnd);
  }, [normalizedSessions]);

  const completedSessions = useMemo(
    () => normalizedSessions.filter((session) => String(session.status || "").toLowerCase() === "completed"),
    [normalizedSessions]
  );

  if (loading || subscriptionModeLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-gray-700">
          <Loader2 className="animate-spin w-5 h-5" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tutor Students</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your linked students and their tutoring schedules from Tutor Planner.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate("/planner")}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Open Tutor Planner
          </Button>

          <Button type="button" className="rounded-xl" onClick={startScanner} disabled={subscriptionLocked}>
            <ScanLine className="h-4 w-4 mr-2" />
            Add Student by QR
          </Button>
        </div>
      </div>

      {errorText ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {subscriptionLocked ? (
        <Card className="rounded-2xl border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-amber-900">
              <Lock className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Subscription required</div>
                <div className="text-sm text-amber-800 mt-1">
                  Subscription mode is enabled. Activate your tutor subscription to manage students, schedules, and messages.
                </div>
              </div>
            </div>
            <Button type="button" onClick={goToSubscription} className="shrink-0 rounded-xl">
              <CreditCard className="h-4 w-4 mr-2" />
              Go to Payment
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard title="Total Students" value={students.length} subtitle="Linked to this tutor" icon={Users} />
        <SummaryCard title="Today" value={todaySessions.length} subtitle="Sessions scheduled" icon={CalendarDays} />
        <SummaryCard title="This Week" value={sessionsThisWeek.length} subtitle="Tutoring sessions" icon={Clock3} />
        <SummaryCard title="Completed" value={completedSessions.length} subtitle="All completed sessions" icon={UserRound} />
      </div>

      <div className="grid xl:grid-cols-[1fr_380px] gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Student Schedule Overview</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Next session and weekly schedule per student.</p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search student, subject, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Next Session</TableHead>
                    <TableHead>This Week</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredStudentRows.map(({ student, nextSession, weekCount, completedCount, sessions: studentSessions }) => {
                    const isRemovable = removableStudentIds.has(student.id);

                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium text-gray-900">{getStudentName(student)}</div>
                          <div className="text-sm text-muted-foreground">{student.email || "No email"}</div>
                        </TableCell>

                        <TableCell>
                          {nextSession ? (
                            <div>
                              <div className="font-medium text-gray-900">
                                {nextSession.subject || nextSession.title || "Tutoring Session"}
                              </div>
                              <div className="text-sm text-gray-500">{formatSessionDate(nextSession.startDate)}</div>
                              <Badge className={`mt-1 rounded-full border capitalize ${getStatusBadgeClass(nextSession.status)}`}>
                                {nextSession.status || "booked"}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No upcoming session</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className="rounded-full">
                            {weekCount} session{weekCount === 1 ? "" : "s"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm text-gray-700">{completedCount} completed</div>
                          <div className="text-xs text-gray-500">{studentSessions.length} total sessions</div>
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openSchedule(student)}>
                              <CalendarDays className="h-4 w-4 mr-2" />
                              Schedule
                            </Button>

                            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openPlannerForStudent(student)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Plan
                            </Button>

                            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleMessage(student.id)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Message
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={subscriptionLocked || !isRemovable}
                              title={isRemovable ? "Remove from your student list" : "Student cannot be removed"}
                              onClick={() => handleRemoveStudent(student)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="lg:hidden grid grid-cols-1 gap-4">
              {filteredStudentRows.map(({ student, nextSession, weekCount, completedCount, sessions: studentSessions }) => {
                const isRemovable = removableStudentIds.has(student.id);

                return (
                  <Card key={student.id} className="p-4 rounded-2xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900">{getStudentName(student)}</div>
                        <div className="text-sm text-gray-500">{student.email || "No email"}</div>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        {weekCount} this week
                      </Badge>
                    </div>

                    <div className="mt-4 rounded-xl bg-gray-50 border p-3">
                      <div className="text-xs text-gray-500 mb-1">Next Session</div>
                      {nextSession ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {nextSession.subject || nextSession.title || "Tutoring Session"}
                          </div>
                          <div className="text-sm text-gray-500">{formatSessionDate(nextSession.startDate)}</div>
                          <Badge className={`mt-2 rounded-full border capitalize ${getStatusBadgeClass(nextSession.status)}`}>
                            {nextSession.status || "booked"}
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No upcoming session</div>
                      )}
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      {completedCount} completed • {studentSessions.length} total sessions
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openSchedule(student)}>
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Schedule
                      </Button>

                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openPlannerForStudent(student)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Plan
                      </Button>

                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleMessage(student.id)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        disabled={subscriptionLocked || !isRemovable}
                        onClick={() => handleRemoveStudent(student)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {filteredStudentRows.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-gray-500" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add a student by QR or create sessions in Tutor Planner.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Upcoming Schedule
            </CardTitle>
            <p className="text-sm text-gray-500">Latest sessions from Tutor Planner.</p>
          </CardHeader>

          <CardContent>
            {upcomingSessions.length === 0 ? (
              <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-500">
                No upcoming tutoring sessions yet.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={scheduleOpen}
        onClose={() => {
          setScheduleOpen(false);
          setActiveStudent(null);
        }}
        title={activeStudent ? `Schedule • ${getStudentName(activeStudent)}` : "Student Schedule"}
        maxWidth="max-w-3xl"
      >
        {!activeStudent ? null : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500">Student</div>
                <div className="font-medium text-gray-900">{getStudentName(activeStudent)}</div>
                <div className="text-sm text-gray-500">{activeStudent.email || "No email"}</div>
              </div>

              <Button type="button" className="rounded-xl" onClick={() => openPlannerForStudent(activeStudent)}>
                <Plus className="h-4 w-4 mr-2" />
                Open in Planner
              </Button>
            </div>

            {activeStudentSessions.length === 0 ? (
              <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-500">
                No sessions found for this student. Create one from Tutor Planner.
              </div>
            ) : (
              <div className="space-y-3">
                {activeStudentSessions.map((session) => (
                  <SessionRow key={session.id} session={session} compact />
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={scannerOpen} onClose={closeScanner} title="Add Student by QR" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Scan the student QR code to add them to your tutor student list.
          </div>

          <div className="rounded-2xl border bg-gray-50 p-3">
            <div id={qrRegionIdRef.current} className="w-full overflow-hidden rounded-xl" />
            {scannerStarting ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting camera…
              </div>
            ) : null}
            {!cameraSupported ? (
              <div className="text-sm text-gray-600 mt-3">Camera unavailable. Use manual input below.</div>
            ) : null}
          </div>

          {scannerError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {scannerError}
            </div>
          ) : null}

          {scannerSuccess ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {scannerSuccess}
            </div>
          ) : null}

          <div className="grid gap-2">
            <div className="text-sm font-medium">Paste QR token or link</div>
            <div className="flex gap-2">
              <Input
                className="rounded-xl"
                value={manualQrValue}
                onChange={(e) => setManualQrValue(e.target.value)}
                placeholder="student_ref token or QR link"
              />
              <Button
                type="button"
                className="rounded-xl"
                disabled={scannerBusy || !manualQrValue.trim()}
                onClick={() => handleAcceptStudentQr(manualQrValue)}
              >
                {scannerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
