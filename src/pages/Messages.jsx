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
  normalizeRole,
  sendMessage,
  listenToMessages,
  listenToMyConversations,
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

  // Optional: smart autoscroll (only scroll if user is near bottom)
  const listRef = useRef(null);

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

      // warm cache
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

  // First-time chat via ?to=
  useEffect(() => {
    if (!me?.uid || !meDoc) return;
    if (!to) return;

    (async () => {
      try {
        setErrorText("");

        if ((myRole === "user" || myRole === "student") && toRole === "school") {
          const conv = await ensureConversation({
            meId: me.uid,
            meRole: myRole,
            targetId: "support",
            targetRole: "support",
            source: "blocked_school_message",
          });

          setSelectedConv(conv);
          const support = { id: "support", full_name: "Support" };
          setPeerDoc(support);
          safeSetPeerCache("support", support);
          return;
        }

        const conv = await ensureConversation({
          meId: me.uid,
          meRole: myRole,
          targetId: to,
          targetRole: toRole || "support",
          source: location?.state?.source || "directory",
        });

        setSelectedConv(conv);

        if (to && to !== "support") {
          const udoc = await getUserDoc(to);
          if (udoc) {
            setPeerDoc(udoc);
            safeSetPeerCache(to, udoc);
          }
        } else {
          const support = { id: "support", full_name: "Support" };
          setPeerDoc(support);
          safeSetPeerCache("support", support);
        }
      } catch (e) {
        console.error("ensure/open conversation error:", e);
        setErrorText(e?.message || "Failed to open conversation.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.uid, meDoc, to, toRole, myRole]);

  // Selected conversation -> realtime messages
  useEffect(() => {
    if (!me?.uid || !selectedConv?.id) return;

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

  // ✅ Smart auto-scroll (only if user is near bottom)
const didOpenConvRef = useRef(false);
const prevMsgCountRef = useRef(0);

useEffect(() => {
  const el = listRef.current;
  if (!el) return;

  const currentCount = messages?.length || 0;

  // When you switch/open a conversation:
  // record count and SKIP auto-scroll once
  if (!didOpenConvRef.current) {
    didOpenConvRef.current = true;
    prevMsgCountRef.current = currentCount;
    return;
  }

  // Only react to NEW messages (count increased)
  const added = currentCount > prevMsgCountRef.current;
  prevMsgCountRef.current = currentCount;
  if (!added) return;

  // Only scroll if user is already near bottom
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
        text: t,
      });

      // ✅ No manual refresh. Listener updates automatically.
    } catch (e) {
      console.error("send message error:", e);
      setErrorText(e?.message || "Failed to send message.");
    }
  }, [me?.uid, selectedConv, text]);

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

                  const title =
                    displayName(otherDoc) ||
                    (otherId === "support" ? "Support" : `Chat (${otherId.slice(0, 6)}…)`);

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
              <img src={peerAvatar} alt={peerName} className="h-10 w-10 rounded-full object-cover" />
              <div>
                <div className="font-semibold text-gray-900">{peerName}</div>
                <div className="text-xs text-gray-600 capitalize">
                  {normalizeRole(selectedConv?.roles?.[peerDoc?.id] || toRole || "support")}
                </div>
              </div>
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
