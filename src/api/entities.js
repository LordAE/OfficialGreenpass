// src/api/entities.js
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, limit as qLimit, or, documentId
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/firebase";

// ---------- helpers ----------
const withId = (snap) => ({ id: snap.id, ...snap.data() });

// Firestore 'in' has max 10 items -> chunk and merge results
async function runInChunks(baseColl, field, values, buildQuery, mergeFn = (acc, x) => acc.concat(x)) {
  const chunks = [];
  for (let i = 0; i < values.length; i += 10) chunks.push(values.slice(i, i + 10));
  let out = [];
  for (const c of chunks) {
    const qRef = buildQuery(collection(db, baseColl), c);
    const s = await getDocs(qRef);
    out = mergeFn(out, s.docs.map(withId));
  }
  return out;
}

async function getById(coll, id) {
  const snap = await getDoc(doc(db, coll, String(id)));
  return snap.exists() ? withId(snap) : null;
}

async function listEq(coll, filters = {}, { limit } = {}) {
  // Special-case sole filter by doc id
  if (filters && typeof filters === 'object' && Object.keys(filters).length === 1 && 'id' in filters) {
    const row = await getById(coll, filters.id);
    return row ? [row] : [];
  }

  // Handle $in cases and simple equality
  const entries = Object.entries(filters || {});
  const inFilters = entries.filter(([_, v]) => v && typeof v === 'object' && '$in' in v && Array.isArray(v.$in) && v.$in.length > 0);
  const eqFilters  = entries.filter(([_, v]) => !(v && typeof v === 'object' && '$in' in v));

  // If there is at least one $in filter, we must fan out the queries (Firestore allows at most one 'in' per query in many cases)
  if (inFilters.length > 0) {
    // For simplicity, support a single $in filter per query (common across your pages).
    // If multiple $in appear, we AND them by client-side intersection.
    const [inField, inSpec] = inFilters[0];
    const otherIn = inFilters.slice(1); // rarely used in your code; will be intersected client-side

    const results = await runInChunks(
      coll,
      inField,
      inSpec.$in,
      (base, chunk) => {
        let qRef = query(base, where(inField, 'in', chunk));
        for (const [k, v] of eqFilters) {
          if (v !== undefined && v !== null) qRef = query(qRef, where(k, '==', v));
        }
        if (limit) qRef = query(qRef, qLimit(limit));
        return qRef;
      }
    );

    // If there were multiple $in filters, intersect client-side
    if (otherIn.length > 0) {
      return results.filter(r => otherIn.every(([k, spec]) => spec.$in.includes(r[k])));
    }
    return results;
  }

  // No $in: build a simple chained query
  let qRef = collection(db, coll);
  for (const [k, v] of eqFilters) {
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
      // If caller passes only the natural key (e.g., event_id), try that first; fallback to doc id.
      if (idField && Object.keys(filters).length === 1 && filters[idField] !== undefined) {
        const rows = await listEq(collectionName, { [idField]: filters[idField] }, options);
        if (rows.length) return rows;
        const fallback = await this.get(filters[idField]);
        return fallback ? [fallback] : [];
      }
      // Support { id: ... } as well
      if (Object.keys(filters).length === 1 && 'id' in filters) {
        const row = await this.get(filters.id);
        return row ? [row] : [];
      }
      return await listEq(collectionName, filters, options);
    },

    async list(sortField, options = {}) {
      // Sorting omitted for simplicity; callers already pass a sort hint like '-created_date'
      // If you need server-side ordering, add orderBy here.
      return await listEq(collectionName, {}, options);
    },

    async create(payload) { return await createIn(collectionName, payload); },
    async update(id, patch) { return await updateIn(collectionName, id, patch); },
    async remove(id) { return await removeIn(collectionName, id); },
    async delete(id) { return await removeIn(collectionName, id); }, // alias for convenience
  };
}

