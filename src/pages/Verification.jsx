// src/pages/Verification.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, CheckCircle, XCircle, Clock, Building,
  Users as UsersIcon, BookOpen, Store, UserCheck, Briefcase, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Required
import { User } from '@/api/entities';

// Optional (may be unavailable in some deployments)
import { Agent } from '@/api/entities';
import { Tutor } from '@/api/entities';
import { Vendor } from '@/api/entities';
import { SchoolProfile as School } from '@/api/entities';

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const toDate = (d) => {
  if (!d) return null;
  if (typeof d?.toDate === 'function') return d.toDate();       // Firestore Timestamp
  if (typeof d === 'object' && typeof d.seconds === 'number')   // {seconds, nanoseconds}
    return new Date(d.seconds * 1000);
  const dt = new Date(d);                                       // ISO/date string/epoch ms
  return isNaN(dt.getTime()) ? null : dt;
};
const safeFormatDate = (d, fmt = 'MMM dd, yyyy') => {
  const date = toDate(d);
  return date ? format(date, fmt) : 'N/A';
};

const dedupeById = (arr) => {
  const map = {};
  (arr || []).forEach((x) => { if (x && x.id) map[x.id] = x; });
  return Object.values(map);
};
// ---------- end helpers ----------

const StatusBadge = ({ status }) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    verified: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
  };
  return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status || 'pending'}</Badge>;
};

const VerificationActions = ({ item, onApprove, onReject, entityType }) => (
  <div className="flex gap-2">
    <Button asChild variant="ghost" size="sm" className="w-8 h-8">
      <Link to={createPageUrl(`UserDetails?id=${encodeURIComponent(item.user_id || item.id)}`)}>
        <Eye className="w-4 h-4" />
      </Link>
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onApprove(item, entityType)} className="w-8 h-8 text-green-600">
      <CheckCircle className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onReject(item, entityType)} className="w-8 h-8 text-red-600">
      <XCircle className="w-4 h-4" />
    </Button>
  </div>
);


/* ---------- Verification Documents helpers ---------- */
const isHttpUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);

const normalizeDocsSources = (item, userDoc) => {
  const sources = [
    item?.verification?.docs,
    item?.verification_docs,
    item?.documents,
    item?.docs,
    userDoc?.verification?.docs,
    userDoc?.verification_docs,
    userDoc?.documents,
    userDoc?.docs,
  ].filter(Boolean);

  // Also consider direct flat fields (fallback)
  const flat = {};
  const candidates = [
    item,
    userDoc,
  ].filter(Boolean);

  for (const obj of candidates) {
    for (const [k, v] of Object.entries(obj)) {
      if (isHttpUrl(v)) flat[k] = v;
    }
  }

  return { sources, flat };
};

