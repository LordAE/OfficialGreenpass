import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Agent } from "@/api/entities";
import { Case } from "@/api/entities";
import { User } from "@/api/entities";
import { Reservation } from "@/api/entities";
import {
  Users,
  FileText,
  DollarSign,
  ArrowRight,
  UserPlus,
  CreditCard,
  MoreHorizontal,
  Globe,
  Image as ImageIcon,
  MessageCircle,
  Ticket,
  Building2,
  X,
  Loader2,
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

import ProfileCompletionBanner from "../profile/ProfileCompletionBanner";
import ActionBlocker from "../profile/ActionBlocker";
import { getProfileCompletionData } from "../profile/ProfileCompletionBanner";

/* -------------------- SAFE HELPERS (date & arrays) -------------------- */
const toValidDate = (v) => {
  if (v && typeof v === "object") {
    if (typeof v.toDate === "function") {
      const d = v.toDate();
      return isNaN(d?.getTime()) ? null : d;
    }
    if (typeof v.seconds === "number") {
      const d = new Date(v.seconds * 1000);
      return isNaN(d?.getTime()) ? null : d;
    }
  }
  if (typeof v === "number") {
    const d = new Date(v > 1e12 ? v : v * 1000);
    return isNaN(d?.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      const d = new Date(n > 1e12 ? n : n * 1000);
      return isNaN(d?.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d?.getTime()) ? null : d;
  }
  return null;
};

const fmt = (v, fmtStr = "MMM dd, h:mm a") => {
  const d = toValidDate(v);
  if (!d) return "—";
  try {
    return format(d, fmtStr);
  } catch {
    return d.toLocaleString();
  }
};

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
/* --------------------------------------------------------------------- */

/* ✅ Uses your REAL user doc fields */
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
      ? "You skipped subscription. Subscribe to unlock full features, commissions, and payouts."
      : status === "expired"
      ? "Your subscription expired. Renew to regain access to commissions and payouts."
      : "You’re not subscribed yet. Subscribe to unlock full agent features, commissions, and payouts.";

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
        <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
          Subscribe Now
        </Button>
      </Link>
    </div>
  );
};

const Shortcut = ({ icon, label, to }) => (
  <Link to={to} className="block">
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-gray-50 transition">
      <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-sm font-medium text-gray-900">{label}</div>
    </div>
  </Link>
);

