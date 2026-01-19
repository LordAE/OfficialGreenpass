// src/pages/TutorDashboard.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TutoringSession, Wallet, Tutor } from "@/api/entities";
import {
  Calendar,
  Users,
  Clock,
  ArrowRight,
  DollarSign,
  BookOpen,
  Star,
  TrendingUp,
  CreditCard,
  MoreHorizontal,
  Globe,
  Image as ImageIcon,
  ExternalLink,
  X,
  Loader2,
  Video,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

// ✅ Firebase
import { db, storage } from "@/firebase";
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

/* ✅ SUBSCRIPTION LOGIC */
function isSubscribedUser(u) {
  if (!u) return false;
  if (u.subscription_active === true) return true;
  const status = String(u.subscription_status || "").toLowerCase().trim();
  const ok = new Set(["active", "paid", "trialing"]);
  return ok.has(status);
}

const SubscribeBanner = ({ to, user }) => {
  const status = String(user?.subscription_status || "").toLowerCase().trim();
  const message =
    status === "skipped"
      ? "You skipped subscription. Subscribe to unlock full tutor features, visibility, and payouts."
      : status === "expired"
      ? "Your subscription expired. Renew to regain full tutor features, visibility, and payouts."
      : "You’re not subscribed yet. Subscribe to unlock full tutor features, visibility, and payouts.";

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <CreditCard className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-red-800">Subscription required</p>
          <p className="text-sm text-red-700">{message}</p>
        </div>
      </div>

      <Link to={to}>
        <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto" type="button">
          Subscribe Now
        </Button>
      </Link>
    </div>
  );
};