const resolveRoleDocs = (role, item, userDoc) => {
  const { sources, flat } = normalizeDocsSources(item, userDoc);

  // merge all maps (later maps override earlier maps)
  const merged = sources.reduce((acc, m) => ({ ...acc, ...m }), {});
  const all = { ...merged, ...flat };

  const pick = (keys, label) => {
    for (const k of keys) {
      const url = all?.[k];
      if (isHttpUrl(url)) return { label, url };
    }
    return null;
  };

  const docs = [];
  if (role === "agent") {
    docs.push(pick(["agent_id_front", "id_front_url", "idFront", "id_front"], "ID Front"));
    docs.push(pick(["agent_id_back", "id_back_url", "idBack", "id_back"], "ID Back"));
    docs.push(pick(["agent_business_permit", "business_permit_url", "businessPermit", "business_permit", "business_license"], "Business Permit"));
  } else if (role === "tutor") {
    docs.push(pick(["tutor_id_front", "id_front_url", "idFront", "id_front"], "ID Front"));
    docs.push(pick(["tutor_id_back", "id_back_url", "idBack", "id_back"], "ID Back"));
    docs.push(pick(["tutor_proof", "tutor_proof_url", "proof_url", "proof", "teaching_proof"], "Tutor Proof"));
  } else if (role === "school") {
    docs.push(pick(["school_permit", "school_permit_url", "permit_url", "permit"], "School Permit"));
    docs.push(pick(["school_dli", "school_dli_url", "dli_url", "dli", "school_accreditation", "accreditation_url"], "DLI / Accreditation"));
  } else if (role === "vendor") {
    docs.push(pick(["vendor_id_front", "id_front_url", "idFront", "id_front"], "ID Front"));
    docs.push(pick(["vendor_id_back", "id_back_url", "idBack", "id_back"], "ID Back"));
    docs.push(pick(["vendor_business_permit", "business_permit_url", "businessPermit", "business_permit"], "Business Permit"));
  } else if (role === "student") {
    docs.push(pick(["student_id_front", "id_front_url", "idFront", "id_front"], "ID Front"));
    docs.push(pick(["student_id_back", "id_back_url", "idBack", "id_back"], "ID Back"));
  } else if (role === "user") {
    docs.push(pick(["user_id_front", "id_front_url", "idFront", "id_front"], "ID Front"));
    docs.push(pick(["user_id_back", "id_back_url", "idBack", "id_back"], "ID Back"));
  }

  return docs.filter(Boolean);
};

const VerificationDocsCell = ({ role, item, userDoc }) => {
  const docs = resolveRoleDocs(role, item, userDoc);
  if (!docs.length) return <span className="text-xs text-gray-500">No docs</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {docs.map((d) => (
        <Button
          key={d.label}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => window.open(d.url, "_blank", "noopener,noreferrer")}
        >
          View {d.label}
        </Button>
      ))}
    </div>
  );
};


