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
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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

function compactText(value, fallback) {
  return String(value || fallback || "").trim();
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
        <Star className={`h-4 w-4 ${active ? "fill-[#f59e0b] text-[#f59e0b]" : "text-slate-300"}`} />
      </button>
    );
  });
}

function normalizeReviewItem(item, idx) {
  if (!item || typeof item !== "object") return null;
  const author =
    item.author || item.userName || item.name || item.full_name || item.displayName || `User ${idx + 1}`;
  const comment = item.comment || item.text || item.message || item.review || "";
  const ratingNum = Number(item.rating || item.stars || item.score || 0);
  const rating = Number.isFinite(ratingNum) ? Math.max(1, Math.min(5, Math.round(ratingNum))) : 5;
  return {
    id: item.id || `review-${idx}`,
    author,
    comment: comment || "Great profile.",
    rating,
    avatar: item.avatar || item.photoURL || item.profile_picture || "",
  };
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-[18px] bg-[#fffaf3] px-3 py-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoBlock({ title, value, icon, accent = "bg-slate-500" }) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-[#fbfdff] px-4 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-bold leading-5 text-slate-900">{title}</div>
          <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
            {value}
          </div>

          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${accent}`} style={{ width: "88%" }} />
          </div>
        </div>
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

export default function ViewProfile() {
  const { tr } = useTr("view_profile");
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

  const canFollow = !!myUid && !!uid && myUid !== uid;

  const nameText =
    user?.full_name || user?.name || user?.displayName || user?.email || uid || tr("unknown", "Unknown");

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
      selected_courses: asArray(user?.selected_courses),
      preferred_countries: asArray(user?.preferred_countries),
      study_areas: asArray(user?.study_areas),
      spoken_languages: asArray(user?.spoken_languages),
      interests: asArray(user?.interests),
      education: asArray(user?.education),
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

  const profileStats = useMemo(
    () => [
      {
        label: tr("role", "Role"),
        value: roleLabel(role, tr),
        icon: <UserRound className="h-4 w-4" />,
      },
      {
        label: tr("country", "Country"),
        value: compactText(name || code, tr("not_available", "Not available")),
        icon: <Globe className="h-4 w-4" />,
      },
      {
        label: tr("contact", "Contact"),
        value: compactText(phone || email, tr("not_available", "Not available")),
        icon: <Phone className="h-4 w-4" />,
      },
      {
        label: tr("status", "Status"),
        value:
          user?.verification?.status === "verified" || user?.is_verified
            ? tr("verified", "Verified")
            : tr("active", "Active"),
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
      {
        label: tr("member_since", "Member Since"),
        value: memberSince,
        icon: <CalendarDays className="h-4 w-4" />,
      },
      {
        label: tr("language", "Language"),
        value: compactText(user?.lang || user?.language, tr("not_available", "Not available")),
        icon: <Globe className="h-4 w-4" />,
      },
    ],
    [tr, role, name, code, phone, email, user, memberSince]
  );

  const mainInfoRows = useMemo(() => {
    const rows = [];

    if (bio) {
      rows.push({
        key: "bio",
        title: tr("bio", "Biography / Description"),
        value: bio,
        icon: <UserRound className="h-5 w-5 text-slate-500" />,
        accent: "bg-amber-500",
      });
    }

    if (email) {
      rows.push({
        key: "email",
        title: tr("email", "Email"),
        value: email,
        icon: <Mail className="h-5 w-5 text-slate-500" />,
        accent: "bg-emerald-500",
      });
    }

    if (phone) {
      rows.push({
        key: "phone",
        title: tr("phone", "Phone"),
        value: phone,
        icon: <Phone className="h-5 w-5 text-slate-500" />,
        accent: "bg-blue-500",
      });
    }

    if (name || code) {
      rows.push({
        key: "country",
        title: tr("country", "Country"),
        value: name || code,
        icon: <Globe className="h-5 w-5 text-slate-500" />,
        accent: "bg-violet-500",
      });
    }

    if (headline) {
      rows.push({
        key: "headline",
        title: tr("headline", "Headline"),
        value: headline,
        icon: <Briefcase className="h-5 w-5 text-slate-500" />,
        accent: "bg-orange-500",
      });
    }

    if (!rows.length) {
      rows.push({
        key: "empty",
        title: tr("profile_details", "Profile details"),
        value: tr("no_additional_information", "No additional information yet."),
        icon: <UserRound className="h-5 w-5 text-slate-500" />,
        accent: "bg-slate-400",
      });
    }

    return rows;
  }, [tr, bio, email, phone, name, code, headline]);

  const roleSpecificRows = useMemo(() => {
    const rows = [];

    if (role === "user") {
      if (user?.current_level) {
        rows.push({
          key: "current_level",
          title: tr("current_level", "Current Level"),
          value: user.current_level,
          icon: <GraduationCap className="h-5 w-5 text-slate-500" />,
          accent: "bg-cyan-500",
        });
      }
      if (user?.age) {
        rows.push({
          key: "age",
          title: tr("age", "Age"),
          value: String(user.age),
          icon: <UserRound className="h-5 w-5 text-slate-500" />,
          accent: "bg-pink-500",
        });
      }
      if (user?.interested_in) {
        rows.push({
          key: "interested_in",
          title: tr("interested_in", "Interested In"),
          value: user.interested_in,
          icon: <BookOpen className="h-5 w-5 text-slate-500" />,
          accent: "bg-indigo-500",
        });
      }
      if (user?.comments) {
        rows.push({
          key: "comments",
          title: tr("comments", "Comments"),
          value: user.comments,
          icon: <MessageCircle className="h-5 w-5 text-slate-500" />,
          accent: "bg-slate-500",
        });
      }
    }

    if (role === "agent") {
      if (agentProfile?.company_name) {
        rows.push({
          key: "company_name",
          title: tr("company_name", "Company Name"),
          value: agentProfile.company_name,
          icon: <Briefcase className="h-5 w-5 text-slate-500" />,
          accent: "bg-orange-500",
        });
      }
      if (agentProfile?.business_license_mst) {
        rows.push({
          key: "business_license_mst",
          title: tr("business_license_mst", "Business License (MST)"),
          value: agentProfile.business_license_mst,
          icon: <CheckCircle2 className="h-5 w-5 text-slate-500" />,
          accent: "bg-emerald-500",
        });
      }
      if (agentProfile?.year_established) {
        rows.push({
          key: "year_established",
          title: tr("year_established", "Year Established"),
          value: String(agentProfile.year_established),
          icon: <CalendarDays className="h-5 w-5 text-slate-500" />,
          accent: "bg-blue-500",
        });
      }
      if (agentProfile?.paypal_email) {
        rows.push({
          key: "paypal_email",
          title: tr("paypal_email", "PayPal Email"),
          value: agentProfile.paypal_email,
          icon: <Wallet className="h-5 w-5 text-slate-500" />,
          accent: "bg-violet-500",
        });
      }
    }

    if (role === "tutor") {
      if (tutorProfile?.experience_years !== undefined && tutorProfile?.experience_years !== "") {
        rows.push({
          key: "experience_years",
          title: tr("experience_years", "Years of Experience"),
          value: String(tutorProfile.experience_years),
          icon: <Briefcase className="h-5 w-5 text-slate-500" />,
          accent: "bg-emerald-500",
        });
      }
      if (tutorProfile?.hourly_rate !== undefined && tutorProfile?.hourly_rate !== "") {
        rows.push({
          key: "hourly_rate",
          title: tr("hourly_rate_usd", "Hourly Rate (USD)"),
          value: `$${tutorProfile.hourly_rate}`,
          icon: <Wallet className="h-5 w-5 text-slate-500" />,
          accent: "bg-blue-500",
        });
      }
      if (tutorProfile?.paypal_email) {
        rows.push({
          key: "paypal_email",
          title: tr("paypal_email", "PayPal Email"),
          value: tutorProfile.paypal_email,
          icon: <Mail className="h-5 w-5 text-slate-500" />,
          accent: "bg-violet-500",
        });
      }
    }

    if (role === "school") {
      if (schoolProfile?.school_name) {
        rows.push({
          key: "school_name",
          title: tr("institution_name", "Institution Name"),
          value: schoolProfile.school_name,
          icon: <Building className="h-5 w-5 text-slate-500" />,
          accent: "bg-orange-500",
        });
      }
      if (schoolProfile?.type) {
        rows.push({
          key: "type",
          title: tr("school_type", "School Type"),
          value: schoolProfile.type,
          icon: <GraduationCap className="h-5 w-5 text-slate-500" />,
          accent: "bg-emerald-500",
        });
      }
      if (schoolProfile?.location) {
        rows.push({
          key: "location",
          title: tr("city_location", "City/Location"),
          value: schoolProfile.location,
          icon: <MapPin className="h-5 w-5 text-slate-500" />,
          accent: "bg-blue-500",
        });
      }
      if (schoolProfile?.website) {
        rows.push({
          key: "website",
          title: tr("official_website", "Official Website"),
          value: schoolProfile.website,
          icon: <Globe className="h-5 w-5 text-slate-500" />,
          accent: "bg-violet-500",
        });
      }
      if (schoolProfile?.about) {
        rows.push({
          key: "about",
          title: tr("about_institution", "About Your Institution"),
          value: schoolProfile.about,
          icon: <BookOpen className="h-5 w-5 text-slate-500" />,
          accent: "bg-amber-500",
        });
      }
    }

    if (role === "vendor") {
      if (vendorProfile?.business_name) {
        rows.push({
          key: "business_name",
          title: tr("business_name", "Business Name"),
          value: vendorProfile.business_name,
          icon: <Store className="h-5 w-5 text-slate-500" />,
          accent: "bg-orange-500",
        });
      }
      if (vendorProfile?.paypal_email) {
        rows.push({
          key: "paypal_email",
          title: tr("paypal_email", "PayPal Email"),
          value: vendorProfile.paypal_email,
          icon: <Wallet className="h-5 w-5 text-slate-500" />,
          accent: "bg-blue-500",
        });
      }
    }

    return rows;
  }, [role, user, agentProfile, tutorProfile, schoolProfile, vendorProfile, tr]);

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

  return (
    <div className="min-h-screen bg-[#eef3f8] px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="text-[24px] font-extrabold tracking-tight text-[#19a34a]">GreenPass</div>
              <div className="text-xs text-slate-500">{tr("view_profile", "Profile")}</div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="rounded-xl border-slate-200 bg-white text-slate-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tr("back", "Back")}
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
              <Card className="rounded-[26px] border border-slate-200 bg-[#f8fbff] shadow-none">
                <CardContent className="p-4 sm:p-5">
                  <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {tr("personalized", "Personalized")}
                  </div>

                  <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
                      <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="mx-auto flex h-44 w-full items-center justify-center overflow-hidden rounded-[22px] bg-[#dfe8f1] text-4xl font-bold text-[#173562] sm:h-56">
                          {avatar ? (
                            <img src={avatar} alt={nameText} className="h-full w-full object-cover" />
                          ) : (
                            initialsFromName(nameText) || "U"
                          )}
                        </div>

                        <div className="mt-4 text-center text-[28px] font-extrabold leading-tight tracking-tight text-[#0f2f63] sm:text-[32px] line-clamp-2">
                          {nameText}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                          <Badge className="rounded-full bg-[#0f2f63] px-3 py-1 text-white hover:bg-[#0f2f63]">
                            {roleLabel(role, tr)}
                          </Badge>

                          {(user?.verification?.status === "verified" || user?.is_verified) ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
                            >
                              {tr("verified", "Verified")}
                            </Badge>
                          ) : null}
                        </div>

                        {(name || code) ? (
                          <div className="mt-3 flex items-center justify-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
                              {flagUrl ? (
                                <img
                                  src={flagUrl}
                                  alt={code ? `${code} flag` : "flag"}
                                  className="h-4 w-6 rounded-sm object-cover"
                                  loading="lazy"
                                />
                              ) : null}
                              <span className="truncate max-w-[140px]">{name || code}</span>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="rounded-[24px] bg-[#fff7ee] p-4 ring-1 ring-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {[avatar, avatar, avatar].map((src, idx) => (
                                <div
                                  key={idx}
                                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-slate-200 text-xs font-bold text-slate-700"
                                >
                                  {src ? (
                                    <img src={src} alt="avatar" className="h-full w-full object-cover" />
                                  ) : (
                                    initialsFromName(nameText) || "U"
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-1 text-[#f59e0b]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className="h-5 w-5 fill-current" />
                            ))}
                            <span className="ml-2 text-sm font-semibold text-slate-600">
                              {averageRating.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-100 bg-white px-3 py-3 shadow-sm">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff1dc] text-sm font-bold text-slate-700">
                              {avatar ? (
                                <img src={avatar} alt={nameText} className="h-full w-full object-cover" />
                              ) : (
                                initialsFromName(nameText) || "U"
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-base font-bold text-slate-900">{nameText}</div>
                              <div className="truncate text-sm text-slate-500">
                                {bio || headline || tr("profile_details", "Profile details")}
                              </div>
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                        </div>

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

                    <div className="mt-5 rounded-[26px] border border-slate-200 bg-[#fbfdff] p-4 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-extrabold text-slate-900">
                            {tr("reviews", "Reviews")}
                          </div>
                          <div className="text-sm text-slate-500">
                            {tr("reviews_subtitle", "See comments and leave a rating")}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">{renderStars(Math.round(averageRating))}</div>
                      </div>

                      <div className="space-y-3">
                        {reviews.length ? (
                          reviews.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff1dc] text-xs font-bold text-slate-700">
                                  {item.avatar ? (
                                    <img src={item.avatar} alt={item.author} className="h-full w-full object-cover" />
                                  ) : (
                                    initialsFromName(item.author) || "U"
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="truncate text-sm font-bold text-slate-900">{item.author}</div>
                                    <div className="flex shrink-0 items-center gap-0.5">{renderStars(item.rating)}</div>
                                  </div>
                                  <div className="mt-1 text-sm leading-6 text-slate-600">{item.comment}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                            {tr("no_reviews_yet", "No reviews yet. Be the first to leave a comment.")}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
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
                          className="mt-3 min-h-[96px] rounded-[16px] border-slate-200"
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[26px] border border-slate-200 bg-white shadow-none">
                <CardContent className="p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                        {role === "user"
                          ? tr("student_info", "Student Info")
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

                  <div className="space-y-3">
                    {mainInfoRows.map((item) => (
                      <InfoBlock
                        key={item.key}
                        title={item.title}
                        value={item.value}
                        icon={item.icon}
                        accent={item.accent}
                      />
                    ))}

                    {roleSpecificRows.map((item) => (
                      <InfoBlock
                        key={item.key}
                        title={item.title}
                        value={item.value}
                        icon={item.icon}
                        accent={item.accent}
                      />
                    ))}
                  </div>

                  {role === "user" ? (
                    <div className="mt-5 space-y-4">
                      <div className="rounded-[22px] border border-slate-100 bg-[#fbfdff] p-4 shadow-sm">
                        <div className="mb-3 text-base font-bold text-slate-900">
                          {tr("courses", "Courses")}
                        </div>
                        <ChipList
                          items={studentArrays.selected_courses}
                          emptyText={tr("no_courses", "No courses added yet.")}
                        />
                      </div>

                      <div className="rounded-[22px] border border-slate-100 bg-[#fbfdff] p-4 shadow-sm">
                        <div className="mb-3 text-base font-bold text-slate-900">
                          {tr("countries", "Countries")}
                        </div>
                        <ChipList
                          items={studentArrays.preferred_countries}
                          emptyText={tr("no_countries", "No preferred countries added yet.")}
                        />
                      </div>

                      <div className="rounded-[22px] border border-slate-100 bg-[#fbfdff] p-4 shadow-sm">
                        <div className="mb-3 text-base font-bold text-slate-900">
                          {tr("areas", "Areas")}
                        </div>
                        <ChipList
                          items={studentArrays.study_areas}
                          emptyText={tr("no_areas", "No study areas added yet.")}
                        />
                      </div>

                      <div className="rounded-[22px] border border-slate-100 bg-[#fbfdff] p-4 shadow-sm">
                        <div className="mb-3 text-base font-bold text-slate-900">
                          {tr("languages", "Languages")}
                        </div>
                        <ChipList
                          items={studentArrays.spoken_languages}
                          emptyText={tr("no_languages", "No languages added yet.")}
                        />
                      </div>
                    </div>
                  ) : null}

                  {role === "tutor" ? (
                    <div className="mt-5 rounded-[22px] border border-slate-100 bg-[#fbfdff] p-4 shadow-sm">
                      <div className="mb-3 text-base font-bold text-slate-900">
                        {tr("specializations", "Specializations")}
                      </div>
                      <ChipList
                        items={tutorSpecializations}
                        emptyText={tr("no_specializations", "No specializations added yet.")}
                      />
                    </div>
                  ) : null}

                  {role === "vendor" ? (
                    <div className="mt-5 rounded-[22px] border border-slate-100 bg-[#fbfdff] p-4 shadow-sm">
                      <div className="mb-3 text-base font-bold text-slate-900">
                        {tr("service_categories", "Service Categories")}
                      </div>
                      <ChipList
                        items={vendorCategories}
                        emptyText={tr("no_categories", "No service categories added yet.")}
                      />
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {profileStats.map((item) => (
                      <StatCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
                    ))}
                  </div>

                  {loading ? <div className="mt-4 text-sm text-slate-500">{tr("loading", "Loading...")}</div> : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}