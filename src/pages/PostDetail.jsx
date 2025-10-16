// src/pages/PostDetail.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, User, Clock, ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";
import YouTubeEmbed from "@/components/YouTubeEmbed";

/* ---------- Firebase ---------- */
import { db } from "@/firebase";
import { collection, doc, getDoc, getDocs, limit as qLimit, query, where } from "firebase/firestore";

/* ---------- (Legacy) API entity fallback ---------- */
import { Post as LegacyPost } from "@/api/entities";

/* ========= Helpers ========= */
const pickFirst = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && `${v}`.trim?.() !== "") ?? undefined;

const displayDate = (when) => {
  if (!when) return "";
  try {
    const dt =
      typeof when === "object" && typeof when.toDate === "function" ? when.toDate() : new Date(when);
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
};

const isHighlightActive = (post) => {
  if (!post?.isHighlight) return false;
  const until = post.highlight_until;
  const ms =
    until?.toMillis?.() ??
    (typeof until === "number" ? until : Number.isFinite(Date.parse(until)) ? Date.parse(until) : 0);
  return ms > Date.now();
};

/* ---------- Gallery extraction (tolerant) ---------- */
const toUrlArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((x) => (typeof x === "string" ? x : x?.url || x?.src || x?.href || x?.file_url || ""))
      .filter(Boolean);
  }
  if (typeof val === "string") {
    return val.split(/[\n,]+/g).map((s) => s.trim()).filter(Boolean);
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
    d.media,
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

const mapDocToPost = (docSnap) => {
  const d = { id: docSnap.id, ...docSnap.data() };
  const galleryImageUrls = extractGalleryUrls(d);

  return {
    id: docSnap.id,
    slug: pickFirst(d.slug, d.path, d.id),
    title: pickFirst(d.title, d.name, "Untitled"),
    category: pickFirst(d.category, d.tag, "General"),
    coverImageUrl: pickFirst(d.coverImageUrl, d.cover_image_url, d.image, ""),
    excerpt: pickFirst(d.excerpt, d.summary, ""),
    author: pickFirst(d.author, d.author_name, "—"),
    readTime: pickFirst(d.readTime, d.read_time, ""),
    videoUrl: pickFirst(d.videoUrl, d.youtube, ""),
    content: pickFirst(d.content, d.body, d.html, ""),
    created_at: d.created_at,
    created_date: pickFirst(d.created_date, d.createdAt, d.created_at),
    updated_at: d.updated_at,
    published: d.published,

    galleryImageUrls,

    isHighlight: Boolean(d.isHighlight),
    highlight_duration_days: d.highlight_duration_days ?? null,
    highlight_until: d.highlight_until ?? null,
  };
};

export default function PostDetail() {
  const loc = useLocation();
  const [post, setPost] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Lightbox
  const [lightboxIdx, setLightboxIdx] = React.useState(null);
  const hasLightbox = lightboxIdx !== null;

  const openLightbox = (i) => setLightboxIdx(i);
  const closeLightbox = () => setLightboxIdx(null);
  const goPrev = () =>
    setLightboxIdx((i) => (i === null ? null : (i - 1 + post.galleryImageUrls.length) % post.galleryImageUrls.length));
  const goNext = () =>
    setLightboxIdx((i) => (i === null ? null : (i + 1) % post.galleryImageUrls.length));

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

  const slug = React.useMemo(() => {
    const sp = new URLSearchParams(loc.search);
    return sp.get("slug") || sp.get("path") || sp.get("id") || "";
  }, [loc.search]);

  React.useEffect(() => {
    let cancelled = false;
    const tryCollections = ["posts", "blog", "blogs"];

    (async () => {
      setLoading(true);
      setError(null);

      if (!slug) {
        if (!cancelled) {
          setError("No post specified.");
          setLoading(false);
        }
        return;
      }

      try {
        let found = null;

        for (const collName of tryCollections) {
          try {
            const byIdRef = doc(db, collName, slug);
            const byIdSnap = await getDoc(byIdRef);
            if (byIdSnap.exists()) {
              found = mapDocToPost(byIdSnap);
              break;
            }
          } catch {}
        }

        if (!found) {
          for (const collName of tryCollections) {
            const coll = collection(db, collName);
            const attempts = [
              query(coll, where("slug", "==", slug), qLimit(1)),
              query(coll, where("path", "==", slug), qLimit(1)),
              query(coll, where("title", "==", slug), qLimit(1)),
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

        if (!found) {
          try {
            const rows = await LegacyPost.filter({ slug });
            if (rows && rows.length > 0) {
              const p = rows[0];
              found = {
                id: p.id,
                slug: pickFirst(p.slug, p.path, p.id),
                title: pickFirst(p.title, p.name, "Untitled"),
                category: pickFirst(p.category, p.tag, "General"),
                coverImageUrl: pickFirst(p.coverImageUrl, p.image, ""),
                excerpt: pickFirst(p.excerpt, p.summary, ""),
                author: pickFirst(p.author, "—"),
                readTime: pickFirst(p.readTime, ""),
                videoUrl: pickFirst(p.videoUrl, ""),
                content: pickFirst(p.content, p.body, p.html, ""),
                created_at: p.created_at,
                created_date: pickFirst(p.created_date, p.createdAt, p.created_at),
                updated_at: p.updated_at,
                published: p.published,
                galleryImageUrls: extractGalleryUrls(p),
                isHighlight: Boolean(p.isHighlight),
                highlight_duration_days: p.highlight_duration_days ?? null,
                highlight_until: p.highlight_until ?? null,
              };
            }
          } catch {}
        }

        if (!found) {
          for (const collName of tryCollections) {
            try {
              const coll = collection(db, collName);
              const snap = await getDocs(query(coll, qLimit(100)));
              const lcSlug = slug.toLowerCase();
              const candidate = snap.docs
                .map((d) => ({ id: d.id, data: d.data(), snap: d }))
                .find(({ id, data }) => {
                  const cands = [id, data.slug, data.path, data.title]
                    .filter(Boolean)
                    .map((x) => String(x).toLowerCase().trim());
                  return cands.includes(lcSlug);
                });
              if (candidate) {
                found = mapDocToPost(candidate.snap);
                break;
              }
            } catch {}
          }
        }

        if (!cancelled) {
          if (found) {
            if (typeof found.published === "boolean" && !found.published) {
              setError("This post is not published.");
            } else {
              setPost(found);
            }
          } else {
            setError("Post not found.");
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch post:", err);
        if (!cancelled) {
          setError("An error occurred while fetching the post.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-8">
        <h2 className="text-2xl font-bold mb-2">Could Not Load Post</h2>
        <p className="text-gray-600 mb-6">{error || "The requested blog post could not be found."}</p>
        <Link to={createPageUrl("Blog")}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
      </div>
    );
  }

  const formattedDate =
    displayDate(pickFirst(post.created_date, post.created_at, post.updated_at)) || "";
  const activeHighlight = isHighlightActive(post);
  const hasGallery = Array.isArray(post.galleryImageUrls) && post.galleryImageUrls.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            to={createPageUrl("Blog")}
            className="text-sm font-medium text-green-600 hover:text-green-800 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all posts
          </Link>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <main className="lg:col-span-8">
            {post.coverImageUrl ? (
              <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
                <img src={post.coverImageUrl} alt={post.title} className="w-full h-auto object-cover" />
              </div>
            ) : null}

            {post.videoUrl ? (
              <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
                <YouTubeEmbed url={post.videoUrl} className="w-full aspect-video" />
              </div>
            ) : null}

            <div className="flex items-center gap-2 mb-3">
              {post.category ? <Badge>{post.category}</Badge> : null}
              {activeHighlight && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                  Highlighted
                </Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-8">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author || "GreenPass Team"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.created_date || ""}>{formattedDate}</time>
              </div>
              {post.readTime ? (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{post.readTime}</span>
                </div>
              ) : null}
            </div>

            {post.content ? (
              <div
                className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-green-600 hover:prose-a:text-green-700"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : post.excerpt ? (
              <p className="text-lg text-gray-700">{post.excerpt}</p>
            ) : null}

            {/* ===== Gallery BELOW the description ===== */}
            {hasGallery && (
              <section className="mt-10">
                <h2 className="text-xl font-semibold mb-3">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {post.galleryImageUrls.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => openLightbox(idx)}
                      className="block rounded-lg overflow-hidden border bg-white hover:shadow focus:outline-none focus:ring-2 focus:ring-green-500"
                      title="View image"
                    >
                      <img
                        src={url}
                        alt={`${post.title} – image ${idx + 1}`}
                        className="w-full h-40 object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </main>

          <aside className="lg:col-span-4 mt-12 lg:mt-0">
            <div className="sticky top-24 space-y-8">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>About this post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-gray-500">Author</p>
                      <p className="font-semibold text-gray-800">{post.author || "GreenPass Team"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-gray-500">Published</p>
                      <p className="font-semibold text-gray-800">{formattedDate}</p>
                    </div>
                  </div>

                  {post.readTime ? (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-gray-500">Read time</p>
                        <p className="font-semibold text-gray-800">{post.readTime}</p>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* ===== Lightbox (no new tab) ===== */}
      {hasGallery && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute top-4 right-4 text-white/90 hover:text-white p-2"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            aria-label="Close"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            className="absolute left-4 md:left-8 text-white/90 hover:text-white p-2"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous image"
            title="Previous"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <img
            src={post.galleryImageUrls[lightboxIdx]}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            className="absolute right-4 md:right-8 text-white/90 hover:text-white p-2"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next image"
            title="Next"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}
