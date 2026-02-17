// src/pages/AdminReports.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase"; // adjust if needed
import { createPageUrl } from "@/utils";
import { useTr } from "@/i18n/useTr";
import { getUserDoc } from "@/api/messaging";
import { BarChart3, Search, Clock, AlertTriangle, FileText } from "lucide-react";

const STATUS_OPTIONS = ["Open", "Reviewing", "Resolved", "Dismissed"];
const RANGE_OPTIONS = [
  { key: "1y", labelKey: "last1Year", fallback: "Last 1 year" },
  { key: "2y", labelKey: "last2Years", fallback: "Last 2 years" },
  { key: "all", labelKey: "allTime", fallback: "All-time" },
];

function safeToDate(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function formatDate(d) {
  if (!d) return "";
  return d.toLocaleString();
}

function getDisplayName(u) {
  if (!u) return "";
  return (
    u.name ||
    u.displayName ||
    u.fullName ||
    u.full_name ||
    u.username ||
    u.email ||
    ""
  );
}

function unifyReport(r) {
  const createdAt = r.createdAt ?? r.created_at ?? null;
  const updatedAt = r.updatedAt ?? r.updated_at ?? null;

  return {
    ...r,
    createdAt,
    updatedAt,
    conversationId: r.conversationId ?? r.conversation_id ?? "",
    reporterId: r.reporterId ?? r.reporter_id ?? "",
    reportedDocId: r.reportedDocId ?? r.reported_user_id ?? "",
    reportedRole: (r.reportedRole ?? r.reported_role ?? "").toString().toLowerCase(),
    reporterRole: (r.reporterRole ?? r.reporter_role ?? "").toString().toLowerCase(),
    reason: r.reason ?? r.reason_text ?? "",
    category: r.category ?? "message_report",
    status: (r.status ?? "Open").toString().toLowerCase(),
  };
}

export default function AdminReports() {
  const { tr: trRaw } = useTr("adminReports");
  const tr = typeof trRaw === "function" ? trRaw : (_k, fallback) => fallback;

  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState("open");
  const [roleFilter, setRoleFilter] = useState("all");
  const [qText, setQText] = useState("");
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messages, setMessages] = useState([]);
  const [rangeKey, setRangeKey] = useState("1y");


const openConversation = (conversationId) => {
  if (!conversationId) return;
  navigate(createPageUrl(`Messages?c=${encodeURIComponent(conversationId)}`));
};

  const [userVer, setUserVer] = useState(0);

  const userCacheRef = useRef({});
  const [reporterDoc, setReporterDoc] = useState(null);
  const [reportedDoc, setReportedDoc] = useState(null);

  // Fetch reports on mount
  useEffect(() => {
    const base = collection(db, "reports");
    const qy = query(base, orderBy("created_at", "desc"), limit(500));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const items = snap.docs.map((d) => unifyReport({ id: d.id, ...d.data() }));
        setReports(items);
        if (!selectedId && items.length) setSelectedId(items[0].id);
      },
      (err) => {
        console.error("Failed to load reports:", err);
        setReports([]);
      }
    );
    return () => unsub();
  }, []);

  // Prefetch user docs for display names
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const slice = (reports || []).slice(0, 80);
      const ids = Array.from(new Set(slice.map((r) => r.reportedUserId).filter(Boolean)));
      for (const uid of ids) {
        if (cancelled) return;
        if (userCacheRef.current[uid]) continue;
        try {
          const u = await getUserDoc(uid);
          if (!cancelled && u) {
            userCacheRef.current[uid] = u;
            setUserVer((v) => v + 1);
          }
        } catch (_e) {}
      }
    };
    if (reports?.length) run();
    return () => {
      cancelled = true;
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const needle = qText.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (roleFilter !== "all" && r.reportedRole !== roleFilter) return false;

      if (!needle) return true;
      const hay = [
        r.reason,
        r.category,
        r.reporterId,
        r.reportedDocId,
        r.reportedRole,
        r.conversationId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [reports, statusFilter, roleFilter, qText]);

  const selected = useMemo(
    () => filteredReports.find((r) => r.id === selectedId) || null,
    [filteredReports, selectedId]
  );

  // Load user docs for report details
  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      setReporterDoc(null);
      setReportedDoc(null);
      if (!selected) return;
      const loadOne = async (uid) => {
        if (!uid) return null;
        if (userCacheRef.current[uid]) return userCacheRef.current[uid];
        const d = await getUserDoc(uid);
        userCacheRef.current[uid] = d;
        return d;
      };
      try {
        const [rep, rpt] = await Promise.all([loadOne(selected.reporterId), loadOne(selected.reportedDocId)]);
        if (cancelled) return;
        setReporterDoc(rep);
        setReportedDoc(rpt);
      } catch (e) {
        console.error("Failed to load user docs:", e);
      }
    }
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  // Load chat messages
  useEffect(() => {
    let unsub = null;
    async function run() {
      setMessages([]);
      setLoadingMessages(false);
      if (!selected?.conversationId) return;
      setLoadingMessages(true);
      const convId = selected.conversationId;
      const msgsRef = collection(db, "conversations", convId, "messages");
      const now = new Date();
      let minDate = null;
      if (rangeKey === "1y") {
        minDate = new Date(now);
        minDate.setFullYear(now.getFullYear() - 1);
      } else if (rangeKey === "2y") {
        minDate = new Date(now);
        minDate.setFullYear(now.getFullYear() - 2);
      }
      const constraints = [];
      if (minDate) constraints.push(where("created_at", ">=", minDate));
      constraints.push(orderBy("created_at", "asc"));
      constraints.push(limit(500));
      const qy = query(msgsRef, ...constraints);
      unsub = onSnapshot(
        qy,
        async (snap) => {
          const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const items = raw.map((m) => ({
            id: m.id,
            text: m.text ?? m.message ?? "",
            createdAt: m.createdAt ?? m.created_at ?? null,
            senderId: m.senderId ?? m.sender_id ?? "",
            senderName: m.senderName ?? "",
            attachments: Array.isArray(m.attachments)
              ? m.attachments
              : Array.isArray(m.files)
              ? m.files
              : [],
          }));
          const missing = Array.from(
            new Set(items.filter((m) => !m.senderName && m.senderId).map((m) => m.senderId))
          ).filter((uid) => !userCacheRef.current[uid]);
          if (missing.length) {
            await Promise.all(
              missing.map(async (uid) => {
                try {
                  const d = await getUserDoc(uid);
                  userCacheRef.current[uid] = d;
                } catch {}
              })
            );
          }
          const enriched = items.map((m) => {
            const u = m.senderId ? userCacheRef.current[m.senderId] : null;
            const name = m.senderName || u?.full_name || u?.name || u?.email || m.senderId || "";
            return { ...m, senderName: name };
          });
          setMessages(enriched);
          setLoadingMessages(false);
        },
        (err) => {
          console.error("Failed to load messages:", err);
          setLoadingMessages(false);
        }
      );
    }
    run();
    return () => {
      if (unsub) unsub();
    };
  }, [selected?.conversationId, rangeKey, selected?.id]);

  async function setStatus(nextStatus) {
    if (!selected?.id) return;
    try {
      await updateDoc(doc(db, "reports", selected.id), {
        status: nextStatus,
        updated_at: new Date(),
      });
    } catch (e) {
      console.error("Failed to update report:", e);
      alert(tr("failedUpdateReport", "Failed to update report."));
    }
  }

  const statusBadge = (s) => {
    const base = "text-xs px-2 py-1 rounded-full border font-semibold";
    if (s === "open") return `${base} border-red-300 bg-red-100 text-red-700`;
    if (s === "reviewing") return `${base} border-yellow-300 bg-yellow-100 text-yellow-800`;
    if (s === "resolved") return `${base} border-green-300 bg-green-100 text-green-700`;
    return `${base} border-gray-300 bg-gray-100 text-gray-700`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6 space-x-3">
          <div className="p-2 bg-white rounded-full shadow-md">
            <BarChart3 className="w-6 h-6 text-blue-500" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-800">{tr("reportsInbox", "Reports Inbox")}</h1>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar: List of reports */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative mb-4">
              <input
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder={tr("searchReports", "Search reports...")}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            </div>
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {["all", ...STATUS_OPTIONS].map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? tr("all", "All") : s}
                  </option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {["all", "agent", "tutor", "vendor", "school", "student"].map((r) => (
                  <option key={r} value={r}>
                    {r === "all" ? tr("allRoles", "All roles") : r}
                  </option>
                ))}
              </select>
            </div>
            {/* List of reports */}
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-rounded max-h-[70vh]">
              {filteredReports.length ? (
                filteredReports.map((r) => {
                  const active = r.id === selectedId;
                  const created = formatDate(safeToDate(r.createdAt));
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition ${
                        active ? "bg-gray-100 border-gray-300" : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-medium text-sm truncate max-w-[70%]">
                          {(selected?.id === r.id
                            ? getDisplayName(reportedDoc)
                            : "") ||
                            getDisplayName(userCacheRef.current[r.reportedUserId]) ||
                            r.category ||
                            tr("report", "Report")}
                        </div>
                        <span className={statusBadge(r.status)}>{r.status}</span>
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-2">{r.reason || tr("noReason", "No reason provided")}</div>
                      <div className="flex items-center text-[11px] text-gray-500 mt-1 gap-2">
                        <Clock className="w-3 h-3" />
                        {created}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-gray-400 text-center">{tr("noReports", "No reports found.")}</div>
              )}
            </div>
          </div>

          {/* Main Content: Details & Messages */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex flex-col">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-lg font-medium">
                {tr("selectReport", "Select a report to view details.")}
              </div>
            ) : (
              <>
                {/* Header: Report info & Actions */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-1">
                      {getDisplayName(reportedDoc) ||
                        getDisplayName(userCacheRef.current[selected?.reportedUserId]) ||
                        selected.reason ||
                        selected.category ||
                        tr("reportDetails", "Report Details")}
                    </h2>
                    <div className="text-sm text-gray-500">{selected.reason || tr("noReason", "No reason provided")}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {tr("conversationId", "Conversation ID")}:{" "}
                      <span className="font-mono">{selected.conversationId || "-"}</span>
                    </div>
                  </div>
                  {/* Status Buttons */}
                  <div className="flex space-x-2 mt-4 md:mt-0">
                    <button
                      onClick={() => setStatus("reviewing")}
                      className="px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 text-sm font-medium transition"
                    >
                      {tr("markReviewing", "Reviewing")}
                    </button>
                    <button
                      onClick={() => setStatus("resolved")}
                      className="px-4 py-2 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 text-sm font-medium transition"
                    >
                      {tr("markResolved", "Resolved")}
                    </button>
                    <button
                      onClick={() => setStatus("dismissed")}
                      className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium transition"
                    >
                      {tr("dismiss", "Dismiss")}
                    </button>
                  </div>
                </div>

                {/* User info cards */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {/* Reporter */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">{tr("reporter", "Reporter")}</div>
                    <div className="text-sm font-semibold mb-1">{getDisplayName(reporterDoc) || getDisplayName(userCacheRef.current[selected?.reporterId]) || selected.reporterId || "-"}</div>
                    <div className="text-xs text-gray-600 mb-1">{reporterDoc?.email || ""}</div>
                    <div className="text-xs text-gray-500">{tr("role", "Role")}: {selected.reporterRole || "-"}</div>
                  </div>
                  {/* Reported User */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">{tr("reportedDoc", "Reported User")}</div>
                    <div className="text-sm font-semibold mb-1">{getDisplayName(reportedDoc) || getDisplayName(userCacheRef.current[selected?.reportedUserId]) || selected.reportedDocId || "-"}</div>
                    <div className="text-xs text-gray-600 mb-1">{reportedDoc?.email || ""}</div>
                    <div className="text-xs text-gray-500">{tr("role", "Role")}: {selected.reportedRole || "-"}</div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <button
                    onClick={() => openMessageToUser(selected.reporterId, selected.reporterRole)}
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                    disabled={!selected?.reporterId}
                  >
                    {`${tr("message", "Message")} ${getDisplayName(reporterDoc) || getDisplayName(userCacheRef.current[selected?.reporterId]) || tr("reporter", "Reporter")}`}
                  </button>
                  <button
                    onClick={() => openMessageToUser(selected.reportedDocId, selected.reportedRole)}
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                    disabled={!selected?.reportedDocId}
                  >
                    {`${tr("message", "Message")} ${getDisplayName(reportedDoc) || getDisplayName(userCacheRef.current[selected?.reportedUserId]) || tr("reportedUser", "Reported user")}`}
                  </button>
                </div>

                {/* Chat logs */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="font-semibold text-gray-800">{tr("platformChatLogs", "Platform Chat Logs")}</div>
                  <select
                    value={rangeKey}
                    onChange={(e) => setRangeKey(e.target.value)}
                    className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {RANGE_OPTIONS.map((r) => (
                      <option key={r.key} value={r.key}>
                        {tr(r.labelKey, r.fallback)}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Messages list */}
                <div className="overflow-y-auto max-h-[45vh] bg-gray-50 rounded-xl p-4 shadow-inner border border-gray-200 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-rounded">
                  {loadingMessages && (
                    <div className="text-sm text-gray-500">{tr("loadingMessages", "Loading messages...")}</div>
                  )}
                  {!loadingMessages && !messages.length && (
                    <div className="text-sm text-gray-400">{tr("noMessagesFound", "No messages found for this conversation in the selected range.")}</div>
                  )}
                  {!loadingMessages &&
                    messages.map((m) => {
                      const when = formatDate(safeToDate(m.createdAt));
                      const atts = Array.isArray(m.attachments) ? m.attachments : [];
                      return (
                        <div key={m.id} className="bg-white rounded-lg p-3 shadow-sm border mb-2">
                          <div className="flex justify-between items-center mb-1 text-xs text-gray-600 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="max-w-full whitespace-normal break-words">
                                {m.senderName || m.senderId || ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-gray-400">{when}</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">{m.text || <span className="text-gray-400">{tr("emptyMessage", "(empty)")}</span>}</div>
                          {atts.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {atts.map((a, idx) => {
                                const mime = String(a?.content_type || a?.mime || a?.type || "");
                                const isImg = mime.startsWith("image/");
                                const url = a?.url || a?.downloadUrl || a?.download_url;
                                const name = a?.name || a?.filename || "attachment";
                                if (!url) return null;
                                return (
                                  <div key={idx} className="rounded-lg border bg-white overflow-hidden">
                                    {isImg ? (
                                      <a href={url} target="_blank" rel="noreferrer" className="block">
                                        <img src={url} alt={name} className="max-h-72 w-auto object-contain" />
                                      </a>
                                    ) : (
                                      <div className="flex items-center justify-between gap-3 p-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FileText className="h-4 w-4 text-gray-500" />
                                          <span className="truncate">{name}</span>
                                        </div>
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-600 hover:underline text-sm"
                                        >
                                          {tr("download", "Download")}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
                {/* Note */}
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                  <AlertTriangle className="w-4 h-4" />
                  <div>
                    {tr(
                      "investigationNote",
                      "Investigation uses platform chat logs only. External transactions without trace may be disregarded."
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}