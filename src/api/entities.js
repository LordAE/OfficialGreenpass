// src/api/entities.js
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, limit as qLimit
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/firebase"; // you already have src/firebase.js

// ---------- helpers ----------
const withId = (snap) => ({ id: snap.id, ...snap.data() });

async function getById(coll, id) {
  const snap = await getDoc(doc(db, coll, String(id)));
  return snap.exists() ? withId(snap) : null;
}
async function listEq(coll, filters = {}, { limit } = {}) {
  let qRef = collection(db, coll);
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null) qRef = query(qRef, where(k, "==", v));
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
  return { id: String(id) };
}

function makeEntity(collectionName, opts = {}) {
  const { idField } = opts; // optional natural key, e.g. event_id
  return {
    collection: collectionName,
    async get(id) { return await getById(collectionName, id); },
    async filter(filters = {}, options = {}) {
      if (idField && Object.keys(filters).length === 1 && filters[idField] !== undefined) {
        const rows = await listEq(collectionName, { [idField]: filters[idField] }, options);
        if (rows.length) return rows;
        const fallback = await this.get(filters[idField]);
        return fallback ? [fallback] : [];
      }
      return await listEq(collectionName, filters, options);
    },
    async list(sortField, options = {}) { // optional, for compatibility
      return await listEq(collectionName, {}, options);
    },
    async create(payload) { return await createIn(collectionName, payload); },
    async update(id, patch) { return await updateIn(collectionName, id, patch); },
    async remove(id) { return await removeIn(collectionName, id); },
  };
}

// ---------- collection name mapping (snake_case plurals) ----------
const C = {
  Agent: "agents",
  Tutor: "tutors",
  VisaRequest: "visa_requests",
  TutoringSession: "tutoring_sessions",
  Reservation: "reservations",
  Payment: "payments",
  Case: "cases",
  Vendor: "vendors",
  Service: "services",
  MarketplaceOrder: "marketplace_orders",
  FAQ: "faqs",
  KnowledgeBase: "knowledge_bases",
  Conversation: "conversations",
  Message: "messages",
  SupportTicket: "support_tickets",
  SupportAgent: "support_agents",
  Question: "questions",
  Quiz: "quizzes",
  Program: "programs",
  Product: "products",
  Wallet: "wallets",
  WalletTransaction: "wallet_transactions",
  VisaDocument: "visa_documents",
  VisaPackage: "visa_packages",
  AgentPackage: "agent_packages",
  TutorPackage: "tutor_packages",
  StudentTutorPackage: "student_tutor_packages",
  StudentRSVP: "student_rsvps",
  Event: "events",
  EventAssignment: "event_assignments",
  EventRegistration: "event_registrations",
  ExhibitorRegistration: "exhibitor_registrations",
  Organization: "organizations",
  BankSettings: "bank_settings",
  BrandSettings: "brand_settings",
  AboutPageContent: "about_page_contents",
  ContactPageContent: "contact_page_contents",
  HomePageContent: "home_page_contents",
  ChatSettings: "chat_settings",
  KnowledgeBaseArticle: "knowledge_base_articles",
  Asset: "assets",
  Lead: "leads",
  Contact: "contacts",
  Post: "posts",
  Registration: "registrations",
  FairEvent: "fair_events",
  Institution: "institutions",
  School: "schools",
  SchoolProfile: "school_profiles",
  OurTeamPageContent: "our_team_page_contents",
  Package: "packages",
};

