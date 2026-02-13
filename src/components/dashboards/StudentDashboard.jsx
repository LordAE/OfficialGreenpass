import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Share2,
  Flag,
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

// 🌍 i18n
import { useTr } from "@/i18n/useTr";

// 🔥 Firebase
import { db, auth } from "@/firebase";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

// 💳 Subscription mode toggle
import { useSubscriptionMode } from "@/hooks/useSubscriptionMode";

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

const RoleBadge = ({ role, tr }) => {
  const cfg =
    role === "school"
      ? { label: tr("role_school", "School"), cls: "bg-blue-50 text-blue-700 border-blue-100" }
      : role === "tutor"
      ? { label: tr("role_tutor", "Tutor"), cls: "bg-purple-50 text-purple-700 border-purple-100" }
      : role === "agent"
      ? { label: tr("role_agent", "Agent"), cls: "bg-emerald-50 text-emerald-700 border-emerald-100" }
      : { label: tr("role_verified", "Verified"), cls: "bg-gray-50 text-gray-700 border-gray-100" };

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

// 🌍 Country helpers (same approach as Onboarding)
const flagUrlFromCode = (code) => {
  const cc = String(code || "").trim().toLowerCase();
  if (!cc) return "";
  return `https://flagcdn.com/w20/${cc}.png`;
};

/* ✅ Real media viewer: multiple images/videos */
const MediaGallery = ({ media = [], tr }) => {
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
                title={tr("open_image", "Open image")}
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
              {tr("open_media", "Open media")}
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
function FeedPostCard({ post, myUid, isFollowing, isRequested, onToggleFollow, onMessage, authorCountryByUid, tr }) {
  const canMessage = String(post.authorRole || "").toLowerCase() !== "school";

  // 🌍 Resolve author country (same logic as AgentDashboard)
  const authorId = post?.authorId;
  const authorCountry = authorId ? authorCountryByUid?.[authorId] : null;
  const resolvedCC = String(authorCountry?.country_code || post?.countryCode || "").trim();
  const resolvedCountryName = String(authorCountry?.country || post?.country || "").trim();

  const sharePost = async () => {
    try {
      const url = `${window.location.origin}${createPageUrl("PostDetails")}?id=${encodeURIComponent(post.id)}`;
      if (navigator.share) {
        await navigator.share({
          title: tr("share_post", "Share post"),
          text: tr("share_post_text", "Check out this post on GreenPass"),
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      alert(tr("link_copied", "Link copied"));
    } catch (e) {
      console.error("sharePost error", e);
      try {
        const url = `${window.location.origin}${createPageUrl("PostDetails")}?id=${encodeURIComponent(post.id)}`;
        window.prompt(tr("copy_link", "Copy link:"), url);
      } catch {
        alert(tr("share_failed", "Share failed"));
      }
    }
  };

  const reportPost = async () => {
    try {
      const reason = window.prompt(tr("report_reason_prompt", "Why are you reporting this post?"), "") || "";
      const cleanReason = reason.trim();
      if (!cleanReason) return;

      if (!myUid) {
        alert(tr("login_required", "Please log in first."));
        return;
      }

      await addDoc(collection(db, "post_reports"), {
        postId: post.id,
        reporterId: myUid,
        authorId: post.authorId || "",
        reason: cleanReason,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      alert(tr("report_submitted", "Report submitted"));
    } catch (e) {
      console.error("reportPost error", e);
      alert(tr("report_failed", "Report failed"));
    }
  };

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
                <RoleBadge role={String(post.authorRole || "").toLowerCase()} tr={tr} />

                {post.isFeatured ? (
                  <Badge className="bg-amber-500 text-white">
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {tr("featured", "Featured")}
                  </Badge>
                ) : null}
              </div>

              {(() => {
                const authorId =
                  post?.authorId ||
                  post?.author_id ||
                  post?.user_id ||
                  post?.userId ||
                  "";
                const authorCountry = authorId ? authorCountryByUid?.[authorId] : null;

                const postCC =
                  post?.country_code ||
                  post?.countryCode ||
                  post?.author_country_code ||
                  post?.authorCountryCode ||
                  post?.authorCC ||
                  "";
                const postCountryName =
                  post?.country ||
                  post?.country_name ||
                  post?.author_country ||
                  post?.authorCountry ||
                  "";

                const authorCC = (authorCountry?.country_code || postCC || "").toString();
                const authorCountryName = (authorCountry?.country || postCountryName || "").toString();

                return (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{post.timeAgo}</span>
                    <span>•</span>
                    {authorCC ? (
                      <>
                        <img
                          src={flagUrlFromCode(authorCC)}
                          alt={authorCC}
                          className="h-3.5 w-5 rounded-sm object-cover"
                          loading="lazy"
                        />
                        <span>{authorCountryName || authorCC.toUpperCase()}</span>
                      </>
                    ) : (
                      <>
                        <Globe className="h-3.5 w-3.5" />
                        <span>{tr("public", "Public")}</span>
                      </>
                    )}
                  </div>
                );
              })()}

              {post.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((t) => (
                    <StatPill key={t}>{t}</StatPill>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-500" type="button" aria-label="Post actions">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={sharePost}>
                <Share2 className="h-4 w-4 mr-2" />
                {tr("share", "Share")}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={reportPost}>
                <Flag className="h-4 w-4 mr-2" />
                {tr("report", "Report")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Body */}
        {post.text ? (
          <div className="px-4 pb-3 text-sm text-gray-800 whitespace-pre-line">{post.text}</div>
        ) : null}

        {/* Media */}
        <MediaGallery media={post.media || []} tr={tr} />

        {/* Follow + Message row */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              className="rounded-xl"
              variant={isFollowing || isRequested ? "outline" : "default"}
              onClick={() => onToggleFollow(post.authorId)}
              type="button"
              disabled={!post.authorId}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="h-4 w-4 mr-2" /> {tr("following", "Following")}
                </>
              ) : isRequested ? (
                <>
                  <UserPlus className="h-4 w-4 mr-2" /> {tr("requested", "Requested")}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" /> {tr("follow", "Follow")}
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
                  ? tr("message_this_creator", "Message this creator")
                  : tr(
                      "students_cannot_message_schools",
                      "Students cannot message Schools. Please contact Admin/Advisor."
                    )
              }
            >
              <Send className="h-4 w-4 mr-2" />
              {canMessage ? tr("message", "Message") : tr("message_not_allowed", "Message (Not allowed)")}
            </Button>
          </div>

          {!canMessage ? (
            <div className="mt-2 text-xs text-gray-500">
              {tr("schools_cant_be_messaged", "Schools can’t be messaged directly. Follow them to get updates.")}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------- REAL Student Dashboard (FB-style) -------------------- */
export default function StudentDashboard() {
  const { tr } = useTr("student_dashboard");
  const { subscriptionModeEnabled, loading: subscriptionLoading } = useSubscriptionMode();

  const navigate = useNavigate();
  const me = auth?.currentUser;
  const myUid = me?.uid;

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState(() => new Set());
  const [requested, setRequested] = useState(() => new Set());
  const [authorCountryByUid, setAuthorCountryByUid] = useState(() => ({}));


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

  // ✅ Live sent-request set (for "Requested" state)
  useEffect(() => {
    if (!myUid) return;

    const ref = collection(db, "users", myUid, "follow_requests_sent");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const next = new Set();
        snap.forEach((d) => next.add(d.id));
        setRequested(next);
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
            // 🌍 country display (prefer post snapshot fields; fallback to author_* keys)
            country: data.country || data.authorCountry || data.author_country || "",
            countryCode:
              data.country_code || data.countryCode || data.authorCountryCode || data.author_country_code || "",
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


  // ✅ Resolve author country for posts that don't store it (matches AgentDashboard behavior)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!posts?.length) return;

        // unique author ids in feed
        const ids = Array.from(
          new Set(posts.map((p) => p?.authorId).filter(Boolean))
        );

        // only fetch missing entries
        const missing = ids.filter((uid) => !(uid in authorCountryByUid));
        if (missing.length === 0) return;

        const next = { ...authorCountryByUid };

        // Firestore "in" query limit = 10
        for (let i = 0; i < missing.length; i += 10) {
          const chunk = missing.slice(i, i + 10);
          const qUsers = query(collection(db, "users"), where("__name__", "in", chunk));
          const snap = await getDocs(qUsers);
          snap.forEach((d) => {
            const data = d.data() || {};
            const country = data.country || data.authorCountry || data.author_country || "";
            const country_code =
              data.country_code || data.countryCode || data.countryCode2 || data.countryCodeISO || "";
            next[d.id] = { country, country_code };
          });

          // Ensure all requested ids exist in map (even if missing doc)
          chunk.forEach((uid) => {
            if (!(uid in next)) next[uid] = { country: "", country_code: "" };
          });
        }

        if (!cancelled) setAuthorCountryByUid(next);
      } catch (e) {
        console.error("author country resolve failed:", e);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [posts, authorCountryByUid]);

  const isFollowing = (creatorId) => following.has(creatorId);
  const isRequested = (creatorId) => requested.has(creatorId);

  const toggleFollow = async (creatorId) => {
    if (!myUid || !creatorId || creatorId === myUid) return;

    const followed = following.has(creatorId);
    const req = requested.has(creatorId);

    // Unfollow: delete your own following doc (backend cleanup removes mirror)
    if (followed) {
      await unfollowUser({ followerId: myUid, followeeId: creatorId });
      return;
    }

    // Cancel request
    if (req) {
      await cancelFollowRequest({ followerId: myUid, followeeId: creatorId });
      return;
    }

    // Send request
    await sendFollowRequest({ followerId: myUid, followeeId: creatorId });
  };

  const messageCreator = (post) => {
    // your messaging page can read ?with=<uid>
    if (!post?.authorId) return;
    navigate(`${createPageUrl("Messages")}?with=${encodeURIComponent(post.authorId)}`);
  };

  const showSubscriptionNotice = !subscriptionLoading && subscriptionModeEnabled;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-5">
        {/* ✅ Subscription notice depends on app_config/subscription.enabled */}
        {showSubscriptionNotice ? (
          <div className="mx-auto max-w-[1800px] mb-5">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-red-800">
                  {tr("subscription_required_title", "Subscription required")}
                </div>
                <div className="text-xs text-red-700 mt-1">
                  {tr("subscription_required_body", "Subscription mode is enabled. Subscribe to unlock full features.")}
                </div>
              </div>

              <Button
                type="button"
                className="rounded-xl bg-red-600 hover:bg-red-700"
                onClick={() => navigate(createPageUrl("Subscribe"))}
              >
                {tr("subscribe_now", "Subscribe")}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-[1800px] grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10">
          {/* LEFT */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-4 space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold text-gray-900">
                  {tr("discover_title", "Discover")}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {tr("discover_subtitle", "Browse posts from Agents, Tutors, and Schools.")}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start rounded-xl"
                    onClick={() => navigate(createPageUrl("Directory"))}
                    type="button"
                  >
                    <Users className="h-4 w-4 mr-2 text-emerald-600" />
                    {tr("directory", "Directory")}
                  </Button>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 border p-3">
                  <div className="text-xs font-semibold text-gray-700">
                    {tr("following_card_title", "Following")}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {tr("following_count", "You’re following {{count}} creators", { count: following.size })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold text-gray-900">
                  {tr("how_messaging_works_title", "How messaging works")}
                </div>
                <div className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {tr(
                    "how_messaging_works_body",
                    "You can message Agents and Tutors. For Schools, messaging is handled by Admin/Advisor — follow schools to receive updates."
                  )}
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
                    <div className="text-sm font-semibold text-gray-900">
                      {tr("explore_updates_title", "Explore Updates")}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {tr("explore_updates_subtitle", "Follow creators to get notified when they post next.")}
                    </div>
                  </div>
                  <Badge className="bg-zinc-900 text-white">{tr("all_posts", "All Posts")}</Badge>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <Card className="rounded-2xl">
                <CardContent className="p-10 flex items-center justify-center text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> {tr("loading_posts", "Loading posts…")}
                </CardContent>
              </Card>
            ) : posts.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="p-6 text-sm text-gray-600">{tr("no_posts", "No community posts yet.")}</CardContent>
              </Card>
            ) : (
              posts.map((p) => (
                <FeedPostCard
                  key={p.id}
                  post={p}
                  myUid={myUid}
                  isFollowing={isFollowing(p.authorId)}
                  onToggleFollow={toggleFollow}
                  onMessage={messageCreator}
                authorCountryByUid={authorCountryByUid}
                  tr={tr}
                />
              ))
            )}
          </div>

          {/* RIGHT */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-4 space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    {tr("suggested_to_follow", "Suggested to follow")}
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-600">
                  {tr("suggested_note", "(Optional) You can later load “Suggested” from Firestore.")}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold text-gray-900">{tr("tip_title", "Tip")}</div>
                <div className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {tr("tip_body", "Follow creators you trust. You’ll automatically get a notification when they post next.")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-only suggestions block (kept minimal) */}
        <div className="lg:hidden mt-6">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-gray-900">{tr("tip_title", "Tip")}</div>
              <div className="text-xs text-gray-600 mt-1">
                {tr("explore_updates_subtitle", "Follow creators to get notified when they post next.")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
