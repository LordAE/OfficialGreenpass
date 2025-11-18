// src/pages/AdminAgentAssignments.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Check,
  X,
  User,
  UserCheck,
  Clock,
  AlertTriangle,
  Search,
  Filter as FilterIcon,
} from "lucide-react";

/* Firebase */
import { db } from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  serverTimestamp,
  getDocs,       // 👈 NEW
  writeBatch,    // 👈 NEW
} from "firebase/firestore";

/* ---------- Utils ---------- */
const fmtDate = (d) =>
  d?.toDate ? d.toDate().toLocaleString() : d ? new Date(d).toLocaleString() : "";

async function fetchAgentWithUser(agentId) {
  try {
    const aSnap = await getDoc(doc(db, "agents", agentId));
    if (!aSnap.exists()) return { agent: null, agentUser: null };

    const agent = { id: aSnap.id, ...aSnap.data() };
    let agentUser = null;

    if (agent.user_id) {
      const uSnap = await getDoc(doc(db, "users", agent.user_id));
      if (uSnap.exists()) agentUser = { id: uSnap.id, ...uSnap.data() };
    }
    return { agent, agentUser };
  } catch {
    return { agent: null, agentUser: null };
  }
}

/**
 * Link all existing visa cases for this student (that have no agent yet)
 * to the given agent user id.
 *
 * This fixes: "package first → then agent"
 */
async function linkExistingCasesToAgent(studentId, agentUserId) {
  if (!studentId || !agentUserId) return;

  try {
    const casesRef = collection(db, "cases");
    const qCases = query(casesRef, where("student_id", "==", studentId));
    const snap = await getDocs(qCases);

    if (snap.empty) return;

    const batch = writeBatch(db);

    snap.forEach((caseDoc) => {
      const data = caseDoc.data();
      // Only touch cases that don't already have an agent
      if (!data.agent_id) {
        batch.update(caseDoc.ref, { agent_id: agentUserId });
      }
    });

    await batch.commit();
  } catch (err) {
    console.error("Failed to link existing cases to agent:", err);
  }
}

