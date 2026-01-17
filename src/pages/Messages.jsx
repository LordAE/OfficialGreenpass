// src/pages/Messages.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare } from "lucide-react";

import {
  ensureConversation,
  getUserDoc,
  resolveUserRole,
  normalizeRole,
  sendMessage,
  listenToMessages,
  listenToMyConversations,
  createReport,
  acceptMessagingAgreement,
  MESSAGING_LIMITS,
} from "@/api/messaging";

function displayName(u) {
  return u?.full_name || u?.name || u?.displayName || u?.email || "Unknown";
}

function avatarUrl(u) {
  return (
    u?.profile_picture ||
    u?.photoURL ||
    "https://ui-avatars.com/api/?background=E5E7EB&color=111827&name=" +
      encodeURIComponent(displayName(u))
  );
}

function isSubInactiveForRole(userDoc) {
  const role = resolveUserRole(userDoc);
  if (!(role === "agent" || role === "tutor" || role === "school")) return false;

  // Use your real schema:
  if (userDoc?.subscription_active === true) return false;
  const s = String(userDoc?.subscription_status || "").toLowerCase().trim();
  return !(s === "active" || s === "trialing");
}

export default function Messages() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const to = params.get("to") || "";
  const toRole = normalizeRole(params.get("role") || "");

  const [me, setMe] = useState(null);
  const [meDoc, setMeDoc] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);

  const [peerCache, setPeerCache] = useState({});
  const [peerDoc, setPeerDoc] = useState(null);

  const [msgsLoading, setMsgsLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const [text, setText] = useState("");
  const endRef = useRef(null);

  const msgsUnsubRef = useRef(null);
  const convoUnsubRef = useRef(null);

  // ✅ SMART scroll (no jump on open)
  const listRef = useRef(null);
  const didOpenConvRef = useRef(false);
  const prevMsgCountRef = useRef(0);

  // Prompts
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState(null);

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const myRole = useMemo(() => resolveUserRole(meDoc), [meDoc]);

  const safeSetPeerCache = useCallback((uid, docu) => {
    if (!uid) return;
    setPeerCache((prev) => (prev[uid] ? prev : { ...prev, [uid]: docu }));
  }, []);

  // Auth bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setMe(u || null);

      if (!u) {
        if (msgsUnsubRef.current) msgsUnsubRef.current();
        msgsUnsubRef.current = null;
        if (convoUnsubRef.current) convoUnsubRef.current();
        convoUnsubRef.current = null;

        setMeDoc(null);
        setSelectedConv(null);
        setConversations([]);
        setPeerDoc(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        const docu = await getUserDoc(u.uid);
        setMeDoc(docu || null);
      } catch (e) {
        console.error("getUserDoc error:", e);
        setMeDoc(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Realtime inbox
  useEffect(() => {
    if (!me?.uid) return;

    if (convoUnsubRef.current) convoUnsubRef.current();

    convoUnsubRef.current = listenToMyConversations(me.uid, async (list, err) => {
      if (err) {
        setErrorText(err?.message || "Failed to listen to conversations.");
        setConversations([]);
        return;
      }

      setErrorText("");
      setConversations(list || []);

      // keep selected conversation fresh
      if (selectedConv?.id) {
        const updated = (list || []).find((c) => c.id === selectedConv.id);
        if (updated) setSelectedConv(updated);
      }

      // warm cache (names in inbox)
      const others = new Set();
      for (const c of list || []) {
        const parts = Array.isArray(c?.participants) ? c.participants : [];
        const otherId = parts.find((x) => x && x !== me.uid);
        if (otherId) others.add(otherId);
      }

      const ids = Array.from(others).filter((x) => x && x !== "support");
      if (ids.length) {
        await Promise.all(
          ids.map(async (uid) => {
            try {
              if (peerCache?.[uid]) return;
              const udoc = await getUserDoc(uid);
              if (udoc) safeSetPeerCache(uid, udoc);
            } catch {
              // ignore
            }
          })
        );
      }
    });

    return () => {
      if (convoUnsubRef.current) convoUnsubRef.current();
      convoUnsubRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.uid, selectedConv?.id, safeSetPeerCache]);

  // First-time open via ?to=
  useEffect(() => {
    if (!me?.uid || !meDoc) return;
    if (!to) return;

    (async () => {
      try {
        setErrorText("");

        const conv = await ensureConversation({
          meId: me.uid,
          meDoc,
          targetId: to,
          targetRole: toRole || "support",
          source: location?.state?.source || "directory",
        });

        setSelectedConv(conv);

        // Load peer
        const participants = Array.isArray(conv?.participants) ? conv.participants : [];
        const otherId = participants.find((x) => x && x !== me.uid) || "support";

        if (otherId === "support") {
          const support = { id: "support", full_name: "Support" };
          setPeerDoc(support);
          safeSetPeerCache("support", support);
        } else {
          const udoc = await getUserDoc(otherId);
          if (udoc) {
            setPeerDoc(udoc);
            safeSetPeerCache(otherId, udoc);
          }
        }
      } catch (e) {
        console.error("ensure/open conversation error:", e);

        if (e?.code === "LIMIT_REACHED") {
          setUpgradeInfo(e.details || null);
          setShowUpgrade(true);
          setErrorText("");
          return;
        }

        setErrorText(e?.message || "Failed to open conversation.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.uid, meDoc, to, toRole, myRole]);

  // Selected conversation -> realtime messages
  useEffect(() => {
    if (!me?.uid || !selectedConv?.id) return;

    // reset smart scroll on convo switch
    didOpenConvRef.current = false;
    prevMsgCountRef.current = 0;

    if (msgsUnsubRef.current) msgsUnsubRef.current();
    msgsUnsubRef.current = null;

    (async () => {
      setMsgsLoading(true);
      try {
        setErrorText("");

        const participants = Array.isArray(selectedConv?.participants) ? selectedConv.participants : [];
        const otherId = participants.find((x) => x && x !== me.uid) || "support";

        if (otherId === "support") {
          const support = { id: "support", full_name: "Support" };
          setPeerDoc(support);
          safeSetPeerCache("support", support);
        } else if (peerCache[otherId]) {
          setPeerDoc(peerCache[otherId]);
        } else {
          const udoc = await getUserDoc(otherId);
          if (udoc) {
            setPeerDoc(udoc);
            safeSetPeerCache(otherId, udoc);
          } else {
            setPeerDoc({ id: otherId, full_name: "Unknown" });
          }
        }

        msgsUnsubRef.current = listenToMessages(selectedConv.id, (msgs, err) => {
          if (err) {
            setErrorText(err?.message || "Failed to listen to messages.");
            setMessages([]);
            setMsgsLoading(false);
            return;
          }
          setMessages(msgs || []);
          setMsgsLoading(false);
        });
      } catch (e) {
        console.error("load messages error:", e);
        setErrorText(e?.message || "Failed to load messages.");
        setMessages([]);
        setMsgsLoading(false);
      }
    })();

    return () => {
      if (msgsUnsubRef.current) msgsUnsubRef.current();
      msgsUnsubRef.current = null;
    };
  }, [me?.uid, selectedConv?.id, peerCache, safeSetPeerCache]);

  // ✅ Smart auto-scroll:
  // - DO NOT scroll when opening a conversation
  // - Only scroll when NEW messages arrive AND user already near bottom
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const currentCount = messages?.length || 0;

    // first update after opening: skip
    if (!didOpenConvRef.current) {
      didOpenConvRef.current = true;
      prevMsgCountRef.current = currentCount;
      return;
    }

    const added = currentCount > prevMsgCountRef.current;
    prevMsgCountRef.current = currentCount;
    if (!added) return;

    const threshold = 140;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < threshold;

    if (isNearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages?.length]);

  const handlePickConversation = useCallback((conv) => {
    setSelectedConv(conv);
  }, []);

  const handleSend = useCallback(async () => {
    if (!me?.uid || !selectedConv?.id) return;

    const t = text.trim();
    if (!t) return;

    try {
      setErrorText("");
      setText("");

      await sendMessage({
        conversationId: selectedConv.id,
        conversationDoc: selectedConv,
        senderId: me.uid,
        senderDoc: meDoc,
        text: t,
      });
    } catch (e) {
      console.error("send message error:", e);

      if (e?.code === "SUBSCRIPTION_REQUIRED") {
        setErrorText("Messaging is locked. Please activate your subscription to continue.");
        return;
      }

      if (e?.code === "WAIT_FOR_REPLY") {
        setErrorText(
          `You can send up to ${MESSAGING_LIMITS.PRO_MAX_OUTBOUND_UNTIL_REPLY} messages until the other user replies.`
        );
        return;
      }

      setErrorText(e?.message || "Failed to send message.");
    }
  }, [me?.uid, selectedConv, text, meDoc]);

  // Agreement banner: uses timestamp in your doc
  const showAgreement =
    myRole === "student" &&
    meDoc &&
    !meDoc?.messaging_agreement_accepted_at;

  const handleAcceptAgreement = useCallback(async () => {
    if (!me?.uid) return;
    try {
      await acceptMessagingAgreement(me.uid);
      const updated = await getUserDoc(me.uid);
      setMeDoc(updated || meDoc);
    } catch (e) {
      setErrorText(e?.message || "Failed to accept agreement.");
    }
  }, [me?.uid, meDoc]);

  // Subscription lock state for agent/tutor/school
  const locked = isSubInactiveForRole(meDoc);

  const peerName = displayName(peerDoc);
  const peerAvatar = avatarUrl(peerDoc);

  const participants = Array.isArray(selectedConv?.participants) ? selectedConv.participants : [];
  const otherId = participants.find((x) => x && x !== me?.uid) || "support";
  const otherRole = normalizeRole(selectedConv?.roles?.[otherId] || toRole || "support");

  const canReport =
    myRole === "student" &&
    (otherRole === "agent" || otherRole === "tutor" || otherRole === "vendor") &&
    selectedConv?.id;

  const handleSubmitReport = useCallback(async () => {
    if (!me?.uid || !selectedConv?.id) return;

    try {
      await createReport({
        reporterId: me.uid,
        reporterDoc: meDoc,
        conversationId: selectedConv.id,
        reportedUserId: otherId,
        reportedRole: otherRole,
        reason: reportReason,
      });

      setShowReport(false);
      setReportReason("");
      setErrorText("Report submitted. Our team will review platform chat logs only.");
    } catch (e) {
      setErrorText(e?.message || "Failed to submit report.");
    }
  }, [me?.uid, meDoc, selectedConv?.id, otherId, otherRole, reportReason]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!me) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">Please log in to use messaging.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {errorText ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {/* ✅ Agreement banner */}
      {showAgreement ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <div className="font-semibold mb-1">Before you start messaging</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Keep important terms inside chat for traceability.</li>
            <li>GreenPass is not liable for external payments.</li>
            <li>If transactions happen outside the platform with no trace, reports may be disregarded.</li>
          </ul>
          <div className="mt-3">
            <Button onClick={handleAcceptAgreement}>I Agree</Button>
          </div>
        </div>
      ) : null}

      {/* ✅ Upgrade prompt */}
      {showUpgrade ? (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
          <div className="font-semibold mb-1">You reached your free messaging limit</div>
          <div className="mb-2">You can start only limited new conversations per month on the free tier.</div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/pricing")}>Upgrade ($19/year)</Button>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>
              Not now
            </Button>
          </div>
          {upgradeInfo?.bucket ? (
            <div className="mt-2 text-xs text-blue-800">
              Bucket: {upgradeInfo.bucket}, Month: {upgradeInfo.key}, Limit: {upgradeInfo.limit}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ✅ Subscription locked */}
      {locked ? (
        <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800">
          <div className="font-semibold mb-1">Messaging is locked</div>
          <div className="mb-2">Your subscription is inactive/pending. Activate it to use messaging.</div>
          <Button onClick={() => navigate("/pricing")}>Go to Payment</Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: inbox */}
        <Card className="md:col-span-4 h-[75vh] overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Inbox
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 h-full overflow-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">No conversations yet.</div>
            ) : (
              <div className="divide-y">
                {conversations.map((c) => {
                  const parts = Array.isArray(c.participants) ? c.participants : [];
                  const oid = parts.find((x) => x && x !== me.uid) || "support";

                  const oDoc = oid === "support" ? { id: "support", full_name: "Support" } : peerCache[oid];
                  const title = displayName(oDoc) || (oid === "support" ? "Support" : `Chat (${oid.slice(0, 6)}…)`);
                  const isActive = selectedConv?.id === c.id;

                  return (
                    <button
                      key={c.id}
                      className={`w-full text-left p-4 hover:bg-gray-50 ${isActive ? "bg-gray-50" : ""}`}
                      onClick={() => handlePickConversation(c)}
                    >
                      <div className="font-semibold text-gray-900">{title}</div>
                      <div className="text-xs text-gray-600 line-clamp-1">
                        {c.last_message_text || "No messages yet"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: chat */}
        <Card className="md:col-span-8 h-[75vh] overflow-hidden flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={peerAvatar} alt={peerName} className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <div className="font-semibold text-gray-900">{peerName}</div>
                  <div className="text-xs text-gray-600 capitalize">{otherRole}</div>
                </div>
              </div>

              {canReport ? (
                <Button variant="outline" onClick={() => setShowReport(true)}>
                  Report
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent ref={listRef} className="flex-1 overflow-auto p-4 bg-white">
            {!selectedConv ? (
              <div className="text-sm text-gray-600">Select a conversation to start chatting.</div>
            ) : msgsLoading ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading messages…
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => {
                  const mine = m.sender_id === me.uid;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? "bg-black text-white" : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            )}
          </CardContent>

          <div className="border-t p-3 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={selectedConv ? "Type a message…" : "Select a conversation…"}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              disabled={!selectedConv || locked || showAgreement}
            />
            <Button onClick={handleSend} disabled={!selectedConv || locked || showAgreement || !text.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </Card>
      </div>

      {/* Report modal */}
      {showReport ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
            <div className="font-semibold text-gray-900 mb-1">Report {peerName}</div>
            <div className="text-xs text-gray-600 mb-3">
              Investigation uses platform chat logs only.
            </div>

            <textarea
              className="w-full h-28 border rounded-lg p-2 text-sm"
              placeholder="What happened? (optional)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReport(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitReport}>Submit report</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
