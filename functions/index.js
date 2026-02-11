const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const crypto = require("crypto");
const OpenAI = require("openai");

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");

admin.initializeApp();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

function hashKey(text, targetLang) {
  return crypto.createHash("sha256").update(`${targetLang}||${text}`).digest("hex");
}

/**
 * ============================
 * 1) Translation API (existing)
 * ============================
 */
exports.api = onRequest(
  { secrets: [OPENAI_API_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { text, targetLang } = req.body || {};

        if (!text || !targetLang) {
          return res.status(400).json({ error: "Missing text or targetLang" });
        }

        if (typeof text !== "string" || text.length > 4000) {
          return res.status(400).json({ error: "Text too long (max 4000 chars)" });
        }

        const key = hashKey(text, targetLang);
        const docRef = admin.firestore().collection("translations_public").doc(key);
        const cached = await docRef.get();

        if (cached.exists) {
          return res.json({ translatedText: cached.data().translatedText, cached: true });
        }

        // ✅ Create OpenAI client INSIDE the handler using the secret
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

        const prompt = `Translate the following text to ${targetLang}. Keep URLs, emails, and names unchanged. Return only the translation.\n\n${text}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: "You are a professional translator. Output ONLY the translated text." },
            { role: "user", content: prompt },
          ],
          temperature: 0,
        });

        const translatedText = completion.choices?.[0]?.message?.content?.trim() || "";

        await docRef.set({
          key,
          targetLang,
          sourceText: text,
          translatedText,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({ translatedText, cached: false });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || "Translate failed" });
      }
    });
  }
);

/**
 * =========================================================
 * 2) Notifications: Followers get notified on new published post
 * =========================================================
 *
 * Data expectations (we support multiple field names):
 * - posts/{postId} contains:
 *   - authorId OR user_id OR author_id
 *   - authorName OR author_name OR full_name (optional)
 *   - authorRole OR author_role OR role (optional)
 *   - status: "published" (recommended)
 *
 * Followers live at:
 * - users/{authorId}/followers/{followerId}
 *
 * Notifications written to:
 * - users/{followerId}/notifications/{notifId}
 *
 * IMPORTANT:
 * - We write: seen (boolean) + readAt (timestamp|null)
 *   (matches your rules that only allow updating seen/readAt)
 * - We use a deterministic notif doc id per follower per post to prevent duplicates.
 */

function normalizeStatus(v) {
  return String(v || "").toLowerCase().trim();
}

function getAuthorId(post) {
  return post.authorId || post.user_id || post.author_id || null;
}

function getAuthorName(post) {
  return post.authorName || post.author_name || post.full_name || "Someone you follow";
}

function getAuthorRole(post) {
  return post.authorRole || post.author_role || post.role || null;
}

async function fanoutNewPostNotification({ postId, post }) {
  const authorId = getAuthorId(post);
  if (!authorId) return;

  const authorName = getAuthorName(post);
  const authorRole = getAuthorRole(post);

  const followersRef = admin.firestore().collection(`users/${authorId}/followers`);
  const followersSnap = await followersRef.get();
  if (followersSnap.empty) return;

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Firestore batch limit = 500 ops/commit
  const followerIds = followersSnap.docs.map((d) => d.id);
  const chunkSize = 450; // leave headroom
  for (let i = 0; i < followerIds.length; i += chunkSize) {
    const chunk = followerIds.slice(i, i + chunkSize);
    const batch = admin.firestore().batch();

    chunk.forEach((followerId) => {
      // Deterministic ID: 1 notif per follower per post
      const notifId = `new_post_${postId}`;
      const notifRef = admin.firestore().collection(`users/${followerId}/notifications`).doc(notifId);

      batch.set(
        notifRef,
        {
          type: "new_post",
          postId,
          authorId,
          authorName,
          authorRole,
          title: "New post",
          body: `${authorName} posted an update`,
          link: `/postdetail?id=${postId}`,

          // ✅ matches your notification rules pattern
          seen: false,
          readAt: null,

          createdAt: now,
        },
        { merge: true } // safe if doc already exists
      );
    });

    await batch.commit();
  }
}

/**
 * 2A) If a post is created already "published", notify immediately.
 */
exports.notifyFollowersOnNewPost = onDocumentCreated("posts/{postId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const post = snap.data() || {};
  const postId = event.params.postId;

  const status = normalizeStatus(post.status);

  // If you don't use status yet, remove this check.
  // Keeping it prevents "draft" posts from notifying followers.
  if (status && status !== "published") return;

  await fanoutNewPostNotification({ postId, post });
});

/**
 * 2B) If you create posts as "draft" first and publish later,
 * this handles the transition draft -> published.
 */
exports.notifyFollowersOnPostPublished = onDocumentUpdated("posts/{postId}", async (event) => {
  const before = event.data?.before?.data?.() || {};
  const after = event.data?.after?.data?.() || {};
  const postId = event.params.postId;

  const beforeStatus = normalizeStatus(before.status);
  const afterStatus = normalizeStatus(after.status);

  if (afterStatus !== "published") return;
  if (beforeStatus === "published") return;

  await fanoutNewPostNotification({ postId, post: after });
});

/**
 * =========================================================
 * 2B) Notifications: User gets notified when someone follows them
 * =========================================================
 *
 * Trigger:
 * - users/{followeeId}/followers/{followerId} (onCreate)
 *
 * Writes:
 * - users/{followeeId}/notifications/{notifId}
 *
 * Notes:
 * - No route/link needed (NotificationsBell already supports link-less notifs)
 * - Deterministic notif id prevents duplicates
 */
exports.notifyUserOnFollow = onDocumentCreated(
  "users/{followeeId}/followers/{followerId}",
  async (event) => {
    try {
      const followeeId = event.params.followeeId;
      const followerId = event.params.followerId;

      if (!followeeId || !followerId) return;
      if (followeeId === followerId) return; // ignore self-follow

      const notifId = `follow_${followeeId}_${followerId}`;
      const notifRef = admin
        .firestore()
        .doc(`users/${followeeId}/notifications/${notifId}`);

      // Pull follower profile for display (best-effort)
      let followerName = "Someone";
      let followerRole = null;
      let followerPhoto = "";

      const followerDoc = await admin.firestore().doc(`users/${followerId}`).get();
      if (followerDoc.exists) {
        const u = followerDoc.data() || {};
        followerName = u.full_name || u.displayName || u.name || followerName;
        followerRole = u.role || u.selected_role || u.user_type || u.userType || followerRole;
        followerPhoto = u.profile_picture || u.photoURL || u.photo_url || followerPhoto;
      }

      await notifRef.set(
        {
          type: "follow",
          followerId,
          followerName,
          followerRole,
          followerPhoto,
          title: "New follower",
          body: `${followerName} started following you`,

          // matches your notification rules pattern
          seen: false,
          readAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("notifyUserOnFollow error:", err);
    }
  }
);