export default function AdminAgentAssignments() {
  const [pending, setPending] = useState([]);                   // raw pending user docs
  const [agentsById, setAgentsById] = useState({});             // agent cache
  const [agentUsersByUid, setAgentUsersByUid] = useState({});   // agent user cache
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [search, setSearch] = useState("");
  const [showSection, setShowSection] = useState("all"); // all | ready | needs

  /* ---------- Live subscription to pending requests (user_type in ["user","student"]) ---------- */
  useEffect(() => {
    setLoading(true);

    // Query: pending + allowed user types
    const qUsers = query(
      collection(db, "users"),
      where("agent_reassignment_request.status", "==", "pending"),
      where("user_type", "in", ["user", "student"])
    );

    const unsub = onSnapshot(
      qUsers,
      async (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPending(rows);

        // Gather agents to fetch
        const ids = Array.from(
          new Set(rows.map((u) => u.agent_reassignment_request?.new_agent_id).filter(Boolean))
        );

        const results = await Promise.all(ids.map((aid) => fetchAgentWithUser(aid)));
        const nextAgents = {};
        const nextAgentUsers = {};
        results.forEach(({ agent, agentUser }) => {
          if (agent) nextAgents[agent.id] = agent;
          if (agentUser) nextAgentUsers[agentUser.id] = agentUser;
        });

        setAgentsById(nextAgents);
        setAgentUsersByUid(nextAgentUsers);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load pending requests:", err);
        setPending([]);
        setAgentsById({});
        setAgentUsersByUid({});
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* ---------- Derived lists & search ---------- */
  const normalized = useMemo(() => {
    // (Extra client-side safety) keep only user/student types even if query fallback happens
    const allowed = pending.filter((u) => {
      const t = (u.user_type || "").toLowerCase();
      return t === "user" || t === "student";
    });

    // Search by student name/email, or agent company/rep name/email
    const s = search.trim().toLowerCase();
    const searched = !s
      ? allowed
      : allowed.filter((u) => {
          const req = u.agent_reassignment_request || {};
          const agent = req.new_agent_id ? agentsById[req.new_agent_id] : null;
          const agentUser = agent?.user_id ? agentUsersByUid[agent.user_id] : null;

          const hay = [
            u.display_name,
            u.full_name,
            u.name,
            u.email,
            u.id,
            agent?.company_name,
            agent?.company,
            agentUser?.full_name,
            agentUser?.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return hay.includes(s);
        });

    // Sort by requested_at (newest first)
    const sorted = [...searched].sort((a, b) => {
      const da = a.agent_reassignment_request?.requested_at;
      const db = b.agent_reassignment_request?.requested_at;
      const ta = da?.toMillis ? da.toMillis() : da ? new Date(da).getTime() : 0;
      const tb = db?.toMillis ? db.toMillis() : db ? new Date(db).getTime() : 0;
      return tb - ta;
    });

    const ready = sorted.filter((u) => !!u.agent_reassignment_request?.new_agent_id);
    const needs = sorted.filter((u) => !u.agent_reassignment_request?.new_agent_id);

    return { ready, needs, all: sorted };
  }, [pending, agentsById, agentUsersByUid, search]);

  const approve = async (user) => {
    const req = user.agent_reassignment_request || {};
    if (!req.new_agent_id) {
      alert("No agent selected. Ask the student to choose an agent first.");
      return;
    }
    setActingId(user.id);
    try {
      // 1) Approve + set assigned_agent_id on the user
      await updateDoc(doc(db, "users", user.id), {
        assigned_agent_id: req.new_agent_id,
        assigned_agent_at: serverTimestamp(),
        agent_reassignment_request: {
          ...req,
          status: "approved",
          approved_at: serverTimestamp(),
        },
      });

      // 2) Link all existing cases (package-first scenario) to this agent
      await linkExistingCasesToAgent(user.id, req.new_agent_id);
    } catch (e) {
      console.error("Approve failed:", e);
      alert("Approve failed. Check console for details.");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (user) => {
    const req = user.agent_reassignment_request || {};
    setActingId(user.id);
    try {
      await updateDoc(doc(db, "users", user.id), {
        agent_reassignment_request: {
          ...req,
          status: "rejected",
          rejected_at: serverTimestamp(),
        },
      });
    } catch (e) {
      console.error("Reject failed:", e);
      alert("Reject failed. Check console for details.");
    } finally {
      setActingId(null);
    }
  };

  /* ---------- Render helpers ---------- */
  const SectionHeader = ({ title, count, accent = "emerald" }) => (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Badge className={`bg-${accent}-100 text-${accent}-800`}>{count}</Badge>
    </div>
  );

  const RequestCard = ({ u }) => {
    const req = u.agent_reassignment_request || {};
    const agent = req.new_agent_id ? agentsById[req.new_agent_id] : null;
    const agentUser = agent?.user_id ? agentUsersByUid[agent.user_id] : null;

    const companyName = agent?.company_name || agent?.company || "Education Agency";
    const repName = agentUser?.full_name || agent?.full_name || "Agent Representative";
    const repEmail = agentUser?.email || agent?.email || "";
    const agentCity = agent?.city || agent?.hq_city;
    const expYears = agent?.experience_years;

    const actionable = !!agent;

    return (
      <Card key={u.id} className="hover:shadow-md transition">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-700" />
            {u.display_name || u.full_name || u.name || u.email || u.id}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {fmtDate(req.requested_at)}
            </span>
          </div>

          <Separator />

          {actionable ? (
            <div className="text-sm">
              <div className="font-semibold mb-1">Requested Agent</div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    <UserCheck className="w-3 h-3 mr-1" />
                    {companyName}
                  </Badge>
                  {agentCity && (
                    <Badge className="bg-blue-100 text-blue-800">{agentCity}</Badge>
                  )}
                  {typeof expYears === "number" && (
                    <Badge className="bg-purple-100 text-purple-800">
                      {expYears}+ yrs
                    </Badge>
                  )}
                </div>
                <div className="text-gray-700">
                  Rep: <span className="font-medium">{repName}</span>
                  {repEmail ? <span className="text-gray-500"> • {repEmail}</span> : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded-md flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              This request doesn’t include a specific agent. Ask the student to select an
              agent in the app, then approve here.
            </div>
          )}

          {req.reason && (
            <div className="text-sm">
              <div className="font-semibold mb-1">Reason</div>
              <div className="text-gray-700">{req.reason}</div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={() => approve(u)}
              disabled={!actionable || actingId === u.id}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {actingId === u.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Approving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => reject(u)} disabled={actingId === u.id}>
              {actingId === u.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Rejecting…
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  /* ---------- Top meta / filters ---------- */
  const total = normalized.all.length;
  const readyCount = normalized.ready.length;
  const needsCount = normalized.needs.length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Assignment Requests</h1>
          <p className="text-sm text-gray-600">
            Approve or reject student requests to assign or change agents. Showing{" "}
            <span className="font-semibold">user</span> and{" "}
            <span className="font-semibold">student</span> accounts only.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search student or agent…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={showSection === "all" ? "default" : "outline"}
              onClick={() => setShowSection("all")}
            >
              <FilterIcon className="w-4 h-4 mr-2" />
              All <Badge className="ml-2 bg-gray-100 text-gray-800">{total}</Badge>
            </Button>
            <Button
              type="button"
              variant={showSection === "ready" ? "default" : "outline"}
              onClick={() => setShowSection("ready")}
            >
              Ready{" "}
              <Badge className="ml-2 bg-emerald-100 text-emerald-800">
                {readyCount}
              </Badge>
            </Button>
            <Button
              type="button"
              variant={showSection === "needs" ? "default" : "outline"}
              onClick={() => setShowSection("needs")}
            >
              Needs Agent{" "}
              <Badge className="ml-2 bg-amber-100 text-amber-800">{needsCount}</Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center p-10 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading pending requests…
        </div>
      ) : total === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-600">
            <UserCheck className="w-8 h-8 mx-auto mb-3 text-emerald-600" />
            No pending requests.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Ready to approve */}
          {(showSection === "all" || showSection === "ready") && (
            <div className="mb-6">
              <SectionHeader title="Ready to Approve" count={readyCount} accent="emerald" />
              {normalized.ready.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-gray-600">
                    Nothing ready yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {normalized.ready.map((u) => (
                    <RequestCard key={u.id} u={u} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Needs agent selected */}
          {(showSection === "all" || showSection === "needs") && (
            <div>
              <SectionHeader title="Needs Agent Selected" count={needsCount} accent="amber" />
              {normalized.needs.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-gray-600">
                    All requests have a chosen agent.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {normalized.needs.map((u) => (
                    <RequestCard key={u.id} u={u} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