export default function Verification() {
  const [agents, setAgents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [schools, setSchools] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // ---------- Users ----------
        let userData = [];
        try {
          userData = await User.list();
          await sleep(150);
        } catch (err) {
          console.error('Error loading users:', err);
        }

        // ---------- Agents ----------
        let agentData = [];
        if (Agent && typeof Agent.filter === 'function') {
          try {
            const [q1, q2] = await Promise.all([
              Agent.filter({ verification_status: 'pending' }).catch(() => []),
              Agent.filter({ is_verified: false }).catch(() => []),
            ]);
            agentData = dedupeById([...(q1 || []), ...(q2 || [])]);
            await sleep(150);
          } catch (err) {
            console.error('Error loading agents:', err);
          }
        }

        // ---------- Tutors ----------
        let tutorData = [];
        if (Tutor && typeof Tutor.filter === 'function') {
          try {
            const [q1, q2] = await Promise.all([
              Tutor.filter({ verification_status: 'pending' }).catch(() => []),
              Tutor.filter({ is_verified: false }).catch(() => []),
            ]);
            tutorData = dedupeById([...(q1 || []), ...(q2 || [])]);
            await sleep(150);
          } catch (err) {
            console.error('Error loading tutors:', err);
          }
        }

        // ---------- Schools ----------
        let schoolData = [];
        if (School && typeof School.filter === 'function') {
          try {
            const [q1, q2] = await Promise.all([
              School.filter({ verification_status: 'pending' }).catch(() => []),
              School.filter({ is_verified: false }).catch(() => []),
            ]);
            schoolData = dedupeById([...(q1 || []), ...(q2 || [])]);
            await sleep(150);
          } catch (err) {
            console.error('Error loading schools:', err);
          }
        }

        // ---------- Vendors ----------
        let vendorData = [];
        if (Vendor && typeof Vendor.filter === 'function') {
          try {
            const [q1, q2] = await Promise.all([
              Vendor.filter({ verification_status: 'pending' }).catch(() => []),
              Vendor.filter({ is_verified: false }).catch(() => []),
            ]);
            vendorData = dedupeById([...(q1 || []), ...(q2 || [])]);
            await sleep(150);
          } catch (err) {
            console.error('Error loading vendors:', err);
          }
        }

        // ---------- Build user map & pending lists ----------
        const userMapping = (Array.isArray(userData) ? userData : []).reduce((acc, u) => {
          if (u && u.id) acc[u.id] = u;
          return acc;
        }, {});
        setUserMap(userMapping);

        const allUsers = Array.isArray(userData) ? userData : [];
        const pendingUsers = allUsers.filter(
          (u) => u.user_type === 'user' && (u.is_verified === false || !u.onboarding_completed)
        );
        const pendingStudents = allUsers.filter(
          (u) => u.user_type === 'student' && (u.is_verified === false || !u.onboarding_completed)
        );

        setAgents(Array.isArray(agentData) ? agentData : []);
        setTutors(Array.isArray(tutorData) ? tutorData : []);
        setSchools(Array.isArray(schoolData) ? schoolData : []);
        setVendors(Array.isArray(vendorData) ? vendorData : []);
        setUsers(pendingUsers);
        setStudents(pendingStudents);
      } catch (err) {
        console.error("Critical error loading verification data:", err);
        setError("Failed to load verification data. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleApprove = async (item, entityType) => {
    try {
      // write both forms for compatibility with different docs
      const updateData = { verification_status: 'verified', is_visible: true, is_verified: true };

      switch (entityType) {
        case 'agent':
          if (Agent?.update) {
            await Agent.update(item.id, updateData);
            setAgents((prev) => prev.filter((a) => a.id !== item.id));
          } else {
            alert('Agent verification not available.');
          }
          break;
        case 'tutor':
          if (Tutor?.update) {
            await Tutor.update(item.id, updateData);
            setTutors((prev) => prev.filter((t) => t.id !== item.id));
          } else {
            alert('Tutor verification not available.');
          }
          break;
        case 'school':
          if (School?.update) {
            await School.update(item.id, updateData);
            setSchools((prev) => prev.filter((s) => s.id !== item.id));
          } else {
            alert('School verification not available.');
          }
          break;
        case 'vendor':
          if (Vendor?.update) {
            await Vendor.update(item.id, updateData);
            setVendors((prev) => prev.filter((v) => v.id !== item.id));
          } else {
            alert('Vendor verification not available.');
          }
          break;
        case 'user':
        case 'student':
          await User.update(item.id, { onboarding_completed: true, is_verified: true });
          if (entityType === 'user') {
            setUsers((prev) => prev.filter((u) => u.id !== item.id));
          } else {
            setStudents((prev) => prev.filter((s) => s.id !== item.id));
          }
          break;
        default:
          alert('Unknown entity type.');
      }
    } catch (err) {
      console.error('Error approving item:', err);
      alert('Failed to approve item. Please try again.');
    }
  };

  const handleReject = async (item, entityType) => {
    try {
      const updateData = { verification_status: 'rejected', is_visible: false, is_verified: false };

      switch (entityType) {
        case 'agent':
          if (Agent?.update) {
            await Agent.update(item.id, updateData);
            setAgents((prev) => prev.filter((a) => a.id !== item.id));
          } else {
            alert('Agent verification not available.');
          }
          break;
        case 'tutor':
          if (Tutor?.update) {
            await Tutor.update(item.id, updateData);
            setTutors((prev) => prev.filter((t) => t.id !== item.id));
          } else {
            alert('Tutor verification not available.');
          }
          break;
        case 'school':
          if (School?.update) {
            await School.update(item.id, updateData);
            setSchools((prev) => prev.filter((s) => s.id !== item.id));
          } else {
            alert('School verification not available.');
          }
          break;
        case 'vendor':
          if (Vendor?.update) {
            await Vendor.update(item.id, updateData);
            setVendors((prev) => prev.filter((v) => v.id !== item.id));
          } else {
            alert('Vendor verification not available.');
          }
          break;
        case 'user':
        case 'student':
          await User.update(item.id, { onboarding_completed: false, is_verified: false });
          if (entityType === 'user') {
            setUsers((prev) => prev.filter((u) => u.id !== item.id));
          } else {
            setStudents((prev) => prev.filter((s) => s.id !== item.id));
          }
          break;
        default:
          alert('Unknown entity type.');
      }
    } catch (err) {
      console.error('Error rejecting item:', err);
      alert('Failed to reject item. Please try again.');
    }
  };

  const totalPending =
    (agents?.length || 0) +
    (tutors?.length || 0) +
    (schools?.length || 0) +
    (vendors?.length || 0) +
    (users?.length || 0) +
    (students?.length || 0);

  const initialTab = useMemo(() => {
    const order = [
      { key: 'agents', available: !!Agent },
      { key: 'tutors', available: !!Tutor },
      { key: 'schools', available: !!School },
      { key: 'vendors', available: !!Vendor },
      { key: 'users', available: true },
      { key: 'students', available: true },
    ];
    const first = order.find((o) => o.available);
    return first ? first.key : 'users';
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <UserCheck className="w-8 h-8 text-emerald-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            Verification Management
          </h1>
        </div>

        <Card className="mb-8 shadow-lg">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Clock className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-700">{totalPending}</div>
              <p className="text-gray-600">Pending Verifications</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white/80 backdrop-blur-sm">
            {Agent && <TabsTrigger value="agents"><Briefcase className="w-4 h-4 mr-2" />Agents ({agents.length})</TabsTrigger>}
            {Tutor && <TabsTrigger value="tutors"><BookOpen className="w-4 h-4 mr-2" />Tutors ({tutors.length})</TabsTrigger>}
            {School && <TabsTrigger value="schools"><Building className="w-4 h-4 mr-2" />Schools ({schools.length})</TabsTrigger>}
            {Vendor && <TabsTrigger value="vendors"><Store className="w-4 h-4 mr-2" />Vendors ({vendors.length})</TabsTrigger>}
            <TabsTrigger value="users"><UsersIcon className="w-4 h-4 mr-2" />Users ({users.length})</TabsTrigger>
            <TabsTrigger value="students"><UsersIcon className="w-4 h-4 mr-2" />Students ({students.length})</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="w-5 h-5" />
                  Pending Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Submitted Date</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name || 'N/A'}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.country || 'N/A'}</TableCell>
                          <TableCell>{safeFormatDate(u.created_at || u.created_date)}</TableCell>
                          <TableCell>
                            <VerificationDocsCell role="user" item={u} userDoc={u} />
                          </TableCell>
                          <TableCell>
                            <VerificationActions
                              item={u}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              entityType="user"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Users</h3>
                    <p className="text-gray-600">All users have completed verification.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students */}
          <TabsContent value="students">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="w-5 h-5" />
                  Pending Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                {students.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Program Enrolled</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Submitted Date</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.full_name || 'N/A'}</TableCell>
                          <TableCell>{s.email}</TableCell>
                          <TableCell>{s.programId || 'N/A'}</TableCell>
                          <TableCell>{s.schoolId || 'N/A'}</TableCell>
                          <TableCell>{safeFormatDate(s.created_at || s.created_date)}</TableCell>
                          <TableCell>
                            <VerificationDocsCell role="student" item={s} userDoc={s} />
                          </TableCell>
                          <TableCell>
                            <VerificationActions
                              item={s}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              entityType="student"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Students</h3>
                    <p className="text-gray-600">All students have completed verification.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agents */}
          {Agent && (
            <TabsContent value="agents">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Pending Agent Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Business License</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Documents</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agents.map((agent) => {
                          const u = userMap[agent.user_id];
                          return (
                            <TableRow key={agent.id}>
                              <TableCell className="font-medium">{agent.company_name || 'N/A'}</TableCell>
                              <TableCell>{agent.contact_person?.name || u?.full_name || 'N/A'}</TableCell>
                              <TableCell>{agent.contact_person?.email || u?.email || 'N/A'}</TableCell>
                              <TableCell>{agent.business_license_mst || 'N/A'}</TableCell>
                              <TableCell>{safeFormatDate(agent.created_at || agent.created_date)}</TableCell>
                              <TableCell>
                                <VerificationDocsCell role="agent" item={agent} userDoc={u} />
                              </TableCell>
                              <TableCell>
                                <VerificationActions
                                  item={agent}
                                  onApprove={handleApprove}
                                  onReject={handleReject}
                                  entityType="agent"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Agents</h3>
                      <p className="text-gray-600">All agents have been verified.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tutors */}
          {Tutor && (
            <TabsContent value="tutors">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Pending Tutor Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tutors.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Specializations</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Documents</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tutors.map((tutor) => {
                          const u = userMap[tutor.user_id];
                          return (
                            <TableRow key={tutor.id}>
                              <TableCell className="font-medium">{u?.full_name || 'N/A'}</TableCell>
                              <TableCell>{u?.email || 'N/A'}</TableCell>
                              <TableCell>{(tutor.specializations || []).join(', ')}</TableCell>
                              <TableCell>{tutor.experience_years || 0} years</TableCell>
                              <TableCell>${tutor.hourly_rate || 0}/hr</TableCell>
                              <TableCell>{safeFormatDate(tutor.created_at || tutor.created_date)}</TableCell>
                              <TableCell>
                                <VerificationDocsCell role="tutor" item={tutor} userDoc={u} />
                              </TableCell>
                              <TableCell>
                                <VerificationActions
                                  item={tutor}
                                  onApprove={handleApprove}
                                  onReject={handleReject}
                                  entityType="tutor"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Tutors</h3>
                      <p className="text-gray-600">All tutors have been verified.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Schools */}
          {School && (
            <TabsContent value="schools">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Pending School Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {schools.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>School Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Documents</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schools.map((school) => {
                          const u = userMap[school.user_id];
                          return (
                            <TableRow key={school.id}>
                              <TableCell className="font-medium">{school.school_name || 'N/A'}</TableCell>
                              <TableCell>{[school.location, school.country].filter(Boolean).join(', ') || 'N/A'}</TableCell>
                              <TableCell>{u?.email || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge className="bg-gray-100 text-gray-800">
                                  {school.type || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell>{safeFormatDate(school.created_at || school.created_date)}</TableCell>
                              <TableCell>
                                <VerificationDocsCell role="school" item={school} userDoc={u} />
                              </TableCell>
                              <TableCell>
                                <VerificationActions
                                  item={school}
                                  onApprove={handleApprove}
                                  onReject={handleReject}
                                  entityType="school"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Schools</h3>
                      <p className="text-gray-600">All schools have been verified.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Vendors */}
          {Vendor && (
            <TabsContent value="vendors">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Pending Vendor Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vendors.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Service Categories</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Documents</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendors.map((vendor) => {
                          const u = userMap[vendor.user_id];
                          return (
                            <TableRow key={vendor.id}>
                              <TableCell className="font-medium">{vendor.business_name || 'N/A'}</TableCell>
                              <TableCell>{u?.email || 'N/A'}</TableCell>
                              <TableCell>{(vendor.service_categories || []).join(', ')}</TableCell>
                              <TableCell>{safeFormatDate(vendor.created_at || vendor.created_date)}</TableCell>
                              <TableCell>
                                <VerificationDocsCell role="vendor" item={vendor} userDoc={u} />
                              </TableCell>
                              <TableCell>
                                <VerificationActions
                                  item={vendor}
                                  onApprove={handleApprove}
                                  onReject={handleReject}
                                  entityType="vendor"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Vendors</h3>
                      <p className="text-gray-600">All vendors have been verified.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