// ---------- generic exports for ALL entities ----------
export const Agent                  = makeEntity(C.Agent);
export const Tutor                  = makeEntity(C.Tutor);
export const VisaRequest            = makeEntity(C.VisaRequest);
export const TutoringSession        = makeEntity(C.TutoringSession);
export const Reservation            = makeEntity(C.Reservation);
export const Case                   = makeEntity(C.Case);
export const Vendor                 = makeEntity(C.Vendor);
export const Service                = makeEntity(C.Service);
export const MarketplaceOrder       = makeEntity(C.MarketplaceOrder);
export const FAQ                    = makeEntity(C.FAQ);
export const KnowledgeBase          = makeEntity(C.KnowledgeBase);
export const Conversation           = makeEntity(C.Conversation);
export const Message                = makeEntity(C.Message);
export const SupportTicket          = makeEntity(C.SupportTicket);
export const SupportAgent           = makeEntity(C.SupportAgent);
export const Question               = makeEntity(C.Question);
export const Quiz                   = makeEntity(C.Quiz);
export const Program                = makeEntity(C.Program);
export const Product                = makeEntity(C.Product);
export const Wallet                 = makeEntity(C.Wallet);
export const WalletTransaction      = makeEntity(C.WalletTransaction);
export const VisaDocument           = makeEntity(C.VisaDocument);
export const VisaPackage            = makeEntity(C.VisaPackage);
export const AgentPackage           = makeEntity(C.AgentPackage);
export const TutorPackage           = makeEntity(C.TutorPackage);
export const StudentTutorPackage    = makeEntity(C.StudentTutorPackage);
export const StudentRSVP            = makeEntity(C.StudentRSVP);
export const EventAssignment        = makeEntity(C.EventAssignment);
export const ExhibitorRegistration  = makeEntity(C.ExhibitorRegistration);
export const Organization           = makeEntity(C.Organization);
export const BrandSettings          = makeEntity(C.BrandSettings);
export const AboutPageContent       = makeEntity(C.AboutPageContent);
export const ContactPageContent     = makeEntity(C.ContactPageContent);
export const HomePageContent        = makeEntity(C.HomePageContent);
export const ChatSettings           = makeEntity(C.ChatSettings);
export const KnowledgeBaseArticle   = makeEntity(C.KnowledgeBaseArticle);
export const Asset                  = makeEntity(C.Asset);
export const Lead                   = makeEntity(C.Lead);
export const Contact                = makeEntity(C.Contact);
export const Post                   = makeEntity(C.Post);
export const Registration           = makeEntity(C.Registration);
export const FairEvent              = makeEntity(C.FairEvent);
export const Institution            = makeEntity(C.Institution);
export const School                 = makeEntity(C.School);
export const SchoolProfile          = makeEntity(C.SchoolProfile);
export const OurTeamPageContent     = makeEntity(C.OurTeamPageContent);
export const PackageEntity          = makeEntity(C.Package); // alias if "Package" conflicts in imports

// ---------- specialized entities your pages depend on ----------
export const BankSettings = {
  async filter({ key }) {
    if (!key) return [];
    const rows = await listEq(C.BankSettings, { key }, { limit: 1 });
    return rows.length ? [rows[0]] : [];
  },
};

// Events: lookup by event_id first, then by doc id
export const Event = {
  async filter({ event_id }) {
    if (!event_id) return [];
    const byField = await listEq(C.Event, { event_id }, { limit: 1 });
    if (byField.length) return byField;
    const byDoc = await getById(C.Event, event_id);
    return byDoc ? [byDoc] : [];
  },
  async create(payload) { return await createIn(C.Event, payload); },
  async update(id, patch) { return await updateIn(C.Event, id, patch); },
};

// EventRegistration: add default timestamps/status
export const EventRegistration = {
  async create(payload) {
    const now = new Date().toISOString();
    return await createIn(C.EventRegistration, {
      status: "unpaid",
      created_at: now,
      updated_at: now,
      ...payload,
    });
  },
  async update(id, patch) {
    return await updateIn(C.EventRegistration, id, {
      ...patch,
      updated_at: new Date().toISOString(),
    });
  },
};

// Payment: timestamp defaults
export const Payment = {
  ...makeEntity(C.Payment), // get, filter, update, remove
  async create(payload) {
    const now = new Date().toISOString();
    return await createIn(C.Payment, {
      created_date: now,
      updated_date: now,
      ...payload,
    });
  },
};


// Auth-backed current user
export const User = {
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
