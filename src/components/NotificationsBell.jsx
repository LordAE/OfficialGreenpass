// src/components/NotificationsBell.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/firebase";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

/* ------------------------------------------------------------
 * Avatar helpers (image when available, initials fallback)
 * ---------------------------------------------------------- */
function getInitials(input) {
  const s = String(input || "").trim();
  if (!s) return "GP";
  const parts = s
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "GP";
  const a = parts[0]?.[0] || "G";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  return (a + (b || "P")).toUpperCase();
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function getNotifName(n) {
  return (
    pickFirst(n, [
      "actorName",
      "senderName",
      "fromName",
      "displayName",
      "userName",
      "authorName",
      "schoolName",
      "name",
    ]) ||
    pickFirst(n?.actor, ["name", "displayName"]) ||
    pickFirst(n?.sender, ["name", "displayName"]) ||
    "GreenPass"
  );
}

function getNotifPhoto(n) {
  return (
    pickFirst(n, [
      "photoURL",
      "photoUrl",
      "avatarUrl",
      "avatarURL",
      "senderPhoto",
      "senderAvatar",
      "actorPhoto",
      "actorAvatar",
      "userPhoto",
      "userAvatar",
      "authorPhoto",
      "authorAvatar",
      "profilePhoto",
      "image",
      "iconUrl",
    ]) ||
    pickFirst(n?.actor, ["photoURL", "photoUrl", "avatarUrl"]) ||
    pickFirst(n?.sender, ["photoURL", "photoUrl", "avatarUrl"]) ||
    ""
  );
}

function NotificationAvatar({ name, src, className = "" }) {
  const [broken, setBroken] = React.useState(false);
  const initials = React.useMemo(() => getInitials(name), [name]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={cn("w-10 h-10 rounded-full object-cover shrink-0", className)}
        onError={() => setBroken(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={cn(
        "w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0",
        className
      )}
      aria-label={name ? `Avatar ${name}` : "Avatar"}
      title={name || ""}
    >
      {initials}
    </div>
  );
}

/* click-outside */
function useClickOutside(ref, handler, when = true) {
  React.useEffect(() => {
    if (!when) return;
    const onDown = (e) => {
      const el = ref?.current;
      if (!el) return;
      if (el === e.target || el.contains(e.target)) return;
      handler?.(e);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler, when]);
}

export default function NotificationsBell({
  currentUser,
  /**
   * Optional: if a notification has no link, we will NOT navigate to a "notifications page".
   * Instead, we simply mark it read and keep the panel behavior (Facebook-style).
   *
   * You can still pass createPageUrl if you want the "See all" button to route,
   * but by default we keep everything inside this component.
   */
  // Kept for backward compatibility (not used by default)
  createPageUrl,
  viewAllLabel = "Notifications",
  className = "",
}) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState("all"); // all | unread
  const [expanded, setExpanded] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const wrapRef = React.useRef(null);

  useClickOutside(
    wrapRef,
    () => {
      setOpen(false);
      setExpanded(false);
    },
    open
  );

  React.useEffect(() => {
    if (!currentUser?.id) {
      setItems([]);
      return;
    }

    const ref = collection(db, "users", currentUser.id, "notifications");
    const qx = query(ref, orderBy("createdAt", "desc"), limit(20));

    const unsub = onSnapshot(
      qx,
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("[NotificationsBell] snapshot error:", err)
    );

    return () => unsub();
  }, [currentUser?.id]);

  const unreadCount = React.useMemo(
    () => items.filter((n) => n?.seen === false).length,
    [items]
  );

  const markSeen = React.useCallback(
    async (notifId) => {
      if (!currentUser?.id || !notifId) return;
      try {
        await updateDoc(doc(db, "users", currentUser.id, "notifications", notifId), {
          seen: true,
          readAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("[NotificationsBell] markSeen failed:", e);
      }
    },
    [currentUser?.id]
  );

  const openItem = React.useCallback(
    async (n) => {
      if (!n) return;
      await markSeen(n.id);

      const link = String(n.link || n.url || "").trim();
      if (link) {
        setOpen(false);
        setExpanded(false);
        return navigate(link);
      }
      // ✅ No fallback route page. Keep it Facebook-style.
    },
    [markSeen, navigate]
  );

  const markAllSeen = React.useCallback(async () => {
    const unseen = items.filter((n) => n?.seen === false);
    await Promise.all(unseen.map((n) => markSeen(n.id)));
  }, [items, markSeen]);

  const seeAllInPanel = React.useCallback(() => {
    // Facebook-style: open a larger panel instead of routing.
    setExpanded(true);
  }, []);

  const filtered = React.useMemo(() => {
    if (tab === "unread") return items.filter((n) => n?.seen === false);
    return items;
  }, [items, tab]);

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-full transition",
          open
            ? "bg-green-100 text-green-700 ring-1 ring-green-200"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        )}
        aria-label="Notifications"
        title="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.12 }}
            role="menu"
            className={cn(
              // ✅ Mobile: fixed, centered panel; Desktop: dropdown (or fixed when expanded)
              "fixed inset-x-0 top-14 z-[9999] px-3",
              expanded
                ? "sm:fixed sm:top-14 sm:right-4 sm:left-auto sm:px-0"
                : "sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-2 sm:px-0"
            )}
          >
            <div
              className={cn(
                "mx-auto w-full max-w-[420px] sm:mx-0 sm:w-[380px] rounded-2xl bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 overflow-hidden"
              )}
            >
            <div className="p-3 flex items-center justify-between">
              <div className="text-base font-bold text-gray-900">Notifications</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllSeen}
                  className="text-xs font-semibold text-green-700 hover:text-green-800 px-2 py-1 rounded-lg hover:bg-green-50"
                >
                  Mark all as read
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setExpanded(false);
                  }}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Tabs (All / Unread) */}
            <div className="px-3 pb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("all")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-semibold",
                  tab === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTab("unread")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-semibold",
                  tab === "unread"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                Unread
              </button>

              <div className="ml-auto">
                <button
                  type="button"
                  onClick={seeAllInPanel}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  See all
                </button>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div
              className={cn(
                "overflow-y-auto",
                expanded ? "max-h-[72vh]" : "max-h-[420px]"
              )}
            >
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">No notifications yet.</div>
              ) : (
                <div className="p-2 space-y-1">
                  {filtered.map((n) => {
                    const title = String(n.title || "").trim() || "Notification";
                    const body = String(n.body || "").trim();
                    const isUnread = n.seen === false;
                    const name = getNotifName(n);
                    const photo = getNotifPhoto(n);

                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => openItem(n)}
                        className={cn(
                          "w-full text-left rounded-2xl px-3 py-3 transition",
                          isUnread ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <NotificationAvatar name={name} src={photo} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {title}
                            </div>
                            {body ? (
                              <div className="text-sm text-gray-600 line-clamp-2 mt-0.5">{body}</div>
                            ) : null}
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            {isUnread ? <div className="h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom "See previous" like FB (UI only) */}
            <div className="p-3 border-t bg-white">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-800 py-2"
              >
                See previous notifications
              </button>
            </div>
                      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
