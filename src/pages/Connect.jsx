import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Filter,
  Star,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  GraduationCap,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";

import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useTr } from "@/i18n/useTr";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";

const createPageUrl = (pageName) => {
  switch (pageName) {
    case "Welcome":
      return "/welcome";
    default:
      return `/${pageName.toLowerCase()}`;
  }
};

const isIso2 = (code) => /^[A-Z]{2}$/.test((code || "").trim().toUpperCase());

const codeToFlagEmoji = (code) => {
  const cc = (code || "").trim().toUpperCase();
  if (!isIso2(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
};

const flagPngUrl = (code) => {
  const cc = (code || "").trim().toUpperCase();
  if (!isIso2(cc)) return "";
  return `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
};

function CountryFlag({ code, className = "" }) {
  const cc = (code || "").trim().toUpperCase();
  const [imgOk, setImgOk] = useState(true);
  const url = useMemo(() => flagPngUrl(cc), [cc]);
  const emoji = useMemo(() => codeToFlagEmoji(cc), [cc]);

  if (!isIso2(cc)) return null;

  if (!url || !imgOk) {
    return emoji ? <span className={className}>{emoji}</span> : null;
  }

  return (
    <img
      src={url}
      alt={`${cc} flag`}
      className={["h-4 w-6 rounded-sm object-cover", className].join(" ")}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setImgOk(false)}
    />
  );
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

function StarSummary({
  value = 0,
  count = 0,
  className = "",
  withDropdown = false,
  isOpen = false,
  onToggle = null,
}) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <div className={["flex items-center gap-2", className].join(" ")}>
      <span className="text-[15px] font-semibold text-slate-800">
        {(Number(value) || 0).toFixed(1)}
      </span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const active = i < rounded;
          return (
            <Star
              key={i}
              className={`h-5 w-5 ${active ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#f59e0b]"}`}
            />
          );
        })}
      </div>
      <span className="text-[15px] font-semibold text-[#2C5E93]">({count})</span>
      {withDropdown ? (
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          aria-label="Toggle rating breakdown"
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      ) : null}
    </div>
  );
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

function getCountryText(item) {
  return item?.country || item?.selected_country || item?.countryName || "Canada";
}

function getCountryCode(item) {
  return String(
    item?.country_code ||
      item?.countryCode ||
      item?.selected_country_code ||
      item?.selectedCountryCode ||
      ""
  )
    .trim()
    .toUpperCase();
}

function getAvatar(item) {
  const fallbackName =
    item?.full_name ||
    item?.name ||
    item?.company_name ||
    "User";

  return (
    item?.profile_picture ||
    item?.profilePhoto ||
    item?.profile_photo ||
    item?.photoURL ||
    item?.avatar ||
    item?.avatarUrl ||
    item?.image ||
    item?.imageUrl ||
    `https://ui-avatars.com/api/?background=DFE8F1&color=173562&name=${encodeURIComponent(fallbackName)}`
  );
}

function EntityListRow({ item, isSelected, onSelect, type, tr }) {
  const name =
    type === "agent"
      ? item.company_name || item.full_name || tr("unknown", "Unknown")
      : item.full_name || item.name || tr("unknown", "Unknown");
  const avatar = getAvatar(item);
  const countryText = getCountryText(item);
  const countryCode = getCountryCode(item);

  return (
    <motion.button
      type="button"
      layout
      onClick={onSelect}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "w-full text-left rounded-[18px] border p-3 shadow-sm",
        "transition-[border-color,box-shadow,background-color,transform] duration-200",
        isSelected
          ? "border-[#0f2f63] bg-white shadow-[0_4px_18px_rgba(15,47,99,0.08)]"
          : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff1dc] text-xs font-bold text-slate-700">
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{name}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <CountryFlag code={countryCode} />
              <span className="truncate">{countryText}</span>
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </div>
    </motion.button>
  );
}

