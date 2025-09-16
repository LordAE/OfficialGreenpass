// npm i zod
import { z } from "zod";

export const UserSchema = z.object({
  role: z.string(),                                    // required
  email: z.string().email(),                           // required
  full_name: z.string(),                               // required

  user_type: z.enum(["user","student","agent","tutor","school","admin","vendor"]).default("user"),

  phone: z.string().optional(),
  country: z.string().optional(),
  profile_picture: z.string().url().optional(),

  address: z
    .object({
      street: z.string().optional(),
      ward: z.string().optional(),
      district: z.string().optional(),
      province: z.string().optional(),
      postal_code: z.string().optional(),
    })
    .optional(),

  is_verified: z.boolean().default(false),
  onboarding_completed: z.boolean().default(false),

  kyc_document_id: z.string().optional(),
  kyc_document_url: z.string().url().optional(),

  assigned_agent_id: z.string().optional(),
  referred_by_agent_id: z.string().optional(),

  purchased_packages: z.array(z.string()).default([]),
  purchased_tutor_packages: z.array(z.string()).default([]),

  session_credits: z.number().default(0),

  schoolId: z.string().optional(),
  programId: z.string().optional(),
  // Store as Firestore Timestamp in DB; here we accept Date or ISO string
  enrollment_date: z.union([z.string(), z.date()]).optional(),

  agent_reassignment_request: z
    .object({
      requested_at: z.union([z.string(), z.date()]).optional(),
      reason: z.string().optional(),
      new_agent_id: z.string().optional(),
      status: z.enum(["pending","approved","rejected"]).default("pending"),
    })
    .optional(),

  settings: z
    .object({
      language: z.enum(["en","vi"]).default("en"),
      timezone: z.string().default("Asia/Ho_Chi_Minh"),
      currency: z.enum(["USD","VND","CAD"]).default("USD"),
      notification_preferences: z
        .object({
          email_notifications: z.boolean().default(true),
          sms_notifications: z.boolean().default(false),
          application_updates: z.boolean().default(true),
          marketing_emails: z.boolean().default(false),
          session_reminders: z.boolean().default(true),
        })
        .default({}),
    })
    .default({}),

  package_assignment: z
    .object({
      package_id: z.string().optional(),
      assigned_at: z.union([z.string(), z.date()]).optional(),
      expires_at: z.union([z.string(), z.date()]).optional(),
    })
    .optional(),

  is_guest_created: z.boolean().default(false),
});

// Example helpers (JS)
export async function createUserDoc(db, uid, data) {
  const { doc, setDoc } = await import("firebase/firestore"); // lazy import ok
  const parsed = UserSchema.parse(data); // throws if invalid; applies defaults
  await setDoc(doc(db, "users", uid), parsed, { merge: true });
}

export async function initUser(db, uid, partial) {
  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
  const DEFAULTS = {
    user_type: "user",
    is_verified: false,
    onboarding_completed: false,
    purchased_packages: [],
    purchased_tutor_packages: [],
    session_credits: 0,
    settings: {
      language: "en",
      timezone: "Asia/Ho_Chi_Minh",
      currency: "USD",
      notification_preferences: {
        email_notifications: true,
        sms_notifications: false,
        application_updates: true,
        marketing_emails: false,
        session_reminders: true,
      },
    },
    is_guest_created: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", uid), { ...DEFAULTS, ...partial }, { merge: true });
}