// ---------- collection name mapping ----------
const C = {
  Agent: "agents",
  Tutor: "tutors",
  Users: "users", // NEW
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

// ---------- generic exports ----------
export const Agent               = makeEntity(C.Agent);
export const Tutor               = makeEntity(C.Tutor);
export const VisaRequest         = makeEntity(C.VisaRequest);
export const TutoringSession     = makeEntity(C.TutoringSession);
export const Reservation         = makeEntity(C.Reservation);
export const Case                = makeEntity(C.Case);
export const Vendor              = makeEntity(C.Vendor);
export const Service             = makeEntity(C.Service);
export const MarketplaceOrder    = makeEntity(C.MarketplaceOrder);
export const FAQ                 = makeEntity(C.FAQ);
export const KnowledgeBase       = makeEntity(C.KnowledgeBase);
export const Conversation        = makeEntity(C.Conversation);
export const Message             = makeEntity(C.Message);
export const SupportTicket       = makeEntity(C.SupportTicket);
export const SupportAgent        = makeEntity(C.SupportAgent);
export const Question            = makeEntity(C.Question);
export const Quiz                = makeEntity(C.Quiz);
export const Program             = makeEntity(C.Program);
export const Product             = makeEntity(C.Product);
export const Wallet              = makeEntity(C.Wallet);
export const WalletTransaction   = makeEntity(C.WalletTransaction);
export const VisaDocument        = makeEntity(C.VisaDocument);
export const VisaPackage         = makeEntity(C.VisaPackage);
export const AgentPackage        = makeEntity(C.AgentPackage);
export const TutorPackage        = makeEntity(C.TutorPackage);
export const StudentTutorPackage = makeEntity(C.StudentTutorPackage);
export const StudentRSVP         = makeEntity(C.StudentRSVP);
export const EventAssignment     = makeEntity(C.EventAssignment);
export const ExhibitorRegistration = makeEntity(C.ExhibitorRegistration);
export const Organization        = makeEntity(C.Organization);
export const BrandSettings       = makeEntity(C.BrandSettings);
export const AboutPageContent    = makeEntity(C.AboutPageContent);
export const ContactPageContent  = makeEntity(C.ContactPageContent);
export const HomePageContent     = makeEntity(C.HomePageContent);
export const ChatSettings        = makeEntity(C.ChatSettings);
export const KnowledgeBaseArticle= makeEntity(C.KnowledgeBaseArticle);
export const Asset               = makeEntity(C.Asset);
export const Lead                = makeEntity(C.Lead);
export const Contact             = makeEntity(C.Contact);
export const Post                = makeEntity(C.Post);
export const Registration        = makeEntity(C.Registration);
export const FairEvent           = makeEntity(C.FairEvent);
export const Institution         = makeEntity(C.Institution);
export const School              = makeEntity(C.School);
export const SchoolProfile       = makeEntity(C.SchoolProfile);
export const OurTeamPageContent  = makeEntity(C.OurTeamPageContent);
export const PackageEntity       = makeEntity(C.Package);

// ---------- specialized entities ----------
export const BankSettings = {
  async filter({ key }) {
    if (!key) return [];
    const rows = await listEq(C.BankSettings, { key }, { limit: 1 });
    return rows.length ? [rows[0]] : [];
  },
};

// Events: lookup by event_id first, then by doc id
export const Event = {
  ...makeEntity(C.Event, { idField: 'event_id' }),
};

// EventRegistration: inherit filter/get/list, add default timestamps/status
export const EventRegistration = {
  ...makeEntity(C.EventRegistration),
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
  ...makeEntity(C.Payment),
  async create(payload) {
    const now = new Date().toISOString();
    return await createIn(C.Payment, {
      created_date: now,
      updated_date: now,
      ...payload,
    });
  },
};

// ---------- Users (auth + profile collection) ----------
const UsersCollection = makeEntity(C.Users);

async function getAuthedFirebaseUser() {
  return await new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      user ? resolve(user) : reject(new Error("Not signed in"));
    });
  });
}

export const User = {
  // Auth + profile merge
  async me() {
    const u = await getAuthedFirebaseUser();
    // load profile doc (id == uid)
    const profile = await getById(C.Users, u.uid);
    return {
      id: u.uid,
      email: u.email || "",
      display_name: u.displayName || "",
      // merge profile fields (full_name, assigned_agent_id, session_credits, etc.)
      ...(profile || {}),
    };
  },

  // CRUD on users collection (by id == uid)
  async get(id)       { return await UsersCollection.get(id); },
  async filter(f,o)   { return await UsersCollection.filter(f,o); },
  async list(s,o)     { return await UsersCollection.list(s,o); },
  async create(data)  { return await UsersCollection.create(data); },
  async update(id,p)  { return await UsersCollection.update(id,p); },
  async remove(id)    { return await UsersCollection.remove(id); },
  async delete(id)    { return await UsersCollection.delete(id); },

  // Convenience: update current user's profile doc
  async updateMyUserData(patch) {
    const u = await getAuthedFirebaseUser();
    // ensure doc exists; if not, create it with id = uid
    const existing = await getById(C.Users, u.uid);
    if (existing) {
      return await updateIn(C.Users, u.uid, patch);
    } else {
      return await createIn(C.Users, { ...patch, id: u.uid });
    }
  },
};
