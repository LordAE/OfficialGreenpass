// src/pages/PostDetail.jsx
import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Calendar,
  Clock,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
} from "lucide-react";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import MultilineText from "@/components/MultilineText";

/* ---------- Firebase ---------- */
import { db } from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  query,
  where,
} from "firebase/firestore";

/* ---------- (Legacy) API entity fallback ---------- */
import { Post as LegacyPost } from "@/api/entities";

/* ========= Helpers ========= */
const pickFirst = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && `${v}`.trim?.() !== "") ??
  undefined;

const displayDate = (when) => {
  if (!when) return "";
  try {
    const dt =
      typeof when === "object" && typeof when.toDate === "function"
        ? when.toDate()
        : typeof when === "object" && typeof when.seconds === "number"
        ? new Date(when.seconds * 1000)
        : new Date(when);
    return isNaN(dt?.getTime?.())
      ? ""
      : dt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  } catch {
    return "";
  }
};

const isHighlightActive = (post) => {
  if (!post?.isHighlight) return false;
  const until = post.highlight_until;
  const ms =
    until?.toMillis?.() ??
    (typeof until === "number"
      ? until
      : Number.isFinite(Date.parse(until))
      ? Date.parse(until)
      : 0);
  return ms > Date.now();
};

/* Heuristic: does a string look like HTML? */
const looksLikeHtml = (s = "") => /<\/?[a-z][\s\S]*>/i.test(String(s));

/* ---------- Gallery extraction (tolerant) ---------- */
const toUrlArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((x) =>
        typeof x === "string"
          ? x
          : x?.url || x?.src || x?.href || x?.file_url || ""
      )
      .filter(Boolean);
  }
  if (typeof val === "string") {
    return val
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const extractGalleryUrls = (d = {}) => {
  const candidates = [
    d.galleryImageUrls,
    d.gallery_images,
    d.galleryImages,
    d.gallery,
    d.images,
    d.media, // ✅ community posts use {type,url,...}
    d.photos,
    d.pictures,
    d.attachments?.images,
    d.content_images,
    d.imageUrls,
    d.image_urls,
  ];
  let urls = candidates.map(toUrlArray).flat();

  // also accept numbered fields like image1, gallery_2, photo03...
  for (const [k, v] of Object.entries(d)) {
    if (/^(image|photo|picture|gallery)[_\-]?\d+/i.test(k)) {
      if (typeof v === "string") urls.push(v.trim());
      else if (v && typeof v === "object") {
        const u = v.url || v.src || v.href || v.file_url;
        if (u) urls.push(`${u}`);
      }
    }
  }

  // de-duplicate
  const seen = new Set();
  const unique = [];
  for (const u of urls) {
    if (u && !seen.has(u)) {
      seen.add(u);
      unique.push(u);
    }
  }
  return unique;
};

const firstMediaImage = (d = {}) => {
  const media = Array.isArray(d.media) ? d.media : [];
  const img = media.find(
    (m) => (m?.type || "").toLowerCase() === "image" && m?.url
  );
  return img?.url || "";
};

const makeTitleFromText = (text) => {
  const s = String(text || "").trim();
  if (!s) return "Post";
  return s.length > 70 ? `${s.slice(0, 70)}…` : s;
};

const mapDocToPost = (docSnap) => {
  const d = { id: docSnap.id, ...docSnap.data() };
  const galleryImageUrls = extractGalleryUrls(d);

  // ✅ Community posts (from dashboards) save: authorName, authorRole, text, media, createdAt
  const text = pickFirst(d.text, d.caption, d.message, d.content, d.body, d.html, "");
  const explicitTitle = pickFirst(d.title, d.name, "");
  const isAutoTitle = !String(explicitTitle || "").trim();
  const title = pickFirst(explicitTitle, makeTitleFromText(text));
  const author = pickFirst(
    d.authorName,
    d.author,
    d.author_name,
    d.createdByName,
    "—"
  );
  const category = pickFirst(d.category, d.tag, "Community");

  const coverImageUrl = pickFirst(
    d.coverImageUrl,
    d.cover_image_url,
    d.image,
    d.image_url,
    firstMediaImage(d),
    galleryImageUrls[0] || ""
  );

  return {
    id: docSnap.id,
    slug: pickFirst(d.slug, d.path, d.id),
    title,
    isAutoTitle,
    category,
    coverImageUrl,
    excerpt: pickFirst(d.excerpt, d.summary, ""),
    author,
    authorRole: pickFirst(d.authorRole, d.role, ""),
    readTime: pickFirst(d.readTime, d.read_time, ""),
    videoUrl: pickFirst(d.videoUrl, d.youtube, ""),
    content: pickFirst(d.content, d.body, d.html, d.text, ""),
    text, // keep original
    created_at: d.created_at,
    created_date: pickFirst(d.created_date, d.createdAt, d.created_at),
    updated_at: d.updated_at,
    published: d.published,

    // media/gallery
    galleryImageUrls,
    media: Array.isArray(d.media) ? d.media : [],

    // highlight (blog-style)
    isHighlight: Boolean(d.isHighlight),
    highlight_duration_days: d.highlight_duration_days ?? null,
    highlight_until: d.highlight_until ?? null,
  };
};

const initialsFromName = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const i = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return i || "U";
};

