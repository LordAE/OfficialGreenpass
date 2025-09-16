// src/api/entities.js
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit as qLimit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "./firebaseClient";

// ---------------------------------------------------------
// Utilities
// ---------------------------------------------------------
const withId = (snap) => ({ id: snap.id, ...snap.data() });

async function getById(coll, id) {
  const snap = await getDoc(doc(db, coll, String(id)));
  return snap.exists() ? withId(snap) : null;
}

async function listEq(coll, filters = {}, { limit } = {}) {
  // equality-only filters to avoid composite index hassles
  let qRef = collection(db, coll);
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null) {
      qRef = query(qRef, where(k, "==", v));
    }
  }
  if (limit) qRef = query(qRef, qLimit(limit));
  const s = await getDocs(qRef);
  return s.docs.map(withId);
}

async function createIn(coll, payload) {
  const ref = await addDoc(collection(db, coll), payload);
  const snap = await getDoc(ref);
  return withId(snap);
}

async function updateIn(coll, id, patch) {
  const ref = doc(db, coll, String(id));
  await updateDoc(ref, patch);
  const snap = await getDoc(ref);
  return withId(snap);
}

async function removeIn(coll, id) {
  await deleteDoc(doc(db, coll, String(id)));
  return { id };
}

// ---------------------------------------------------------
// Generic entity factory
// ---------------------------------------------------------
function makeEntity(collectionName, opts = {}) {
  const { idField } = opts; // optional "natural key" field to fast-path
  return {
    collection: collectionName,
    // Look up by Firestore doc id
    async get(id) {
      return await getById(collectionName, id);
    },
    // Equality filter; ex: filter({ status: 'open', user_id })
    async filter(filters = {}, options = {}) {
      // if caller passes an idField and only that field, try a faster path
      if (
        idField &&
        Object.keys(filters).length === 1 &&
        filters[idField] !== undefined
      ) {
        // try field match, fallback to doc id
        const rows = await listEq(collectionName, { [idField]: filters[idField] }, options);
        if (rows.length) return rows;
        const fallback = await this.get(filters[idField]);
        return fallback ? [fallback] : [];
      }
      return await listEq(collectionName, filters, options);
    },
    async create(payload) {
      return await createIn(collectionName, payload);
    },
    async update(id, patch) {
      return await updateIn(collectionName, id, patch);
    },
    async remove(id) {
      return await removeIn(collectionName, id);
    },
  };
}

// ---------------------------------------------------------
// Collections mapping (from your schema pack)
// Using lowercase snake_case & plural names for Firestore
// Special cases ('*Settings') are already plural, so no extra "es".
// ---------------------------------------------------------
export const COLLECTIONS = {
  AboutPageContent: "about_page_contents",
  Agent: "agents",
  AgentPackage: "agent_packages",
  Asset: "assets",
  BankSettings: "bank_settings",
  BrandSettings: "brand_settings",
  Case: "cases",
  ChatSettings: "chat_settings",
  Contact: "contacts",
  ContactPageContent: "contact_page_contents",
  Conversation: "conversations",
  Event: "events",
  EventAssignment: "event_assignments",
  EventRegistration: "event_registrations",
  ExhibitorRegistration: "exhibitor_registrations",
  FAQ: "faqs",
  Job: "jobs",
  Lead: "leads",
  Message: "messages",
  MessageTemplate: "message_templates",
  Notification: "notifications",
  Organization: "organizations",
  Package: "packages",
  Payment: "payments",
  Post: "posts",
  Product: "products",
  Program: "programs",
  Question: "questions",
  Quiz: "quizzes",
  Reservation: "reservations",
  School: "schools",
  Service: "services",
  StudentRSVP: "student_rsvps",
  StudentTutorPackage: "student_tutor_packages",
  SupportAgent: "support_agents",
  SupportTicket: "support_tickets",
  Tutor: "tutors",
  TutorPackage: "tutor_packages",
  TutoringSession: "tutoring_sessions",
  Vendor: "vendors",
  VisaDocument: "visa_documents",
  VisaPackage: "visa_packages",
  VisaRequest: "visa_requests",
  Wallet: "wallets",
  WalletTransaction: "wallet_transactions",
};

