import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useTr } from "@/i18n/useTr";
import { ensureConversation, getUserDoc, sendMessage } from "@/api/messaging";
import { cancelFollowRequest, respondToFollowRequest, unfollowUser } from "@/api/follow";

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function normalizeRole(r) {
  const v = String(r || "").toLowerCase().trim();
  // In GreenPass, many "Student" accounts are stored as role "user" or "users"
  if (v === "student" || v === "students" || v === "user" || v === "users") return "student";
  if (v === "tutors") return "tutor";
  if (v === "agents") return "agent";
  if (v === "schools") return "school";
  return v || "user";
}

function resolveRole(userDoc) {
  return normalizeRole(
    userDoc?.selected_role ||
      userDoc?.role ||
      userDoc?.signup_entry_role ||
      userDoc?.user_type ||
      userDoc?.userType ||
      "user"
  );
}

async function fetchUsersByIds(ids) {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return {};

  const map = {};
  // Firestore "in" limit is 10
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const qUsers = query(collection(db, "users"), where("__name__", "in", chunk));
    const snap = await getDocs(qUsers);
    snap.forEach((d) => {
      map[d.id] = { id: d.id, ...d.data() };
    });
    chunk.forEach((uid) => {
      if (!map[uid]) map[uid] = { id: uid };
    });
  }
  return map;
}