const StatCard = ({ title, value, icon, to, color = "text-blue-600" }) => (
  <Card className="hover:shadow-lg transition-shadow rounded-2xl">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <p className="text-gray-600">{title}</p>
        </div>
        {icon}
      </div>
      {to && (
        <Link to={to}>
          <Button variant="ghost" size="sm" className="w-full mt-3" type="button">
            View Details <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
    </CardContent>
  </Card>
);

const QuickLink = ({ title, description, to, icon }) => (
  <Link to={to}>
    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const Avatar = ({ name = "Tutor", size = "md" }) => {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  const s =
    size === "lg"
      ? "h-12 w-12 text-base"
      : size === "sm"
      ? "h-8 w-8 text-xs"
      : "h-10 w-10 text-sm";

  return (
    <div
      className={`${s} rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 text-white flex items-center justify-center font-semibold`}
    >
      {initials || "T"}
    </div>
  );
};

/* -------------------- Follow Button (no likes/comments/shares) -------------------- */
function FollowButton({ currentUserId, creatorId, creatorRole, size = "sm", className = "" }) {
  const [following, setFollowing] = useState(false);
  const disabled = !currentUserId || !creatorId || currentUserId === creatorId;

  useEffect(() => {
    if (disabled) {
      setFollowing(false);
      return;
    }
    const ref = doc(db, "users", currentUserId, "following", creatorId);
    const unsub = onSnapshot(ref, (snap) => setFollowing(snap.exists()));
    return () => unsub();
  }, [currentUserId, creatorId, disabled]);

  const follow = async () => {
    if (disabled) return;
    const batch = writeBatch(db);

    batch.set(
      doc(db, "users", currentUserId, "following", creatorId),
      {
        followee_id: creatorId,
        followee_role: creatorRole || null,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    batch.set(
      doc(db, "users", creatorId, "followers", currentUserId),
      { follower_id: currentUserId, createdAt: serverTimestamp() },
      { merge: true }
    );

    await batch.commit();
  };

  const unfollow = async () => {
    if (disabled) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, "users", currentUserId, "following", creatorId));
    batch.delete(doc(db, "users", creatorId, "followers", currentUserId));
    await batch.commit();
  };

  return (
    <Button
      type="button"
      size={size}
      variant={following ? "outline" : "default"}
      disabled={disabled}
      className={className}
      onClick={following ? unfollow : follow}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}

/* -------------------- Media grid (REAL) -------------------- */
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
                  className="h-56 w-full object-cover hover:scale-[1.01] transition"
                  loading="lazy"
                />
              </a>
            );
          }

          if (type === "video") {
            return (
              <div key={idx} className="overflow-hidden rounded-2xl border bg-black">
                <video src={url} controls preload="metadata" className="h-56 w-full object-cover" />
              </div>
            );
          }

          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex h-56 items-center justify-center rounded-2xl border bg-gray-50 text-sm text-gray-600"
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

/* -------------------- Post Card (FOLLOW + MESSAGE only) -------------------- */
const RealPostCard = ({ post, currentUserId }) => {
  const created = post?.createdAt?.seconds
    ? new Date(post.createdAt.seconds * 1000)
    : post?.createdAt?.toDate
    ? post.createdAt.toDate()
    : null;

  const authorId = post?.authorId || post?.user_id || post?.author_id;
  const authorRole = post?.authorRole || post?.creator_role || "tutor";
  const authorName = post?.authorName || post?.author_name || "Tutor";

  const isMine = currentUserId && authorId && currentUserId === authorId;

  const messageUrl = `${createPageUrl("Messages")}?with=${encodeURIComponent(authorId || "")}`;

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardContent className="p-0">
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar name={authorName} />
            <div className="leading-tight">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold text-gray-900">{authorName}</div>

                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700 border border-emerald-100"
                >
                  {String(authorRole || "tutor").toUpperCase()}
                </Badge>

                {post?.paid ? <Badge className="bg-zinc-900 text-white">Paid Post</Badge> : null}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>{created ? format(created, "MMM dd, h:mm a") : "—"}</span>
                <span>•</span>
                <Globe className="h-3.5 w-3.5" />
                <span>Public</span>
              </div>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="text-gray-500" type="button">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {post?.text ? (
          <div className="px-4 pb-3 text-sm text-gray-800 whitespace-pre-line">{post.text}</div>
        ) : null}

        <MediaGallery media={post?.media || []} />

        {/* ✅ ONLY FOLLOW + MESSAGE (no like/comment/share) */}
        <div className="px-4 pb-4">
          <div className="mt-3 border-t pt-2 grid grid-cols-2 gap-2">
            <div className="flex">
              {isMine ? (
                <Button
                  variant="outline"
                  className="w-full justify-center text-gray-700"
                  type="button"
                  disabled
                >
                  This is you
                </Button>
              ) : (
                <FollowButton
                  currentUserId={currentUserId}
                  creatorId={authorId}
                  creatorRole={authorRole}
                  className="w-full justify-center"
                />
              )}
            </div>

            <Link to={messageUrl} className="w-full">
              <Button
                variant="ghost"
                className="w-full justify-center text-gray-700"
                type="button"
                disabled={!authorId || !currentUserId || isMine}
                title={!authorId ? "Missing author id" : isMine ? "You can't message yourself" : "Message"}
              >
                <MessageSquare className="h-4 w-4 mr-2" /> Message
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function TutorDashboard({ user }) {
  const userId = user?.id || user?.uid || user?.user_id;

  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    totalEarnings: 0,
    totalStudents: 0,
    averageRating: 0,
    availableBalance: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Tutor can post
  const [composerText, setComposerText] = useState("");
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]); // File[]
  const [attachmentPreviews, setAttachmentPreviews] = useState([]); // {id,name,type,url}

  // ✅ Posting state
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  // ✅ Posts feed (Option B: one community feed including your own posts)
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  const isSubscribed = useMemo(() => isSubscribedUser(user), [user]);
  const subscribeUrl = useMemo(() => createPageUrl("Pricing"), []);

  useEffect(() => {
    if (!userId) return;

    const loadDashboardData = async () => {
      try {
        const [sessions, wallet, tutorData] = await Promise.all([
          TutoringSession.filter({ tutor_id: userId }, "-scheduled_date"),
          Wallet.filter({ user_id: userId }),
          Tutor.filter({ user_id: userId }),
        ]);

        const now = new Date();
        const upcoming = sessions
          .filter((s) => s.status === "scheduled" && new Date(s.scheduled_date) > now)
          .slice(0, 5);

        const uniqueStudents = [...new Set(sessions.map((s) => s.student_id).filter(Boolean))];
        const completedWithRating = sessions.filter(
          (s) => s.status === "completed" && s.student_rating
        );
        const avgRating =
          completedWithRating.length > 0
            ? completedWithRating.reduce((sum, s) => sum + s.student_rating, 0) /
              completedWithRating.length
            : 0;

        setStats({
          totalSessions: sessions.length,
          upcomingSessions: sessions.filter(
            (s) => s.status === "scheduled" && new Date(s.scheduled_date) > now
          ).length,
          completedSessions: sessions.filter((s) => s.status === "completed").length,
          totalEarnings: wallet.length > 0 ? wallet[0].total_earned || 0 : 0,
          totalStudents: uniqueStudents.length,
          averageRating: avgRating,
          availableBalance: wallet.length > 0 ? wallet[0].balance_usd || 0 : 0,
        });

        setUpcomingSessions(upcoming);
        setTutorProfile(tutorData.length > 0 ? tutorData[0] : null);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [userId]);

  // ✅ Live load: published posts
  useEffect(() => {
    if (!userId) return;

    setCommunityLoading(true);

    // NOTE: This assumes you store status as "published"
    // If your existing posts don't have status, you can remove the where("status","==","published")
    const q = query(
      collection(db, "posts"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCommunityPosts(list);
        setCommunityLoading(false);
      },
      (err) => {
        console.error("community posts snapshot error:", err);
        setCommunityPosts([]);
        setCommunityLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  // Build & cleanup preview URLs
  useEffect(() => {
    attachmentPreviews.forEach((p) => {
      if (p?.url) URL.revokeObjectURL(p.url);
    });

    const next = attachments.map((f, idx) => ({
      id: `${f.name}-${f.size}-${f.lastModified}-${idx}`,
      name: f.name,
      type: f.type,
      url: URL.createObjectURL(f),
    }));

    setAttachmentPreviews(next);

    return () => {
      next.forEach((p) => {
        if (p?.url) URL.revokeObjectURL(p.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  const openFilePicker = () => fileInputRef.current?.click();

  const onFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const key = (f) => `${f.name}|${f.size}|${f.lastModified}`;
    const map = new Map();
    [...attachments, ...files].forEach((f) => map.set(key(f), f));
    setAttachments(Array.from(map.values()));

    e.target.value = "";
  };

  const removeAttachment = (id) => {
    const toRemove = attachmentPreviews.find((p) => p.id === id);
    if (!toRemove) return;

    setAttachments((prev) =>
      prev.filter((f) => !(f.name === toRemove.name && f.type === toRemove.type))
    );
  };

  const clearComposer = () => {
    setComposerText("");
    setAttachments([]);
    setPostError("");
  };

  const uploadOne = async (file, postId, idx) => {
    const ext = (file.name || "").split(".").pop() || "";
    const safeExt = ext ? `.${ext}` : "";
    const path = `posts/${postId}/${idx}-${Date.now()}${safeExt}`;

    const sref = storageRef(storage, path);
    await uploadBytes(sref, file, { contentType: file.type || undefined });
    const url = await getDownloadURL(sref);

    const type = String(file.type || "").startsWith("video/") ? "video" : "image";

    return {
      type,
      url,
      name: file.name || `file-${idx}`,
      contentType: file.type || null,
      size: file.size || null,
      storagePath: path,
    };
  };

  const handlePost = async () => {
    const text = composerText.trim();
    if (!text && attachments.length === 0) return;
    if (!userId) return;

    setPosting(true);
    setPostError("");

    try {
      const authorName = user?.full_name || "Tutor";

      // 1) Create post doc first
      const postRef = await addDoc(collection(db, "posts"), {
        authorId: userId,
        authorRole: "tutor",
        authorName,
        text,
        media: [],
        status: "published", // later: draft -> paid -> publish
        paid: false,
        createdAt: serverTimestamp(),
      });

      // 2) Upload attachments and update the post doc
      if (attachments.length > 0) {
        const uploaded = [];
        for (let i = 0; i < attachments.length; i++) {
          uploaded.push(await uploadOne(attachments[i], postRef.id, i));
        }

        await updateDoc(doc(db, "posts", postRef.id), {
          media: uploaded,
        });
      }

      clearComposer();
    } catch (e) {
      console.error("handlePost error:", e);
      setPostError("Failed to post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mx-auto max-w-[1800px] space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Welcome, {(user?.full_name || "Tutor").split(" ")[0]}
              </h1>
              <p className="text-sm text-gray-600">Tutor dashboard</p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Badge
                variant={tutorProfile?.verification_status === "verified" ? "default" : "secondary"}
                className={
                  tutorProfile?.verification_status === "verified"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {tutorProfile?.verification_status || "pending"}
              </Badge>

              {stats.averageRating > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  {stats.averageRating.toFixed(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* Subscribe */}
          {!isSubscribed && <SubscribeBanner to={subscribeUrl} user={user} />}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10">
            {/* LEFT: stats */}
            <div className="lg:col-span-3 space-y-4">
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-1">
                <StatCard
                  title="Total Sessions"
                  value={stats.totalSessions}
                  icon={<Calendar className="h-6 w-6 text-purple-200" />}
                  to={createPageUrl("TutorSessions")}
                  color="text-purple-600"
                />
                <StatCard
                  title="Students"
                  value={stats.totalStudents}
                  icon={<Users className="h-6 w-6 text-blue-200" />}
                  to={createPageUrl("TutorStudents")}
                  color="text-blue-600"
                />
                <StatCard
                  title="Total Earnings"
                  value={`$${Number(stats.totalEarnings || 0).toFixed(2)}`}
                  icon={<DollarSign className="h-6 w-6 text-green-200" />}
                  to={createPageUrl("TutorEarnings")}
                  color="text-green-600"
                />
                <StatCard
                  title="Available"
                  value={`$${Number(stats.availableBalance || 0).toFixed(2)}`}
                  icon={<TrendingUp className="h-6 w-6 text-emerald-200" />}
                  to={createPageUrl("TutorEarnings")}
                  color="text-emerald-600"
                />
              </div>

              <Card className="rounded-2xl">
                <CardContent className="p-3 space-y-3">
                  <QuickLink
                    title="Set Availability"
                    description="Update your teaching schedule"
                    to={createPageUrl("TutorAvailability")}
                    icon={<Clock className="w-5 h-5 text-purple-500" />}
                  />
                  <QuickLink
                    title="My Students"
                    description="See your student list"
                    to={createPageUrl("TutorStudents")}
                    icon={<Users className="w-5 h-5 text-blue-500" />}
                  />
                  <QuickLink
                    title="Update Profile"
                    description="Edit your tutor profile"
                    to={createPageUrl("Profile")}
                    icon={<BookOpen className="w-5 h-5 text-orange-500" />}
                  />
                </CardContent>
              </Card>
            </div>

            {/* CENTER: composer + feeds */}
            <div className="lg:col-span-6 space-y-4">
              {/* Composer */}
              <div className="rounded-2xl border bg-white">
                <div className="p-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 w-full">
                    <Avatar name={user?.full_name || "Tutor"} />
                    <div className="w-full">
                      <div className="text-sm font-semibold text-gray-900">
                        Share an update, {(user?.full_name || "Tutor").split(" ")[0]}?
                      </div>

                      <textarea
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        placeholder="Post availability, new packages, reminders..."
                        className="mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 min-h-[90px]"
                      />

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={onFilesSelected}
                      />

                      {attachmentPreviews.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-semibold text-gray-500">
                            Attachments ({attachmentPreviews.length})
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {attachmentPreviews.map((p) => {
                              const isVideo = String(p.type || "").startsWith("video/");
                              return (
                                <div
                                  key={p.id}
                                  className="rounded-2xl border bg-gray-50 p-2 flex items-center gap-3"
                                >
                                  <div className="h-12 w-12 rounded-xl border bg-white overflow-hidden flex items-center justify-center">
                                    {isVideo ? (
                                      <div className="h-full w-full relative">
                                        <video
                                          src={p.url}
                                          className="h-full w-full object-cover"
                                          muted
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                                            <Video className="h-4 w-4" />
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <img
                                        src={p.url}
                                        alt={p.name}
                                        className="h-full w-full object-cover"
                                      />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                      {p.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {isVideo ? "Video" : "Photo"}
                                    </div>
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-500"
                                    onClick={() => removeAttachment(p.id)}
                                    title="Remove"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {postError ? <div className="mt-3 text-sm text-red-600">{postError}</div> : null}

                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <Button
                          variant="ghost"
                          className="justify-center text-gray-700 w-full sm:w-auto"
                          type="button"
                          onClick={openFilePicker}
                          disabled={posting}
                        >
                          <ImageIcon className="h-4 w-4 mr-2 text-green-600" />
                          Photo/video
                        </Button>

                        <Button
                          className="rounded-xl w-full sm:w-auto"
                          onClick={handlePost}
                          disabled={posting || (!composerText.trim() && attachments.length === 0)}
                          type="button"
                        >
                          {posting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            "Post"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" className="text-gray-500" type="button">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                <div className="border-t px-3 py-2 flex items-center gap-2 text-xs text-gray-500">
                  <Globe className="h-3.5 w-3.5" />
                  Public
                </div>
              </div>

              {/* ✅ Posts feed (Option B: one feed) */}
              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Posts</div>
                    <Badge variant="secondary" className="border bg-white">
                      Live
                    </Badge>
                  </div>

                  {communityLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading posts...
                    </div>
                  ) : communityPosts.length === 0 ? (
                    <div className="mt-3 text-sm text-gray-600">No community posts yet.</div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {communityPosts.map((p) => (
                        <RealPostCard key={p.id} post={p} currentUserId={userId} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: upcoming sessions */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-4 space-y-4">
                <Card className="rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-gray-900">Upcoming Sessions</div>
                      <Link to={createPageUrl("TutorSessions")}>
                        <Button variant="ghost" size="sm" type="button">
                          View <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>

                    {upcomingSessions.length > 0 ? (
                      <div className="space-y-2">
                        {upcomingSessions.slice(0, 4).map((session) => (
                          <div key={session.id} className="rounded-2xl border bg-gray-50 p-3">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {session.subject || "Session"}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {format(new Date(session.scheduled_date), "MMM dd, h:mm a")}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {session.duration} min • ${session.price}
                            </div>
                            <Badge className="mt-2" variant="secondary">
                              Scheduled
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">No upcoming sessions.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
