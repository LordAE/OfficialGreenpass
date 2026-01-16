// src/pages/Messages.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare } from "lucide-react";

import {
  ensureConversation,
  getUserDoc,
  listMessages,
  listMyConversations,
  normalizeRole,
  sendMessage,
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

export default function Messages() {
  const location = useLocation();
  const [params] = useSearchParams();

  // Directory passes these
  const to = params.get("to") || "";
  const toRole = normalizeRole(params.get("role") || "");

  const [me, setMe] = useState(null);
  const [meDoc, setMeDoc] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);

  // Cache user docs for peers so inbox can show names
  const [peerCache, setPeerCache] = useState({}); // { uid: userDoc }

  const [peerDoc, setPeerDoc] = useState(null);

  const [msgsLoading, setMsgsLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const [text, setText] = useState("");
  const endRef = useRef(null);

  const myRole = useMemo(() => {
    return normalizeRole(meDoc?.user_type || meDoc?.selected_role || meDoc?.role || "user");
  }, [meDoc]);

  const safeSetPeerCache = useCallback((uid, doc) => {
    if (!uid) return;
    setPeerCache((prev) => {
      if (prev[uid]) return prev;
      return { ...prev, [uid]: doc };
    });
  }, []);

  const refreshConversations = useCallback(
    async (uid) => {
      try {
        setErrorText("");
        const list = await listMyConversations(uid);
        setConversations(list || []);
        return list || [];
      } catch (e) {
        console.error("refreshConversations error:", e);
        setErrorText(e?.message || "Failed to load conversations.");
        setConversations([]);
        return [];
      }
    },
    []
  );

  // Auth bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setMe(u || null);

      if (!u) {
        setMeDoc(null);
        setSelectedConv(null);
        setConversations([]);
        setPeerDoc(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        const doc = await getUserDoc(u.uid);
        setMeDoc(doc || null);
      } catch (e) {
        console.error("getUserDoc error:", e);
        setMeDoc(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Load conversations once logged in
  useEffect(() => {
    if (!me?.uid) return;
    (async () => {
      const list = await refreshConversations(me.uid);

      // Warm peer cache so inbox has names instead of just IDs
      const others = new Set();
      for (const c of list) {
        const parts = Array.isArray(c?.participants) ? c.participants : [];
        const otherId = parts.find((x) => x && x !== me.uid);
        if (otherId) others.add(otherId);
      }

      const ids = Array.from(others).filter((x) => x !== "support");
      if (ids.length) {
        await Promise.all(
          ids.map(async (uid) => {
            try {
              const udoc = await getUserDoc(uid);
              if (udoc) safeSetPeerCache(uid, udoc);
            } catch (e) {
              // ignore
            }
          })
        );
      }
    })();
  }, [me?.uid, refreshConversations, safeSetPeerCache]);

  /**
   * ✅ FIRST-TIME CHAT HANDLING:
   * If opened with ?to=... we ensure the conversation exists,
   * refresh inbox immediately, then auto-select it.
   */
  useEffect(() => {
    if (!me?.uid || !meDoc) return;
    if (!to) return;

    (async () => {
      try {
        setErrorText("");

        // ✅ Enforce: student/user cannot message schools (route to support convo)
        if ((myRole === "user" || myRole === "student") && toRole === "school") {
          const conv = await ensureConversation({
            meId: me.uid,
            meRole: myRole,
            targetId: "support",
            targetRole: "support",
            source: "blocked_school_message",
          });

          // Refresh inbox so the new convo appears immediately
          const list = await refreshConversations(me.uid);
          const latest = list.find((c) => c.id === conv.id) || conv;
          setSelectedConv(latest);

          setPeerDoc({ id: "support", full_name: "Support" });
          safeSetPeerCache("support", { id: "support", full_name: "Support" });
          return;
        }

        // Normal direct convo
        const conv = await ensureConversation({
          meId: me.uid,
          meRole: myRole,
          targetId: to,
          targetRole: toRole || "support",
          source: location?.state?.source || "directory",
        });

        // Refresh inbox so convo is listed even before first message
        const list = await refreshConversations(me.uid);
        const latest = list.find((c) => c.id === conv.id) || conv;
        setSelectedConv(latest);

        // Load peer doc right away for header
        if (to && to !== "support") {
          const u = await getUserDoc(to);
          if (u) {
            setPeerDoc(u);
            safeSetPeerCache(to, u);
          }
        } else {
          setPeerDoc({ id: "support", full_name: "Support" });
          safeSetPeerCache("support", { id: "support", full_name: "Support" });
        }
      } catch (e) {
        console.error("ensure/open conversation error:", e);
        setErrorText(e?.message || "Failed to open conversation.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.uid, meDoc, to, toRole, myRole]);

  // When conversation selected: load peer + messages
  useEffect(() => {
    if (!me?.uid || !selectedConv?.id) return;

    (async () => {
      setMsgsLoading(true);
      try {
        setErrorText("");

        // Determine peer
        const participants = Array.isArray(selectedConv?.participants) ? selectedConv.participants : [];
        const otherId = participants.find((x) => x && x !== me.uid) || "support";

        if (otherId === "support") {
          const support = { id: "support", full_name: "Support" };
          setPeerDoc(support);
          safeSetPeerCache("support", support);
        } else if (peerCache[otherId]) {
          setPeerDoc(peerCache[otherId]);
        } else {
          const u = await getUserDoc(otherId);
          if (u) {
            setPeerDoc(u);
            safeSetPeerCache(otherId, u);
          } else {
            setPeerDoc({ id: otherId, full_name: "Unknown" });
          }
        }

        // Load messages
        const list = await listMessages(selectedConv.id);
        setMessages(list || []);
      } catch (e) {
        console.error("load messages error:", e);
        setErrorText(e?.message || "Failed to load messages.");
        setMessages([]);
      } finally {
        setMsgsLoading(false);
      }
    })();
  }, [me?.uid, selectedConv?.id, peerCache, safeSetPeerCache]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, msgsLoading]);

  const handlePickConversation = useCallback(async (conv) => {
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
        text: t,
      });

      // Refresh messages + inbox ordering/preview
      const list = await listMessages(selectedConv.id);
      setMessages(list || []);

      const updated = await refreshConversations(me.uid);
      const latest = updated.find((c) => c.id === selectedConv.id);
      if (latest) setSelectedConv(latest);
    } catch (e) {
      console.error("send message error:", e);
      setErrorText(e?.message || "Failed to send message.");
    }
  }, [me?.uid, refreshConversations, selectedConv, text]);

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
          <CardContent className="text-sm text-gray-600">
            Please log in to use messaging.
          </CardContent>
        </Card>
      </div>
    );
  }

  const peerName = displayName(peerDoc);
  const peerAvatar = avatarUrl(peerDoc);

  return (
    <div className="p-4 md:p-6">
      {errorText ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: conversations */}
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
                  const participants = Array.isArray(c.participants) ? c.participants : [];
                  const otherId = participants.find((x) => x && x !== me.uid) || "support";

                  const otherDoc =
                    otherId === "support"
                      ? { id: "support", full_name: "Support" }
                      : peerCache[otherId];

                  const title = displayName(otherDoc) || (otherId === "support" ? "Support" : `Chat (${otherId.slice(0, 6)}…)`);
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
            <div className="flex items-center gap-3">
              <img
                src={peerAvatar}
                alt={peerName}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <div className="font-semibold text-gray-900">{peerName}</div>
                <div className="text-xs text-gray-600 capitalize">
                  {normalizeRole(selectedConv?.roles?.[peerDoc?.id] || toRole || "support")}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-auto p-4 bg-white">
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
              disabled={!selectedConv}
            />
            <Button onClick={handleSend} disabled={!selectedConv || !text.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
