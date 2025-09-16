// src/pages/FindAgent.jsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Globe, Languages, MessageCircle, UserCheck, AlertCircle } from "lucide-react";

/* ---------- Firebase ---------- */
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";

/* ---------- Simple route helper ---------- */
const createPageUrl = (pageName) => {
  switch (pageName) {
    case "Welcome":
      return "/welcome";
    default:
      return `/${pageName.toLowerCase()}`;
  }
};

/* ---------- Agent Card ---------- */
const AgentCard = ({ agent, onSelectAgent, isSelecting, currentUser }) => {
  const showSelectAgentButton = !currentUser?.assigned_agent_id;
  const isCurrentlySelecting = isSelecting === agent.id;

  return (
    <Card className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col">
      <CardContent className="p-6 flex-grow flex flex-col">
        <div className="flex items-start gap-4">
          <img
            src={
              agent.profile_picture ||
              agent.photo_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                agent.full_name || agent.company_name || "A"
              )}`
            }
            alt={agent.full_name || "Agent"}
            className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{agent.company_name || "Education Agency"}</h3>
            <p className="text-gray-600 text-sm">{agent.full_name || "Agent Representative"}</p>
            <div className="flex items-center gap-2 mt-1">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-emerald-600">Verified Agent</span>
            </div>
          </div>
        </div>

        <div className="my-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Target Countries:</p>
          <div className="flex flex-wrap gap-2">
            {(agent.target_countries || ["Canada"]).map((country) => (
              <Badge key={country} variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {country}
              </Badge>
            ))}
          </div>
        </div>

        <div className="my-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Languages Spoken:</p>
          <div className="flex flex-wrap gap-2">
            {(agent.team_details?.languages_spoken || ["English"]).map((lang) => (
              <Badge key={lang} variant="outline">
                {lang}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex-grow" />

        <div className="border-t pt-4 mt-4">
          {showSelectAgentButton ? (
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white"
              onClick={() => onSelectAgent(agent)}
              disabled={isCurrentlySelecting}
            >
              {isCurrentlySelecting ? "Selecting..." : "Select This Agent"}
            </Button>
          ) : (
            <Button className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white" disabled>
              <MessageCircle className="w-4 h-4 mr-2" /> Contact Agent
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* ---------- Page ---------- */
export default function FindAgent() {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ country: "all", language: "all" });

  const [currentUser, setCurrentUser] = useState(null);
  const [assignedAgent, setAssignedAgent] = useState(null);
  const [agentUsers, setAgentUsers] = useState({}); // map user_id -> user doc
  const [selectingAgent, setSelectingAgent] = useState(null);
  const [error, setError] = useState(null);

  /* -------- Helpers to read Firestore -------- */
  const getUserDoc = async (uid) => {
    const uref = doc(db, "users", uid);
    const usnap = await getDoc(uref);
    return usnap.exists() ? { id: uid, ...usnap.data() } : null;
  };

  const fetchAgents = async () => {
    // agents where verification_status == 'verified'
    const q = query(collection(db, "agents"), where("verification_status", "==", "verified"));
    const qs = await getDocs(q);

    const rawAgents = qs.docs.map((d) => ({ id: d.id, ...d.data() }));

    // gather user_ids for batch lookup
    const userIds = Array.from(
      new Set(
        rawAgents
          .map((a) => a.user_id)
          .filter((uid) => typeof uid === "string" && uid.length > 0)
      )
    );

    // fetch user docs (simple parallel fetch; OK for reasonable counts)
    const pairs = await Promise.all(
      userIds.map(async (uid) => {
        try {
          const u = await getUserDoc(uid);
          return [uid, u];
        } catch {
          return [uid, null];
        }
      })
    );

    const usersMap = {};
    for (const [uid, u] of pairs) {
      if (u) usersMap[uid] = u;
    }

    // combine display fields
    const combined = rawAgents.map((a) => {
      const u = usersMap[a.user_id] || {};
      return {
        ...a,
        full_name: u.full_name || a.full_name || "Agent Representative",
        email: u.email || a.email || "contact@agency.com",
        profile_picture: u.profile_picture || u.photo_url || a.profile_picture || a.photo_url,
      };
    });

    setAgentUsers(usersMap);
    setAgents(combined);
    setFilteredAgents(combined);
  };

  const fetchAssignedAgent = async (user) => {
    if (!user?.assigned_agent_id) {
      setAssignedAgent(null);
      return;
    }
    try {
      const aref = doc(db, "agents", user.assigned_agent_id);
      const asnap = await getDoc(aref);
      if (!asnap.exists()) {
        setAssignedAgent(null);
        return;
      }
      const agentDoc = { id: asnap.id, ...asnap.data() };

      // make sure agent user info is present
      if (agentDoc.user_id && !agentUsers[agentDoc.user_id]) {
        const u = await getUserDoc(agentDoc.user_id);
        if (u) {
          setAgentUsers((prev) => ({ ...prev, [agentDoc.user_id]: u }));
        }
      }
      setAssignedAgent(agentDoc);
    } catch (e) {
      console.warn("Could not load assigned agent:", e);
      setAssignedAgent(null);
    }
  };

  /* -------- Load user + data -------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setError(null);
      try {
        if (!fbUser) {
          setCurrentUser(null);
          // We still show the public list of verified agents even if not logged in
          await fetchAgents();
          return;
        }
        // load current user doc
        const u = await getUserDoc(fbUser.uid);
        setCurrentUser(u ? u : { id: fbUser.uid });

        await fetchAgents();
        await fetchAssignedAgent(u);
      } catch (err) {
        console.error("Error loading agents:", err);
        setError("Failed to load agents. Please try again later.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub && unsub();
  }, []);

  /* -------- Filtering -------- */
  useEffect(() => {
    let list = agents;

    // If user has an assigned agent, hide that agent from the selectable list
    if (currentUser?.assigned_agent_id) {
      list = list.filter((a) => a.id !== currentUser.assigned_agent_id);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          (a.full_name || "").toLowerCase().includes(s) ||
          (a.company_name || "").toLowerCase().includes(s)
      );
    }
    if (filters.country !== "all") {
      list = list.filter((a) => (a.target_countries || []).includes(filters.country));
    }
    if (filters.language !== "all") {
      list = list.filter((a) => (a.team_details?.languages_spoken || []).includes(filters.language));
    }

    setFilteredAgents(list);
  }, [agents, searchTerm, filters, currentUser]);

  /* -------- Select agent (assign) -------- */
  const handleSelectAgent = async (agent) => {
    if (!currentUser) {
      window.location.href = createPageUrl("Welcome");
      return;
    }
    if (currentUser?.assigned_agent_id) {
      alert("You already have an assigned agent. Please contact support if you need to change your agent.");
      return;
    }

    setSelectingAgent(agent.id);
    try {
      const uref = doc(db, "users", currentUser.id);
      await updateDoc(uref, { assigned_agent_id: agent.id });

      // refresh current user + assigned agent banner
      const updatedUser = await getUserDoc(currentUser.id);
      setCurrentUser(updatedUser || currentUser);
      setAssignedAgent(agent);

      alert("Agent assigned successfully! They will be notified and will contact you soon.");
    } catch (e) {
      console.error("Error assigning agent:", e);
      alert("Failed to assign agent. Please try again.");
    } finally {
      setSelectingAgent(null);
    }
  };

  const handleRequestReassignment = () => {
    const reason = prompt("Please explain why you want to change your agent:");
    if (!reason) {
      alert("Agent reassignment request cancelled.");
      return;
    }
    // In a real app, you'd write a 'reassign_requests' doc here.
    console.log("Reassignment request reason:", reason);
    alert("Your reassignment request has been submitted to admin for review. You will be contacted shortly.");
  };

  /* -------- Filter options -------- */
  const uniqueCountries = [...new Set(agents.flatMap((a) => a.target_countries || []))];
  const uniqueLanguages = [...new Set(agents.flatMap((a) => a.team_details?.languages_spoken || []))];

  /* -------- UI -------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Unable to Load Agents</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            {currentUser?.assigned_agent_id ? "Your Assigned Agent" : "Find Your Agent"}
          </h1>
          <p className="text-gray-600 text-lg">
            {currentUser?.assigned_agent_id
              ? "Your dedicated agent will guide you through your immigration journey."
              : "Choose a trusted agent to guide your immigration journey"}
          </p>
        </div>

        {/* Assigned agent banner */}
        {assignedAgent && currentUser?.assigned_agent_id && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <UserCheck className="w-6 h-6" />
                Assigned Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <img
                  src={
                    (agentUsers[assignedAgent.user_id]?.profile_picture ||
                      agentUsers[assignedAgent.user_id]?.photo_url) ??
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      agentUsers[assignedAgent.user_id]?.full_name || assignedAgent.company_name || "A"
                    )}`
                  }
                  alt={agentUsers[assignedAgent.user_id]?.full_name || "Assigned Agent"}
                  className="w-16 h-16 rounded-full border-4 border-white shadow-md object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {assignedAgent.company_name || "Education Agency"}
                  </h3>
                  <p className="text-gray-600">
                    {agentUsers[assignedAgent.user_id]?.full_name || "Agent Representative"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {agentUsers[assignedAgent.user_id]?.email || "contact@agency.com"}
                  </p>
                </div>
                <div className="text-right">
                  <Button
                    variant="outline"
                    onClick={handleRequestReassignment}
                    className="text-orange-600 hover:bg-orange-50"
                  >
                    Request Change
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">Admin approval required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List of agents for selection (only if none assigned) */}
        {!currentUser?.assigned_agent_id && (
          <>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 grid lg:grid-cols-4 gap-6 items-center">
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by name or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>

              <Select
                value={filters.country}
                onValueChange={(v) => setFilters((p) => ({ ...p, country: v }))}
              >
                <SelectTrigger className="h-12">
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.language}
                onValueChange={(v) => setFilters((p) => ({ ...p, language: v }))}
              >
                <SelectTrigger className="h-12">
                  <Languages className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {uniqueLanguages.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAgents.length === 0 &&
              (searchTerm !== "" || filters.country !== "all" || filters.language !== "all") ? (
                <p className="text-gray-600 lg:col-span-3">No agents found matching your criteria.</p>
              ) : filteredAgents.length === 0 ? (
                <p className="text-gray-600 lg:col-span-3">
                  No agents available for selection at this moment.
                </p>
              ) : (
                filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onSelectAgent={handleSelectAgent}
                    isSelecting={selectingAgent}
                    currentUser={currentUser}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
