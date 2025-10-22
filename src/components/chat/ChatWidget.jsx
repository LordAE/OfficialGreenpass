// src/components/chat/ChatWidget.jsx
import React from "react";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { InvokeLLM } from "@/api/integrations";
// If you use entity helpers for logged-in persistence:
import { Message, Conversation, User as UserEntity } from "@/api/entities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MessageSquare, Send, Phone } from "lucide-react";

/* ---------- helpers ---------- */
const digitsOnly = (val) => String(val || "").replace(/[^\d]/g, "");

function WhatsAppIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="currentColor">
      <path d="M19.1 17.1c-.3-.1-1-.5-1.2-.6-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.1-.3.1-.6 0-1.8-.7-3-2.5-3.1-2.6-.1-.2-.1-.4 0-.5.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2 0-.5-.3-.4-.5-.4h-.4c-.1 0-.5.1-.7.3-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.4.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.9-.8 2.1-1.6.2-.8.2-1.4.1-1.6-.1-.2-.3-.2-.6-.3z"/>
      <path d="M26.6 5.4A13.1 13.1 0 0 0 5.4 26.6L4 28a.8.8 0 0 0 .6 1.4H6a13.1 13.1 0 1 0 20.6-24zM16 27.4a11.3 11.3 0 1 1 0-22.6 11.3 11.3 0 0 1 0 22.6z"/>
    </svg>
  );
}

