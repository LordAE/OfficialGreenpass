import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { auth } from "@/firebase";
import { ensureConversation, getUserDoc, sendMessage } from "@/api/messaging";
import { listenFollowState, sendFollowRequest, cancelFollowRequest, unfollowUser } from "@/api/follow";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useTr } from "@/i18n/useTr";

function normalizeRole(r) {
  const v = String(r || "").toLowerCase().trim();
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
  return (
    u?.phone ||
    u?.phoneNumber ||
    u?.mobile ||
    u?.mobile_number ||
    u?.contact ||
    ""
  );
}

function pickAddressText(u) {
  const a = u?.address || {};
  const parts = [
    a?.street,
    a?.ward,
    a?.district,
    a?.province || a?.state,
    a?.postal_code || a?.postalCode,
    a?.country || u?.country,
  ].filter(Boolean);
  return parts.join(", ");
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
  const name =
    u?.country ||
    u?.countryName ||
    u?.selected_country ||
    u?.selectedCountry ||
    "";
  return { code: String(code || "").toUpperCase(), name: String(name || "") };
}

// 🌍 Flag helper (same as Dashboard)
const flagUrlFromCode = (code) => {
  const cc = (code || "").toString().trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return "";
  return `https://flagcdn.com/w20/${cc}.png`;
};

export default function ViewProfile() {
  const { tr } = useTr("view_profile");
  const navigate = useNavigate();
  const { uid } = useParams();

  const me = auth?.currentUser;
  const myUid = me?.uid;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [followState, setFollowState] = useState({ following: false, requested: false });
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

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
  const addressText = useMemo(() => pickAddressText(user), [user]);
  const { code, name } = useMemo(() => pickCountry(user), [user]);
  const flagUrl = useMemo(() => flagUrlFromCode(code), [code]);

  const canFollow = !!myUid && !!uid && myUid !== uid;

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

  const onSendMessage = async () => {
    if (!myUid || !uid || myUid === uid) return;
    const text = String(msg || "").trim();
    if (!text) return;

    try {
      setSending(true);
      const convoId = await ensureConversation(myUid, uid);
      await sendMessage({ conversationId: convoId, senderId: myUid, text });
      setMsg("");
      // Optional: you can navigate to messages thread if you have a route
      // navigate(`/messages?cid=${convoId}`);
      alert(tr("message_sent", "Message sent."));
    } catch (e) {
      console.error(e);
      alert(tr("message_failed", "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  const nameText =
    user?.full_name || user?.name || user?.displayName || user?.email || uid || tr("unknown", "Unknown");

  const headline =
    user?.headline || user?.title || user?.position || user?.occupation || user?.school_name || "";

  const about =
    user?.about ||
    user?.bio ||
    user?.description ||
    user?.intro ||
    "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {tr("view_profile", "Profile")}
            </div>
            <Button variant="outline" onClick={() => navigate(-1)}>
              {tr("back", "Back")}
            </Button>
          </div>

          <Card className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center font-semibold text-gray-700">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={nameText} className="h-full w-full object-cover" />
                  ) : (
                    String(nameText).trim().slice(0, 1).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-gray-900 truncate">{nameText}</div>
                    <Badge className="capitalize">{role}</Badge>
                    {name || code ? (
                      <span className="text-sm text-gray-600 inline-flex items-center gap-2">
                        {flagUrl ? (
                          <img
                            src={flagUrl}
                            alt={code ? `${code} flag` : "flag"}
                            className="w-5 h-3 rounded-sm object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <span>{name || code}</span>
                      </span>
                    ) : null}
                  </div>

                  {headline ? (
                    <div className="text-sm text-gray-700 mt-1">{headline}</div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {user?.email ? (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium text-gray-700">{tr("email", "Email")}:</span>{" "}
                        {user.email}
                      </div>
                    ) : null}

                    {phone ? (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium text-gray-700">{tr("phone", "Phone")}:</span>{" "}
                        {phone}
                      </div>
                    ) : null}

                    {addressText ? (
                      <div className="text-xs text-gray-600 sm:col-span-2">
                        <span className="font-medium text-gray-700">{tr("address", "Address")}:</span>{" "}
                        {addressText}
                      </div>
                    ) : null}
                  </div>

                  {about ? (
                    <div className="text-sm text-gray-700 mt-3 whitespace-pre-line">{about}</div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {canFollow ? (
                      <Button onClick={onFollowToggle} variant={followState.following ? "outline" : "default"}>
                        {followState.following
                          ? tr("unfollow", "Unfollow")
                          : followState.requested
                          ? tr("requested", "Requested")
                          : tr("follow", "Follow")}
                      </Button>
                    ) : null}
</div>
                </div>
              </div>

              {canFollow ? (
                <div className="mt-5 border-t pt-4">
                  <div className="text-sm font-semibold text-gray-900 mb-2">
                    {tr("message", "Message")}
                  </div>
                  <Textarea
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder={tr("type_message", "Type your message...")}
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={onSendMessage} disabled={sending || !String(msg || "").trim()}>
                      {sending ? tr("sending", "Sending...") : tr("send", "Send")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="mt-3 text-xs text-gray-500">{tr("loading", "Loading...")}</div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
