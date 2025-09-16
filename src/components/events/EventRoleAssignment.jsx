
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { EventAssignment } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Trash2, Edit, Users, Shield } from 'lucide-react';

const roleConfigs = {
  event_coordinator: {
    label: "Event Coordinator",
    color: "bg-purple-100 text-purple-800",
    defaultPermissions: ["view_registrations", "manage_registrations", "view_attendees", "edit_event_details"]
  },
  registration_manager: {
    label: "Registration Manager", 
    color: "bg-blue-100 text-blue-800",
    defaultPermissions: ["view_registrations", "manage_registrations", "scan_qr_codes"]
  },
  booth_supervisor: {
    label: "Booth Supervisor",
    color: "bg-green-100 text-green-800", 
    defaultPermissions: ["view_attendees", "scan_qr_codes"]
  },
  technical_support: {
    label: "Technical Support",
    color: "bg-orange-100 text-orange-800",
    defaultPermissions: ["view_attendees"]
  },
  marketing_lead: {
    label: "Marketing Lead",
    color: "bg-pink-100 text-pink-800",
    defaultPermissions: ["send_notifications", "view_registrations"]
  }
};

const permissionLabels = {
  view_registrations: "View Registrations",
  manage_registrations: "Manage Registrations", 
  view_attendees: "View Attendees",
  scan_qr_codes: "Scan QR Codes",
  send_notifications: "Send Notifications",
  edit_event_details: "Edit Event Details"
};

export default function EventRoleAssignment({ event }) {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentData, userData] = await Promise.all([
        EventAssignment.filter({ event_id: event.event_id }),
        User.list()
      ]);
      setAssignments(assignmentData);
      setUsers(userData.filter(u => ['admin', 'agent', 'tutor', 'school'].includes(u.user_type)));
    } catch (error) {
      console.error("Failed to load assignment data:", error);
    }
    setLoading(false);
  }, [event.event_id]); // Depend on event.event_id to refetch data when event changes

  useEffect(() => {
    loadData();
  }, [loadData]); // Depend on loadData to ensure it's called when event.event_id changes

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setSelectedPermissions(roleConfigs[role]?.defaultPermissions || []);
  };

  const handlePermissionToggle = (permission) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedRole) return;
    
    try {
      const currentUser = await User.me();
      await EventAssignment.create({
        event_id: event.event_id,
        user_id: selectedUser,
        assigned_role: selectedRole,
        permissions: selectedPermissions,
        notes: notes,
        assigned_by: currentUser.id
      });
      
      setIsAssignModalOpen(false);
      setSelectedUser('');
      setSelectedRole('');
      setSelectedPermissions([]);
      setNotes('');
      loadData();
    } catch (error) {
      console.error("Failed to assign role:", error);
      alert("Failed to assign role. Please try again.");
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (window.confirm("Are you sure you want to remove this assignment?")) {
      try {
        await EventAssignment.delete(assignmentId);
        loadData();
      } catch (error) {
        console.error("Failed to remove assignment:", error);
        alert("Failed to remove assignment.");
      }
    }
  };

  const getUserById = (userId) => users.find(u => u.id === userId);

  if (loading) {
    return <div className="text-center py-6">Loading assignments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Event Role Assignments
          </CardTitle>
          <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign Event Role</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select User</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose user to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.user_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleConfigs).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRole && (
                  <div>
                    <Label>Permissions</Label>
                    <div className="space-y-2 mt-2">
                      {Object.entries(permissionLabels).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={selectedPermissions.includes(key)}
                            onCheckedChange={() => handlePermissionToggle(key)}
                          />
                          <Label htmlFor={key}>{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes about this assignment..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssign} disabled={!selectedUser || !selectedRole}>
                    Assign Role
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {assignments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map(assignment => {
                const user = getUserById(assignment.user_id);
                const roleConfig = roleConfigs[assignment.assigned_role];
                return (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user?.full_name || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500">{user?.email}</div>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {user?.user_type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleConfig?.color || "bg-gray-100 text-gray-800"}>
                        {roleConfig?.label || assignment.assigned_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {assignment.permissions?.map(permission => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {permissionLabels[permission] || permission}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={assignment.status === 'active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No role assignments for this event yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
