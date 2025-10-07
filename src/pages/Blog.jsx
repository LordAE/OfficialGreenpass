// src/pages/Blog.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles } from 'lucide-react';

/* ---------- Firebase ---------- */
import { db } from '@/firebase';
import { collection, getDocs, limit } from 'firebase/firestore';

/* ========= Helpers ========= */
const pickFirst = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && `${v}`.trim?.() !== '') ?? undefined;

const toMillisMaybe = (v) => {
  if (!v) return 0;
  if (typeof v === 'object' && typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
};

const displayDate = (post) => {
  const ms = toMillisMaybe(pickFirst(post.created_at, post.created_date, post.updated_at));
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
};

const mapDocToPost = (docSnap) => {
  const d = { id: docSnap.id, ...docSnap.data() };

  return {
    id: docSnap.id,
    slug: pickFirst(d.slug, d.path, d.id),
    title: pickFirst(d.title, d.name, 'Untitled'),
    category: pickFirst(d.category, d.tag, 'General'),
    coverImageUrl: pickFirst(d.coverImageUrl, d.cover_image_url, d.image, ''),
    excerpt: pickFirst(d.excerpt, d.summary, ''),
    author: pickFirst(d.author, d.author_name, '—'),
    readTime: pickFirst(d.readTime, d.read_time, ''),
    created_at: d.created_at,
    created_date: pickFirst(d.created_date, d.createdAt, d.created_at),
    updated_at: d.updated_at,
    published: d.published,
  };
};

const PostCard = ({ post }) => (
  <Link to={createPageUrl(`PostDetail?slug=${post.slug}`)} className="block group h-full">
    <Card className="flex flex-col overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-shadow h-full">
      {post.coverImageUrl ? (
        <div className="flex-shrink-0 h-48 overflow-hidden">
          <img
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            src={post.coverImageUrl}
            alt={post.title}
          />
        </div>
      ) : (
        <div className="flex-shrink-0 h-48 bg-gray-200" />
      )}
      <div className="flex-1 bg-white p-6 flex flex-col justify-between">
        <div className="flex-1">
          <div className="mb-2">
            <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
              {post.category}
            </Badge>
          </div>
          <p className="text-xl font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
            {post.title}
          </p>
          <p className="mt-3 text-base text-gray-600 line-clamp-3">{post.excerpt}</p>
        </div>
        <div className="mt-6 text-sm text-gray-500">
          <p className="font-medium text-gray-900">{post.author}</p>
          <div className="flex flex-wrap items-center gap-2">
            <time dateTime={post.created_date || ''}>{displayDate(post)}</time>
            {post.readTime ? (
              <>
                <span aria-hidden="true">•</span>
                <span>{post.readTime}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  </Link>
);

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Emphasize page title for SEO too
  useEffect(() => {
    const prev = document.title;
    document.title = 'GreenPass Blog – Insights and Guides';
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'posts'), limit(100));
        let items = snap.docs.map(mapDocToPost);

        const hasPublishedFlag = items.some((p) => typeof p.published === 'boolean');
        if (hasPublishedFlag) items = items.filter((p) => p.published === true);

        items.sort(
          (a, b) =>
            toMillisMaybe(pickFirst(b.created_at, b.created_date, b.updated_at)) -
            toMillisMaybe(pickFirst(a.created_at, a.created_date, a.updated_at))
        );

        setPosts(items);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero with stronger emphasis */}
      <section className="bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* small badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-200 bg-green-50 text-green-700 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              GreenPass
            </div>

            {/* BIG emphasized heading */}
            <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl lg:text-6xl leading-tight">
              <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 bg-clip-text text-transparent">
                GreenPass Blog
              </span>
            </h1>

            {/* decorative underline */}
            <div className="mx-auto mt-4 h-1.5 w-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-400" />

            <p className="max-w-2xl mx-auto mt-5 text-lg sm:text-xl text-gray-600">
              Insights and guides for studying in Canada — admissions, visas, student life, and more.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-green-600" />
          </div>
        ) : posts.length > 0 ? (
          <div className="grid gap-10 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-2xl font-semibold text-gray-800">No Posts Yet</h3>
            <p className="text-gray-500 mt-2">Check back soon for insights and guides!</p>
          </div>
        )}
      </div>
    </div>
  );
}
