// src/pages/AdminVisaRequests.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Search, Eye, CheckCircle, Clock, AlertCircle, User as UserIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ---- helpers ----
const toDate = (val) => {
  if (!val) return null;
  try {
    if (typeof val?.toDate === "function") return val.toDate(); // Firestore Timestamp
    return new Date(val); // string/number
  } catch {
    return null;
  }
};

const StatusBadge = ({ status }) => {
  const variants = {
    pending: { variant: "secondary", icon: Clock, color: "text-yellow-600" },
    in_progress: { variant: "default", icon: Clock, color: "text-blue-600" },
    documents_required: { variant: "outline", icon: AlertCircle, color: "text-orange-600" },
    waiting_loa: { variant: "outline", icon: Clock, color: "text-purple-600" },
    completed: { variant: "default", icon: CheckCircle, color: "text-green-600" },
    rejected: { variant: "destructive", icon: AlertCircle, color: "text-red-600" },
  };

  const config = variants[status] || variants.pending;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {(status || "").replaceAll("_", " ").toUpperCase() || "PENDING"}
    </Badge>
  );
};

const DEFAULT_STATUS_OPTIONS = [
  "pending",
  "in_progress",
  "documents_required",
  "waiting_loa",
  "completed",
  "rejected",
];

const CaseDetailsModal = ({ caseData, user, agent, open, onOpenChange, onUpdate, statusOptions }) => {
  const [formData, setFormData] = useState(caseData || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (caseData) setFormData(caseData);
  }, [caseData]);

  const handleSave = async () => {
    if (!caseData?.id) return;
    try {
      setSaving(true);
      // Update Firestore case doc
      await updateDoc(doc(db, "cases", caseData.id), {
        status: formData.status || "pending",
        program_name: formData.program_name || "",
        notes: formData.notes || "",
      });
      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating case:", error);
      alert("Failed to update case. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!caseData) return null;

  const options = Array.from(new Set([...(statusOptions || []), ...DEFAULT_STATUS_OPTIONS]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Case Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserIcon className="w-5 h-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Name:</p>
                  <p>{user?.full_name || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Email:</p>
                  <p>{user?.email || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Phone:</p>
                  <p>{user?.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Country:</p>
                  <p>{user?.country || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Case Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Case Type</Label>
                  <p className="font-medium">{formData.case_type || "—"}</p>
                </div>
                <div>
                  <Label>Current Status</Label>
                  <Select
                    value={formData.status || "pending"}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Program Name</Label>
                <Input
                  value={formData.program_name || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, program_name: e.target.value }))}
                  placeholder="Enter program name"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add case notes..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assigned Agent */}
          {agent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Company:</p>
                    <p>{agent.company_name || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Contact Person:</p>
                    <p>{agent.contact_person?.name || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminVisaRequests() {
  const [cases, setCases] = useState([]);
  const [users, setUsers] = useState({});
  const [agents, setAgents] = useState({});
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cases (newest first if field exists)
      let caseDocs = [];
      try {
        const cq = query(collection(db, "cases"), orderBy("created_date", "desc"));
        const csnap = await getDocs(cq);
        caseDocs = csnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {
        const csnap = await getDocs(collection(db, "cases"));
        caseDocs = csnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      setCases(caseDocs || []);

      // Users
      const usnap = await getDocs(collection(db, "users"));
      const userMap = {};
      usnap.docs.forEach((d) => (userMap[d.id] = { id: d.id, ...d.data() }));
      setUsers(userMap);

      // Agents
      const asnap = await getDocs(collection(db, "agents"));
      const agentMap = {};
      asnap.docs.forEach((d) => (agentMap[d.id] = { id: d.id, ...d.data() }));
      setAgents(agentMap);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // derive available statuses (for filter + modal options)
  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          (cases || [])
            .map((c) => c.status)
            .filter(Boolean)
        )
      ),
    [cases]
  );

  useEffect(() => {
    let filtered = cases;

    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter((caseItem) => {
        const user = users[caseItem.student_id];
        return (
          user?.full_name?.toLowerCase().includes(t) ||
          user?.email?.toLowerCase().includes(t) ||
          caseItem.case_type?.toLowerCase().includes(t) ||
          caseItem.program_name?.toLowerCase().includes(t)
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((caseItem) => caseItem.status === statusFilter);
    }

    setFilteredCases(filtered);
  }, [cases, users, searchTerm, statusFilter]);

  const openCaseDetails = (caseData) => {
    setSelectedCase(caseData);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          Visa Case Management
        </h1>
        <p className="text-gray-600 mt-2">Monitor and manage all visa applications</p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by student name, email, or case type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Showing {filteredCases.length} of {cases.length} cases
          </p>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Visa Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Case Type</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((caseItem) => {
                const user = users[caseItem.student_id];
                const created = toDate(caseItem.created_date);
                return (
                  <TableRow key={caseItem.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user?.full_name || "Unknown"}</p>
                        <p className="text-sm text-gray-600">{user?.email || "No email"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{caseItem.case_type || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{caseItem.program_name || "Not specified"}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={caseItem.status} />
                    </TableCell>
                    <TableCell>{created ? format(created, "MMM dd, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openCaseDetails(caseItem)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Link to={createPageUrl(`VisaDocuments?case_id=${caseItem.id}`)}>
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredCases.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cases Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search filters"
                  : "No visa cases have been created yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CaseDetailsModal
        caseData={selectedCase}
        user={selectedCase ? users[selectedCase.student_id] : null}
        agent={null /* wire if you want to show agent details: agents[selectedCase?.agent_id] */}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={loadData}
        statusOptions={statuses}
      />
    </div>
  );
}
