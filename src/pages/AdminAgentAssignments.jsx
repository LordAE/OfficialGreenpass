import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Agent } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, Search, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

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
      const allUsers = await User.list();
      const pendingRequests = allUsers.filter(u => u.agent_reassignment_request && u.agent_reassignment_request.status === 'pending');
      
      const agentUsers = await User.filter({ user_type: 'agent', is_verified: true });
      setAgents(agentUsers);
      setRequests(pendingRequests);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Could not load assignment requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (userId, action, newAgentId = null) => {
    setProcessingId(userId);
    const userToUpdate = requests.find(r => r.id === userId);
    if (!userToUpdate) return;

    try {
      let updatedData = {};
      let updatedRequest = { ...userToUpdate.agent_reassignment_request };

      if (action === 'approve') {
        updatedRequest.status = 'approved';
        updatedData = {
          assigned_agent_id: updatedRequest.new_agent_id,
          agent_reassignment_request: updatedRequest
        };
      } else if (action === 'reject') {
        updatedRequest.status = 'rejected';
        updatedData = {
          agent_reassignment_request: updatedRequest
        };
      } else if (action === 'reassign' && newAgentId) {
        updatedRequest.status = 'approved'; // Reassigning is an approval with a different agent
        updatedData = {
          assigned_agent_id: newAgentId,
          agent_reassignment_request: updatedRequest
        };
      }

      await User.update(userId, updatedData);
      // Refresh data from server
      await fetchData();

    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      alert(`Could not perform action. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
                    <TableCell colSpan="5" className="text-center py-8">
                      No pending assignment requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map(user => {
                    const req = user.agent_reassignment_request;
                    const requestedAgent = agents.find(a => a.id === req.new_agent_id);
                    const isProcessing = processingId === user.id;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </TableCell>
                        <TableCell>{requestedAgent?.full_name || 'N/A'}</TableCell>
                        <TableCell>{req.reason || 'N/A'}</TableCell>
                        <TableCell>{new Date(req.requested_at).toLocaleDateString()}</TableCell>
                        <TableCell className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-50 text-green-700 hover:bg-green-100"
                              onClick={() => handleAction(user.id, 'approve')}
                              disabled={isProcessing}
                            >
                              <ShieldCheck className="w-4 h-4 mr-2" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(user.id, 'reject')}
                              disabled={isProcessing}
                            >
                              <ShieldX className="w-4 h-4 mr-2" /> Reject
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={(agentId) => handleAction(user.id, 'reassign', agentId)}
                              disabled={isProcessing}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Re-assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                {agents.map(agent => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {isProcessing && <Loader2 className="w-4 h-4 animate-spin"/>}
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