// src/pages/MyStudents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, FileCheck, X, Plus, ClipboardList, MessageSquare, Trash2 } from "lucide-react";
import { createPageUrl } from "@/utils";

// Firebase
import { getAuth } from "firebase/auth";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  documentId,
  deleteDoc,
} from "firebase/firestore";

/**
 * AGENT-ONLY PAGE (My Clients)
 * - Client list = referred users + agent_students relationship
 * - Document checklist per client stored in: agent_client_checklists/{agentId}_{clientId}
 *
 * ACTIONS:
 * - Message: navigates to Messages?to=<clientId>
 * - Remove: removes ONLY manually-added clients (agent_students). Referred clients can't be removed here.
 *   Also deletes the checklist for that client for cleanliness.
 */

const CHECKLIST_COLLECTION = "agent_client_checklists";

// Firestore "in" supports max 10 items
const chunk = (arr, size = 10) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const makeRelId = (agentId, clientId) => `${agentId}_${clientId}`;

const defaultDocTemplate = () => ([
  { name: "Passport bio page" },
  { name: "Study plan / SOP" },
  { name: "School documents (LOA / offer)" },
  { name: "Proof of funds / bank statement" },
  { name: "Tuition payment receipt (if applicable)" },
  { name: "Medical / IME (if applicable)" },
  { name: "Police clearance (if applicable)" },
  { name: "Birth certificate" },
  { name: "National ID (if applicable)" },
  { name: "Photos (passport size)" },
]);

// Simple id generator without deps
const cryptoRandomId = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeDocs = (docs) => {
  if (!Array.isArray(docs)) return [];
  return docs
    .filter(Boolean)
    .map((d) => ({
      id: String(d.id || cryptoRandomId()),
      name: String(d.name || "").trim(),
      submitted: Boolean(d.submitted),
      created_at: d.created_at || null,
      updated_at: d.updated_at || null,
    }))
    .filter((d) => d.name.length > 0);
};