const safeCopy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export default function PostDetail() {
  const loc = useLocation();
  const nav = useNavigate();
  const params = useParams();

  const [post, setPost] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Lightbox state
  const [lightboxIdx, setLightboxIdx] = React.useState(null);
  const hasLightbox = lightboxIdx !== null;

  const openLightbox = (i) => setLightboxIdx(i);
  const closeLightbox = () => setLightboxIdx(null);
  const goPrev = () =>
    setLightboxIdx((i) =>
      i === null || !post?.galleryImageUrls?.length
        ? null
        : (i - 1 + post.galleryImageUrls.length) % post.galleryImageUrls.length
    );
  const goNext = () =>
    setLightboxIdx((i) =>
      i === null || !post?.galleryImageUrls?.length
        ? null
        : (i + 1) % post.galleryImageUrls.length
    );

  // Keyboard navigation + close
  React.useEffect(() => {
    if (!hasLightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasLightbox, post?.galleryImageUrls?.length]);

  // Lock body scroll when lightbox open
  React.useEffect(() => {
    if (!hasLightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [hasLightbox]);

  // ✅ Resolve post id from: query (?id=), route params (/postdetails/:id), or state (navigate(...,{state:{postId}}))
  const resolvedId = React.useMemo(() => {
    const sp = new URLSearchParams(loc.search);
    const fromQuery = sp.get("id") || sp.get("slug") || sp.get("path") || "";
    const fromParams = pickFirst(params?.id, params?.postId, "");
    const fromState =
      loc?.state?.postId ||
      loc?.state?.id ||
      loc?.state?.slug ||
      loc?.state?.path ||
      "";
    return fromQuery || fromParams || fromState || "";
  }, [loc.search, loc.state, params]);

  React.useEffect(() => {
    let cancelled = false;
    const tryCollections = ["posts", "blog", "blogs"];

    (async () => {
      setLoading(true);
      setError(null);

      if (!resolvedId) {
        if (!cancelled) {
          setError("No post specified.");
          setLoading(false);
        }
        return;
      }

      try {
        let found = null;

        // 0) Try doc by id across known collections
        for (const collName of tryCollections) {
          try {
            const byIdRef = doc(db, collName, resolvedId);
            const byIdSnap = await getDoc(byIdRef);
            if (byIdSnap.exists()) {
              found = mapDocToPost(byIdSnap);
              break;
            }
          } catch {}
        }

        // 1) Field equality queries (slug / path / title)
        if (!found) {
          for (const collName of tryCollections) {
            const coll = collection(db, collName);
            const attempts = [
              query(coll, where("slug", "==", resolvedId), qLimit(1)),
              query(coll, where("path", "==", resolvedId), qLimit(1)),
              query(coll, where("title", "==", resolvedId), qLimit(1)),
            ];
            for (const qref of attempts) {
              const snap = await getDocs(qref);
              if (!snap.empty) {
                found = mapDocToPost(snap.docs[0]);
                break;
              }
            }
            if (found) break;
          }
        }

        // 2) Legacy entity fallback (if you still have old API posts)
        if (!found) {
          try {
            const legacy = await LegacyPost.list();
            const match =
              legacy?.find(
                (x) =>
                  x?.id === resolvedId ||
                  x?.slug === resolvedId ||
                  x?.path === resolvedId
              ) || null;
            if (match) {
              found = {
                id: match.id,
                slug: match.slug,
                title: pickFirst(match.title, match.name, "Untitled"),
                category: pickFirst(match.category, match.tag, "General"),
                coverImageUrl: pickFirst(
                  match.coverImageUrl,
                  match.cover_image_url,
                  match.image,
                  ""
                ),
                excerpt: pickFirst(match.excerpt, match.summary, ""),
                author: pickFirst(match.author, match.author_name, "—"),
                readTime: pickFirst(match.readTime, match.read_time, ""),
                videoUrl: pickFirst(match.videoUrl, match.youtube, ""),
                content: pickFirst(match.content, match.body, match.html, match.text, ""),
                text: pickFirst(match.text, ""),
                created_date: pickFirst(match.created_date, match.createdAt, match.created_at),
                galleryImageUrls: extractGalleryUrls(match),
                media: Array.isArray(match.media) ? match.media : [],
                isHighlight: Boolean(match.isHighlight),
                highlight_until: match.highlight_until ?? null,
                highlight_duration_days: match.highlight_duration_days ?? null,
                isAutoTitle: false,
              };
            }
          } catch {}
        }

        if (!cancelled) {
          if (found) setPost(found);
          else setError("Post not found.");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Failed to load post.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedId]);

  const goDashboard = () => nav(createPageUrl("Dashboard"));

  const onCopyLink = async () => {
    const url = window?.location?.href || "";
    if (!url) return;
    const ok = await safeCopy(url);
    if (!ok) {
      // fallback: prompt
      window.prompt("Copy link:", url);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading post...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_10%_0%,rgba(59,130,246,0.12),transparent_50%),radial-gradient(900px_circle_at_90%_10%,rgba(16,185,129,0.12),transparent_45%),linear-gradient(to_bottom,#ffffff,#f7f9ff)]">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Card className="rounded-3xl border-white/40 bg-white/70 backdrop-blur shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle>Post</CardTitle>
              <div className="text-sm text-gray-600">{error}</div>
            </CardHeader>
            <CardContent>
              <Button onClick={goDashboard} className="gap-2 rounded-full">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const gallery = post?.galleryImageUrls || [];
  const created = displayDate(post?.created_date);
  const highlightActive = isHighlightActive(post);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_10%_0%,rgba(59,130,246,0.12),transparent_50%),radial-gradient(900px_circle_at_90%_10%,rgba(16,185,129,0.12),transparent_45%),linear-gradient(to_bottom,#ffffff,#f7f9ff)]">
      <div className="mx-auto max-w-2xl px-3 sm:px-6 py-4 sm:py-6">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goDashboard}
            className="gap-2 rounded-full bg-white/70 backdrop-blur border-white/50 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {highlightActive ? (
              <Badge className="rounded-full bg-amber-500 hover:bg-amber-500">
                Highlighted
              </Badge>
            ) : null}

            <Button
              variant="outline"
              size="icon"
              onClick={onCopyLink}
              className="rounded-full bg-white/70 backdrop-blur border-white/50 hover:bg-white"
              title="Copy link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-3xl border-white/40 bg-white/75 backdrop-blur shadow-[0_10px_30px_rgba(2,6,23,0.08)]">
          {/* Cover */}
          {post?.coverImageUrl ? (
            <div className="relative w-full bg-black/5">
              <img
                src={post.coverImageUrl}
                alt={post.title || "Post image"}
                className="h-[260px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />
            </div>
          ) : null}

          <CardHeader className="pb-3">
            {/* Author row */}
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center border border-white/70 shadow-sm">
                  <span className="text-sm font-semibold text-gray-800">
                    {initialsFromName(post?.author || "User")}
                  </span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="font-semibold text-gray-900 truncate">
                    {post?.author || "—"}
                  </div>

                  {post?.category ? (
                    <Badge
                      variant="outline"
                      className="rounded-full text-xs border-gray-200 bg-white/60"
                    >
                      {post.category}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  {created ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {created}
                    </span>
                  ) : null}
                  {post?.readTime ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {post.readTime}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Title (only if real title exists) */}
            {!post?.isAutoTitle ? (
              <CardTitle className="mt-4 text-xl sm:text-2xl leading-snug text-gray-900">
                {post?.title}
              </CardTitle>
            ) : null}

            {post?.excerpt ? (
              <div className="mt-2 text-sm text-gray-700">{post.excerpt}</div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Video */}
            {post?.videoUrl ? (
              <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white">
                <YouTubeEmbed url={post.videoUrl} />
              </div>
            ) : null}

            {/* Main content */}
            {post?.text || post?.content ? (
              looksLikeHtml(post?.content) ? (
                <div
                  className="prose max-w-none prose-p:leading-7"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <div className="text-gray-900 leading-7 text-[15px]">
                  <MultilineText text={post.text || post.content} />
                </div>
              )
            ) : (
              <div className="text-sm text-gray-600">No content.</div>
            )}

            {/* Gallery (more IG-like layout) */}
            {gallery.length > 0 ? (
              <div className="space-y-2">
                {gallery.length === 1 ? (
                  <button
                    type="button"
                    onClick={() => openLightbox(0)}
                    className="group relative w-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                    title="Open"
                  >
                    <img
                      src={gallery[0]}
                      alt="media-1"
                      className="w-full max-h-[520px] object-cover transition group-hover:scale-[1.01]"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openLightbox(0)}
                      className="group relative col-span-2 sm:col-span-1 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                      title="Open"
                    >
                      <img
                        src={gallery[0]}
                        alt="media-1"
                        className="h-64 sm:h-full w-full object-cover transition group-hover:scale-[1.01]"
                        loading="lazy"
                      />
                    </button>

                    <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                      {gallery.slice(1, 5).map((u, i) => {
                        const idx = i + 1;
                        const remaining = gallery.length - 5;
                        const showMore = idx === 4 && remaining > 0;
                        return (
                          <button
                            key={`${u}-${idx}`}
                            type="button"
                            onClick={() => openLightbox(idx)}
                            className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                            title="Open"
                          >
                            <img
                              src={u}
                              alt={`media-${idx + 1}`}
                              className="h-32 w-full object-cover transition group-hover:scale-[1.01]"
                              loading="lazy"
                            />
                            {showMore ? (
                              <div className="absolute inset-0 grid place-items-center bg-black/55">
                                <div className="text-white font-semibold text-lg">
                                  +{remaining}
                                </div>
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Lightbox */}
        {hasLightbox ? (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 sm:left-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <img
              src={gallery[lightboxIdx] || ""}
              alt="Preview"
              className="max-h-[85vh] max-w-[92vw] object-contain rounded-xl"
            />

            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 sm:right-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