function SupportOptions({ whatsappLink, zaloLink, className = "" }) {
  if (!whatsappLink && !zaloLink) return null;
  return (
    <div className={`mt-2 border-t border-gray-200 pt-2 ${className}`}>
      <p className="text-xs text-gray-500 mb-2">Prefer another support channel?</p>
      <div className="grid grid-cols-2 gap-2">
        {whatsappLink && (
          <a href={whatsappLink} target="_blank" rel="noreferrer" className="block">
            <Button variant="secondary" className="w-full justify-center gap-2">
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp
            </Button>
          </a>
        )}
        {zaloLink && (
          <a href={zaloLink} target="_blank" rel="noreferrer" className="block">
            <Button variant="secondary" className="w-full justify-center gap-2">
              <Phone className="h-4 w-4" />
              Zalo
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

/* ---------- main widget ---------- */
export default function ChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [newMessage, setNewMessage] = React.useState("");
  const [messages, setMessages] = React.useState([]);
  const [conversation, setConversation] = React.useState(null);
  const [currentUser, setCurrentUser] = React.useState(null);

  // Settings
  const [chatSettings, setChatSettings] = React.useState(null);

  const listRef = React.useRef(null);
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  // auth listener
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
      } else {
        try {
          const me = await UserEntity.me?.();
          setCurrentUser(me || { id: fbUser.uid });
        } catch {
          setCurrentUser({ id: fbUser.uid });
        }
      }
    });
    return () => unsub();
  }, []);

  // load chat settings from Firestore
  React.useEffect(() => {
    (async () => {
      try {
        // Try direct doc first (works regardless of entities mapping)
        const snap = await getDoc(doc(db, "chatSettings", "SINGLETON"));
        if (snap.exists()) {
          setChatSettings(snap.data());
          return;
        }
      } catch {}
      // fallback via entity list (if configured)
      try {
        const list = await (await import("@/api/entities")).ChatSettings?.list?.();
        if (Array.isArray(list) && list.length) setChatSettings(list[0]);
      } catch {}
      if (!chatSettings) setChatSettings({ whatsapp_number: "", zalo_number: "" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // create or load conversation (guest if not logged in)
  React.useEffect(() => {
    (async () => {
      if (!currentUser) {
        // guest mode: keep local
        let gid = localStorage.getItem("gp_guest_conv");
        if (!gid) {
          gid = String(Date.now());
          localStorage.setItem("gp_guest_conv", gid);
        }
        setConversation({ id: `guest-${gid}`, guest: true });
        try {
          const saved = JSON.parse(localStorage.getItem("gp_guest_msgs") || "[]");
          if (Array.isArray(saved)) setMessages(saved);
        } catch {}
        return;
      }

      // logged-in: try to find the latest conversation or create one
      try {
        let conv = await Conversation.mostRecent?.();
        if (!conv) {
          conv = await Conversation.create?.({ user_id: currentUser.id, source: "widget" });
        }
        setConversation(conv || null);

        if (conv) {
          const history = (await Message.filter({ conversation_id: conv.id }, "created_date")) || [];
          setMessages(history);
          scrollToBottom();
        }
      } catch {
        // fallback to guest if entities API fails for some reason
        let gid = localStorage.getItem("gp_guest_conv");
        if (!gid) {
          gid = String(Date.now());
          localStorage.setItem("gp_guest_conv", gid);
        }
        setConversation({ id: `guest-${gid}`, guest: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const whatsappDigits = digitsOnly(chatSettings?.whatsapp_number);
  const zaloDigits = digitsOnly(chatSettings?.zalo_number);
  const whatsappDefault = chatSettings?.whatsapp_default_message || "";

  const whatsappLink = whatsappDigits
    ? `https://wa.me/${whatsappDigits}${whatsappDefault ? `?text=${encodeURIComponent(whatsappDefault)}` : ""}`
    : null;
  const zaloLink = zaloDigits ? `https://zalo.me/${zaloDigits}` : null;

  const handleSendMessage = async () => {
    if (loading) return;
    const text = newMessage.trim();
    if (!text || !conversation) return;

    setNewMessage("");

    const provisionalId = "local-" + Date.now();
    const optimisticUserMsg = {
      id: provisionalId,
      sender: "user",
      text,
      created_date: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    scrollToBottom();
    setLoading(true);

    try {
      // ----- Guest mode: no Firestore -----
      if (conversation?.guest) {
        const history = [...messages, optimisticUserMsg];
        const chatMessages = history.map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

        const system =
          "You are GreenPass AI support. Be concise, helpful, and friendly. If asked about personal data or sensitive issues, advise to contact support.";

        const ai = await InvokeLLM({ messages: chatMessages, system });
        const aiText = ai?.choices?.[0]?.message?.content?.trim() || "Thanks for your message!";
        const aiMsg = {
          id: "local-ai-" + Date.now(),
          sender: "ai",
          text: aiText,
          created_date: new Date().toISOString(),
        };

        setMessages((prev) => {
          const next = [
            ...prev.filter((m) => m.id !== provisionalId),
            optimisticUserMsg,
            aiMsg,
          ];
          try {
            localStorage.setItem("gp_guest_msgs", JSON.stringify(next));
          } catch {}
          return next;
        });
        scrollToBottom();
        return;
      }

      // ----- Logged-in: persist to backend collections -----
      const createdUser = await Message.create({
        conversation_id: conversation.id,
        sender: "user",
        text,
      });

      const history =
        (await Message.filter(
          { conversation_id: conversation.id },
          "created_date"
        )) || [];

      const chatMessages = history.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const system =
        "You are GreenPass AI support. Be concise, helpful, and friendly. If asked about personal data or sensitive issues, advise to contact support.";

      const ai = await InvokeLLM({ messages: chatMessages, system });
      const aiText =
        ai?.choices?.[0]?.message?.content?.trim() ||
        "Thanks for your message! Our team will get back to you shortly.";

      const createdAI = await Message.create({
        conversation_id: conversation.id,
        sender: "ai",
        text: aiText,
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== provisionalId),
        createdUser || optimisticUserMsg,
        createdAI,
      ]);
      scrollToBottom();
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === provisionalId ? { ...m, error: true } : m))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full px-4 py-3 bg-green-600 text-white shadow-lg hover:bg-green-700 transition"
          aria-label="Open support chat"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="hidden sm:inline">Chat</span>
        </button>
      )}

      {/* panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
            <div className="font-semibold text-gray-800">GreenPass Support</div>
            <button
              className="p-1 rounded hover:bg-gray-100"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* messages list */}
          <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="p-3 rounded-md bg-green-50 border border-green-100 text-sm text-green-800">
                Hi! I’m GreenPass AI. Ask me anything — or use another support channel below.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.sender === "user"
                      ? "ml-auto bg-green-600 text-white"
                      : "mr-auto bg-gray-100 text-gray-800"
                  } ${m.error ? "ring-2 ring-red-400" : ""}`}
                >
                  {m.text}
                </div>
              ))
            )}

            {/* inline support choices */}
            <SupportOptions
              whatsappLink={whatsappLink}
              zaloLink={zaloLink}
            />
          </div>

          {/* composer */}
          <div className="border-t bg-white p-2">
            <div className="flex items-center gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
              />
              <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {/* bottom support choices for mobile spacing (optional) */}
            {/* <SupportOptions whatsappLink={whatsappLink} zaloLink={zaloLink} className="px-1 mt-2" /> */}
          </div>
        </div>
      )}
    </>
  );
}
