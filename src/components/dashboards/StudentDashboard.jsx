import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Globe,
  UserPlus,
  UserMinus,
  Send,
  Sparkles,
  ShieldCheck,
  Building2,
  GraduationCap,
  Users,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// 🔥 Firebase
import { db, auth } from "@/firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

/* -------------------- Small helpers -------------------- */
const toValidDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const timeAgo = (dt) => {
  const d = toValidDate(dt);
  if (!d) return "—";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  const w = Math.floor(days / 7);
  if (w < 4) return `${w}w`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo`;
  const y = Math.floor(days / 365);
  return `${y}y`;
};

const Avatar = ({ name = "User", role = "user" }) => {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  const roleIcon =
    role === "school" ? (
      <Building2 className="h-3.5 w-3.5" />
    ) : role === "tutor" ? (
      <GraduationCap className="h-3.5 w-3.5" />
    ) : role === "agent" ? (
      <Users className="h-3.5 w-3.5" />
    ) : (
      <ShieldCheck className="h-3.5 w-3.5" />
    );

  const roleColor =
    role === "school"
      ? "bg-blue-600"
      : role === "tutor"
      ? "bg-purple-600"
      : role === "agent"
      ? "bg-emerald-600"
      : "bg-gray-600";

  return (
    <div className="relative">
      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 text-white flex items-center justify-center font-semibold">
        {initials || "U"}
      </div>
      <div
        className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full ${roleColor} text-white flex items-center justify-center border-2 border-white`}
        title={role}
      >
        {roleIcon}
      </div>
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const cfg =
    role === "school"
      ? { label: "School", cls: "bg-blue-50 text-blue-700 border-blue-100" }
      : role === "tutor"
      ? { label: "Tutor", cls: "bg-purple-50 text-purple-700 border-purple-100" }
      : role === "agent"
      ? { label: "Agent", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" }
      : { label: "Verified", cls: "bg-gray-50 text-gray-700 border-gray-100" };

  return (
    <Badge variant="secondary" className={`border ${cfg.cls}`}>
      {cfg.label}
    </Badge>
  );
};

const StatPill = ({ children }) => (
  <span className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px] text-gray-600">
    {children}
  </span>
);

/* ✅ Real media viewer: multiple images/videos */
const MediaGallery = ({ media = [] }) => {
  const items = Array.isArray(media) ? media : [];
  if (!items.length) return null;

  const many = items.length > 1;

  return (
    <div className="px-4 pb-4">
      <div className={`grid gap-2 ${many ? "grid-cols-2" : "grid-cols-1"}`}>
        {items.slice(0, 4).map((m, idx) => {
          const type = String(m?.type || "").toLowerCase();
          const url = m?.url;
          if (!url) return null;

          if (type === "image") {
            return (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-2xl border bg-gray-100"
                title="Open image"
              >
                <img
                  src={url}
                  alt={m?.name || `image-${idx}`}
                  className="h-60 w-full object-cover hover:scale-[1.01] transition"
                  loading="lazy"
                />
              </a>
            );
          }

          if (type === "video") {
            return (
              <div key={idx} className="overflow-hidden rounded-2xl border bg-black">
                <video src={url} controls preload="metadata" className="h-60 w-full object-cover" />
              </div>
            );
          }

          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex h-60 items-center justify-center rounded-2xl border bg-gray-50 text-sm text-gray-600"
            >
              Open media
            </a>
          );
        })}
      </div>

      {items.length > 4 ? (
        <div className="mt-2 text-xs text-gray-500">+{items.length - 4} more</div>
      ) : null}
    </div>
  );
};