export default function Connections() {
  const { tr } = useTr("connections");
  const navigate = useNavigate();
  const qp = useQueryParams();

  const me = auth?.currentUser;
  const myUid = me?.uid;

  const initialTab = String(qp.get("tab") || "").toLowerCase();
  const [tab, setTab] = useState(
    initialTab === "requests" || initialTab === "followers" || initialTab === "following"
      ? initialTab
      : "requests"
  );

  const [roleFilter, setRoleFilter] = useState("all"); // all | agent | tutor | school | student

  const [myRole, setMyRole] = useState("user"); // resolved role of logged-in user

  const [requests, setRequests] = useState([]); // { id: followerId, ...data }
  const [followers, setFollowers] = useState([]); // { id, ...data }
  const [following, setFollowing] = useState([]);

  const [usersById, setUsersById] = useState({});

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [massText, setMassText] = useState("");
  const [sending, setSending] = useState(false);

  // Listen: follow requests (incoming)
  useEffect(() => {
    if (!myUid) return;

    const ref = collection(db, "users", myUid, "follow_requests");
    const qRef = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(qRef, (snap) => {
      const list = [];
      snap.forEach((d) => {
        const data = d.data() || {};
        if (String(data.status || "pending").toLowerCase() === "pending") {
          list.push({ id: d.id, ...data });
        }
      });
      setRequests(list);
    });

    return () => unsub();
  }, [myUid]);

  // Listen: followers
  useEffect(() => {
    if (!myUid) return;
    const ref = collection(db, "users", myUid, "followers");
    const qRef = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qRef, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() || {}) }));
      setFollowers(list);
    });
    return () => unsub();
  }, [myUid]);

  // Listen: following
  useEffect(() => {
    if (!myUid) return;
    const ref = collection(db, "users", myUid, "following");
    const qRef = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qRef, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() || {}) }));
      setFollowing(list);
    });
    return () => unsub();
  }, [myUid]);

  // Fetch user docs for all ids we need
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const ids = [
          ...requests.map((r) => r.id),
          ...followers.map((r) => r.id),
          ...following.map((r) => r.id),
        ];
        const map = await fetchUsersByIds(ids);
        if (!cancelled) setUsersById(map);
      } catch (e) {
        console.error("connections fetch users failed", e);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [requests, followers, following]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedIds(new Set());
    setMassText("");
  }, [tab, roleFilter]);

  // Load my role once we know uid
  useEffect(() => {
    if (!myUid) return;

    let cancelled = false;
    (async () => {
      try {
        const meDoc = await getUserDoc(myUid);
        const r = resolveRole(meDoc);
        if (!cancelled) setMyRole(r);
      } catch (e) {
        console.error("failed to load my role", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [myUid]);

  // Students should not be able to view/select "student" role filter
  useEffect(() => {
    if (myRole === "student" && roleFilter === "student") {
      setRoleFilter("all");
    }
  }, [myRole, roleFilter]);


  const filteredList = useMemo(() => {
    const base = tab === "followers" ? followers : tab === "following" ? following : requests;

    // If I'm a student/user, don't show other students in connections lists
    const roleSafeBase =
      myRole === "student"
        ? base.filter((item) => {
            const u = usersById[item.id] || {};
            return resolveRole(u) !== "student";
          })
        : base;

    if (roleFilter === "all") return roleSafeBase;
    return roleSafeBase.filter((item) => {
      const u = usersById[item.id] || {};
      return resolveRole(u) === roleFilter;
    });
  }, [tab, followers, following, requests, roleFilter, usersById, myRole]);


  const toggleSelect = (uid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const acceptRequest = async (followerId) => {
    if (!myUid || !followerId) return;
    await respondToFollowRequest({ followeeId: myUid, followerId, decision: "accepted" });
  };

  const declineRequest = async (followerId) => {
    if (!myUid || !followerId) return;
    await respondToFollowRequest({ followeeId: myUid, followerId, decision: "declined" });
  };

  const removeFollower = async (followerId) => {
    // Optional: removing followers isn't in spec; keep it simple by declining future requests.
    // If you want "remove follower" later, we can add a callable function.
    if (!myUid || !followerId) return;
    // best-effort: delete their follower doc under you (rules may block; backend can handle if you want)
    await deleteDoc(doc(db, "users", myUid, "followers", followerId)).catch(() => {});
  };

  const unfollow = async (followeeId) => {
    if (!myUid || !followeeId) return;
    await unfollowUser({ followerId: myUid, followeeId });
  };

  const cancelRequest = async (followeeId) => {
    if (!myUid || !followeeId) return;
    await cancelFollowRequest({ followerId: myUid, followeeId });
  };

  const canMassMessage = tab === "followers" || tab === "following";

  const sendMass = async () => {
    if (!myUid) return;
    const text = String(massText || "").trim();
    if (!text) return;

    const targets = Array.from(selectedIds);
    if (!targets.length) return;

    setSending(true);
    try {
      const meDoc = await getUserDoc(myUid);

      for (const targetId of targets) {
        const targetDoc = usersById[targetId] || (await getUserDoc(targetId));
        const convo = await ensureConversation({
          meId: myUid,
          meDoc,
          targetId,
          targetRole: resolveRole(targetDoc),
          source: "connections_mass_message",
        });

        await sendMessage({
          conversationId: convo.id,
          conversationDoc: convo,
          senderId: myUid,
          senderDoc: meDoc,
          text,
        });
      }

      setMassText("");
      setSelectedIds(new Set());
    } catch (e) {
      console.error("mass message failed", e);
      alert(tr("mass_message_failed", "Mass message failed. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const renderUserRow = (uid, extraRight) => {
    const u = usersById[uid] || {};
    const name = u.full_name || u.name || u.displayName || u.email || uid;
    const role = resolveRole(u);

    return (
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
            {String(name).trim().slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{name}</div>
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <span className="capitalize">{role}</span>
              {role === "agent" ? <Badge>Agent</Badge> : role === "tutor" ? <Badge>Tutor</Badge> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {extraRight}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xl font-semibold text-gray-900">{tr("connections", "Connections")}</div>
              <div className="text-sm text-gray-600">{tr("connections_sub", "Manage follow requests and your network")}</div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              {tr("back_to_dashboard", "Back to Dashboard")}
            </Button>
          </div>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="requests">{tr("requests", "Requests")}</TabsTrigger>
                  <TabsTrigger value="followers">{tr("followers", "Followers")}</TabsTrigger>
                  <TabsTrigger value="following">{tr("following", "Following")}</TabsTrigger>
                </TabsList>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{tr("filter", "Filter")}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={roleFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRoleFilter("all")}
                      >
                        {tr("all", "All")}
                      </Button>
                      <Button
                        type="button"
                        variant={roleFilter === "agent" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRoleFilter("agent")}
                      >
                        {tr("agents", "Agents")}
                      </Button>
                      <Button
                        type="button"
                        variant={roleFilter === "tutor" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRoleFilter("tutor")}
                      >
                        {tr("tutors", "Tutors")}
                      </Button>
                      <Button
                        type="button"
                        variant={roleFilter === "school" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRoleFilter("school")}
                      >
                        {tr("schools", "Schools")}
                      </Button>
                      {myRole !== "student" && (

                        <Button

                          type="button"

                          variant={roleFilter === "student" ? "default" : "outline"}

                          size="sm"

                          onClick={() => setRoleFilter("student")}

                        >

                          {tr("students", "Students")}

                        </Button>

                      )}
                    </div>
                  </div>

                  {canMassMessage ? (
                    <div className="sm:ml-auto flex items-center gap-2">
                      <div className="text-xs text-gray-600">
                        {tr("selected", "Selected")}: {selectedIds.size}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Requests */}
                <TabsContent value="requests" className="mt-4">
                  {filteredList.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-600">
                      {tr("no_requests", "No follow requests")}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredList.map((r) => (
                        <div key={r.id}>
                          {renderUserRow(r.id, (
                            <>
                              <Button size="sm" onClick={() => acceptRequest(r.id)}>
                                {tr("accept", "Accept")}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => declineRequest(r.id)}>
                                {tr("decline", "Decline")}
                              </Button>
                            </>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Followers */}
                <TabsContent value="followers" className="mt-4">
                  {filteredList.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-600">
                      {tr("no_followers", "No followers yet")}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredList.map((r) => (
                        <div key={r.id}>
                          {renderUserRow(r.id, (
                            <>
                              <label className="flex items-center gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(r.id)}
                                  onChange={() => toggleSelect(r.id)}
                                />
                                {tr("select", "Select")}
                              </label>
                            </>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {canMassMessage ? (
                    <div className="mt-4 rounded-2xl border bg-white p-4">
                      <div className="text-sm font-semibold text-gray-900 mb-2">
                        {tr("mass_message", "Mass Message")}
                      </div>
                      <Textarea
                        value={massText}
                        onChange={(e) => setMassText(e.target.value)}
                        placeholder={tr("type_message", "Type your message...")}
                        className="rounded-xl"
                      />
                      <div className="mt-3 flex items-center justify-end">
                        <Button disabled={sending || selectedIds.size === 0 || !String(massText).trim()} onClick={sendMass}>
                          {sending ? tr("sending", "Sending...") : tr("send", "Send")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </TabsContent>

                {/* Following */}
                <TabsContent value="following" className="mt-4">
                  {filteredList.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-600">
                      {tr("no_following", "You’re not following anyone yet")}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredList.map((r) => (
                        <div key={r.id}>
                          {renderUserRow(r.id, (
                            <>
                              <label className="flex items-center gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(r.id)}
                                  onChange={() => toggleSelect(r.id)}
                                />
                                {tr("select", "Select")}
                              </label>
                              <Button size="sm" variant="outline" onClick={() => unfollow(r.id)}>
                                {tr("unfollow", "Unfollow")}
                              </Button>
                            </>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {canMassMessage ? (
                    <div className="mt-4 rounded-2xl border bg-white p-4">
                      <div className="text-sm font-semibold text-gray-900 mb-2">
                        {tr("mass_message", "Mass Message")}
                      </div>
                      <Textarea
                        value={massText}
                        onChange={(e) => setMassText(e.target.value)}
                        placeholder={tr("type_message", "Type your message...")}
                        className="rounded-xl"
                      />
                      <div className="mt-3 flex items-center justify-end">
                        <Button disabled={sending || selectedIds.size === 0 || !String(massText).trim()} onClick={sendMass}>
                          {sending ? tr("sending", "Sending...") : tr("send", "Send")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