const Avatar = ({ name = "User", size = "md" }) => {
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
      {initials || "U"}
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
      { followee_id: creatorId, followee_role: creatorRole || null, createdAt: serverTimestamp() },
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

/* -------------------- Media grid (images + videos) -------------------- */
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

/* -------------------- Real Post Card (FOLLOW + MESSAGE only) -------------------- */
const RealPostCard = ({ post, currentUserId }) => {
  const created = post?.createdAt?.seconds
    ? new Date(post.createdAt.seconds * 1000)
    : post?.createdAt?.toDate
    ? post.createdAt.toDate()
    : null;

  const authorId = post?.authorId || post?.user_id || post?.author_id;
  const authorRole = post?.authorRole || post?.creator_role || "agent";
  const authorName = post?.authorName || post?.author_name || "Agent";

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
                  {String(authorRole || "agent").toUpperCase()}
                </Badge>
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
                <MessageCircle className="h-4 w-4 mr-2" /> Message
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PerformanceBlock = ({ stats, successRate, referralCodeFallback = "AG2025001" }) => (
  <div className="rounded-2xl border bg-white p-4">
    <div className="text-sm font-semibold text-gray-900 mb-3">Performance</div>

    <div className="space-y-3">
      <div className="rounded-2xl border bg-gray-50 p-3">
        <div className="text-xs text-gray-500">This Month</div>
        <div className="text-2xl font-bold text-blue-600">{stats.thisMonthReferrals}</div>
        <div className="text-sm text-gray-600">New Referrals</div>
      </div>

      <div className="rounded-2xl border bg-gray-50 p-3">
        <div className="text-xs text-gray-500">Success Rate</div>
        <div className="text-2xl font-bold text-green-600">{successRate}%</div>
        <div className="text-sm text-gray-600">Visa Approvals</div>
      </div>

      <div className="rounded-2xl border bg-gray-50 p-3">
        <div className="text-xs text-gray-500">Referral Code</div>
        <div className="mt-2 text-center">
          <code className="text-lg font-bold bg-white px-3 py-2 rounded border inline-block">
            {stats.referralCode || referralCodeFallback}
          </code>
          <div className="text-xs text-gray-600 mt-2">Share this code with students</div>
        </div>
      </div>
    </div>
  </div>
);

export default function AgentDashboard({ user }) {
  const userId = user?.id || user?.uid || user?.user_id;
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCases: 0,
    totalEarnings: 0,
    pendingPayout: 0,
    approvedCases: 0,
    thisMonthReferrals: 0,
    commissionRate: 10,
    referralCode: "",
  });
  const [recentCases, setRecentCases] = useState([]);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState({ isComplete: true });

  // ✅ Agent can post (multi-media)
  const [composerText, setComposerText] = useState("");
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]); // File[]
  const [attachmentPreviews, setAttachmentPreviews] = useState([]); // {id,name,type,url}

  // ✅ Posting / feed
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [agentData, cases, students, reservations] = await Promise.all([
          Agent.filter({ user_id: user.id }),
          Case.filter({ agent_id: user.id }, "-created_date"),
          User.filter({ referred_by_agent_id: user.id }),
          Reservation.filter({ status: "confirmed" }),
        ]);

        const agentRecord = agentData.length > 0 ? agentData[0] : null;
        setAgent(agentRecord);

        const completion = getProfileCompletionData(user, agentRecord);
        setProfileCompletion(completion);

        const agentReservations = arr(reservations).filter((r) =>
          arr(students).some((s) => s.id === r.student_id)
        );

        const now = new Date();
        const thisMonth = arr(students).filter((s) => {
          const d = toValidDate(s.created_date);
          return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const totalEarnings =
          agentReservations.reduce(
            (sum, r) => sum + (Number(r.amount_usd) || 0) * (agentRecord?.commission_rate || 0.1),
            0
          ) + arr(cases).filter((c) => c.status === "Approved").length * 500;

        setStats({
          totalStudents: arr(students).length,
          activeCases: arr(cases).filter((c) => !["Approved", "Rejected"].includes(c.status)).length,
          totalEarnings,
          pendingPayout: agentRecord?.pending_payout || 0,
          approvedCases: arr(cases).filter((c) => c.status === "Approved").length,
          thisMonthReferrals: thisMonth.length,
          commissionRate: (agentRecord?.commission_rate || 0.1) * 100,
          referralCode: agentRecord?.referral_code || "",
        });

        setRecentCases(arr(cases).slice(0, 5));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // ✅ Live load: community posts (includes your own posts) — Option B
  useEffect(() => {
    if (!userId) return;
    setCommunityLoading(true);

    const q = query(
      collection(db, "posts"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setCommunityPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  // ✅ Build & cleanup preview URLs
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
    setAttachments((prev) => prev.filter((f) => !(f.name === toRemove.name && f.type === toRemove.type)));
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

  const isSubscribed = useMemo(() => isSubscribedUser(user), [user]);
  const subscribeUrl = useMemo(() => createPageUrl("Pricing"), []);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const firstName = user?.full_name?.split(" ")[0] || "Agent";
  const successRate = recentCases.length > 0 ? ((stats.approvedCases / recentCases.length) * 100).toFixed(1) : "0";

  const handlePost = async () => {
    const text = composerText.trim();
    if (!text && attachments.length === 0) return;
    if (!userId) return;

    setPosting(true);
    setPostError("");

    try {
      const authorName = user?.full_name || "Agent";

      // 1) Create post doc first
      const postRef = await addDoc(collection(db, "posts"), {
        authorId: userId,
        authorRole: "agent",
        authorName,
        text,
        media: [],
        status: "published", // Cloud Function relies on this
        paid: false,
        createdAt: serverTimestamp(),
      });

      // 2) Upload attachments then update the post
      if (attachments.length > 0) {
        const uploaded = [];
        for (let i = 0; i < attachments.length; i++) {
          uploaded.push(await uploadOne(attachments[i], postRef.id, i));
        }
        await updateDoc(doc(db, "posts", postRef.id), { media: uploaded });
      }

      clearComposer();
    } catch (e) {
      console.error("handlePost error:", e);
      setPostError("Failed to post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mx-auto max-w-[1800px]">
          {/* Header (same style as student) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome, {firstName}</h1>
              <p className="text-sm text-gray-600">Newsfeed-style dashboard (agent updates + posts)</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={agent?.verification_status === "verified" ? "default" : "secondary"}
                className={
                  agent?.verification_status === "verified"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {agent?.verification_status || "pending"}
              </Badge>
              <Badge variant="outline">{stats.commissionRate}% Commission</Badge>
            </div>
          </div>

          {!isSubscribed && (
            <div className="mb-4">
              <SubscribeBanner to={subscribeUrl} user={user} />
            </div>
          )}

          <div className="mb-4">
            <ProfileCompletionBanner user={user} relatedEntity={agent} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10">
            {/* LEFT */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-4 space-y-4">
                <div className="rounded-2xl border bg-white p-2">
                  <div className="px-2 py-2 text-xs font-semibold text-gray-500">Shortcuts</div>
                  <div className="space-y-1">
                    <Shortcut to={createPageUrl("MyStudents")} label="My Students" icon={<Users className="h-5 w-5 text-blue-600" />} />
                    <Shortcut to={createPageUrl("VisaCases")} label="Cases" icon={<FileText className="h-5 w-5 text-purple-600" />} />
                    <Shortcut to={createPageUrl("AgentEarnings")} label="Earnings" icon={<DollarSign className="h-5 w-5 text-green-600" />} />
                    <Shortcut to={createPageUrl("AgentLeads")} label="Find Leads" icon={<UserPlus className="h-5 w-5 text-orange-600" />} />
                    <Shortcut to={createPageUrl("Events")} label="Events" icon={<Ticket className="h-5 w-5 text-emerald-600" />} />
                    <Shortcut to={createPageUrl("Directory")} label="Directory" icon={<Building2 className="h-5 w-5 text-blue-600" />} />
                  </div>
                </div>

                {/* ✅ Performance cards moved to the side (LEFT) */}
                <PerformanceBlock
                  stats={{ ...stats, referralCode: agent?.referral_code || stats.referralCode }}
                  successRate={successRate}
                />
              </div>
            </div>

            {/* CENTER */}
            <div className="lg:col-span-6 space-y-4">
              {/* Composer */}
              <ActionBlocker
                isBlocked={!profileCompletion.isComplete}
                title="Complete Profile to Post"
                message="Finish your agent profile to publish updates and announcements."
              >
                <div className="rounded-2xl border bg-white">
                  <div className="p-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 w-full">
                      <Avatar name={user?.full_name || "Agent"} />
                      <div className="w-full">
                        <div className="text-sm font-semibold text-gray-900">
                          What’s on your mind, {firstName}?
                        </div>

                        <textarea
                          value={composerText}
                          onChange={(e) => setComposerText(e.target.value)}
                          placeholder="Share an update about schools, events, or your agency..."
                          className="mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 min-h-[90px]"
                        />

                        {/* Hidden file input (multi image/video) */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={onFilesSelected}
                        />

                        {/* Attachments preview */}
                        {attachmentPreviews.length > 0 ? (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {attachmentPreviews.map((p) => {
                              const isVideo = String(p.type || "").startsWith("video/");
                              return (
                                <div
                                  key={p.id}
                                  className="relative overflow-hidden rounded-2xl border bg-gray-100"
                                >
                                  <button
                                    type="button"
                                    onClick={() => removeAttachment(p.id)}
                                    className="absolute top-2 right-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 hover:bg-white shadow"
                                    title="Remove"
                                  >
                                    <X className="h-4 w-4 text-gray-700" />
                                  </button>

                                  {isVideo ? (
                                    <video
                                      src={p.url}
                                      className="h-36 w-full object-cover"
                                      preload="metadata"
                                      muted
                                    />
                                  ) : (
                                    <img
                                      src={p.url}
                                      alt={p.name}
                                      className="h-36 w-full object-cover"
                                      loading="lazy"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        {postError ? <div className="mt-2 text-sm text-red-600">{postError}</div> : null}

                        {/* ✅ ONLY Photo/video (removed Live video + Feeling/activity) */}
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="justify-center text-gray-700 w-full sm:w-auto"
                            onClick={openFilePicker}
                          >
                            <ImageIcon className="h-4 w-4 mr-2 text-green-600" />
                            Photo/video
                          </Button>

                          <Button
                            className="rounded-xl w-full sm:w-auto"
                            onClick={handlePost}
                            disabled={posting || (!composerText.trim() && attachments.length === 0)}
                          >
                            {posting ? (
                              <span className="inline-flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting
                              </span>
                            ) : (
                              "Post"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="icon" className="text-gray-500">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="border-t px-3 py-2 flex items-center gap-2 text-xs text-gray-500">
                    <Globe className="h-3.5 w-3.5" />
                    Public
                  </div>
                </div>
              </ActionBlocker>

              {/* Feed */}
              <div className="space-y-4">
                {communityLoading ? (
                  <div className="rounded-2xl border bg-white p-6 text-sm text-gray-500">Loading posts…</div>
                ) : communityPosts.length === 0 ? (
                  <div className="rounded-2xl border bg-white p-6 text-sm text-gray-500">
                    No posts yet. Be the first to post an update.
                  </div>
                ) : (
                  communityPosts.map((p) => <RealPostCard key={p.id} post={p} currentUserId={userId} />)
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-4 space-y-4">
                {/* Stats (compact, like FB right sidebar widgets) */}
                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900 mb-3">Highlights</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Students</div>
                      <div className="text-lg font-bold text-blue-600">{stats.totalStudents}</div>
                    </div>
                    <div className="rounded-2xl border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Active Cases</div>
                      <div className="text-lg font-bold text-purple-600">{stats.activeCases}</div>
                    </div>
                    <div className="rounded-2xl border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Earnings</div>
                      <div className="text-lg font-bold text-green-600">${stats.totalEarnings.toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Pending</div>
                      <div className="text-lg font-bold text-emerald-600">
                        ${Number(stats.pendingPayout || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ Performance cards moved to the side (RIGHT) */}
                <PerformanceBlock
                  stats={{ ...stats, referralCode: agent?.referral_code || stats.referralCode }}
                  successRate={successRate}
                />

                {/* Recent cases widget */}
                <div className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-gray-900">Recent Cases</div>
                    <Link to={createPageUrl("VisaCases")}>
                      <Button variant="ghost" size="sm">
                        View <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>

                  {recentCases.length > 0 ? (
                    <div className="space-y-2">
                      {recentCases.slice(0, 3).map((c) => (
                        <div key={c.id} className="rounded-2xl border bg-gray-50 p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-gray-900">{c.case_type || "Case"}</div>
                            <Badge variant={c.status === "Approved" ? "default" : "secondary"}>{c.status || "—"}</Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{fmt(c.created_date, "MMM dd, yyyy")}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No cases yet.</div>
                  )}
                </div>

                {/* Contacts */}
                <div className="rounded-2xl border bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-900">Contacts</div>
                    <Button variant="ghost" size="icon" className="text-gray-500">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {["GreenPass Support", "GAIN Fair Team", "School Rep", "Admissions Desk"].map((n) => (
                      <div key={n} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-gray-50 transition">
                        <Avatar name={n} size="sm" />
                        <div className="text-sm text-gray-800">{n}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
