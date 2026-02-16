import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TutoringSession } from '@/api/entities';
import { User } from '@/api/entities';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  where,
  documentId,
} from 'firebase/firestore';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, Calendar, Trash2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

// ---- helpers ----
const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const safeStr = (v) => (v == null ? "" : String(v));

const safeFormatDateTime = (ts) => {
  try {
    if (!ts) return "—";
    const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
};

const flagUrlFromCode = (code) => {
  const cc = (code || '').toString().trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return '';
  return `https://flagcdn.com/w20/${cc}.png`;
};

const statusBadge = (status) => {
  const s = safeStr(status || "needs_schedule").toLowerCase();
  if (s === "scheduled") return <Badge className="bg-green-600">Scheduled</Badge>;
  if (s === "paused") return <Badge variant="secondary">Paused</Badge>;
  return <Badge variant="outline">Needs schedule</Badge>;
};

export default function TutorStudents() {
  const location = useLocation();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  // auth (some pages use User.me, but we also listen to firebase auth for safety)
  const [meAuth, setMeAuth] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setMeAuth(u || null));
    return () => unsub?.();
  }, []);

  // schedule modal
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleStudent, setScheduleStudent] = useState(null);
  const [scheduleValue, setScheduleValue] = useState(""); // yyyy-MM-ddThh:mm
  const [frequency, setFrequency] = useState("weekly");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // query param: your URL shows ?openschedule=...
  const openScheduleStudentId = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search || "");
      return sp.get("openschedule") || sp.get("openSchedule") || "";
    } catch {
      return "";
    }
  }, [location.search]);

  const openScheduleFor = (student) => {
    setScheduleStudent(student);

    const next = student?.next_session_at;
    if (next?.toDate) {
      const d = next.toDate();
      const pad = (x) => String(x).padStart(2, "0");
      setScheduleValue(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      );
    } else {
      setScheduleValue("");
    }

    setFrequency(student?.session_frequency || "weekly");
    setNotes(student?.session_notes || "");
    setScheduleOpen(true);
  };

  const closeSchedule = () => {
    setScheduleOpen(false);
    setScheduleStudent(null);
    setScheduleValue("");
    setFrequency("weekly");
    setNotes("");
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorText("");

      try {
        const currentUser = await User.me();
        const tutorId = currentUser?.id || meAuth?.uid;
        if (!tutorId) {
          setStudents([]);
          return;
        }

        // 1) Sessions (existing behavior)
        const sessionData = await TutoringSession.filter({ tutor_id: tutorId });
        const sessions = [...(sessionData || [])].sort(
          (a, b) => new Date(b.scheduled_date || 0) - new Date(a.scheduled_date || 0)
        );

        const byStudent = new Map();
        for (const s of sessions) {
          const key = s.student_id || s.student_email || `unknown-${(s.id || Math.random()).toString()}`;
          const bucket = byStudent.get(key) || [];
          bucket.push(s);
          byStudent.set(key, bucket);
        }

        // 2) Firestore tutor_students (NEW - so Add as student appears here)
        const relQ = query(collection(db, "tutor_students"), where("tutor_id", "==", tutorId));
        const relSnap = await getDocs(relQ);

        const relByStudentId = {};
        const relStudentIds = [];
        relSnap.docs.forEach((d) => {
          const data = d.data() || {};
          if (data.student_id) {
            relByStudentId[data.student_id] = { id: d.id, ...data };
            relStudentIds.push(data.student_id);
          }
        });

        // 3) Pull user docs for relationships (to show name/country)
        const userById = {};
        for (const batch of chunk(relStudentIds, 10)) {
          const usersQ = query(collection(db, "users"), where(documentId(), "in", batch));
          const usersSnap = await getDocs(usersQ);
          usersSnap.docs.forEach((u) => (userById[u.id] = { id: u.id, ...(u.data() || {}) }));
        }

        // 4) Build rows = union of (sessions-based students) + (relationship-based students)
        const rowsMap = new Map();

        // from sessions
        for (const [key, sess] of byStudent.entries()) {
          const latest = sess[0];
          const fullName = latest.student_full_name || latest.student_name || "Unnamed";
          const email = latest.student_email || '';
          const completed = sess.filter(x => x.status === 'completed');
          const rated = sess.filter(x => typeof x.student_rating === 'number' && x.student_rating > 0);
          const averageRating =
            rated.length > 0
              ? rated.reduce((sum, x) => sum + (x.student_rating || 0), 0) / rated.length
              : 0;

          // Try to link schedule data if key matches a real student_id
          const rel = relByStudentId[key] || null;
          const userDoc = userById[key] || null;

          rowsMap.set(key, {
            id: key,
            full_name: userDoc?.fullName || userDoc?.displayName || fullName,
            email: userDoc?.email || email,
            role: userDoc?.role || userDoc?.user_role || "",
            country: userDoc?.country || userDoc?.country_name || "",
            country_code: userDoc?.country_code || userDoc?.countryCode || userDoc?.country_iso2 || "",
            profile_picture: userDoc?.profile_picture || userDoc?.profilePicture || userDoc?.photoURL || userDoc?.photo_url || userDoc?.photoUrl || userDoc?.avatar || "",
            subjects: Array.from(new Set(sess.map(x => x.subject).filter(Boolean))),
            totalSessions: sess.length,
            completedSessions: completed.length,
            averageRating,
            lastSession: latest,

            schedule_status: rel?.schedule_status || "needs_schedule",
            next_session_at: rel?.next_session_at || null,
            session_frequency: rel?.session_frequency || "weekly",
            session_notes: rel?.session_notes || "",
          });
        }

        // from relationships (students added but no sessions yet)
        for (const sid of relStudentIds) {
          if (rowsMap.has(sid)) continue;
          const rel = relByStudentId[sid];
          const u = userById[sid] || {};
          rowsMap.set(sid, {
            id: sid,
            full_name: (u.full_name || u.fullName || u.displayName || u.name || (u.email ? u.email.split("@")[0] : "") || "Unnamed"),
            email: u.email || "",
            role: u.role || u.user_role || "",
            country: u.country || u.country_name || "",
            country_code: u.country_code || u.countryCode || u.country_iso2 || "",
            profile_picture: u.profile_picture || u.profilePicture || u.photoURL || u.photo_url || u.photoUrl || u.avatar || "",
            subjects: [],
            totalSessions: 0,
            completedSessions: 0,
            averageRating: 0,
            lastSession: null,

            schedule_status: rel?.schedule_status || "needs_schedule",
            next_session_at: rel?.next_session_at || null,
            session_frequency: rel?.session_frequency || "weekly",
            session_notes: rel?.session_notes || "",
          });
        }

        const rows = Array.from(rowsMap.values());

        // sort: scheduled first, then needs_schedule, then paused, then by name
        const order = { scheduled: 0, needs_schedule: 1, paused: 2 };
        rows.sort((a, b) => {
          const da = order[safeStr(a.schedule_status).toLowerCase()] ?? 99;
          const dbb = order[safeStr(b.schedule_status).toLowerCase()] ?? 99;
          if (da !== dbb) return da - dbb;
          return safeStr(a.full_name).localeCompare(safeStr(b.full_name));
        });

        setStudents(rows);
      } catch (error) {
        console.error('Error loading students:', error);
        setErrorText(error?.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meAuth?.uid]);

  // auto-open schedule after navigation
  useEffect(() => {
    if (loading) return;
    if (!openScheduleStudentId) return;

    const found = students.find((s) => s.id === openScheduleStudentId);
    if (found) {
      openScheduleFor(found);

      // remove query param so it doesn't keep reopening
      try {
        const sp = new URLSearchParams(location.search || "");
        sp.delete("openschedule");
        sp.delete("openSchedule");
        navigate({ search: sp.toString() }, { replace: true });
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, openScheduleStudentId, students]);

  const saveSchedule = async () => {
    try {
      if (!scheduleStudent?.id) return;

      const currentUser = await User.me();
      const tutorId = currentUser?.id || meAuth?.uid;
      if (!tutorId) return;

      setSaving(true);

      let nextVal = null;
      if (scheduleValue) {
        const d = new Date(scheduleValue);
        if (!Number.isNaN(d.getTime())) nextVal = d;
      }

      const relId = `${tutorId}_${scheduleStudent.id}`;
      await updateDoc(doc(db, "tutor_students", relId), {
        schedule_status: nextVal ? "scheduled" : "needs_schedule",
        next_session_at: nextVal ? nextVal : null,
        session_frequency: frequency || "weekly",
        session_notes: notes || "",
        updated_at: serverTimestamp(),
      });

      // update local list quickly
      setStudents((prev) =>
        prev.map((s) =>
          s.id === scheduleStudent.id
            ? {
                ...s,
                schedule_status: nextVal ? "scheduled" : "needs_schedule",
                next_session_at: nextVal ? { toDate: () => nextVal } : null,
                session_frequency: frequency || "weekly",
                session_notes: notes || "",
              }
            : s
        )
      );

      closeSchedule();
    } catch (e) {
      console.error("saveSchedule error:", e);
      setErrorText(e?.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const removeStudent = async (student) => {
    try {
      const currentUser = await User.me();
      const tutorId = currentUser?.id || meAuth?.uid;
      if (!tutorId) return;

      const relId = `${tutorId}_${student.id}`;
      await deleteDoc(doc(db, 'tutor_students', relId));

      // remove from UI
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (e) {
      console.error('removeStudent error:', e);
      setErrorText(e?.message || 'Failed to remove student');
    }
  };

  const goMessage = (studentId) => {
    navigate(createPageUrl(`Messages?to=${studentId}`));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Users className="w-8 h-8 text-purple-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            My Students
          </h1>
        </div>

        {!!errorText && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {errorText}
          </div>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Student Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Next Session</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Frequency</TableHead>                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => {
                    const flagUrl = flagUrlFromCode(student.country_code);
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          {(() => {
                            const name =
                              student.full_name ||
                              student.fullName ||
                              student.displayName ||
                              student.name ||
                              "Unnamed";
                            const photo =
                              student.photoURL ||
                              student.photo_url ||
                              student.photoUrl ||
                              student.profile_photo ||
                              student.profilePhoto ||
                              student.profile_picture ||
                              student.profilePicture ||
                              student.avatarUrl ||
                              student.avatar ||
                              student.image ||
                              student.imageUrl ||
                              "";
                            const initials = name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p) => p[0].toUpperCase())
                              .join("");
                            return (
                              <div className="flex items-center gap-3">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={name}
                                    className="w-9 h-9 rounded-full object-cover border"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gray-100 border flex items-center justify-center text-xs font-semibold text-gray-600">
                                    {initials || "U"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{name}</div>
                                  {student.email ? (
                                    <div className="text-sm text-gray-500 truncate">{student.email}</div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(student.country || student.country_code) ? (
                            <span className="text-sm">
                              {flagUrl ? (
                                <img
                                  src={flagUrl}
                                  alt=""
                                  className="inline-block w-5 h-[14px] mr-1 align-[-2px] rounded-sm"
                                  loading="lazy"
                                />
                              ) : null}
                              {student.country || student.country_code}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>

                        <TableCell>{safeFormatDateTime(student.next_session_at)}</TableCell>
                        <TableCell>{statusBadge(student.schedule_status)}</TableCell>
                        <TableCell className="capitalize">{safeStr(student.session_frequency || "—").replace("_", " ")}</TableCell>

                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" title="Message" onClick={() => goMessage(student.id)}>
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Schedule / Reschedule" onClick={() => openScheduleFor(student)}>
                              <Calendar className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Remove"
                              onClick={() => removeStudent(student)}
                            >
                              {safeStr(student.schedule_status).toLowerCase() === "paused"
                                ? <Trash2 className="w-4 h-4" />
                                : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Yet</h3>
                <p className="text-gray-600">Students you add or who book sessions with you will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Modal */}
        {scheduleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="text-lg font-semibold">Schedule session</div>
                  <div className="text-sm text-gray-500">
                    {scheduleStudent?.full_name || "Student"} {scheduleStudent?.email ? `• ${scheduleStudent.email}` : ""}
                  </div>
                </div>
                <Button variant="ghost" onClick={closeSchedule}>Close</Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Next session date & time</label>
                  <input
                    type="datetime-local"
                    value={scheduleValue}
                    onChange={(e) => setScheduleValue(e.target.value)}
                    className="mt-1 w-full border rounded-lg p-2"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Leave blank if you want to schedule later.
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="mt-1 w-full border rounded-lg p-2"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="ad_hoc">Ad hoc</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full border rounded-lg p-2 min-h-[90px]"
                    placeholder="e.g., IELTS Speaking focus, homework, goals…"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeSchedule} disabled={saving}>Cancel</Button>
                  <Button onClick={saveSchedule} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