function ReviewCard({ item }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
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
  );
}

function ReviewBreakdownDropdown({ reviews = [] }) {
  const distribution = useMemo(() => {
    const total = reviews.length || 0;
    return [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((item) => Math.round(Number(item.rating || 0)) === star).length;
      const percentage = total ? Math.round((count / total) * 100) : 0;
      return { star, count, percentage };
    });
  }, [reviews]);

  return (
    <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-2.5">
        {distribution.map((row) => (
          <div key={row.star} className="grid grid-cols-[88px_minmax(0,1fr)_56px] items-center gap-4">
            <div className="text-[15px] font-medium text-[#2C5E93]">{row.star} star</div>
            <div className="h-4 overflow-hidden rounded-full border border-slate-300 bg-white">
              <div className="h-full bg-[#ff6a00]" style={{ width: `${row.percentage}%` }} />
            </div>
            <div className="text-right text-[15px] font-medium text-[#2C5E93]">{row.percentage}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function maskEmail(email) {
  const value = String(email || "").trim();
  if (!value || !value.includes("@")) return "No email available";

  const [local, domain] = value.split("@");
  const safeLocal =
    local.length <= 2
      ? `${local[0] || ""}*`
      : `${local.slice(0, 2)}${"*".repeat(Math.max(2, local.length - 2))}`;

  return `${safeLocal}@${domain}`;
}

function getEmail(item) {
  return (
    item?.email ||
    item?.user_email ||
    item?.emailAddress ||
    item?.contact_email ||
    item?.contactEmail ||
    ""
  );
}

function getPhone(item) {
  return (
    item?.phone ||
    item?.phone_number ||
    item?.phoneNumber ||
    item?.mobile ||
    item?.mobile_number ||
    item?.mobileNumber ||
    item?.contact_number ||
    item?.contactNumber ||
    item?.whatsapp ||
    item?.whatsApp ||
    ""
  );
}

function maskPhone(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return "No number available";

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return raw;

  const last4 = digits.slice(-4);
  return `+•• ••• ••• ${last4}`;
}

function RightSideDirectoryTabs({
  tr,
  activeTab,
  onTabChange,
  agentList,
  tutorList,
  userList,
  selectedId,
  onSelectItem,
  selectedCountry,
  onCountryChange,
  countryOptions,
  hiddenRole,
}) {
  const visibleTabs = [
    hiddenRole !== "agent"
      ? { value: "agent", label: tr("agents", "Agents"), icon: Briefcase }
      : null,
    hiddenRole !== "tutor"
      ? { value: "tutor", label: tr("tutors", "Tutors"), icon: GraduationCap }
      : null,
    hiddenRole !== "user"
      ? { value: "user", label: tr("users", "Users"), icon: Users }
      : null,
  ].filter(Boolean);

  const list =
    activeTab === "agent"
      ? agentList
      : activeTab === "tutor"
      ? tutorList
      : userList;

  return (
    <Card className="h-full rounded-[26px] border border-slate-200 bg-white shadow-none">
      <CardContent className="flex h-full min-h-0 flex-col p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-900">{tr("directory", "Directory")}</div>
            <div className="text-xs text-slate-500">{tr("select_from_list", "Select from the list")}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="min-w-[170px]">
              <Select value={selectedCountry} onValueChange={onCountryChange}>
                <SelectTrigger className="h-10 rounded-full border-slate-200 bg-white">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <SelectValue placeholder={tr("country", "Country")} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("all_countries", "All Countries")}</SelectItem>
                  {countryOptions.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Badge className="rounded-full bg-[#0f2f63] px-4 py-2 text-white hover:bg-[#0f2f63]">
              {list.length}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={onTabChange} className="mb-4 shrink-0">
          <TabsList
            className="grid h-12 w-full rounded-full bg-[#eef3f8] p-1"
            style={{ gridTemplateColumns: `repeat(${Math.max(visibleTabs.length, 1)}, minmax(0, 1fr))` }}
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-full data-[state=active]:bg-[#0f2f63] data-[state=active]:text-white"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-2.5">
            {list.length ? (
              list.map((item) => (
                <EntityListRow
                  key={item.id}
                  item={item}
                  type={activeTab}
                  tr={tr}
                  isSelected={item.id === selectedId}
                  onSelect={() => onSelectItem(item.id)}
                />
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                {activeTab === "agent"
                  ? tr("no_agents_found", "No agents found.")
                  : activeTab === "tutor"
                  ? tr("no_tutors_found", "No tutors found.")
                  : tr("no_users_found", "No users found.")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Connect() {
  const { tr } = useTr("connect");

  const [currentUserDoc, setCurrentUserDoc] = useState(null);

  const myRole = useMemo(() => {
    const raw = String(
      currentUserDoc?.role ||
        currentUserDoc?.selected_role ||
        currentUserDoc?.user_type ||
        currentUserDoc?.userType ||
        ""
    )
      .trim()
      .toLowerCase();

    if (raw === "student") return "user";
    if (["user", "agent", "tutor"].includes(raw)) return raw;
    return "";
  }, [currentUserDoc]);

  const [activeTab, setActiveTab] = useState("agent");
  const [allAgents, setAllAgents] = useState([]);
  const [allTutors, setAllTutors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [filteredTutors, setFilteredTutors] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [selectedTutorId, setSelectedTutorId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userHasSelected, setUserHasSelected] = useState(false);
  const [lockedDisplay, setLockedDisplay] = useState(null);

  const [selectingAgent, setSelectingAgent] = useState(null);
  const [assignedAgent, setAssignedAgent] = useState(null);
  const [pendingAgent, setPendingAgent] = useState(null);

  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [localReviews, setLocalReviews] = useState([]);
  const [remoteReviews, setRemoteReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showRatingBreakdown, setShowRatingBreakdown] = useState(false);

  const fetchUsersForRole = useCallback(async (roleOrRoles) => {
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    const usersRef = collection(db, "users");
    const byId = new Map();

    await Promise.all(
      roles.flatMap((role) => [
        query(usersRef, where("user_type", "==", role)),
        query(usersRef, where("userType", "==", role)),
        query(usersRef, where("role", "==", role)),
        query(usersRef, where("selected_role", "==", role)),
      ]).map(async (q1) => {
        const snap = await getDocs(q1);
        snap.forEach((docSnap) => {
          const d = docSnap.data() || {};
          byId.set(docSnap.id, { id: docSnap.id, ...d });
        });
      })
    );

    return Array.from(byId.values());
  }, []);

  const getUserDoc = useCallback(async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { id: uid, ...snap.data() } : null;
  }, []);

  const fetchAssignedAgent = useCallback(async (user) => {
    if (!user?.assigned_agent_id) {
      setAssignedAgent(null);
      return null;
    }

    try {
      const agentUser = await getUserDoc(user.assigned_agent_id);
      setAssignedAgent(agentUser);
      return agentUser;
    } catch {
      setAssignedAgent(null);
      return null;
    }
  }, [getUserDoc]);

  const fetchPendingAgent = useCallback(async (user) => {
    const req = user?.agent_reassignment_request;
    const targetId = req?.new_agent_id;
    if (!targetId || req?.status !== "pending") {
      setPendingAgent(null);
      return null;
    }

    try {
      const agentUser = await getUserDoc(targetId);
      setPendingAgent(agentUser);
      return agentUser;
    } catch {
      setPendingAgent(null);
      return null;
    }
  }, [getUserDoc]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setError("");

      try {
        let myDoc = null;
        if (fbUser?.uid) {
          myDoc = await getUserDoc(fbUser.uid);
          setCurrentUserDoc(myDoc);
        } else {
          setCurrentUserDoc(null);
        }

        const [agents, tutors, users] = await Promise.all([
          fetchUsersForRole("agent"),
          fetchUsersForRole("tutor"),
          fetchUsersForRole(["user", "student"]),
        ]);

        setAllAgents(agents);
        setAllTutors(tutors);
        setAllUsers(users);
        setFilteredAgents(agents);
        setFilteredTutors(tutors);
        setFilteredUsers(users);

        if (agents.length) setSelectedAgentId((prev) => prev || agents[0].id);
        if (tutors.length) setSelectedTutorId((prev) => prev || tutors[0].id);
        if (users.length) setSelectedUserId((prev) => prev || users[0].id);

        if (myDoc) {
          await fetchAssignedAgent(myDoc);
          await fetchPendingAgent(myDoc);
        } else {
          setAssignedAgent(null);
          setPendingAgent(null);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load directory. Please try again later.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub && unsub();
  }, [fetchAssignedAgent, fetchPendingAgent, fetchUsersForRole, getUserDoc]);

  useEffect(() => {
    const filterByCountry = (u) =>
      selectedCountry === "all" ||
      String(u.country || u.selected_country || u.countryName || "").toLowerCase() === selectedCountry.toLowerCase();

    setFilteredAgents(allAgents.filter(filterByCountry));
    setFilteredTutors(allTutors.filter(filterByCountry));
    setFilteredUsers(allUsers.filter(filterByCountry));
  }, [allAgents, allTutors, allUsers, selectedCountry]);

  useEffect(() => {
    if (filteredAgents.length && !filteredAgents.some((x) => x.id === selectedAgentId)) {
      setSelectedAgentId(filteredAgents[0].id);
    }
    if (!filteredAgents.length) setSelectedAgentId(null);
  }, [filteredAgents, selectedAgentId]);

  useEffect(() => {
    if (filteredTutors.length && !filteredTutors.some((x) => x.id === selectedTutorId)) {
      setSelectedTutorId(filteredTutors[0].id);
    }
    if (!filteredTutors.length) setSelectedTutorId(null);
  }, [filteredTutors, selectedTutorId]);

  useEffect(() => {
    if (filteredUsers.length && !filteredUsers.some((x) => x.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].id);
    }
    if (!filteredUsers.length) setSelectedUserId(null);
  }, [filteredUsers, selectedUserId]);

  useEffect(() => {
    const availableTabs = ["agent", "tutor", "user"].filter((tab) => tab !== myRole);
    if (!availableTabs.length) return;
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [myRole, activeTab]);

  const fallbackSelectedEntity = useMemo(() => {
    if (activeTab === "agent") {
      return filteredAgents.find((x) => x.id === selectedAgentId) || filteredAgents[0] || null;
    }
    if (activeTab === "tutor") {
      return filteredTutors.find((x) => x.id === selectedTutorId) || filteredTutors[0] || null;
    }
    return filteredUsers.find((x) => x.id === selectedUserId) || filteredUsers[0] || null;
  }, [activeTab, filteredAgents, filteredTutors, filteredUsers, selectedAgentId, selectedTutorId, selectedUserId]);

  const displayedEntity = userHasSelected && lockedDisplay ? lockedDisplay : fallbackSelectedEntity;
  const displayedRole =
    displayedEntity?.user_type ||
    displayedEntity?.userType ||
    displayedEntity?.role ||
    displayedEntity?.selected_role ||
    activeTab;
  const displayedEntityId = displayedEntity?.id || null;

  useEffect(() => {
    setLocalReviews([]);
    setReviewText("");
    setReviewRating(5);
    setShowRatingBreakdown(false);
  }, [displayedEntityId, displayedRole]);

  useEffect(() => {
    if (!userHasSelected || !lockedDisplay?.id) return;

    const source = [...allAgents, ...allTutors, ...allUsers];
    const refreshed = source.find((item) => item.id === lockedDisplay.id);
    if (refreshed) {
      setLockedDisplay(refreshed);
    }
  }, [allAgents, allTutors, allUsers, lockedDisplay?.id, userHasSelected]);

  const reviews = useMemo(() => {
    const source = Array.isArray(displayedEntity?.reviews)
      ? displayedEntity.reviews
      : Array.isArray(displayedEntity?.comments)
      ? displayedEntity.comments
      : [];

    const embeddedReviews = source.map(normalizeReviewItem).filter(Boolean);
    return [...localReviews, ...remoteReviews, ...embeddedReviews];
  }, [displayedEntity, localReviews, remoteReviews]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 5;
    const total = reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return Math.max(1, Math.min(5, total / reviews.length));
  }, [reviews]);

  const reviewCount = useMemo(() => reviews.length, [reviews]);

  const countryOptions = useMemo(() => {
    const list =
      activeTab === "agent"
        ? allAgents
        : activeTab === "tutor"
        ? allTutors
        : allUsers;

    return Array.from(
      new Set(
        list
          .map((item) => item.country || item.selected_country || item.countryName || "")
          .map((v) => String(v || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [activeTab, allAgents, allTutors, allUsers]);

  useEffect(() => {
    let cancelled = false;

    const roleForReviews =
      displayedRole === "agent" || displayedRole === "tutor" || displayedRole === "user" || displayedRole === "student"
        ? displayedRole === "student"
          ? "user"
          : displayedRole
        : activeTab;

    const loadReviews = async () => {
      if (!displayedEntity?.id) {
        setRemoteReviews([]);
        return;
      }

      setReviewsLoading(true);
      try {
        const reviewsRef = collection(db, "profile_reviews");
        const reviewsQuery = query(
          reviewsRef,
          where("target_user_id", "==", displayedEntity.id),
          where("target_role", "==", roleForReviews)
        );

        const snap = await getDocs(reviewsQuery);

        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .map((item, idx) => ({
            id: item.id || `remote-${idx}`,
            author:
              item.author_name ||
              item.author ||
              item.userName ||
              item.name ||
              item.full_name ||
              "User",
            comment: item.comment || item.text || item.message || item.review || "",
            rating: Math.max(1, Math.min(5, Math.round(Number(item.rating || item.stars || 5)))),
            avatar: item.author_avatar || item.avatar || item.photoURL || item.profile_picture || "",
            created_at_ms: Number(item.created_at_ms || item.createdAt || 0) || 0,
          }))
          .sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0));

        if (!cancelled) setRemoteReviews(rows);
      } catch (e) {
        console.error("Failed to load reviews:", e);
        if (!cancelled) setRemoteReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [displayedEntity?.id, displayedRole, activeTab]);

  const handleSelectAgent = async (agent) => {
    if (!currentUserDoc) {
      window.location.href = createPageUrl("Welcome");
      return;
    }

    if (currentUserDoc?.assigned_agent_id) {
      alert("You already have an assigned agent. Please contact support if you need to change your agent.");
      return;
    }

    if (currentUserDoc?.agent_reassignment_request?.status === "pending") {
      alert("You already have a pending agent request. Please wait for admin approval.");
      return;
    }

    setSelectingAgent(agent.id);
    try {
      const uref = doc(db, "users", currentUserDoc.id);

      await updateDoc(uref, {
        agent_reassignment_request: {
          status: "pending",
          new_agent_id: agent.id,
          requested_at: serverTimestamp(),
          requested_by: currentUserDoc.id,
        },
      });

      const updatedUser = await getUserDoc(currentUserDoc.id);
      setCurrentUserDoc(updatedUser || currentUserDoc);
      await fetchPendingAgent(updatedUser || currentUserDoc);
      alert("Request submitted. An admin will verify and assign your selected agent.");
    } catch (e) {
      console.error(e);
      alert("Failed to submit request. Please try again.");
    } finally {
      setSelectingAgent(null);
    }
  };

  const handleSubmitReview = async () => {
    const text = String(reviewText || "").trim();
    if (!text) {
      alert(tr("review_required", "Please write a comment first."));
      return;
    }

    if (!auth?.currentUser?.uid) {
      alert(tr("login_required_review", "Please sign in to leave a review."));
      return;
    }

    if (!displayedEntity?.id) {
      alert(tr("select_profile_first", "Please select a profile first."));
      return;
    }

    const roleForReviews =
      displayedRole === "agent" || displayedRole === "tutor" || displayedRole === "user" || displayedRole === "student"
        ? displayedRole === "student"
          ? "user"
          : displayedRole
        : activeTab;

    const myName =
      auth?.currentUser?.displayName ||
      auth?.currentUser?.email?.split("@")[0] ||
      tr("you", "You");

    const optimisticReview = {
      id: `local-${Date.now()}`,
      author: myName,
      comment: text,
      rating: reviewRating,
      avatar: auth?.currentUser?.photoURL || "",
      created_at_ms: Date.now(),
    };

    setLocalReviews((prev) => [optimisticReview, ...prev]);

    try {
      await addDoc(collection(db, "profile_reviews"), {
        target_user_id: displayedEntity.id,
        target_role: roleForReviews,
        author_id: auth.currentUser.uid,
        author_name: myName,
        author_avatar: auth.currentUser.photoURL || "",
        comment: text,
        rating: reviewRating,
        created_at: serverTimestamp(),
        created_at_ms: Date.now(),
      });

      setReviewText("");
      setReviewRating(5);
    } catch (e) {
      console.error("Failed to submit review:", e);
      setLocalReviews((prev) => prev.filter((item) => item.id !== optimisticReview.id));
      alert(
        tr(
          "review_submit_failed",
          "Could not submit your review yet. Add the profile_reviews Firestore rule first."
        )
      );
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSelectedCountry("all");

    if (value === "agent" && !selectedAgentId && filteredAgents.length) {
      setSelectedAgentId(filteredAgents[0].id);
    }
    if (value === "tutor" && !selectedTutorId && filteredTutors.length) {
      setSelectedTutorId(filteredTutors[0].id);
    }
    if (value === "user" && !selectedUserId && filteredUsers.length) {
      setSelectedUserId(filteredUsers[0].id);
    }
  };

  const handleSelectItem = (id) => {
    setUserHasSelected(true);

    if (activeTab === "agent") {
      setSelectedAgentId(id);
      const picked = filteredAgents.find((item) => item.id === id) || null;
      if (picked) setLockedDisplay(picked);
    } else if (activeTab === "tutor") {
      setSelectedTutorId(id);
      const picked = filteredTutors.find((item) => item.id === id) || null;
      if (picked) setLockedDisplay(picked);
    } else {
      setSelectedUserId(id);
      const picked = filteredUsers.find((item) => item.id === id) || null;
      if (picked) setLockedDisplay(picked);
    }
  };

  const rightSideSelectedId =
    activeTab === "agent"
      ? selectedAgentId
      : activeTab === "tutor"
      ? selectedTutorId
      : selectedUserId;

  const name =
    displayedRole === "agent"
      ? displayedEntity?.company_name || displayedEntity?.full_name || tr("unknown", "Unknown")
      : displayedEntity?.full_name || displayedEntity?.name || tr("unknown", "Unknown");

  const personName = displayedEntity?.full_name || name;
  const avatar = getAvatar(displayedEntity);
  const countryText = getCountryText(displayedEntity || {});
  const countryCode = getCountryCode(displayedEntity || {});
  const maskedEmail = maskEmail(getEmail(displayedEntity || {}));
  const maskedPhone = maskPhone(getPhone(displayedEntity || {}));
  const headline =
    displayedRole === "agent"
      ? displayedEntity?.full_name || tr("agent_representative", "Agent Representative")
      : displayedRole === "user" || displayedRole === "student"
      ? displayedEntity?.headline || displayedEntity?.title || tr("user", "User")
      : displayedEntity?.headline || displayedEntity?.title || tr("tutor", "Tutor");

  if (loading) {
    return (
      <div className="h-[calc(100vh-72px)] overflow-hidden bg-[#eef3f8] px-2 py-2 sm:px-3 lg:px-4">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <Loader2 className="h-12 w-12 animate-spin text-[#0f2f63]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-72px)] overflow-hidden bg-[#eef3f8] px-2 py-2 sm:px-3 lg:px-4">
        <div className="mx-auto flex h-full max-w-4xl items-center justify-center rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div>
            <AlertCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
            <div className="text-2xl font-extrabold text-slate-900">Unable to Load Directory</div>
            <div className="mt-2 text-slate-500">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-72px)] overflow-hidden bg-[#eef3f8] px-2 py-2 sm:px-3 lg:px-4">
      <div className="mx-auto flex h-full max-w-[1500px] flex-col">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="min-h-0 flex-1 p-2 sm:p-3 lg:p-4">
            <div className={userHasSelected ? "grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(400px,0.98fr)]" : "grid h-full min-h-0 grid-cols-1"}>
              <AnimatePresence initial={false} mode="wait">
                {userHasSelected && displayedEntity ? (
                  <motion.div
                    key={`detail-${displayedRole}-${displayedEntityId || "selected"}`}
                    layout
                    className="min-h-0 h-full"
                    initial={{ opacity: 0, x: -18, scale: 0.985 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 18, scale: 0.985 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Card className="h-full overflow-hidden rounded-[24px] border border-slate-200 bg-[#f8fbff] shadow-none xl:min-w-0">
                      <CardContent className="flex h-full flex-col overflow-hidden p-3 sm:p-4">
                        <div className="min-h-0 flex-1 rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                          <div className="grid gap-3 xl:grid-cols-[0.88fr_1.42fr]">
                            <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-sm">
                              <div className="mx-auto flex h-32 w-full items-center justify-center overflow-hidden rounded-[20px] bg-[#dfe8f1] text-4xl font-bold text-[#173562] sm:h-40">
                                <img src={avatar} alt={name} className="h-full w-full object-cover" />
                              </div>

                              <div className="mt-3 text-center text-[24px] font-extrabold leading-tight tracking-tight text-[#0f2f63] sm:text-[28px] line-clamp-2">
                                {name}
                              </div>

                              <div className="mt-1.5 text-center text-xs text-slate-500">{headline}</div>

                              <div className="mt-2 flex items-center justify-center gap-2">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                                  <CountryFlag code={countryCode} />
                                  <span className="truncate max-w-[140px]">{countryText}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="relative">
                                <div className="rounded-[22px] bg-[#fff7ee] p-3 ring-1 ring-slate-100">
                                  <div className="flex items-start justify-between">
                                    <div className="text-[22px] font-extrabold leading-none text-slate-700">
                                      Success Rate
                                    </div>

                                    <div className="mr-10 text-[22px] font-extrabold leading-none text-[#2C5E93]">
                                      {`${Math.round((averageRating / 5) * 100)}%`}
                                    </div>
                                  </div>

                                  <div className="mt-3">
                                    <StarSummary
                                      value={averageRating}
                                      count={reviewCount}
                                      withDropdown
                                      isOpen={showRatingBreakdown}
                                      onToggle={() => setShowRatingBreakdown((prev) => !prev)}
                                    />
                                  </div>
                                </div>

                                <AnimatePresence initial={false}>
                                  {showRatingBreakdown ? (
                                    <motion.div
                                      initial={{ opacity: 0, y: -8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -8 }}
                                      transition={{ duration: 0.2, ease: "easeOut" }}
                                      className="absolute left-0 right-0 top-[calc(100%+10px)] z-20"
                                    >
                                      <ReviewBreakdownDropdown reviews={reviews} />
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                              </div>

                              <div className="rounded-[18px] border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff1dc] text-sm font-bold text-slate-700">
                                    <img src={avatar} alt={personName} className="h-full w-full object-cover" />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-bold text-slate-900">{maskedEmail}</div>
                                    <div className="truncate text-xs text-slate-500">{maskedPhone}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {displayedRole === "agent" ? (
                                  !currentUserDoc?.assigned_agent_id &&
                                  currentUserDoc?.agent_reassignment_request?.status !== "pending" ? (
                                    <Button
                                      onClick={() => handleSelectAgent(displayedEntity)}
                                      disabled={selectingAgent === displayedEntity.id}
                                      className="h-11 rounded-full bg-[#ff9500] text-sm font-bold text-white hover:bg-[#ea8a00]"
                                    >
                                      {selectingAgent === displayedEntity.id
                                        ? tr("submitting", "Submitting...")
                                        : tr("select_agent", "Select")}
                                    </Button>
                                  ) : (
                                    <div className="flex h-11 items-center justify-center rounded-full bg-[#ff9500] px-4 text-sm font-bold text-white">
                                      {tr("selected", "Selected")}
                                    </div>
                                  )
                                ) : (
                                  <Button
                                    type="button"
                                    className="h-11 rounded-full bg-[#ff9500] px-4 text-sm font-bold text-white hover:bg-[#ea8a00]"
                                  >
                                    {tr("follow", "Follow")}
                                  </Button>
                                )}

                                <Button
                                  type="button"
                                  className="h-11 rounded-full bg-[#0f2f63] px-4 text-sm font-bold text-white hover:bg-[#123972]"
                                >
                                  {tr("message", "Message")}
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-[24px] border border-slate-200 bg-[#fbfdff] p-3 shadow-sm">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-base font-extrabold text-slate-900">{tr("reviews", "Reviews")}</div>
                                <div className="text-xs text-slate-500">
                                  {tr("reviews_subtitle", "See comments and leave a rating")}
                                </div>
                              </div>
                              <StarSummary value={averageRating} count={reviewCount} className="justify-end" />
                            </div>

                            <div className="min-h-0 overflow-y-auto pr-1">
                              <div className="space-y-2.5">
                                {reviewsLoading ? (
                                  <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                                    {tr("loading_reviews", "Loading reviews...")}
                                  </div>
                                ) : reviews.length ? (
                                  reviews.slice(0, 3).map((item) => <ReviewCard key={item.id} item={item} />)
                                ) : (
                                  <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                                    {tr("no_reviews_yet", "No reviews yet. Be the first to leave a comment.")}
                                  </div>
                                )}

                                <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
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
                                    className="mt-2.5 min-h-[72px] rounded-[14px] border-slate-200"
                                  />

                                  <div className="mt-3 flex justify-end">
                                    <Button
                                      type="button"
                                      onClick={handleSubmitReview}
                                      className="rounded-full bg-[#0f2f63] px-4 py-2 text-white hover:bg-[#123972]"
                                    >
                                      {tr("submit_review", "Submit Review")}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <motion.div
                layout
                key={`list-${activeTab}`}
                initial={{ opacity: 0.98 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={userHasSelected ? "h-full min-h-0" : "h-full min-h-0 w-full"}
              >
                <div className="h-full min-h-0 xl:min-w-[460px]">
                  <RightSideDirectoryTabs
                    tr={tr}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    agentList={filteredAgents}
                    tutorList={filteredTutors}
                    userList={filteredUsers}
                    selectedId={rightSideSelectedId}
                    onSelectItem={handleSelectItem}
                    selectedCountry={selectedCountry}
                    onCountryChange={setSelectedCountry}
                    countryOptions={countryOptions}
                    hiddenRole={myRole}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}