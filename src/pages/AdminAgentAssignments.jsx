// src/pages/AdminAgentAssignments.jsx
import React, { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserCheck, ShieldCheck, ShieldX } from "lucide-react";

export default function AdminAgentAssignments() {
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // pending requests: users with agent_reassignment_request.status == "pending"
      const usersRef = collection(db, "users");
      const pendingQ = query(
        usersRef,
        where("agent_reassignment_request.status", "==", "pending")
      );
      const [pendingSnap, agentsSnap] = await Promise.all([
        getDocs(pendingQ),
        getDocs(
          query(
            usersRef,
            where("user_type", "==", "agent"),
            where("is_verified", "==", true)
          )
        ),
      ]);

      const pending = pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const agentList = agentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setRequests(pending);
      setAgents(agentList);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Could not load assignment requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // If you want live updates, switch to onSnapshot here.
  }, []);

  const handleAction = async (userId, action, newAgentId = null) => {
    setProcessingId(userId);
    const userToUpdate = requests.find((r) => r.id === userId);
    if (!userToUpdate) {
      setProcessingId(null);
      return;
    }

    try {
      const userRef = doc(db, "users", userId);
      const currentReq = userToUpdate.agent_reassignment_request || {};
      let update = {};
      let nextReq = { ...currentReq };

      if (action === "approve") {
        nextReq.status = "approved";
        update = {
          assigned_agent_id: currentReq.new_agent_id || null,
          agent_reassignment_request: nextReq,
          updated_at: serverTimestamp(),
        };
      } else if (action === "reject") {
        nextReq.status = "rejected";
        update = {
          agent_reassignment_request: nextReq,
          updated_at: serverTimestamp(),
        };
      } else if (action === "reassign" && newAgentId) {
        // Treat reassign as approval with a different agent
        nextReq.status = "approved";
        update = {
          assigned_agent_id: newAgentId,
          agent_reassignment_request: nextReq,
          updated_at: serverTimestamp(),
        };
      }

      await updateDoc(userRef, update);
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      alert("Could not perform action. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatReqDate = (val) => {
    // Supports Firestore Timestamp or ISO/string/number
    try {
      const d =
        val?.toDate?.() ??
        (typeof val === "string" || typeof val === "number"
          ? new Date(val)
          : null);
      return d ? d.toLocaleDateString() : "—";
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <UserCheck className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Agent Assignment Requests</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Requested Agent</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No pending assignment requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((user) => {
                    const req = user.agent_reassignment_request || {};
                    const requestedAgent = agents.find(
                      (a) => a.id === req.new_agent_id
                    );
                    const isProcessing = processingId === user.id;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">
                            {user.full_name || user.name || "Unnamed"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {requestedAgent?.full_name ||
                            requestedAgent?.name ||
                            "N/A"}
                        </TableCell>
                        <TableCell>{req.reason || "N/A"}</TableCell>
                        <TableCell>{formatReqDate(req.requested_at)}</TableCell>
                        <TableCell className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-50 text-green-700 hover:bg-green-100"
                              onClick={() => handleAction(user.id, "approve")}
                              disabled={isProcessing}
                            >
                              <ShieldCheck className="w-4 h-4 mr-2" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(user.id, "reject")}
                              disabled={isProcessing}
                            >
                              <ShieldX className="w-4 h-4 mr-2" /> Reject
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={(agentId) =>
                                handleAction(user.id, "reassign", agentId)
                              }
                              disabled={isProcessing}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Re-assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                {agents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.full_name || agent.name || agent.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {isProcessing && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
