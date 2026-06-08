import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Clock3,
  Search,
  Loader2,
  Building2,
  User,
  Mail,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const CLAIM_REQUESTS_COLL = "institution_claim_requests";
const INSTITUTIONS_COLL = "institutions";
const USERS_COLL = "users";

function toDateSafe(v) {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(v) {
  const d = toDateSafe(v);
  if (!d) return "—";
  return d.toLocaleString();
}

function normalizeStatus(v) {
  return String(v || "").trim().toLowerCase();
}

function statusBadge(status) {
  const s = normalizeStatus(status);
  if (s === "pending") {
    return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
  }
  if (s === "approved") {
    return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
  }
  if (s === "rejected") {
    return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
  }
  return <Badge variant="outline">{status || "unknown"}</Badge>;
}

function firstNonEmpty(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  return [v];
}

function normalizeDocItemsFromUser(userDoc) {
  const schoolProfile = userDoc?.school_profile || {};
  const draftProfile = userDoc?.school_profile_draft || {};
  const verification = userDoc?.verification || userDoc?.verification_profile || {};
  const schoolVerification =
    userDoc?.school_verification || userDoc?.school_profile_verification || {};

  const rawCandidates = [
    {
      label: "Business License / Registration",
      url: firstNonEmpty(
        schoolVerification?.business_license_url,
        verification?.business_license_url,
        schoolProfile?.business_license_url,
        draftProfile?.business_license_url
      ),
    },
    {
      label: "School Registration Document",
      url: firstNonEmpty(
        schoolVerification?.school_registration_url,
        verification?.school_registration_url,
        schoolProfile?.school_registration_url,
        draftProfile?.school_registration_url
      ),
    },
    {
      label: "Official ID / Representative ID",
      url: firstNonEmpty(
        schoolVerification?.representative_id_url,
        verification?.representative_id_url,
        schoolVerification?.government_id_url,
        verification?.government_id_url,
        schoolProfile?.government_id_url,
        draftProfile?.government_id_url
      ),
    },
    {
      label: "Proof of Employment / Authorization",
      url: firstNonEmpty(
        schoolVerification?.authorization_letter_url,
        verification?.authorization_letter_url,
        schoolVerification?.employment_proof_url,
        verification?.employment_proof_url
      ),
    },
    {
      label: "Verification Form Attachment",
      url: firstNonEmpty(
        schoolVerification?.document_url,
        verification?.document_url,
        schoolVerification?.file_url,
        verification?.file_url
      ),
    },
  ];

  const arraySources = [
    ...asArray(schoolVerification?.documents),
    ...asArray(verification?.documents),
    ...asArray(schoolProfile?.verification_documents),
    ...asArray(draftProfile?.verification_documents),
    ...asArray(schoolProfile?.documents),
    ...asArray(draftProfile?.documents),
  ];

  const normalizedFromArrays = arraySources
    .map((item, idx) => {
      if (typeof item === "string") {
        return { label: `Supporting Document ${idx + 1}`, url: item };
      }
      if (item && typeof item === "object") {
        return {
          label:
            firstNonEmpty(item.label, item.name, item.title, `Supporting Document ${idx + 1}`) ||
            `Supporting Document ${idx + 1}`,
          url: firstNonEmpty(item.url, item.file_url, item.downloadURL, item.download_url),
        };
      }
      return null;
    })
    .filter(Boolean);

  const all = [...rawCandidates, ...normalizedFromArrays]
    .filter((x) => typeof x?.url === "string" && x.url.trim())
    .map((x) => ({
      label: x.label || "Document",
      url: x.url.trim(),
    }));

  const seen = new Set();
  return all.filter((x) => {
    const key = `${x.label}|${x.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getVerificationSummary(userDoc) {
  const verification = userDoc?.verification || userDoc?.verification_profile || {};
  const schoolVerification =
    userDoc?.school_verification || userDoc?.school_profile_verification || {};

  return {
    status: firstNonEmpty(
      schoolVerification?.status,
      verification?.status,
      userDoc?.verification_status,
      "not_submitted"
    ),
    officialEmail: firstNonEmpty(
      schoolVerification?.official_email,
      verification?.official_email,
      userDoc?.official_email,
      userDoc?.email
    ),
    officialWebsite: firstNonEmpty(
      schoolVerification?.official_website,
      verification?.official_website,
      userDoc?.website,
      userDoc?.school_profile?.website,
      userDoc?.school_profile_draft?.website
    ),
    notes: firstNonEmpty(
      schoolVerification?.notes,
      verification?.notes
    ),
  };
}


function normalizeSchoolProfileForInstitution(profile, uid, institutionId, existingInstitution = {}) {
  const p = profile && typeof profile === "object" ? profile : {};

  const imageUrls = Array.isArray(p.imageUrls)
    ? p.imageUrls.filter(Boolean)
    : Array.isArray(p.image_urls)
    ? p.image_urls.filter(Boolean)
    : p.imageUrl || p.image_url
    ? [p.imageUrl || p.image_url].filter(Boolean)
    : [];

  const primaryImage = firstNonEmpty(
    p.imageUrl,
    p.image_url,
    imageUrls[0],
    existingInstitution.imageUrl,
    existingInstitution.image_url
  );

  const name = firstNonEmpty(
    p.name,
    p.school_name,
    p.institution_name,
    existingInstitution.name,
    existingInstitution.school_name,
    existingInstitution.institution_name
  );

  return {
    user_id: uid,
    claim_status: "claimed",
    claimed_at: serverTimestamp(),

    name,
    short_name: firstNonEmpty(p.short_name, existingInstitution.short_name, name),

    school_level: firstNonEmpty(p.school_level, existingInstitution.school_level, "University"),
    type: firstNonEmpty(p.type, p.school_type, existingInstitution.type, existingInstitution.school_type, "university"),
    school_type: firstNonEmpty(p.school_type, p.type, existingInstitution.school_type, existingInstitution.type, "university"),

    public_private: firstNonEmpty(p.public_private, p.is_public, existingInstitution.public_private, "public"),
    isPublic:
      typeof p.isPublic === "boolean"
        ? p.isPublic
        : firstNonEmpty(p.public_private, p.is_public, existingInstitution.public_private, "public") === "public",
    is_public: firstNonEmpty(p.is_public, p.public_private, existingInstitution.is_public, "public"),

    year_established: firstNonEmpty(p.year_established, p.founded_year, existingInstitution.year_established, existingInstitution.founded_year, ""),
    founded_year: firstNonEmpty(p.founded_year, p.year_established, existingInstitution.founded_year, existingInstitution.year_established, ""),

    country: firstNonEmpty(p.country, existingInstitution.country, ""),
    province: firstNonEmpty(p.province, existingInstitution.province, ""),
    city: firstNonEmpty(p.city, p.location, existingInstitution.city, existingInstitution.location, ""),
    location: firstNonEmpty(p.location, p.city, existingInstitution.location, existingInstitution.city, ""),
    address: firstNonEmpty(p.address, existingInstitution.address, ""),

    website: firstNonEmpty(p.website, existingInstitution.website, ""),
    email: firstNonEmpty(p.email, existingInstitution.email, ""),
    phone: firstNonEmpty(p.phone, existingInstitution.phone, ""),

    logoUrl: firstNonEmpty(p.logoUrl, p.logo_url, primaryImage, existingInstitution.logoUrl, existingInstitution.logo_url, ""),
    logo_url: firstNonEmpty(p.logo_url, p.logoUrl, primaryImage, existingInstitution.logo_url, existingInstitution.logoUrl, ""),
    bannerUrl: firstNonEmpty(p.bannerUrl, p.banner_url, existingInstitution.bannerUrl, existingInstitution.banner_url, ""),
    banner_url: firstNonEmpty(p.banner_url, p.bannerUrl, existingInstitution.banner_url, existingInstitution.bannerUrl, ""),

    imageUrl: primaryImage || "",
    image_url: primaryImage || "",
    imageUrls,
    image_urls: imageUrls,

    about: firstNonEmpty(p.about, p.description, existingInstitution.about, existingInstitution.description, ""),
    description: firstNonEmpty(p.description, p.about, existingInstitution.description, existingInstitution.about, ""),

    pgwp_available: typeof p.pgwp_available === "boolean" ? p.pgwp_available : existingInstitution.pgwp_available || false,
    hasCoop: typeof p.hasCoop === "boolean" ? p.hasCoop : typeof p.has_coop === "boolean" ? p.has_coop : existingInstitution.hasCoop || false,
    has_coop: typeof p.has_coop === "boolean" ? p.has_coop : typeof p.hasCoop === "boolean" ? p.hasCoop : existingInstitution.has_coop || false,
    isDLI: typeof p.isDLI === "boolean" ? p.isDLI : typeof p.is_dli === "boolean" ? p.is_dli : existingInstitution.isDLI || false,
    is_dli: typeof p.is_dli === "boolean" ? p.is_dli : typeof p.isDLI === "boolean" ? p.isDLI : existingInstitution.is_dli || false,
    dliNumber: firstNonEmpty(p.dliNumber, p.dli_number, existingInstitution.dliNumber, existingInstitution.dli_number, ""),
    dli_number: firstNonEmpty(p.dli_number, p.dliNumber, existingInstitution.dli_number, existingInstitution.dliNumber, ""),

    rating: firstNonEmpty(p.rating, existingInstitution.rating, 0),
    acceptance_rate: firstNonEmpty(p.acceptance_rate, existingInstitution.acceptance_rate, 0),
    avgTuition: firstNonEmpty(p.avgTuition, p.tuition_fees, existingInstitution.avgTuition, existingInstitution.tuition_fees, 0),
    tuition_fees: firstNonEmpty(p.tuition_fees, p.avgTuition, existingInstitution.tuition_fees, existingInstitution.avgTuition, 0),
    application_fee: firstNonEmpty(p.application_fee, existingInstitution.application_fee, 0),
    cost_of_living: firstNonEmpty(p.cost_of_living, existingInstitution.cost_of_living, 0),

    status: firstNonEmpty(existingInstitution.status, "active"),
    visibility: firstNonEmpty(existingInstitution.visibility, "public"),
    verification_status: firstNonEmpty(existingInstitution.verification_status, "pending"),

    linked_institution_id: institutionId,
    updated_at: serverTimestamp(),
  };
}

export default function AdminClaimRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");

    try {
      const snap = await getDocs(
        query(collection(db, CLAIM_REQUESTS_COLL), orderBy("created_at", "desc"), limit(200))
      );

      const rows = [];
      for (const d of snap.docs) {
        const data = d.data() || {};

        let institution = null;
        let requester = null;

        try {
          if (data.institution_id) {
            const instSnap = await getDoc(doc(db, INSTITUTIONS_COLL, data.institution_id));
            if (instSnap.exists()) {
              institution = { id: instSnap.id, ...instSnap.data() };
            }
          }
        } catch {}

        try {
          if (data.requested_by_uid) {
            const userSnap = await getDoc(doc(db, USERS_COLL, data.requested_by_uid));
            if (userSnap.exists()) {
              requester = { id: userSnap.id, ...userSnap.data() };
            }
          }
        } catch {}

        rows.push({
          id: d.id,
          ...data,
          institution,
          requester,
        });
      }

      setRequests(rows);
    } catch (e) {
      console.error("Failed to load claim requests:", e);
      setError("Failed to load claim requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((r) => {
      const statusOk =
        statusFilter === "all" || normalizeStatus(r.status) === statusFilter;

      if (!statusOk) return false;

      if (!q) return true;

      const haystack = [
        r.institution_name,
        r.requested_by_name,
        r.requested_by_email,
        r.institution?.name,
        r.institution?.country,
        r.institution?.province,
        r.institution?.city,
        r.requester?.full_name,
        r.requester?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [requests, search, statusFilter]);

  const openDetails = (requestRow) => {
    setSelected(requestRow);
    setRejectionReason(requestRow?.rejection_reason || "");
    setDetailsOpen(true);
    setError("");
  };

  const approveRequest = async () => {
    if (!selected?.id) return;
    if (!selected?.institution_id) {
      setError("This request has no institution_id.");
      return;
    }
    if (!selected?.requested_by_uid) {
      setError("This request has no requested_by_uid.");
      return;
    }

    setApproving(true);
    setError("");

    try {
      const adminUid = auth.currentUser?.uid || "";

      await runTransaction(db, async (tx) => {
        const requestRef = doc(db, CLAIM_REQUESTS_COLL, selected.id);
        const instRef = doc(db, INSTITUTIONS_COLL, selected.institution_id);
        const requesterRef = doc(db, USERS_COLL, selected.requested_by_uid);

        const [requestSnap, instSnap, requesterSnap] = await Promise.all([
          tx.get(requestRef),
          tx.get(instRef),
          tx.get(requesterRef),
        ]);

        if (!requestSnap.exists()) {
          throw new Error("Claim request no longer exists.");
        }
        if (!instSnap.exists()) {
          throw new Error("Institution no longer exists.");
        }

        const requestData = requestSnap.data() || {};
        const instData = instSnap.data() || {};
        const requesterData = requesterSnap.exists() ? requesterSnap.data() || {} : {};

        const currentStatus = normalizeStatus(requestData.status);
        if (currentStatus === "approved") {
          throw new Error("This request is already approved.");
        }

        const existingOwner = String(instData.user_id || "").trim();
        if (existingOwner && existingOwner !== selected.requested_by_uid) {
          throw new Error("This institution is already owned by another user.");
        }

        const draftProfile =
          requesterData.school_profile_draft && typeof requesterData.school_profile_draft === "object"
            ? requesterData.school_profile_draft
            : requesterData.school_profile && typeof requesterData.school_profile === "object"
            ? requesterData.school_profile
            : {};

        const institutionMergeData = normalizeSchoolProfileForInstitution(
          draftProfile,
          selected.requested_by_uid,
          selected.institution_id,
          instData
        );

        tx.set(
          instRef,
          {
            ...institutionMergeData,
            claimed_by_email: requestData.requested_by_email || "",
          },
          { merge: true }
        );

        tx.set(
          requestRef,
          {
            status: "approved",
            reviewed_by: adminUid,
            reviewed_at: serverTimestamp(),
            approval_note: "Approved by admin.",
            rejection_reason: "",
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );

        if (requesterSnap.exists()) {
          const prevSchoolProfile =
            requesterData.school_profile && typeof requesterData.school_profile === "object"
              ? requesterData.school_profile
              : {};

          const approvedProfile = {
            ...prevSchoolProfile,
            ...draftProfile,
            institution_id: selected.institution_id,
            user_id: selected.requested_by_uid,
            claim_status: "claimed",
          };

          tx.set(
            requesterRef,
            {
              linked_institution_id: selected.institution_id,
              school_profile: approvedProfile,
              school_profile_draft: approvedProfile,
              updated_at: serverTimestamp(),
            },
            { merge: true }
          );
        }
      });

      setDetailsOpen(false);
      setSelected(null);
      await loadRequests();
    } catch (e) {
      console.error("Approve request failed:", e);
      setError(e?.message || "Failed to approve request.");
    } finally {
      setApproving(false);
    }
  };

  const rejectRequest = async () => {
    if (!selected?.id) return;

    setRejecting(true);
    setError("");

    try {
      const adminUid = auth.currentUser?.uid || "";
      const requestRef = doc(db, CLAIM_REQUESTS_COLL, selected.id);

      await runTransaction(db, async (tx) => {
        const requestSnap = await tx.get(requestRef);
        if (!requestSnap.exists()) {
          throw new Error("Claim request no longer exists.");
        }

        const requestData = requestSnap.data() || {};
        const currentStatus = normalizeStatus(requestData.status);
        if (currentStatus === "approved") {
          throw new Error("Approved requests cannot be rejected here.");
        }

        tx.set(
          requestRef,
          {
            status: "rejected",
            reviewed_by: adminUid,
            reviewed_at: serverTimestamp(),
            rejection_reason: rejectionReason.trim(),
            approval_note: "",
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );
      });

      setDetailsOpen(false);
      setSelected(null);
      setRejectionReason("");
      await loadRequests();
    } catch (e) {
      console.error("Reject request failed:", e);
      setError(e?.message || "Failed to reject request.");
    } finally {
      setRejecting(false);
    }
  };

  const selectedDocs = useMemo(
    () => normalizeDocItemsFromUser(selected?.requester || {}),
    [selected]
  );

  const selectedVerification = useMemo(
    () => getVerificationSummary(selected?.requester || {}),
    [selected]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-blue-700" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">School Claim Requests</h1>
            <p className="text-sm text-gray-600">
              Review, approve, or reject optional school profile claim requests.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search school, requester, or email"
                  className="pl-9"
                />
              </div>

              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <Button variant="outline" onClick={loadRequests}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && !detailsOpen ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading claim requests...
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-sm text-gray-500">
                No claim requests found.
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((r) => {
              const docs = normalizeDocItemsFromUser(r.requester || {});
              const verification = getVerificationSummary(r.requester || {});
              const hasDocs = docs.length > 0;

              return (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-700" />
                          <div className="font-semibold text-gray-900">
                            {r.institution_name || r.institution?.name || "Unknown school"}
                          </div>
                          {statusBadge(r.status)}
                          {hasDocs ? (
                            <Badge className="bg-green-100 text-green-800">
                              Docs Found
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              No Docs Found
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{r.requested_by_name || r.requester?.full_name || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span>{r.requested_by_email || r.requester?.email || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock3 className="h-4 w-4" />
                            <span>{fmtDate(r.created_at)}</span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-500">
                          {r.institution?.city || r.institution?.location || "—"}
                          {r.institution?.province ? `, ${r.institution.province}` : ""}
                          {r.institution?.country ? `, ${r.institution.country}` : ""}
                        </div>

                        <div className="text-xs text-gray-500">
                          Verification status:{" "}
                          <span className="font-medium">
                            {String(selectedVerification?.status || verification?.status || "not_submitted")}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => openDetails(r)}>
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Claim Request</DialogTitle>
              <DialogDescription>
                Approve or reject this optional school profile claim request using the same uploaded profile verification documents.
              </DialogDescription>
            </DialogHeader>

            {selected ? (
              <div className="space-y-5">
                <div className="rounded-xl border bg-gray-50 p-4 space-y-2 text-sm">
                  <div>
                    <span className="font-medium">School:</span>{" "}
                    {selected.institution_name || selected.institution?.name || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Institution ID:</span>{" "}
                    {selected.institution_id || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Requester:</span>{" "}
                    {selected.requested_by_name || selected.requester?.full_name || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>{" "}
                    {selected.requested_by_email || selected.requester?.email || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    {selected.status || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Submitted:</span>{" "}
                    {fmtDate(selected.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">Reason:</span>{" "}
                    {selected.claim_reason || "—"}
                  </div>
                  {selected.reviewed_at ? (
                    <div>
                      <span className="font-medium">Reviewed:</span>{" "}
                      {fmtDate(selected.reviewed_at)}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-700" />
                    <h3 className="font-semibold text-gray-900">Requester Verification/Profile Data</h3>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <span className="font-medium">Verification Status:</span>{" "}
                      {selectedVerification.status || "not_submitted"}
                    </div>
                    <div>
                      <span className="font-medium">Official Email:</span>{" "}
                      {selectedVerification.officialEmail || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Official Website:</span>{" "}
                      {selectedVerification.officialWebsite || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Requester UID:</span>{" "}
                      {selected.requested_by_uid || "—"}
                    </div>
                  </div>

                  {selectedVerification.notes ? (
                    <div className="mt-3 text-sm">
                      <span className="font-medium">Verification Notes:</span>{" "}
                      {selectedVerification.notes}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-blue-700" />
                    <h3 className="font-semibold text-gray-900">Uploaded Supporting Documents</h3>
                  </div>

                  {selectedDocs.length === 0 ? (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        No verification/profile documents were found on this requester’s school profile yet.
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {selectedDocs.map((docItem, idx) => (
                        <div
                          key={`${docItem.label}-${docItem.url}-${idx}`}
                          className="rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-gray-900">
                              {docItem.label}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {docItem.url}
                            </div>
                          </div>

                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0"
                          >
                            <Button type="button" variant="outline" size="sm">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Rejection Reason
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    placeholder="Enter reason if rejecting this request"
                  />
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDetailsOpen(false)}
                    disabled={approving || rejecting}
                  >
                    Close
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={rejectRequest}
                    disabled={approving || rejecting}
                  >
                    {rejecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      "Reject"
                    )}
                  </Button>

                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={approveRequest}
                    disabled={approving || rejecting}
                  >
                    {approving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      "Approve"
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}