function ProgressBadge({ docs }) {
  const total = Array.isArray(docs) ? docs.length : 0;
  const done = Array.isArray(docs) ? docs.filter((d) => d.submitted).length : 0;
  if (!total) return <Badge variant="secondary" className="rounded-full">0</Badge>;
  return (
    <Badge variant={done === total ? "default" : "secondary"} className="rounded-full">
      {done}/{total}
    </Badge>
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
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

export default function MyStudents() {
  const [clients, setClients] = useState([]);
  const [manualClientIds, setManualClientIds] = useState(new Set()); // from agent_students
  const [checklistsByClient, setChecklistsByClient] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorText, setErrorText] = useState("");

  // Modal state
  const [docsOpen, setDocsOpen] = useState(false);
  const [activeClient, setActiveClient] = useState(null);
  const [docsSaving, setDocsSaving] = useState(false);
  const [docName, setDocName] = useState("");

  const openDocs = (client) => {
    setActiveClient(client);
    setDocName("");
    setDocsOpen(true);
  };

  const closeDocs = () => {
    setDocsOpen(false);
    setActiveClient(null);
    setDocName("");
    setDocsSaving(false);
  };

  const activeDocs = useMemo(() => {
    if (!activeClient?.id) return [];
    return normalizeDocs(checklistsByClient[activeClient.id] || []);
  }, [activeClient?.id, checklistsByClient]);

  const saveChecklist = async (agentId, clientId, nextDocs) => {
    const relId = makeRelId(agentId, clientId);
    const ref = doc(db, CHECKLIST_COLLECTION, relId);

    const payload = {
      agent_id: agentId,
      client_id: clientId,
      documents: nextDocs.map((d) => ({
        id: d.id,
        name: d.name,
        submitted: !!d.submitted,
        updated_at: new Date().toISOString(),
        created_at: d.created_at || new Date().toISOString(),
      })),
      updated_at: serverTimestamp(),
      created_at: serverTimestamp(),
    };

    await setDoc(ref, payload, { merge: true });

    setChecklistsByClient((prev) => ({
      ...prev,
      [clientId]: payload.documents,
    }));
  };

  const handleToggleDoc = async (docId) => {
    const auth = getAuth();
    const me = auth.currentUser;
    if (!me || !activeClient?.id) return;

    const next = activeDocs.map((d) =>
      d.id === docId ? { ...d, submitted: !d.submitted, updated_at: new Date().toISOString() } : d
    );

    setDocsSaving(true);
    try {
      await saveChecklist(me.uid, activeClient.id, next);
    } catch (e) {
      console.error("Checklist toggle failed:", e);
      setErrorText(e?.message || "Failed to update document checklist.");
    } finally {
      setDocsSaving(false);
    }
  };

  const handleAddDoc = async () => {
    const name = String(docName || "").trim();
    if (!name) return;

    const auth = getAuth();
    const me = auth.currentUser;
    if (!me || !activeClient?.id) return;

    const next = [
      ...activeDocs,
      { id: cryptoRandomId(), name, submitted: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    setDocsSaving(true);
    try {
      await saveChecklist(me.uid, activeClient.id, next);
      setDocName("");
    } catch (e) {
      console.error("Checklist add failed:", e);
      setErrorText(e?.message || "Failed to add document.");
    } finally {
      setDocsSaving(false);
    }
  };

  const handleRemoveDoc = async (docId) => {
    const auth = getAuth();
    const me = auth.currentUser;
    if (!me || !activeClient?.id) return;

    const next = activeDocs.filter((d) => d.id !== docId);

    setDocsSaving(true);
    try {
      await saveChecklist(me.uid, activeClient.id, next);
    } catch (e) {
      console.error("Checklist remove failed:", e);
      setErrorText(e?.message || "Failed to remove document.");
    } finally {
      setDocsSaving(false);
    }
  };

  const handleApplyTemplate = async () => {
    const auth = getAuth();
    const me = auth.currentUser;
    if (!me || !activeClient?.id) return;

    const base = defaultDocTemplate().map((d) => ({
      id: cryptoRandomId(),
      name: d.name,
      submitted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setDocsSaving(true);
    try {
      await saveChecklist(me.uid, activeClient.id, base);
    } catch (e) {
      console.error("Checklist template failed:", e);
      setErrorText(e?.message || "Failed to apply template.");
    } finally {
      setDocsSaving(false);
    }
  };

  const handleMessage = (clientId) => {
    window.location.href = createPageUrl(`Messages?to=${clientId}`);
  };

  const handleRemoveClient = async (client) => {
    const auth = getAuth();
    const me = auth.currentUser;
    if (!me || !client?.id) return;

    // Only removable if it was manually added
    if (!manualClientIds.has(client.id)) return;

    const ok = window.confirm(`Remove ${client.full_name || client.email || "this client"} from your client list?`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "agent_students", makeRelId(me.uid, client.id)));

      // cleanup checklist for this agent+client
      try {
        await deleteDoc(doc(db, CHECKLIST_COLLECTION, makeRelId(me.uid, client.id)));
      } catch {}

      setClients((prev) => prev.filter((c) => c.id !== client.id));
      setManualClientIds((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(client.id);
        return next;
      });
      setChecklistsByClient((prev) => {
        const next = { ...prev };
        delete next[client.id];
        return next;
      });
    } catch (e) {
      console.error("Remove client failed:", e);
      setErrorText(e?.message || "Failed to remove client.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorText("");
      try {
        const auth = getAuth();
        const me = auth.currentUser;

        if (!me) {
          setClients([]);
          setManualClientIds(new Set());
          setChecklistsByClient({});
          setLoading(false);
          return;
        }

        // Clients via referral
        const referredQ = query(collection(db, "users"), where("referred_by_agent_id", "==", me.uid));
        const referredSnap = await getDocs(referredQ);
        const referredDocs = referredSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Clients manually added
        const relQ = query(collection(db, "agent_students"), where("agent_id", "==", me.uid));
        const relSnap = await getDocs(relQ);
        const relClientIds = relSnap.docs.map((d) => d.data()?.student_id).filter(Boolean);
        setManualClientIds(new Set(relClientIds));

        const relUsers = [];
        if (relClientIds.length) {
          const uniqueIds = Array.from(new Set(relClientIds));
          for (const batch of chunk(uniqueIds, 10)) {
            const usersQ = query(collection(db, "users"), where(documentId(), "in", batch));
            const usersSnap = await getDocs(usersQ);
            usersSnap.docs.forEach((u) => relUsers.push({ id: u.id, ...u.data() }));
          }
        }

        const merged = [...referredDocs, ...relUsers];
        const seen = new Set();
        const clientDocs = merged.filter((u) => {
          if (!u?.id) return false;
          if (seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });

        setClients(clientDocs);

        // Fetch all checklists for this agent (for badges)
        const checklistQ = query(collection(db, CHECKLIST_COLLECTION), where("agent_id", "==", me.uid));
        const checklistSnap = await getDocs(checklistQ);
        const map = {};
        checklistSnap.docs.forEach((d) => {
          const data = d.data() || {};
          const cid = data.client_id;
          if (!cid) return;
          map[cid] = Array.isArray(data.documents) ? data.documents : [];
        });
        setChecklistsByClient(map);
      } catch (err) {
        console.error("Error fetching clients/checklists:", err);
        setErrorText(err?.message || "Failed to load clients.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredClients = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return clients;
    return clients.filter(
      (c) =>
        String(c.full_name || "").toLowerCase().includes(s) ||
        String(c.email || "").toLowerCase().includes(s)
    );
  }, [clients, searchTerm]);

  if (loading) {
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
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">My Clients</h1>
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
          <ClipboardList className="h-4 w-4" />
          Track required documents per client
        </div>
      </div>

      {errorText ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>My Clients List</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by client name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Docs</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredClients.map((client) => {
                  const isManual = manualClientIds.has(client.id);
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="font-medium">{client.full_name || "Unnamed"}</div>
                        <div className="text-sm text-muted-foreground">{client.email || "No email"}</div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ProgressBadge docs={checklistsByClient[client.id]} />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => openDocs(client)}
                          >
                            <FileCheck className="h-4 w-4 mr-2" />
                            Documents
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant={client.onboarding_completed ? "default" : "secondary"}
                          className="rounded-full"
                        >
                          {client.onboarding_completed ? "Complete" : "Incomplete"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => handleMessage(client.id)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            disabled={!isManual}
                            title={isManual ? "Remove from your client list" : "Referred clients can't be removed here"}
                            onClick={() => handleRemoveClient(client)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredClients.map((client) => {
              const isManual = manualClientIds.has(client.id);
              return (
                <Card key={client.id} className="p-4 rounded-2xl">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-bold">{client.full_name || "Unnamed"}</p>
                      <p className="text-sm text-gray-500">{client.email || "No email"}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Docs</span>
                        <ProgressBadge docs={checklistsByClient[client.id]} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => openDocs(client)}
                      >
                        <FileCheck className="h-4 w-4 mr-2" />
                        Docs
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => handleMessage(client.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        disabled={!isManual}
                        title={isManual ? "Remove from your client list" : "Referred clients can't be removed here"}
                        onClick={() => handleRemoveClient(client)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-500">Profile</p>
                      <Badge
                        variant={client.onboarding_completed ? "default" : "secondary"}
                        className="mt-1 rounded-full"
                      >
                        {client.onboarding_completed ? "Complete" : "Incomplete"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
              <p className="mt-1 text-sm text-gray-500">No clients match your search criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Modal */}
      <Modal
        open={docsOpen}
        onClose={closeDocs}
        title={
          activeClient
            ? `Documents • ${activeClient.full_name || activeClient.email || "Client"}`
            : "Documents"
        }
      >
        {!activeClient ? null : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-gray-600">
                Create a required document list for this client, then tick off items as they submit them.
              </div>

              <div className="flex items-center gap-2">
                <ProgressBadge docs={activeDocs} />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleApplyTemplate}
                  disabled={docsSaving}
                  title="Adds a default checklist (you can edit after)"
                >
                  Use template
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                className="rounded-xl"
                placeholder="Add a document (e.g., Bank statement)…"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddDoc();
                }}
              />
              <Button
                type="button"
                className="rounded-xl"
                onClick={handleAddDoc}
                disabled={docsSaving || !docName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <div className="border rounded-2xl overflow-hidden">
              {activeDocs.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  No documents yet. Click <span className="font-medium">Use template</span> or add your own.
                </div>
              ) : (
                <div className="divide-y">
                  {activeDocs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!d.submitted}
                          onChange={() => handleToggleDoc(d.id)}
                          disabled={docsSaving}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="font-medium">{d.name}</div>
                          <div className="text-xs text-gray-500">
                            {d.submitted ? "Submitted" : "Pending"}
                          </div>
                        </div>
                      </label>

                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => handleRemoveDoc(d.id)}
                        disabled={docsSaving}
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {docsSaving ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