/* -------------------- Post Card UI (NO like/comment/share) -------------------- */
function FeedPostCard({ post, isFollowing, onToggleFollow, onMessage }) {
  const canMessage = String(post.authorRole || "").toLowerCase() !== "school";

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar name={post.authorName} role={post.authorRole} />
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold text-gray-900 truncate">{post.authorName}</div>
                <RoleBadge role={String(post.authorRole || "").toLowerCase()} />

                {post.isFeatured ? (
                  <Badge className="bg-amber-500 text-white">
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Featured
                  </Badge>
                ) : null}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>{post.timeAgo}</span>
                <span>•</span>
                <Globe className="h-3.5 w-3.5" />
                <span>Public</span>
              </div>

              {post.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((t) => (
                    <StatPill key={t}>{t}</StatPill>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <Button variant="ghost" size="icon" className="text-gray-500" type="button">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        {post.text ? (
          <div className="px-4 pb-3 text-sm text-gray-800 whitespace-pre-line">{post.text}</div>
        ) : null}

        {/* Media */}
        <MediaGallery media={post.media || []} />

        {/* Follow + Message row */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              className="rounded-xl"
              variant={isFollowing ? "outline" : "default"}
              onClick={() => onToggleFollow(post.authorId)}
              type="button"
              disabled={!post.authorId}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="h-4 w-4 mr-2" /> Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" /> Follow
                </>
              )}
            </Button>

            <Button
              className="rounded-xl"
              variant="outline"
              disabled={!canMessage}
              onClick={() => onMessage(post)}
              type="button"
              title={
                canMessage
                  ? "Message this creator"
                  : "Students cannot message Schools. Please contact Admin/Advisor."
              }
            >
              <Send className="h-4 w-4 mr-2" />
              {canMessage ? "Message" : "Message (Not allowed)"}
            </Button>
          </div>

          {!canMessage ? (
            <div className="mt-2 text-xs text-gray-500">
              Schools can’t be messaged directly. Follow them to get updates.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------- REAL Student Dashboard (FB-style) -------------------- */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const me = auth?.currentUser;
  const myUid = me?.uid;

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState(() => new Set());

  // ✅ Live following set
  useEffect(() => {
    if (!myUid) return;

    const ref = collection(db, "users", myUid, "following");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const next = new Set();
        snap.forEach((d) => next.add(d.id));
        setFollowing(next);
      },
      () => {}
    );

    return () => unsub();
  }, [myUid]);

  // ✅ Live posts feed
  useEffect(() => {
    const qPosts = query(
      collection(db, "posts"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsub = onSnapshot(
      qPosts,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() || {};
          const created =
            data.createdAt || data.created_at || data.publishedAt || data.published_at || null;

          return {
            id: d.id,
            authorId: data.authorId || data.author_id || data.user_id || data.userId || "",
            authorRole: String(data.authorRole || data.author_role || "").toLowerCase(),
            authorName: data.authorName || data.author_name || "Creator",
            text: data.text || "",
            tags: Array.isArray(data.tags) ? data.tags : [],
            isFeatured: !!data.isFeatured,
            timeAgo: timeAgo(created),
            media: Array.isArray(data.media) ? data.media : [],
          };
        });

        setPosts(list);
        setLoading(false);
      },
      (err) => {
        console.error("community posts snapshot error", err);
        setPosts([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const isFollowing = (creatorId) => following.has(creatorId);

  const toggleFollow = async (creatorId) => {
    if (!myUid || !creatorId || creatorId === myUid) return;

    const followed = following.has(creatorId);
    const batch = writeBatch(db);

    const myFollowingRef = doc(db, "users", myUid, "following", creatorId);
    const creatorFollowersRef = doc(db, "users", creatorId, "followers", myUid);

    if (followed) {
      batch.delete(myFollowingRef);
      batch.delete(creatorFollowersRef);
    } else {
      batch.set(myFollowingRef, {
        followee_id: creatorId,
        follower_id: myUid,
        createdAt: serverTimestamp(),
      });
      batch.set(creatorFollowersRef, {
        follower_id: myUid,
        followee_id: creatorId,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  };

  const messageCreator = (post) => {
    // your messaging page can read ?with=<uid>
    if (!post?.authorId) return;
    navigate(`${createPageUrl("Messages")}?with=${encodeURIComponent(post.authorId)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-5">
        <div className="mx-auto max-w-[1800px] grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10">
          {/* LEFT */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-4 space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold text-gray-900">Discover</div>
                <div className="text-xs text-gray-600 mt-1">
                  Browse posts from Agents, Tutors, and Schools.
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start rounded-xl"
                    onClick={() => navigate(createPageUrl("Directory"))}
                  >
                    <Users className="h-4 w-4 mr-2 text-emerald-600" />
                    Directory
                  </Button>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 border p-3">
                  <div className="text-xs font-semibold text-gray-700">Following</div>
                  <div className="text-xs text-gray-600 mt-1">
                    You’re following <span className="font-semibold">{following.size}</span> creators
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold text-gray-900">How messaging works</div>
                <div className="text-xs text-gray-600 mt-2 leading-relaxed">
                  You can message <span className="font-semibold">Agents</span> and{" "}
                  <span className="font-semibold">Tutors</span>. For{" "}
                  <span className="font-semibold">Schools</span>, messaging is handled by Admin/Advisor —
                  follow schools to receive updates.
                </div>
              </div>
            </div>
          </div>

          {/* CENTER */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">Explore Updates</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Follow creators to get notified when they post next.
                    </div>
                  </div>
                  <Badge className="bg-zinc-900 text-white">All Posts</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="border bg-white">
                    Trending
                  </Badge>
                  <Badge variant="secondary" className="border bg-white">
                    Latest
                  </Badge>
                  <Badge variant="secondary" className="border bg-white">
                    Scholarships
                  </Badge>
                  <Badge variant="secondary" className="border bg-white">
                    IELTS
                  </Badge>
                  <Badge variant="secondary" className="border bg-white">
                    Admissions
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <Card className="rounded-2xl">
                <CardContent className="p-10 flex items-center justify-center text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading posts…
                </CardContent>
              </Card>
            ) : posts.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="p-6 text-sm text-gray-600">No community posts yet.</CardContent>
              </Card>
            ) : (
              posts.map((p) => (
                <FeedPostCard
                  key={p.id}
                  post={p}
                  isFollowing={isFollowing(p.authorId)}
                  onToggleFollow={toggleFollow}
                  onMessage={messageCreator}
                />
              ))
            )}
          </div>

          {/* RIGHT */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-4 space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Suggested to follow</div>
                  <Button variant="ghost" size="icon" className="text-gray-500" type="button">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                <div className="mt-3 text-xs text-gray-600">
                  (Optional) You can later load “Suggested” from Firestore.
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold text-gray-900">Tip</div>
                <div className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Follow creators you trust. You’ll automatically get a notification when they post next.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-only suggestions block (kept minimal) */}
        <div className="lg:hidden mt-6">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-gray-900">Tip</div>
              <div className="text-xs text-gray-600 mt-1">
                Follow creators to get notified when they post next.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