// ---------------------------------------------------------
// Generic entities for ALL collections above
// (so you can import ANY of them directly)
// ---------------------------------------------------------
export const AboutPageContent       = makeEntity(COLLECTIONS.AboutPageContent);
export const Agent                  = makeEntity(COLLECTIONS.Agent);
export const AgentPackage           = makeEntity(COLLECTIONS.AgentPackage);
export const Asset                  = makeEntity(COLLECTIONS.Asset);
export const BrandSettings          = makeEntity(COLLECTIONS.BrandSettings);
export const Case                   = makeEntity(COLLECTIONS.Case);
export const ChatSettings           = makeEntity(COLLECTIONS.ChatSettings);
export const Contact                = makeEntity(COLLECTIONS.Contact);
export const ContactPageContent     = makeEntity(COLLECTIONS.ContactPageContent);
export const Conversation           = makeEntity(COLLECTIONS.Conversation);
export const EventAssignment        = makeEntity(COLLECTIONS.EventAssignment);
export const ExhibitorRegistration  = makeEntity(COLLECTIONS.ExhibitorRegistration);
export const FAQ                    = makeEntity(COLLECTIONS.FAQ);
export const Job                    = makeEntity(COLLECTIONS.Job);
export const Lead                   = makeEntity(COLLECTIONS.Lead);
export const Message                = makeEntity(COLLECTIONS.Message);
export const MessageTemplate        = makeEntity(COLLECTIONS.MessageTemplate);
export const Notification           = makeEntity(COLLECTIONS.Notification);
export const Organization           = makeEntity(COLLECTIONS.Organization);
export const PackageEntity          = makeEntity(COLLECTIONS.Package); // "Package" is reserved in some contexts
export const Post                   = makeEntity(COLLECTIONS.Post);
export const Product                = makeEntity(COLLECTIONS.Product);
export const Program                = makeEntity(COLLECTIONS.Program);
export const Question               = makeEntity(COLLECTIONS.Question);
export const Quiz                   = makeEntity(COLLECTIONS.Quiz);
export const Reservation            = makeEntity(COLLECTIONS.Reservation);
export const School                 = makeEntity(COLLECTIONS.School);
export const Service                = makeEntity(COLLECTIONS.Service);
export const StudentRSVP            = makeEntity(COLLECTIONS.StudentRSVP);
export const StudentTutorPackage    = makeEntity(COLLECTIONS.StudentTutorPackage);
export const SupportAgent           = makeEntity(COLLECTIONS.SupportAgent);
export const SupportTicket          = makeEntity(COLLECTIONS.SupportTicket);
export const Tutor                  = makeEntity(COLLECTIONS.Tutor);
export const TutorPackage           = makeEntity(COLLECTIONS.TutorPackage);
export const TutoringSession        = makeEntity(COLLECTIONS.TutoringSession);
export const Vendor                 = makeEntity(COLLECTIONS.Vendor);
export const VisaDocument           = makeEntity(COLLECTIONS.VisaDocument);
export const VisaPackage            = makeEntity(COLLECTIONS.VisaPackage);
export const VisaRequest            = makeEntity(COLLECTIONS.VisaRequest);
export const Wallet                 = makeEntity(COLLECTIONS.Wallet);
export const WalletTransaction      = makeEntity(COLLECTIONS.WalletTransaction);

// ---------------------------------------------------------
// Specialized entities used by your pages today
// (drop-in compatibility with your existing code)
// ---------------------------------------------------------

// Auth-backed "current user"
export const User = {
  // Returns { id, email, display_name } or throws if not signed in
  async me() {
    const u = await new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        user ? resolve(user) : reject(new Error("Not signed in"));
      });
    });
    return { id: u.uid, email: u.email, display_name: u.displayName || "" };
  },
};

// Read a setting by key (e.g., CAD_USD_FX_RATE)
export const BankSettings = {
  async filter({ key }) {
    if (!key) return [];
    const rows = await listEq(COLLECTIONS.BankSettings, { key }, { limit: 1 });
    return rows.length ? [rows[0]] : [];
  },
};

// Events: try event_id field first; fallback to doc id
export const Event = {
  async filter({ event_id }) {
    if (!event_id) return [];
    const byField = await listEq(COLLECTIONS.Event, { event_id }, { limit: 1 });
    if (byField.length) return byField;
    const byDoc = await getById(COLLECTIONS.Event, event_id);
    return byDoc ? [byDoc] : [];
  },
};

// Registrations: add default timestamps/status
export const EventRegistration = {
  async create(payload) {
    const now = new Date().toISOString();
    return await createIn(COLLECTIONS.EventRegistration, {
      status: "unpaid",
      created_at: now,
      updated_at: now,
      ...payload,
    });
  },
  async update(id, patch) {
    return await updateIn(COLLECTIONS.EventRegistration, id, {
      ...patch,
      updated_at: new Date().toISOString(),
    });
  },
};

// Payments: add default timestamps
export const Payment = {
  async create(payload) {
    const now = new Date().toISOString();
    return await createIn(COLLECTIONS.Payment, {
      created_date: now,
      updated_date: now,
      ...payload,
    });
  },
};
