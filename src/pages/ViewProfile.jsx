// src/pages/ViewProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { auth } from "@/firebase";
import { ensureConversation, getUserDoc } from "@/api/messaging";
import {
  listenFollowState,
  sendFollowRequest,
  cancelFollowRequest,
  unfollowUser,
} from "@/api/follow";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTr } from "@/i18n/useTr";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building,
  CalendarDays,
  CheckCircle2,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Store,
  UserRound,
  Wallet,
} from "lucide-react";

function normalizeRole(r) {
  const v = String(r || "").toLowerCase().trim();
  if (v === "student" || v === "students" || v === "user" || v === "users") return "user";
  if (v === "tutors") return "tutor";
  if (v === "agents") return "agent";
  if (v === "schools") return "school";
  if (v === "vendors") return "vendor";
  return v || "user";
}

function resolveRole(userDoc) {
  return normalizeRole(
    userDoc?.selected_role ||
      userDoc?.role ||
      userDoc?.signup_entry_role ||
      userDoc?.user_type ||
      userDoc?.userType ||
      userDoc?.verification?.role ||
      "user"
  );
}

function roleLabel(role, tr) {
  if (role === "agent") return tr("role_agent", "Agent");
  if (role === "tutor") return tr("role_tutor", "Tutor");
  if (role === "school") return tr("role_school", "School");
  if (role === "vendor") return tr("role_vendor", "Vendor");
  return tr("role_student", "Student");
}

function pickAvatar(u) {
  return (
    u?.profile_picture ||
    u?.profilePhoto ||
    u?.profile_photo ||
    u?.photoURL ||
    u?.avatar ||
    u?.avatarUrl ||
    u?.image ||
    u?.imageUrl ||
    ""
  );
}

function pickPhone(u) {
  return u?.phone || u?.phoneNumber || u?.mobile || u?.mobile_number || u?.contact || "";
}

function pickCountry(u) {
  const code =
    u?.countryCode ||
    u?.country_code ||
    u?.countryISO ||
    u?.country_iso ||
    u?.selected_country_code ||
    u?.selectedCountryCode ||
    "";

  const name = u?.country || u?.countryName || u?.selected_country || u?.selectedCountry || "";
  return { code: String(code || "").toUpperCase(), name: String(name || "") };
}

function flagUrlFromCode(code) {
  const cc = (code || "").toString().trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return "";
  return `https://flagcdn.com/w40/${cc}.png`;
}

