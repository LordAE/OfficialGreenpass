// src/pages/Messages.jsx
// Human-to-human messaging (NO AI BOT)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import {
  getMessagingSettings,
  getSupportAdminUid,
  getMyUserDoc,
  isStudent,
  isPremiumStudent,
  categoryForRecipientRole,
  getOrCreateConversation,
  sendMessage,
  acceptMessagingAgreement,
  submitReport,
} from "@/api/messaging";

import { MessageSquare, Send, ShieldAlert, Lock } from "lucide-react";

function tsToDate(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  try {
    return new Date(ts);
  } catch {
    return null;
  }
}

function fmtTime(d) {
  if (!d) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const directTo = searchParams.get("to");   // uid OR "support"
  const directRole = searchParams.get("role"); // agent|tutor|vendor|support

  const [fbUser, setFbUser] = useState(null);
  const [me, setMe] = useState(null);
  const [settings, setSettings] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [activeOtherUser, setActiveOtherUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  // Agreement + limits + report
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [limitError, setLimitError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportType, setReportType] = useState("");

  const listRef = useRef(null);

  const isMeStudent = useMemo(() => isStudent(me), [me]);
  const isMePremium = useMemo(() => isPremiumStudent(me), [me]);

  // Auth + load settings + my user doc
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFbUser(u || null);
      if (!u?.uid) {
        setMe(null);
        setSettings(null);
        setConversations([]);
        setActiveConv(null);
        setMessages([]);
        return;
      }

      const [s, m] = await Promise.all([getMessagingSettings(), getMyUserDoc(u.uid)]);
      setSettings(s);
      setMe(m || { id: u.uid });
    });

    return () => unsub();
  }, []);

  // List my conversations
  useEffect(() => {
    if (!fbUser?.uid) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", fbUser.uid),
      orderBy("last_message_at", "desc"),
      limit(200)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Populate "other user" preview (best-effort)
      const withOther = await Promise.all(
        rows.map(async (c) => {
          const otherId = (c.participants || []).find((p) => p !== fbUser.uid);
          if (!otherId) return { ...c, other: null };

          try {
            const us = await getDoc(doc(db, "users", otherId));
            const other = us.exists() ? { id: us.id, ...us.data() } : { id: otherId };
            return { ...c, other };
          } catch {
            return { ...c, other: { id: otherId } };
          }
        })
      );

      setConversations(withOther);

      // Auto-select first convo if none selected
      if (!activeConv && withOther.length) {
        setActiveConv(withOther[0]);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbUser?.uid]);

  // If URL has ?to=... create/open a conversation
  useEffect(() => {
    (async () => {
      if (!fbUser?.uid || !settings) return;
      if (!directTo) return;

      let otherId = directTo;
      let otherRole = directRole || "support";

      // support shortcut
      if (directTo === "support") {
        const adminUid = await getSupportAdminUid();
        if (!adminUid) return;
        otherId = adminUid;
        otherRole = "support";
      }

      // Student agreement gate
      if (isMeStudent && !me?.messaging_agreement_accepted_at) {
        setAgreementOpen(true);
        return;
      }

      // Fetch other user doc
      const otherSnap = await getDoc(doc(db, "users", otherId));
      const otherUser = otherSnap.exists() ? { id: otherSnap.id, ...otherSnap.data() } : { id: otherId };

      // Create/open conversation (this enforces limit ONLY if new)
      try {
        const conv = await getOrCreateConversation({
          me: { id: fbUser.uid, ...(me || {}) },
          otherUser,
          otherRole,
          settings,
          forceCategory: categoryForRecipientRole(otherRole),
        });

        setActiveConv(conv);

        // clean URL
        navigate("/messages", { replace: true });
      } catch (e) {
        setLimitError(e?.message || "You reached your free messaging limit.");
        setUpgradeOpen(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directTo, directRole, fbUser?.uid, settings]);

  // When active conversation changes, set other user + load messages
  useEffect(() => {
    if (!fbUser?.uid || !activeConv?.id) {
      setMessages([]);
      setActiveOtherUser(null);
      return;
    }

    const otherId = (activeConv.participants || []).find((p) => p !== fbUser.uid);
    if (activeConv.other) setActiveOtherUser(activeConv.other);
    else if (otherId) {
      getDoc(doc(db, "users", otherId))
        .then((s) => setActiveOtherUser(s.exists() ? { id: s.id, ...s.data() } : { id: otherId }))
        .catch(() => setActiveOtherUser({ id: otherId }));
    }

    const q = query(
      collection(db, "messages"),
      where("conversation_id", "==", activeConv.id),
      orderBy("created_at", "asc"),
      limit(500)
    );

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(rows);

      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 0);
    });

    return () => unsub();
  }, [activeConv?.id, fbUser?.uid, activeConv?.participants]);

  const otherLabel = useMemo(() => {
    const name = activeOtherUser?.full_name || activeOtherUser?.name || activeOtherUser?.email || "Conversation";
    const role = activeConv?.participant_roles?.[activeOtherUser?.id] || activeOtherUser?.user_type || "";
    const roleNorm = String(role || "").toLowerCase();
    return { name, role: roleNorm };
  }, [activeOtherUser, activeConv]);

  const onSend = async () => {
    if (!fbUser?.uid || !activeConv?.id) return;
    const text = String(draft || "").trim();
    if (!text) return;

    await sendMessage({
      conversationId: activeConv.id,
      senderId: fbUser.uid,
      text,
    });
    setDraft("");
  };

  const onAcceptAgreement = async () => {
    if (!fbUser?.uid) return;
    await acceptMessagingAgreement(fbUser.uid);

    // update local
    setMe((prev) => ({ ...(prev || {}), messaging_agreement_accepted_at: new Date().toISOString() }));
    setAgreementOpen(false);

    // retry direct open if present
    if (directTo) {
      navigate(`/messages?to=${encodeURIComponent(directTo)}&role=${encodeURIComponent(directRole || "support")}`, { replace: true });
    }
  };

  const openReport = () => {
    const otherId = activeOtherUser?.id;
    if (!otherId || !activeConv?.id) return;

    // only allow reporting agent/tutor/vendor
    const role = (otherLabel.role || "").toLowerCase();
    const type =
      role === "agent" ? "agent" : role === "tutor" ? "tutor" : role === "vendor" ? "vendor" : "";

    if (!type) return;

    setReportType(type);
    setReportReason("");
    setReportOpen(true);
  };

  const submitReportNow = async () => {
    const otherId = activeOtherUser?.id;
    if (!fbUser?.uid || !otherId || !activeConv?.id) return;

    await submitReport({
      reporterId: fbUser.uid,
      againstUserId: otherId,
      conversationId: activeConv.id,
      reason: reportReason,
      type: reportType,
    });

    setReportOpen(false);
  };

  if (!fbUser?.uid) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Please log in to use messaging.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: conversation list */}
        <Card className="md:col-span-4 overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversations
            </CardTitle>
            {isMeStudent && !isMePremium && (
              <p className="text-xs text-muted-foreground">
                Free tier limits reset monthly. Upgrade: ${settings?.premium_student_price_usd || 19}/year.
              </p>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="max-h-[70vh] overflow-auto">
              {conversations.map((c) => {
                const other = c.other || {};
                const name = other.full_name || other.email || "User";
                const role = c.participant_roles?.[other.id] || other.user_type || "";
                const cat = c.category || "";
                const active = activeConv?.id === c.id;

                return (
                  <button
                    key={c.id}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${active ? "bg-gray-100" : ""}`}
                    onClick={() => setActiveConv(c)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{name}</div>
                      <div className="flex items-center gap-2">
                        {role ? <Badge variant="secondary">{String(role).toUpperCase()}</Badge> : null}
                        {cat ? <Badge variant="outline">{cat}</Badge> : null}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.last_message_text || "No messages yet"}
                    </div>
                  </button>
                );
              })}

              {!conversations.length && (
                <div className="p-6 text-sm text-muted-foreground">
                  No conversations yet. Start one from Directory, My Agent, or Support.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: active chat */}
        <Card className="md:col-span-8 overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="truncate">{otherLabel.name}</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {otherLabel.role ? `Role: ${otherLabel.role}` : " "}
                </div>
              </div>

              {/* Report button (only for agent/tutor/vendor) */}
              {["agent", "tutor", "vendor"].includes((otherLabel.role || "").toLowerCase()) && (
                <Button variant="outline" className="gap-2" onClick={openReport}>
                  <ShieldAlert className="w-4 h-4" />
                  Report
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0 flex flex-col h-[70vh]">
            <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map((m) => {
                const mine = m.sender_id === fbUser.uid;
                const d = tsToDate(m.created_at);
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-blue-600 text-white" : "bg-white border"}`}>
                      <div className="whitespace-pre-wrap break-words">{m.text}</div>
                      <div className={`mt-1 text-[11px] ${mine ? "text-blue-100" : "text-muted-foreground"}`}>
                        {fmtTime(d)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!activeConv?.id && (
                <div className="text-sm text-muted-foreground">
                  Select a conversation from the left, or open one from Directory.
                </div>
              )}
            </div>

            <div className="border-t p-3 flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                disabled={!activeConv?.id}
              />
              <Button onClick={onSend} disabled={!activeConv?.id} className="gap-2">
                <Send className="w-4 h-4" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agreement banner (before first convo) */}
      <Dialog open={agreementOpen} onOpenChange={setAgreementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Messaging Agreement</DialogTitle>
            <DialogDescription>
              Before your first conversation:
              <div className="mt-3 space-y-2 text-sm">
                <div>• Keep important terms inside chat for traceability.</div>
                <div>• GreenPass is not liable for external payments.</div>
                <div className="text-muted-foreground">
                  Reporting & investigations use platform chat logs only. If a transaction happens fully outside the platform with no trace,
                  reports may be disregarded.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAgreementOpen(false)}>Cancel</Button>
            <Button onClick={onAcceptAgreement}>I Agree</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade prompt */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade required</DialogTitle>
            <DialogDescription>
              {limitError || "You hit your free tier limit."}
              <div className="mt-2 text-sm">
                Upgrade to Student Premium for <b>${settings?.premium_student_price_usd || 19}/year</b> to continue messaging.
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                If you don’t upgrade, you can message again after your next monthly reset.
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>No thanks</Button>
            <Button onClick={() => navigate("/checkout?plan=student_premium_yearly")}>Upgrade</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {reportType}</DialogTitle>
            <DialogDescription>
              Reports are reviewed using platform chat logs only. If the issue is based on external payments with no chat trace,
              the report may be disregarded.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-medium">Reason</div>
            <Input value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Describe what happened…" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={submitReportNow} disabled={!reportReason.trim()}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
