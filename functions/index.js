const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const crypto = require("crypto");
const OpenAI = require("openai");

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

admin.initializeApp();

function pickFirst(obj, keys = []) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function notifyUser(uid, payload) {
  if (!uid) return Promise.resolve();

  const ref = admin
    .firestore()
    .collection("users")
    .doc(uid)
    .collection("notifications")
    .doc();

  return ref.set({
    type: payload.type || "system",
    title: payload.title || "",
    body: payload.body || "",
    link: payload.link || "",
    data: payload.data || {},
    seen: false,
    readAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

function hashKey(text, targetLang) {
  return crypto.createHash("sha256").update(`${targetLang}||${text}`).digest("hex");
}

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
            {
              role: "system",
              content: "You are a professional translator. Output ONLY the translated text.",
            },
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

// ===========================
// Step 4 — Firestore Triggers
// ===========================

// A) Message created -> notify other participants
//
// ✅ FIXED:
// - Listen to the REAL message path: conversations/{conversationId}/messages/{messageId}
// - Use conversationId from event params (no need to rely on msg.conversationId field)
// - Support participants stored as array OR map (participants_map / participantsMap / members_map / membersMap)
// - Keep existing senderId detection + preview building + notifyUser behavior
exports.onMessageCreated = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const msg = snap.data() || {};
    const senderId = msg.sender_id || msg.senderId || msg.from_uid || msg.fromUid;

    // conversationId comes from the path
    const conversationId = event.params.conversationId;
    const messageId = event.params.messageId;

    if (!senderId || !conversationId) return;

    const convRef = admin.firestore().collection("conversations").doc(conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists) return;

    const conv = convSnap.data() || {};

    // participants can be an array OR a map
    let participants = [];
    if (Array.isArray(conv.participants)) {
      participants = conv.participants;
    } else {
      const pMap =
        conv.participants_map ||
        conv.participantsMap ||
        conv.members_map ||
        conv.membersMap;

      if (pMap && typeof pMap === "object") {
        participants = Object.keys(pMap);
      }
    }

    if (!participants.length) return;

    const recipients = participants.filter((uid) => uid && uid !== senderId);

    const preview =
      (msg.text || msg.message || msg.body || msg.content || "")
        .toString()
        .trim()
        .slice(0, 120);

    await Promise.all(
      recipients.map((uid) =>
        notifyUser(uid, {
          type: "message",
          title: "New message",
          body: preview || "You received a new message",
          link: `/messages?c=${conversationId}`,
          data: { conversationId, senderId, messageId },
        })
      )
    );
  }
);

// B) Lead created -> notify assigned agent (if lead has agent field)
exports.onLeadCreated = onDocumentCreated(
  "leads/{docId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const lead = snap.data() || {};

    // Try common field names (adjust if you confirm exact field name)
    const agentUid = pickFirst(lead, [
      "assigned_agent_id",
      "assigned_agent_uid",
      "agent_id",
      "agent_uid",
      "to_agent_id",
      "to_agent_uid",
    ]);

    if (!agentUid) return;

    await notifyUser(agentUid, {
      type: "lead",
      title: "New lead",
      body: "A new lead was submitted.",
      link: "/agent/leads",
      data: { leadId: event.params.docId },
    });
  }
);

// C) Tutoring session created -> notify tutor + student (if fields exist)
exports.onTutoringSessionCreated = onDocumentCreated(
  "tutoring_sessions/{docId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const s = snap.data() || {};

    const tutorUid = pickFirst(s, ["tutor_auth_uid", "tutor_uid", "tutor_id"]);
    const studentUid = pickFirst(s, ["student_auth_uid", "student_uid", "student_id"]);

    // notify tutor
    if (tutorUid) {
      await notifyUser(tutorUid, {
        type: "session",
        title: "New tutoring session",
        body: "A student booked a tutoring session.",
        link: "/tutor/sessions",
        data: { sessionId: event.params.docId },
      });
    }

    // notify student (optional but recommended)
    if (studentUid) {
      await notifyUser(studentUid, {
        type: "session",
        title: "Session booked",
        body: "Your tutoring session has been created.",
        link: "/my-sessions",
        data: { sessionId: event.params.docId },
      });
    }
  }
);