function initialsFromName(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

function getFollowButtonLabel(tr, followState) {
  if (followState.following) return tr("unfollow", "Unfollow");
  if (followState.requested) return tr("requested", "Requested");
  return tr("follow", "Follow");
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function renderStars(value, interactive = false, onPick = null) {
  return Array.from({ length: 5 }).map((_, i) => {
    const active = i < value;
    return (
      <button
        key={i}
        type="button"
        onClick={interactive && onPick ? () => onPick(i + 1) : undefined}
        className={interactive ? "transition-transform hover:scale-110" : "cursor-default"}
        disabled={!interactive}
      >
        <Star
          className={`h-4 w-4 ${
            active ? "fill-[#f59e0b] text-[#f59e0b]" : "text-slate-300"
          }`}
        />
      </button>
    );
  });
}

function normalizeReviewItem(item, idx) {
  if (!item || typeof item !== "object") return null;
  const author =
    item.author ||
    item.userName ||
    item.name ||
    item.full_name ||
    item.displayName ||
    `User ${idx + 1}`;
  const comment = item.comment || item.text || item.message || item.review || "";
  const ratingNum = Number(item.rating || item.stars || item.score || 0);
  const rating = Number.isFinite(ratingNum)
    ? Math.max(1, Math.min(5, Math.round(ratingNum)))
    : 5;

  return {
    id: item.id || `review-${idx}`,
    author,
    comment: comment || "Great profile.",
    rating,
    avatar: item.avatar || item.photoURL || item.profile_picture || "",
  };
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function ChipList({ items, emptyText }) {
  if (!items?.length) {
    return <div className="text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <Badge
          key={`${item}-${idx}`}
          variant="outline"
          className="rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700"
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

function SectionBlock({ title, subtitle, children }) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-[#f8fbff] p-4 sm:p-5">
      <div className="mb-4">
        <div className="text-base font-extrabold text-slate-900">{title}</div>
        {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, subvalue }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-bold text-slate-900 break-words">{value}</div>
      {subvalue ? <div className="mt-1 text-sm text-slate-600 break-words">{subvalue}</div> : null}
    </div>
  );
}

export default function ViewProfile() {
  const tr0 = useTr("view_profile");
  const tr =
    typeof tr0 === "function"
      ? tr0
      : tr0?.tr || tr0?.t || ((key, fallback) => fallback ?? key);

  const navigate = useNavigate();
  const { uid } = useParams();

  const me = auth?.currentUser;
  const myUid = me?.uid;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followState, setFollowState] = useState({ following: false, requested: false });
  const [sending, setSending] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [localReviews, setLocalReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const u = await getUserDoc(uid);
        if (!cancelled) setUser(u ? { id: uid, ...u } : { id: uid });
      } catch (e) {
        console.error("failed to load profile", e);
        if (!cancelled) setUser({ id: uid });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!myUid || !uid || myUid === uid) return;
    return listenFollowState({ meId: myUid, targetId: uid }, setFollowState);
  }, [myUid, uid]);

  const role = useMemo(() => resolveRole(user), [user]);
  const avatar = useMemo(() => pickAvatar(user), [user]);
  const phone = useMemo(() => pickPhone(user), [user]);
  const { code, name } = useMemo(() => pickCountry(user), [user]);
  const flagUrl = useMemo(() => flagUrlFromCode(code), [code]);

  useEffect(() => {
    if (loading) return;
    if (!uid) return;
    if (role !== "school") return;

    navigate(`${createPageUrl("SchoolDetails")}?id=${encodeURIComponent(uid)}`, {
      replace: true,
    });
  }, [loading, role, uid, navigate]);

  const canFollow = !!myUid && !!uid && myUid !== uid;
  const showReviews = role !== "user";

  const nameText =
    user?.full_name ||
    user?.name ||
    user?.displayName ||
    user?.email ||
    uid ||
    tr("unknown", "Unknown");

  const email = user?.email || "";
  const bio =
    user?.bio ||
    user?.about ||
    user?.description ||
    user?.intro ||
    user?.agent_profile?.bio ||
    user?.tutor_profile?.bio ||
    user?.school_profile?.bio ||
    user?.vendor_profile?.bio ||
    "";

  const headline =
    user?.headline ||
    user?.title ||
    user?.position ||
    user?.occupation ||
    user?.school_name ||
    user?.company_name ||
    "";

  const memberSince = useMemo(() => {
    const raw = user?.created_at;
    try {
      const date =
        typeof raw?.toDate === "function"
          ? raw.toDate()
          : raw instanceof Date
            ? raw
            : null;

      if (!date || Number.isNaN(date.getTime())) return tr("recently_joined", "Recently joined");

      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return tr("recently_joined", "Recently joined");
    }
  }, [user, tr]);

  const reviews = useMemo(() => {
    const source = Array.isArray(user?.reviews)
      ? user.reviews
      : Array.isArray(user?.comments)
        ? user.comments
        : [];

    const normalized = source.map(normalizeReviewItem).filter(Boolean);
    return [...localReviews, ...normalized];
  }, [user, localReviews]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 5;
    const total = reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return Math.max(1, Math.min(5, total / reviews.length));
  }, [reviews]);

  const studentArrays = useMemo(
    () => ({
      preferred_programs: asArray(user?.preferred_programs),
      selected_courses: asArray(user?.selected_courses),
      preferred_countries: asArray(user?.preferred_countries),
      study_areas: asArray(user?.study_areas),
      spoken_languages: asArray(user?.spoken_languages),
    }),
    [user]
  );

  const tutorSpecializations = useMemo(
    () => asArray(user?.tutor_profile?.specializations || user?.specializations),
    [user]
  );

  const vendorCategories = useMemo(
    () => asArray(user?.vendor_profile?.service_categories || user?.service_categories),
    [user]
  );

  const schoolProfile = user?.school_profile || {};
  const agentProfile = user?.agent_profile || {};
  const tutorProfile = user?.tutor_profile || {};
  const vendorProfile = user?.vendor_profile || {};

  const studentSummary = useMemo(() => {
    if (role !== "user") return null;

    return {
      targetCountry: user?.target_country || "",
      targetProgram: user?.target_program || "",
      intakeYear: user?.intake_year || "",
      budget: user?.budget || "",
      gpa: user?.gpa || "",
      ielts: user?.ielts || "",
      currentLevel: user?.current_level || "",
      academicBackground: user?.academic_background || "",
      scholarshipInterest: user?.scholarship_interest || "",
      highSchool: user?.high_school || "",
      university: user?.university || "",
      achievements: user?.achievements || "",
      age: user?.age || "",
    };
  }, [role, user]);

  const commonRows = useMemo(() => {
    const rows = [];

    if (email) {
      rows.push({
        label: tr("email", "Email"),
        value: email,
        icon: <Mail className="h-5 w-5" />,
      });
    }

    if (phone) {
      rows.push({
        label: tr("phone", "Phone"),
        value: phone,
        icon: <Phone className="h-5 w-5" />,
      });
    }

    if (name || code) {
      rows.push({
        label: tr("country", "Country"),
        value: name || code,
        icon: <Globe className="h-5 w-5" />,
      });
    }

    rows.push({
      label:
        user?.verification?.status === "verified" || user?.is_verified
          ? tr("verification", "Verification")
          : tr("status", "Status"),
      value:
        user?.verification?.status === "verified" || user?.is_verified
          ? tr("verified", "Verified")
          : tr("active", "Active"),
      icon: <CheckCircle2 className="h-5 w-5" />,
    });

    const seen = new Set();
    return rows.filter((row) => {
      const k = `${String(row.label).toLowerCase()}::${String(row.value).toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [tr, email, phone, name, code, user]);

  const quickFacts = useMemo(() => {
    const rows = [];

    rows.push({
      label: tr("role", "Role"),
      value: roleLabel(role, tr),
    });

    rows.push({
      label: tr("member_since", "Member Since"),
      value: memberSince,
    });

    if (headline) {
      rows.push({
        label: tr("headline", "Headline"),
        value: headline,
      });
    }

    return rows;
  }, [tr, role, memberSince, headline]);

  const onFollowToggle = async () => {
    if (!canFollow) return;
    try {
      if (followState.following) {
        await unfollowUser({ followerId: myUid, followeeId: uid });
        return;
      }
      if (followState.requested) {
        await cancelFollowRequest({ followerId: myUid, followeeId: uid });
        return;
      }
      await sendFollowRequest({ followerId: myUid, followeeId: uid });
    } catch (e) {
      console.error(e);
      alert(tr("follow_failed", "Could not update follow. Please try again."));
    }
  };

  const onOpenMessage = async () => {
    if (!myUid || !uid || myUid === uid) return;

    try {
      setSending(true);
      const convoId = await ensureConversation(myUid, uid);
      navigate(`/messages?cid=${convoId}`);
    } catch (e) {
      console.error(e);
      alert(tr("message_failed", "Failed to open message."));
    } finally {
      setSending(false);
    }
  };

  const onSubmitReview = () => {
    const text = String(reviewText || "").trim();
    if (!text) {
      alert(tr("review_required", "Please write a comment first."));
      return;
    }

    const myName = me?.displayName || me?.email?.split("@")[0] || tr("you", "You");

    setLocalReviews((prev) => [
      {
        id: `local-${Date.now()}`,
        author: myName,
        comment: text,
        rating: reviewRating,
        avatar: me?.photoURL || "",
      },
      ...prev,
    ]);
    setReviewText("");
    setReviewRating(5);
  };

  if (!loading && role === "school") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#eef3f8] px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="text-[24px] font-extrabold tracking-tight text-[#19a34a]">
                GreenPass
              </div>
              <div className="text-xs text-slate-500">{tr("view_profile", "Profile")}</div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="rounded-xl border-slate-200 bg-white text-slate-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tr("back", "Back")}
            </Button>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <Card className="rounded-[28px] border border-slate-200 bg-white shadow-none">
                  <CardContent className="p-5 sm:p-6">
                    <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {tr("personalized", "Personalized")}
                    </div>

                    <div className="grid gap-5 md:grid-cols-[260px_1fr]">
                      <div className="rounded-[24px] border border-slate-100 bg-[#f8fbff] p-4">
                        <div className="mx-auto flex h-52 w-full items-center justify-center overflow-hidden rounded-[22px] bg-[#dfe8f1] text-4xl font-bold text-[#173562]">
                          {avatar ? (
                            <img src={avatar} alt={nameText} className="h-full w-full object-cover" />
                          ) : (
                            initialsFromName(nameText) || "U"
                          )}
                        </div>

                        <div className="mt-4 text-center text-[30px] font-extrabold leading-tight tracking-tight text-[#0f2f63]">
                          {nameText}
                        </div>

                        {headline ? (
                          <div className="mt-2 text-center text-sm text-slate-500">{headline}</div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          <Badge className="rounded-full bg-[#0f2f63] px-3 py-1 text-white hover:bg-[#0f2f63]">
                            {roleLabel(role, tr)}
                          </Badge>

                          {user?.verification?.status === "verified" || user?.is_verified ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
                            >
                              {tr("verified", "Verified")}
                            </Badge>
                          ) : null}
                        </div>

                        {name || code ? (
                          <div className="mt-4 flex justify-center">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
                              {flagUrl ? (
                                <img
                                  src={flagUrl}
                                  alt={code ? `${code} flag` : "flag"}
                                  className="h-4 w-6 rounded-sm object-cover"
                                  loading="lazy"
                                />
                              ) : null}
                              <span>{name || code}</span>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col justify-between gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {quickFacts.map((fact, idx) => (
                            <div
                              key={`${fact.label}-${idx}`}
                              className="rounded-2xl border border-slate-100 bg-[#f8fbff] px-4 py-4"
                            >
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {fact.label}
                              </div>
                              <div className="mt-2 text-sm font-bold leading-6 text-slate-900">
                                {fact.value}
                              </div>
                            </div>
                          ))}
                        </div>

                        {showReviews ? (
                          <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-[#fff7ee] px-4 py-4">
                            <div className="flex items-center gap-1 text-[#f59e0b]">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className="h-5 w-5 fill-current" />
                              ))}
                            </div>
                            <div className="ml-2 text-sm font-bold text-slate-800">
                              {averageRating.toFixed(1)}
                            </div>
                            <div className="text-sm text-slate-500">
                              · {reviews.length} {tr("reviews", "reviews")}
                            </div>
                          </div>
                        ) : role === "user" ? (
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                            <div className="text-sm font-semibold text-emerald-900">
                              {tr("student_profile_summary", "Student Profile Summary")}
                            </div>
                            <div className="mt-1 text-sm text-emerald-800">
                              {studentSummary?.targetCountry || studentSummary?.targetProgram
                                ? `${studentSummary?.targetCountry || tr("not_set", "Not set")} · ${
                                    studentSummary?.targetProgram || tr("not_set", "Not set")
                                  }`
                                : tr(
                                    "student_summary_empty",
                                    "This student has started building their profile."
                                  )}
                            </div>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-2 gap-3">
                          {canFollow ? (
                            <Button
                              onClick={onFollowToggle}
                              className={[
                                "h-12 rounded-full text-sm font-bold shadow-none",
                                followState.following
                                  ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
                                  : followState.requested
                                    ? "bg-[#0f2f63] text-white hover:bg-[#123972]"
                                    : "bg-[#ff9500] text-white hover:bg-[#ea8a00]",
                              ].join(" ")}
                            >
                              {getFollowButtonLabel(tr, followState)}
                            </Button>
                          ) : (
                            <div className="flex h-12 items-center justify-center rounded-full bg-[#ff9500] px-4 text-sm font-bold text-white">
                              {tr("profile", "Profile")}
                            </div>
                          )}

                          <Button
                            type="button"
                            onClick={onOpenMessage}
                            disabled={!canFollow || sending}
                            className="h-12 rounded-full bg-[#0f2f63] px-4 text-sm font-bold text-white hover:bg-[#123972] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {sending ? tr("opening", "Opening...") : tr("message", "Message")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {role === "user" ? (
                  <Card className="rounded-[28px] border border-slate-200 bg-white shadow-none">
                    <CardContent className="p-5 sm:p-6">
                      <div className="mb-4">
                        <div className="text-xl font-extrabold text-slate-900">
                          {tr("student_snapshot", "Student Snapshot")}
                        </div>
                        <div className="text-sm text-slate-500">
                          {tr(
                            "student_snapshot_subtitle",
                            "A quick overview of the student's goals and academic profile"
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MiniStat
                          label={tr("target", "Target")}
                          value={studentSummary?.targetCountry || tr("not_set", "Not set")}
                          subvalue={studentSummary?.targetProgram || tr("not_set", "Not set")}
                        />
                        <MiniStat
                          label={tr("intake_budget", "Intake & Budget")}
                          value={studentSummary?.intakeYear || tr("not_set", "Not set")}
                          subvalue={studentSummary?.budget || tr("not_set", "Not set")}
                        />
                        <MiniStat
                          label={tr("academic", "Academic")}
                          value={`GPA: ${studentSummary?.gpa || tr("not_set", "Not set")}`}
                          subvalue={`IELTS: ${studentSummary?.ielts || tr("not_set", "Not set")}`}
                        />
                        <MiniStat
                          label={tr("scholarship", "Scholarship")}
                          value={studentSummary?.scholarshipInterest || tr("not_set", "Not set")}
                          subvalue={studentSummary?.currentLevel || tr("not_set", "Not set")}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="rounded-[28px] border border-slate-200 bg-white shadow-none">
                  <CardContent className="p-5 sm:p-6">
                    <div className="mb-3">
                      <div className="text-xl font-extrabold text-slate-900">
                        {tr("bio", role === "school" ? "About / Description" : "Biography / Description")}
                      </div>
                      <div className="text-sm text-slate-500">
                        {tr("bio_subtitle", "Personal introduction and profile overview")}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-slate-100 bg-[#f8fbff] p-5 text-sm leading-7 text-slate-700">
                      {bio || tr("no_biography_yet", "No biography added yet.")}
                    </div>
                  </CardContent>
                </Card>

                {showReviews ? (
                  <Card className="rounded-[28px] border border-slate-200 bg-white shadow-none">
                    <CardContent className="p-5 sm:p-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xl font-extrabold text-slate-900">
                            {tr("reviews", "Reviews")}
                          </div>
                          <div className="text-sm text-slate-500">
                            {tr("reviews_subtitle", "See comments and leave a rating")}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {renderStars(Math.round(averageRating))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {reviews.length ? (
                          reviews.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-[20px] border border-slate-100 bg-[#f8fbff] p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff1dc] text-xs font-bold text-slate-700">
                                  {item.avatar ? (
                                    <img
                                      src={item.avatar}
                                      alt={item.author}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    initialsFromName(item.author) || "U"
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="truncate text-sm font-bold text-slate-900">
                                      {item.author}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-0.5">
                                      {renderStars(item.rating)}
                                    </div>
                                  </div>
                                  <div className="mt-1 text-sm leading-6 text-slate-600">
                                    {item.comment}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[20px] border border-dashed border-slate-300 bg-[#f8fbff] px-4 py-5 text-sm text-slate-500">
                            {tr("no_reviews_yet", "No reviews yet. Be the first to leave a comment.")}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 rounded-[22px] border border-slate-100 bg-[#f8fbff] p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <MessageCircle className="h-4 w-4 text-slate-500" />
                          {tr("leave_review", "Leave a review")}
                        </div>

                        <div className="mt-3 flex items-center gap-1">
                          {renderStars(reviewRating, true, setReviewRating)}
                          <span className="ml-2 text-xs text-slate-500">
                            {tr("choose_rating", "Choose up to 5 stars")}
                          </span>
                        </div>

                        <Textarea
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder={tr("write_review", "Write your comment here...")}
                          className="mt-3 min-h-[96px] rounded-[16px] border-slate-200 bg-white"
                        />

                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            onClick={onSubmitReview}
                            className="rounded-full bg-[#0f2f63] px-5 text-white hover:bg-[#123972]"
                          >
                            {tr("submit_review", "Submit Review")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              <Card className="rounded-[28px] border border-slate-200 bg-white shadow-none">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                        {role === "user"
                          ? tr("student_profile", "Student Profile")
                          : role === "agent"
                            ? tr("agent_details", "Agent Details")
                            : role === "tutor"
                              ? tr("tutor_details", "Tutor Details")
                              : role === "school"
                                ? tr("school_details", "School Details")
                                : tr("vendor_details", "Vendor Details")}
                      </div>
                      <div className="text-sm text-slate-500">
                        {tr("profile_information_panel", "Profile information panel")}
                      </div>
                    </div>

                    <div className="rounded-full bg-[#0f2f63] px-4 py-2 text-sm font-semibold text-white shadow-sm">
                      {tr("summary", "Summary")}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionBlock
                      title={tr("contact_and_status", "Contact & Status")}
                      subtitle={tr("basic_contact_status", "Basic contact details and account status")}
                    >
                      <div className="space-y-3">
                        {commonRows.map((row, idx) => (
                          <InfoRow
                            key={`${row.label}-${idx}`}
                            icon={row.icon}
                            label={row.label}
                            value={row.value}
                          />
                        ))}
                      </div>
                    </SectionBlock>

                    {role === "user" ? (
                      <>
                        <SectionBlock
                          title={tr("study_goal", "Study Goal")}
                          subtitle={tr(
                            "study_goal_subtitle",
                            "Where the student wants to study and what they want to take"
                          )}
                        >
                          <div className="grid gap-3">
                            {studentSummary?.targetCountry ? (
                              <InfoRow
                                icon={<Globe className="h-5 w-5" />}
                                label={tr("target_country", "Target Country")}
                                value={studentSummary.targetCountry}
                              />
                            ) : null}

                            {studentSummary?.targetProgram ? (
                              <InfoRow
                                icon={<BookOpen className="h-5 w-5" />}
                                label={tr("target_program", "Target Program")}
                                value={studentSummary.targetProgram}
                              />
                            ) : null}

                            {studentSummary?.intakeYear ? (
                              <InfoRow
                                icon={<CalendarDays className="h-5 w-5" />}
                                label={tr("intake_year", "Intake Year")}
                                value={String(studentSummary.intakeYear)}
                              />
                            ) : null}

                            {studentSummary?.budget ? (
                              <InfoRow
                                icon={<Wallet className="h-5 w-5" />}
                                label={tr("budget", "Budget")}
                                value={String(studentSummary.budget)}
                              />
                            ) : null}

                            {studentSummary?.scholarshipInterest ? (
                              <InfoRow
                                icon={<Star className="h-5 w-5" />}
                                label={tr("scholarship_interest", "Scholarship Interest")}
                                value={studentSummary.scholarshipInterest}
                              />
                            ) : null}
                          </div>
                        </SectionBlock>

                        <SectionBlock
                          title={tr("academic_snapshot", "Academic Snapshot")}
                          subtitle={tr(
                            "academic_snapshot_subtitle",
                            "Academic level, scores, and educational background"
                          )}
                        >
                          <div className="grid gap-3">
                            {studentSummary?.currentLevel ? (
                              <InfoRow
                                icon={<GraduationCap className="h-5 w-5" />}
                                label={tr("current_level", "Current Level")}
                                value={studentSummary.currentLevel}
                              />
                            ) : null}

                            {studentSummary?.age ? (
                              <InfoRow
                                icon={<UserRound className="h-5 w-5" />}
                                label={tr("age", "Age")}
                                value={String(studentSummary.age)}
                              />
                            ) : null}

                            {studentSummary?.gpa ? (
                              <InfoRow
                                icon={<CheckCircle2 className="h-5 w-5" />}
                                label={tr("gpa", "GPA")}
                                value={String(studentSummary.gpa)}
                              />
                            ) : null}

                            {studentSummary?.ielts ? (
                              <InfoRow
                                icon={<CheckCircle2 className="h-5 w-5" />}
                                label={tr("ielts", "IELTS")}
                                value={String(studentSummary.ielts)}
                              />
                            ) : null}

                            {studentSummary?.highSchool ? (
                              <InfoRow
                                icon={<GraduationCap className="h-5 w-5" />}
                                label={tr("high_school", "High School")}
                                value={studentSummary.highSchool}
                              />
                            ) : null}

                            {studentSummary?.university ? (
                              <InfoRow
                                icon={<Building className="h-5 w-5" />}
                                label={tr("university", "University / College")}
                                value={studentSummary.university}
                              />
                            ) : null}

                            {studentSummary?.academicBackground ? (
                              <InfoRow
                                icon={<BookOpen className="h-5 w-5" />}
                                label={tr("academic_summary", "Academic Summary")}
                                value={studentSummary.academicBackground}
                              />
                            ) : null}
                          </div>
                        </SectionBlock>

                        <SectionBlock
                          title={tr("preferences", "Preferences")}
                          subtitle={tr(
                            "preferences_subtitle",
                            "Programs, countries, study areas, and languages"
                          )}
                        >
                          <div className="space-y-5">
                            <div>
                              <div className="mb-2 text-sm font-extrabold text-slate-900">
                                {tr("preferred_programs", "Preferred Programs")}
                              </div>
                              <ChipList
                                items={studentArrays.preferred_programs}
                                emptyText={tr("no_preferred_programs", "No preferred programs added yet.")}
                              />
                            </div>

                            <div>
                              <div className="mb-2 text-sm font-extrabold text-slate-900">
                                {tr("programs_of_interest", "Programs of Interest")}
                              </div>
                              <ChipList
                                items={studentArrays.selected_courses}
                                emptyText={tr("no_courses", "No programs of interest added yet.")}
                              />
                            </div>

                            <div>
                              <div className="mb-2 text-sm font-extrabold text-slate-900">
                                {tr("preferred_study_countries", "Preferred Study Countries")}
                              </div>
                              <ChipList
                                items={studentArrays.preferred_countries}
                                emptyText={tr("no_countries", "No preferred countries added yet.")}
                              />
                            </div>

                            <div>
                              <div className="mb-2 text-sm font-extrabold text-slate-900">
                                {tr("study_areas", "Study Areas")}
                              </div>
                              <ChipList
                                items={studentArrays.study_areas}
                                emptyText={tr("no_areas", "No study areas added yet.")}
                              />
                            </div>

                            <div>
                              <div className="mb-2 text-sm font-extrabold text-slate-900">
                                {tr("languages_spoken", "Languages Spoken")}
                              </div>
                              <ChipList
                                items={studentArrays.spoken_languages}
                                emptyText={tr("no_languages", "No languages added yet.")}
                              />
                            </div>
                          </div>
                        </SectionBlock>

                        {studentSummary?.achievements ? (
                          <SectionBlock
                            title={tr("strengths", "Strengths")}
                            subtitle={tr(
                              "strengths_subtitle",
                              "Awards, leadership experience, and recognitions"
                            )}
                          >
                            <InfoRow
                              icon={<Star className="h-5 w-5" />}
                              label={tr(
                                "awards_leadership_recognitions",
                                "Awards, Leadership, and Recognitions"
                              )}
                              value={studentSummary.achievements}
                            />
                          </SectionBlock>
                        ) : null}
                      </>
                    ) : null}

                    {role === "agent" ? (
                      <SectionBlock
                        title={tr("agent_information", "Agent Information")}
                        subtitle={tr("agent_information_subtitle", "Company and business details")}
                      >
                        <div className="space-y-3">
                          {agentProfile?.company_name ? (
                            <InfoRow
                              icon={<Briefcase className="h-5 w-5" />}
                              label={tr("company_name", "Company Name")}
                              value={agentProfile.company_name}
                            />
                          ) : null}
                          {agentProfile?.business_license_mst ? (
                            <InfoRow
                              icon={<CheckCircle2 className="h-5 w-5" />}
                              label={tr("business_license_mst", "Business License (MST)")}
                              value={agentProfile.business_license_mst}
                            />
                          ) : null}
                          {agentProfile?.year_established ? (
                            <InfoRow
                              icon={<CalendarDays className="h-5 w-5" />}
                              label={tr("year_established", "Year Established")}
                              value={String(agentProfile.year_established)}
                            />
                          ) : null}
                          {agentProfile?.paypal_email ? (
                            <InfoRow
                              icon={<Wallet className="h-5 w-5" />}
                              label={tr("paypal_email", "PayPal Email")}
                              value={agentProfile.paypal_email}
                            />
                          ) : null}
                        </div>
                      </SectionBlock>
                    ) : null}

                    {role === "tutor" ? (
                      <>
                        <SectionBlock
                          title={tr("tutor_information", "Tutor Information")}
                          subtitle={tr("tutor_information_subtitle", "Experience and payment details")}
                        >
                          <div className="space-y-3">
                            {tutorProfile?.experience_years !== undefined &&
                            tutorProfile?.experience_years !== "" ? (
                              <InfoRow
                                icon={<Briefcase className="h-5 w-5" />}
                                label={tr("experience_years", "Years of Experience")}
                                value={String(tutorProfile.experience_years)}
                              />
                            ) : null}
                            {tutorProfile?.hourly_rate !== undefined &&
                            tutorProfile?.hourly_rate !== "" ? (
                              <InfoRow
                                icon={<Wallet className="h-5 w-5" />}
                                label={tr("hourly_rate_usd", "Hourly Rate (USD)")}
                                value={`$${tutorProfile.hourly_rate}`}
                              />
                            ) : null}
                            {tutorProfile?.paypal_email ? (
                              <InfoRow
                                icon={<Mail className="h-5 w-5" />}
                                label={tr("paypal_email", "PayPal Email")}
                                value={tutorProfile.paypal_email}
                              />
                            ) : null}
                          </div>
                        </SectionBlock>

                        <SectionBlock
                          title={tr("specializations", "Specializations")}
                          subtitle={tr("specializations_subtitle", "Subjects or training focus areas")}
                        >
                          <ChipList
                            items={tutorSpecializations}
                            emptyText={tr("no_specializations", "No specializations added yet.")}
                          />
                        </SectionBlock>
                      </>
                    ) : null}

                    {role === "school" ? (
                      <SectionBlock
                        title={tr("school_information", "School Information")}
                        subtitle={tr("school_information_subtitle", "Institution details")}
                      >
                        <div className="space-y-3">
                          {schoolProfile?.school_name ? (
                            <InfoRow
                              icon={<Building className="h-5 w-5" />}
                              label={tr("institution_name", "Institution Name")}
                              value={schoolProfile.school_name}
                            />
                          ) : null}
                          {schoolProfile?.type ? (
                            <InfoRow
                              icon={<GraduationCap className="h-5 w-5" />}
                              label={tr("school_type", "School Type")}
                              value={schoolProfile.type}
                            />
                          ) : null}
                          {schoolProfile?.location ? (
                            <InfoRow
                              icon={<MapPin className="h-5 w-5" />}
                              label={tr("city_location", "City/Location")}
                              value={schoolProfile.location}
                            />
                          ) : null}
                          {schoolProfile?.website ? (
                            <InfoRow
                              icon={<Globe className="h-5 w-5" />}
                              label={tr("official_website", "Official Website")}
                              value={schoolProfile.website}
                            />
                          ) : null}
                          {schoolProfile?.about ? (
                            <InfoRow
                              icon={<BookOpen className="h-5 w-5" />}
                              label={tr("about_institution", "About Institution")}
                              value={schoolProfile.about}
                            />
                          ) : null}
                        </div>
                      </SectionBlock>
                    ) : null}

                    {role === "vendor" ? (
                      <>
                        <SectionBlock
                          title={tr("vendor_information", "Vendor Information")}
                          subtitle={tr("vendor_information_subtitle", "Business and payment details")}
                        >
                          <div className="space-y-3">
                            {vendorProfile?.business_name ? (
                              <InfoRow
                                icon={<Store className="h-5 w-5" />}
                                label={tr("business_name", "Business Name")}
                                value={vendorProfile.business_name}
                              />
                            ) : null}
                            {vendorProfile?.paypal_email ? (
                              <InfoRow
                                icon={<Wallet className="h-5 w-5" />}
                                label={tr("paypal_email", "PayPal Email")}
                                value={vendorProfile.paypal_email}
                              />
                            ) : null}
                          </div>
                        </SectionBlock>

                        <SectionBlock
                          title={tr("service_categories", "Service Categories")}
                          subtitle={tr("service_categories_subtitle", "Available service types")}
                        >
                          <ChipList
                            items={vendorCategories}
                            emptyText={tr("no_categories", "No service categories added yet.")}
                          />
                        </SectionBlock>
                      </>
                    ) : null}

                    {loading ? (
                      <div className="mt-2 text-sm text-slate-500">{tr("loading", "Loading...")}</div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}