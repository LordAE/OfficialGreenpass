// src/pages/Home.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Star, Users, GraduationCap, TrendingUp,
  School as SchoolIcon, MapPin, DollarSign, Calendar,
  ChevronLeft, ChevronRight, Clock, Newspaper
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import IconResolver from '../components/IconResolver';
import EventCard from '../components/home/EventCard';
import YouTubeEmbed from '../components/YouTubeEmbed';
import MultilineText from '@/components/MultilineText'; // <-- NEW

/* ---------- Firebase ---------- */
import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

/* =========================
   Helpers
========================= */
const pickFirst = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && (`${v}`.trim?.() ?? `${v}`) !== '') ?? undefined;

const toDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t) : null;
};

const toMillisMaybe = (v) => {
  if (!v) return 0;
  if (typeof v === 'object' && typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
};

const ensureArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
const normalize = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(the|of|and|for|at|in|de|la|le|du|des|université|universite)\b/g, "")
    .replace(/\b(university|college|institute|polytechnic|school|academy|centre|center)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

const relTime = (d) => {
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
};

/* ---------- Labels ---------- */
const getLevelLabel = (level) => {
  switch ((level || '').toLowerCase()) {
    case 'undergraduate': return 'Undergraduate';
    case 'postgraduate':  return 'Postgraduate';
    case 'diploma':       return 'Diploma';
    case 'certificate':   return 'Certificate';
    case 'vocational':    return 'Vocational';
    default:
      return level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Program';
  }
};

const getProvinceLabel = (code) => {
  const provinces = {
    AB:'Alberta', BC:'British Columbia', MB:'Manitoba', NB:'New Brunswick',
    NL:'Newfoundland and Labrador', NS:'Nova Scotia', ON:'Ontario',
    PE:'Prince Edward Island', QC:'Quebec', SK:'Saskatchewan',
    NT:'Northwest Territories', NU:'Nunavut', YT:'Yukon'
  };
  return provinces[code] || code;
};

/* =========================
   Content mappers
========================= */
const sanitizeHomeContent = (loaded = {}) => {
  const prev = {
    hero_section: {
      title: '',
      subtitle: '',
      image_url: '',
      video_url: '',
      background_video_url:
        'https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2FGPintro.mp4?alt=media&token=bbcde9d6-a628-429f-9cff-8cad12933cba',
      poster_url: ''
    },
    features_section: [],
    testimonials_section: [],
    stats_section: [],
    schools_programs_section: { title: '', subtitle: '', show_featured_only: false, max_items: 6 },
  };

  const sanitizedFeatures = (loaded.features_section || []).map((feature) => ({
    icon: 'Star',
    title: 'Default Title',
    description: 'Default description.',
    media_position: 'left',
    show_rating: false,
    school_rating: 4.5,
    image_url: '',
    youtube_url: '',
    video_url: '',
    link_url: '',
    link_text: '',
    ...feature,
  }));

  return {
    ...prev,
    ...loaded,
    hero_section: { ...prev.hero_section, ...(loaded.hero_section || {}) },
    features_section: sanitizedFeatures,
    testimonials_section: loaded.testimonials_section || [],
    stats_section: loaded.stats_section || [],
    schools_programs_section: { ...prev.schools_programs_section, ...(loaded.schools_programs_section || {}) },
  };
};

const mapSchoolDoc = (snap) => {
  const d = { id: snap.id, ...snap.data() };
  return {
    id: snap.id,
    is_featured: !!pickFirst(d.is_featured, d.featured, d.recommended),
    rating: Number(pickFirst(d.rating, 4.5)) || 4.5,
    school_image_url: pickFirst(d.school_image_url, d.institution_logo_url, d.logo_url, d.image_url, ''),
    school_name: pickFirst(d.school_name, d.name, d.institution_name, 'Institution'),
    institution_name: pickFirst(d.institution_name, d.school_name, d.name, 'Institution'),
    school_city: pickFirst(d.school_city, d.city, ''),
    school_province: pickFirst(d.school_province, d.province, d.state, ''),
    program_level: pickFirst(d.top_program_level, d.program_level, 'undergraduate'),
    program_title: pickFirst(d.top_program_title, d.program_title, 'View programs'),
    institution_type: pickFirst(d.institution_type, d.type, 'University'),
    tuition_fee_cad: Number(pickFirst(d.avg_tuition_cad, 0)) || 0,
    intake_dates: ensureArray(pickFirst(d.intake_dates, [])),
    institution_logo_url: pickFirst(d.institution_logo_url, ''),
  };
};

const mapEventDoc = (snap) => {
  const d = { id: snap.id, ...snap.data() };
  return {
    id: snap.id,
    ...d,
    event_id: pickFirst(d.event_id, snap.id),
    title: pickFirst(d.title, d.name, 'Untitled Event'),
    location: pickFirst(d.location, d.city, ''),
    start: toDate(d.start),
    end: toDate(d.end),
    archive_at: toDate(pickFirst(d.archive_at, d.archiveAt)),
    sort_order: d.sort_order ?? d.sortOrder ?? 999,
    banner_url: pickFirst(d.banner_url, d.image_url, d.coverImageUrl, ''),
  };
};

/* ---------- Blog highlight helpers (EXCERPT + COVER IMAGE ONLY) ---------- */
const mapPostDoc = (snap) => {
  const d = { id: snap.id, ...snap.data() };
  return {
    id: snap.id,
    slug: pickFirst(d.slug, d.path, d.id),
    title: pickFirst(d.title, d.name, 'Untitled'),
    excerpt: typeof d.excerpt === 'string' ? d.excerpt : '',
    coverImageUrl: pickFirst(d.coverImageUrl, d.cover_image_url, d.image, ''),
    category: pickFirst(d.category, 'Highlight'),
    readTime: pickFirst(d.readTime, ''),
    created_at: pickFirst(d.created_at, d.created_date, d.createdAt),
    updated_at: d.updated_at,
    isHighlight: Boolean(d.isHighlight),
    highlight_duration_days: typeof d.highlight_duration_days === 'number' ? d.highlight_duration_days : null,
    highlight_until: pickFirst(d.highlight_until, d.highlightUntil),
  };
};

const isHighlightedNow = (post) => {
  if (!post?.isHighlight) return false;
  const now = Date.now();
  const untilMs = toMillisMaybe(post.highlight_until);
  if (untilMs) return untilMs > now;
  const createdMs = toMillisMaybe(post.created_at);
  if (createdMs && post.highlight_duration_days) {
    return createdMs + post.highlight_duration_days * 24 * 60 * 60 * 1000 > now;
  }
  return true;
};

/* =========================
   Sections (UI)
========================= */
const DEFAULT_POSTER = '';

const Hero = ({ content }) => {
  const hero = content?.hero_section || {};
  const bgVideo = hero.background_video_url || hero.video_url || "";
  const poster = hero.poster_url || hero.image_url || DEFAULT_POSTER;

  const [useImage, setUseImage] = React.useState(!bgVideo);
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    if (!bgVideo || !videoRef.current) return;
    const el = videoRef.current;
    const tryPlay = () => el.play().catch(() => {});
    if (el.readyState >= 2) tryPlay();
    else el.addEventListener("canplay", tryPlay, { once: true });
    return () => el.removeEventListener("canplay", tryPlay);
  }, [bgVideo]);

  return (
    <div className="relative text-white overflow-hidden min-h-[calc(100vh-80px)]">
      {!useImage && bgVideo ? (
        <video
          key={bgVideo}
          ref={videoRef}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[100%] w-auto"
          src={bgVideo}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setUseImage(true)}
        />
      ) : (
        <img
          src={poster}
          alt=""
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[100%] w-auto"
          loading="eager"
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
            >
              {hero.title || (<><br/><br/><span className="text-green-400"><br/><br/></span><br/><br/></>)}
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-200 leading-relaxed"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
          >
            {/* Preserve line breaks & bullets */}
            {hero.subtitle ? <MultilineText text={hero.subtitle} /> : ''}
          </motion.p>
        </div>
      </div>
    </div>
  );
};

/* =========================
   News & Highlights Carousel
   (cover image only + excerpt only)
========================= */
const fallbackSlides = [
  {
    id: 'n1',
    title: 'IRCC announces streamlined visa process for students',
    summary: 'Canada introduces faster processing for eligible institutions and programs.',
    image: 'https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/ircc-announces-2-year-cap.jpg?alt=media&token=a05ff2c8-f090-4069-aad5-82a6bfbd0cd1',
    tag: 'Policy Update',
    date: '2 days ago',
    href: '#'
  },
  {
    id: 'n2',
    title: 'University of Toronto ranked top in Canada again',
    summary: 'UofT leads national rankings with strong research and student outcomes.',
    image: 'https://www.utoronto.ca/sites/default/files/picpath/2014-08-15-rankings.jpg',
    tag: 'Rankings',
    date: '5 days ago',
    href: '#'
  },
  {
    id: 'n3',
    title: 'Why London International Academy?',
    summary: 'New scholarships programs offers.',
    image: 'https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/825_585_london-international-academy-1.jpg?alt=media&token=56fd5481-3ad9-433c-8043-bea86c118c09',
    tag: 'Scholarships',
    date: '1 week ago',
    href: '#'
  },
];

const stripHtml = (s = '') => String(s).replace(/<[^>]*>/g, '').trim();

function NewsHighlights({ highlights = [] }) {
  const highlightItems = highlights.map((p) => ({
    id: `post-${p.id}`,
    title: p.title,
    excerpt: stripHtml(p.excerpt || ''),
    cover: p.coverImageUrl || '',
    tag: p.category || 'Highlight',
    date: relTime(toDate(p.created_at) || toDate(p.updated_at)),
    href: createPageUrl(`PostDetail?slug=${encodeURIComponent(p.slug)}`),
  }));

  const fallback = fallbackSlides.map((s) => ({
    id: s.id,
    title: s.title,
    excerpt: stripHtml(s.summary || ''),
    cover: s.image || '',
    tag: s.tag || 'Highlight',
    date: s.date || '',
    href: s.href || '#',
  }));

  const items = highlightItems.length ? highlightItems : fallback;

  const [index, setIndex] = useState(0);
  const timeoutRef = useRef(null);

  const next = () => setIndex((i) => (i + 1) % items.length);
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);

  useEffect(() => {
    timeoutRef.current = setInterval(next, 5500);
    return () => clearInterval(timeoutRef.current);
  }, [items.length]);

  const pause = () => clearInterval(timeoutRef.current);
  const resume = () => {
    clearInterval(timeoutRef.current);
    timeoutRef.current = setInterval(next, 5500);
  };

  const active = items[index];

  return (
    <div className="bg-white py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">News & Highlights</h2>
              <p className="text-slate-600">Stay updated on policy changes, rankings, and scholarships</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prev} onMouseEnter={pause} onMouseLeave={resume}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={next} onMouseEnter={pause} onMouseLeave={resume}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-0 shadow-md">
          <div
            className="relative w-full h-[26rem] sm:h-[34rem] lg:h-[40rem]"
            onMouseEnter={pause}
            onMouseLeave={resume}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={active.id}
                className="absolute inset-0"
                initial={{ opacity: 0.0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <div className="absolute inset-0">
                  <img
                    src={active.cover}
                    alt={active.title}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                </div>

                <div className="relative z-10 h-full flex items=end sm:items-end">
                  <div className="p-4 sm:p-8 w-full">
                    <div className="max-w-3xl bg-black/35 backdrop-blur-sm rounded-2xl px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-white/20 text-white border-white/30">{active.tag}</Badge>
                        <span className="text-white/90 text-sm inline-flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {active.date}
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold leading-snug text-white drop-shadow line-clamp-2">
                        {active.title}
                      </h3>
                      {active.excerpt ? (
                        <p className="mt-2 text-white/90 line-clamp-3">
                          {active.excerpt}
                        </p>
                      ) : null}
                      <div className="mt-4">
                        <Link to={active.href}>
                          <Button className="bg-green-600 hover:bg-green-700">
                            Read more <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="sm:hidden absolute inset-x-0 bottom-4 px-4 flex items-center justify-between">
              <button aria-label="Previous" onClick={prev} className="p-2 rounded-full bg-white/90 shadow hover:bg-white">
                <ChevronLeft className="w-5 h-5 text-slate-800" />
              </button>
              <button aria-label="Next" onClick={next} className="p-2 rounded-full bg-white/90 shadow hover:bg-white">
                <ChevronRight className="w-5 h-5 text-slate-800" />
              </button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  onClick={() => setIndex(i)}
                  className={`h-2.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2.5 bg-white/60'}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================
   Partners strip (marquee)
========================= */
function PartnersStrip() {
  const partners = [
    { name: "UWE Bristol", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FUWEBristol.jpg?alt=media&token=0d3c6c10-d925-47d5-bdf7-14a38bcb67dd" },
    { name: "Cape Breton University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FCapeBretonUniveristy.jpg?alt=media&token=f8695d0d-0e13-44be-a319-5b7c262f1d05" },
    { name: "Canterbury Christ Church University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FCanterbury-Christ-Church-University.png?alt=media&token=2235d037-6d1d-43c3-9959-3e6f913ee09f" },
    { name: "University of West Alabama", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FUniversityofWestAlabama.png?alt=media&token=9fc57006-3137-44c5-b888-6c1fcca756b0" },
    { name: "Capilano University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FCapilanoUniversity.jpg?alt=media&token=535e4daa-5673-4ea9-ad2c-7ac4f33d1979" },
    { name: "University of Toronto", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FUniversityofToronto.avif?alt=media&token=687579c2-f19f-483c-a0d6-e8c3ff20b995" },
    { name: "McGill University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FmcgillUniversity.png?alt=media&token=7f0fcfbd-e7cd-4555-af62-978c308d6dd8" },
    { name: "University of British Columbia", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FUniversityofBristishColumbia.jpg?alt=media&token=6ee96860-9835-4996-9a30-15cbf8442c16" },
    { name: "University of Alberta", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FUniversityofAlberta.jpg?alt=media&token=51d0f6c9-c50f-4edb-87a5-5cfa27381f08" },
    { name: "University of Waterloo", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2Funiversityofwaterloo.avif?alt=media&token=ace9a9ce-b679-4eae-b517-e5f511da629e" },
    { name: "Western University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FWesternUniversity.png?alt=media&token=2cd1a3af-2307-417b-b5c9-36e2e55b9cf0" },
    { name: "Queen’s University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FQueensUniversity.png?alt=media&token=2187b37a-199d-4770-b489-68970f88e666" },
    { name: "University of Manitoba", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FUniversityofManitoba.png?alt=media&token=7e36dd5b-6f69-49fe-aa7a-d31e51974690" },
    { name: "University of Saskatchewan", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2Funiversity-of-saskatchewan.png?alt=media&token=c0046b80-793e-4cc0-aeb3-e3f4035ec567" },
    { name: "Concordia University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2Fconcordia-university.svg?alt=media&token=4224a6c8-e362-457c-83a2-9565d7322e4a" },
    { name: "Dalhousie University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FdalhousieUniversity.png?alt=media&token=2010cc34-971f-42b0-b1a1-10e79bdd5cb9" },
    { name: "York University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FyorkUniversity.png?alt=media&token=c0f6b3b6-cc52-4f95-9a7d-c1b12005268a" },
    { name: "Carleton University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FcarletonUniversity.jpg?alt=media&token=673a958c-69f4-41df-94b0-981243bbd6d7" },
    { name: "Memorial University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FMemorialUniversity.png?alt=media&token=6989515c-debd-47e2-b02e-600b55da58a0" },
  ];

  const marquee = [...partners, ...partners];
  const controls = useAnimation();
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    controls.start({
      x: ["0%", "-50%"],
      transition: { duration: 40, ease: "linear", repeat: Infinity },
    });
  }, [controls]);

  const handleEnter = () => { setPaused(true); controls.stop(); };
  const handleLeave = () => {
    setPaused(false);
    controls.start({ x: ["0%", "-50%"], transition: { duration: 40, ease: "linear", repeat: Infinity } });
  };

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl sm:text-4xl font-bold text-slate-900">
          Top university partners
        </h2>

        <div className="relative mt-10 overflow-hidden pb-10 sm:pb-12" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
          <motion.div animate={controls} className="flex gap-6 sm:gap-10 md:gap-12 w-[200%]">
            {marquee.map((p, i) => (
              <motion.div
                key={`${p.name}-${i}`}
                className="shrink-0 w-[200px] sm:w-[220px] lg:w-[230px]"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                whileHover={{ scale: 1.04, y: -2 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
              >
                <div className="rounded-3xl bg-white p-10 shadow-md hover:shadow-xl transition-shadow duration-200 h-full flex items-center justify-center">
                  <img src={p.logo} alt={p.name} className="h-16 w-auto object-contain" loading="lazy" />
                </div>
                <p className="mt-3 text-center text-sm text-slate-600 line-clamp-1">{p.name}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* =========================
   CountUp + Stats
========================= */
function CountUp({ valueString = "0", start, duration = 1.2 }) {
  const [display, setDisplay] = React.useState("0");

  const parse = (s) => {
    const match = s.match(/([0-9][0-9,\.]*)/);
    const numStr = match ? match[1] : "0";
    const startIdx = match ? match.index : 0;
    const endIdx = startIdx + numStr.length;
    const prefix = s.slice(0, startIdx || 0);
    const suffix = s.slice(endIdx);
    const target = parseFloat(numStr.replace(/,/g, "")) || 0;
    const decimals = numStr.includes(".") ? (numStr.split(".")[1]?.length ?? 0) : 0;
    return { target, prefix, suffix, decimals };
  };

  React.useEffect(() => {
    const { target, prefix, suffix, decimals } = parse(valueString);

    if (!start) {
      setDisplay(prefix + format(0, decimals) + suffix);
      return;
    }

    let raf;
    const t0 = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const p = Math.min(1, (now - t0) / (duration * 1000));
      const eased = easeOutCubic(p);
      const val = target * eased;
      setDisplay(prefix + format(val, decimals) + suffix);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, valueString, duration]);

  function format(n, decimals = 0) {
    const fixed = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart ? `${withCommas}.${decPart}` : withCommas;
  }

  return <span>{display}</span>;
}

function Stats({ stats }) {
  const items = Array.isArray(stats) && stats.length
    ? stats
    : [
        { value: "15,000+", label: "Students helped", icon: Users },
        { value: "7,000+",  label: "Programs",        icon: GraduationCap },
        { value: "1,200+",  label: "Campuses",        icon: SchoolIcon },
        { value: "96%",     label: "Visa Success Rate", icon: TrendingUp },
      ];

  const [start, setStart] = useState(false);

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="grid gap-10 sm:gap-12 grid-cols-2 sm:grid-cols-4"
          onViewportEnter={() => setStart(true)}
          viewport={{ once: true, amount: 0.4 }}
        >
          {items.map((it, i) => {
            const Icon = it.icon || Users;
            return (
              <div key={i} className="flex items-start gap-4">
                <Icon className="w-12 h-12 text-slate-400" />
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600">
                    <CountUp valueString={it.value} start={start} duration={1.4} />
                  </div>
                  <div className="text-slate-700 text-base sm:text-lg">{it.label}</div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* =========================
   Features
========================= */
const Features = ({ features }) => {
  const defaultFeatures = [
    {
      icon: "School",
      title: "Discover Top Schools",
      description: "Explore thousands of programs from top institutions worldwide. Our smart filters help you find the perfect match for your academic and career goals.",
      image_url: "",
      video_url: "",
      youtube_url: "",
      link_url: createPageUrl('Schools'),
      link_text: "Explore Schools",
      media_position: 'right'
    },
    {
      icon: "Users",
      title: "Expert Agent Guidance",
      description: "Connect with verified education agents who can guide you through every step, from school selection to visa paperwork.",
      youtube_url: "",
      video_url: "",
      link_url: createPageUrl('FindAgent'),
      link_text: "Find an Agent",
      media_position: 'left'
    },
    {
      icon: "GraduationCap",
      title: "Recommended For You: University of Toronto",
      description: "A world-renowned university in a vibrant, multicultural city.",
      image_url: "",
      video_url: "",
      link_url: createPageUrl('SchoolDetails?id=university-of-toronto'),
      link_text: "View University",
      media_position: 'right',
      school_rating: 4.8,
      show_rating: true
    }
  ];

  const featuresToDisplay = (features && features.length > 0) ? features : defaultFeatures;

  return (
    <div className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 sm:mb-20 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Everything You Need for Your Study Abroad Journey</h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            From finding the perfect program to landing in your new country, we've got every step covered.
          </p>
        </div>

        <div className="space-y-16 sm:space-y-24">
          {featuresToDisplay.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true, amount: 0.3 }}
              className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center"
            >
              <div className={`space-y-6 text-center lg:text-left ${feature.media_position === 'right' ? 'lg:order-1' : 'lg:order-2'}`}>
                {feature.show_rating ? (
                  <div className="inline-flex items-center justify-center bg-green-100 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${i < Math.floor(feature.school_rating || 4.5)
                              ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {(feature.school_rating || 4.5).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center bg-green-100 rounded-xl p-3">
                    <IconResolver name={feature.icon} className="h-7 w-7 text-green-700" />
                  </div>
                )}

                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  <Link to={feature.link_url || '#'} className="hover:text-green-700 transition-colors duration-200">
                    {feature.title}
                  </Link>
                </h3>

                {/* Preserve line breaks in feature description */}
                <p className="text-lg text-slate-600 leading-relaxed">
                  <MultilineText text={feature.description} />
                </p>

                {feature.link_url && feature.link_text && (
                  <Link to={feature.link_url}>
                    <Button size="lg" className="mt-4 bg-green-600 hover:bg-green-700 text-white shadow-md">
                      {feature.link_text}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                )}
              </div>

              <div className={`relative ${feature.media_position === 'right' ? 'lg:order-2' : 'lg:order-1'}`}>
                <div className="bg-white p-2 rounded-2xl shadow-2xl border border-gray-100">
                  {feature.youtube_url ? (
                    <YouTubeEmbed url={feature.youtube_url} className="w-full h-56 sm:h-80 rounded-xl overflow-hidden" />
                  ) : feature.video_url ? (
                    <video
                      className="w-full h-56 sm:h-80 rounded-xl"
                      src={feature.video_url}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  ) : feature.image_url ? (
                    <img src={feature.image_url} alt={feature.title} className="w-full h-auto object-cover rounded-xl" />
                  ) : (
                    <div className="w-full h-56 sm:h-80 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                      <IconResolver name={feature.icon} className="h-16 w-16 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* =========================
   Schools
========================= */
const SchoolProgramsSection = ({ content, schools }) => (
  <div className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
          {content?.schools_programs_section?.title || "Recommended Schools"}
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          {/* Preserve line breaks in subtitle */}
          <MultilineText
            text={
              content?.schools_programs_section?.subtitle ||
              "Discover our personally recommended educational institutions selected for their excellence and student success rates"
            }
          />
        </p>
      </div>

      {schools && schools.length > 0 ? (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {schools
              .slice(0, content?.schools_programs_section?.max_items || 6)
              .map((school, index) => (
                <motion.div
                  key={school.id || index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-0 shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={
                          school.school_image_url ||
                          school.institution_logo_url ||
                          'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=250&fit=crop'
                        }
                        alt={school.school_name || school.institution_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      <div className="absolute top-4 right-4">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < Math.floor(school.rating || 4.5)
                                  ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-gray-700 ml-1">
                            {(school.rating || 4.5).toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">
                          {school.school_name || school.institution_name}
                        </h3>
                        <p className="text-white/90 text-sm flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {school.school_city}
                          {school.school_province ? `, ${getProvinceLabel(school.school_province)}` : ''}
                        </p>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-green-100 text-green-800">
                            {getLevelLabel(school.program_level)}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-800">Recommended</Badge>
                        </div>

                        <h4 className="font-semibold text-gray-900 line-clamp-2 min-h-[3rem]">
                          {school.program_title}
                        </h4>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            <span>{school.institution_type || 'University'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span>${(school.tuition_fee_cad || 0).toLocaleString()} CAD/year</span>
                          </div>
                          {school.intake_dates && school.intake_dates.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Next: {school.intake_dates[0]}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <Link to={createPageUrl(`ProgramDetail?id=${school.id}`)}>
                          <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                            View Program Details
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </div>

          <div className="text-center">
            <Link to={createPageUrl("Schools")}>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-green-600 text-green-700 hover:bg-green-50 px-8 py-3 font-semibold transition-all duration-200"
              >
                View All Schools & Programs
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
            <SchoolIcon className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-600 text-lg">No schools available at this time. Check back soon!</p>
        </div>
      )}
    </div>
  </div>
);

/* =========================
   Testimonials, Events
========================= */
const Testimonials = ({ testimonials }) => (
  <div className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900"></h2>
        <p className="text-xl text-slate-600"></p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(testimonials || [
          { author_name: "", author_title: "", author_image_url: "", quote: "" },
          { author_name: "", author_title: "", author_image_url: "", quote: "" },
          { author_name: "", author_title: "", author_image_url: "", quote: "" },
        ]).map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8">
                {t.video_url && (
                  <div className="mb-6">
                    <YouTubeEmbed url={t.video_url} className="w-full h-48 rounded-lg" />
                  </div>
                )}

                <blockquote className="text-slate-700 mb-6 italic text-lg leading-relaxed">
                  {/* Preserve line breaks in quotes */}
                  <MultilineText text={`"${t.quote || ""}"`} />
                </blockquote>

                <div className="flex items-center">
                  <img
                    src={t.author_image_url || ""}
                    alt={t.author_name}
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">{t.author_name}</div>
                    <div className="text-sm text-slate-600">{t.author_title}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const UpcomingEvents = ({ events }) => (
  <div className="py-20 bg-slate-50/50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Upcoming Events & Fairs</h2>
        <p className="text-xl text-slate-600">Join our education fairs and connect with schools directly</p>
      </div>

      {events && events.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.slice(0, 3).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-600 text-lg">No upcoming events at this time. Check back soon!</p>
        </div>
      )}

      <div className="text-center mt-12">
        <Link to={createPageUrl("FairAndEvents")}>
          <Button
            variant="outline"
            size="lg"
            className="border-2 border-slate-300 text-slate-700 hover:border-green-600 hover:text-green-700 hover:bg-green-50 px-8 py-3 font-semibold transition-all duration-200"
          >
            View All Events <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  </div>
);

/* =========================
   Page
========================= */
export default function Home() {
  const [content, setContent] = useState(null);
  const [events, setEvents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [highlightedPosts, setHighlightedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Home content
        const homeSnap = await getDoc(doc(db, 'home_page_contents', 'SINGLETON'));
        const homeData = homeSnap.exists() ? sanitizeHomeContent(homeSnap.data()) : sanitizeHomeContent({});
        setContent(homeData);

        // Events
        const evSnap = await getDocs(collection(db, 'events'));
        const evs = evSnap.docs.map(mapEventDoc);
        evs.sort((a, b) => {
          const orderA = a.sort_order ?? 999;
          const orderB = b.sort_order ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          const aStart = a.start ? a.start.getTime() : 0;
          const bStart = b.start ? b.start.getTime() : 0;
          return aStart - bStart;
        });
        const now = Date.now();
        const upcoming = evs.filter((e) => {
          const endMs = e.end ? e.end.getTime() : 0;
          const archived = e.archive_at ? e.archive_at.getTime() < now : false;
          return endMs >= now && !archived;
        });
        setEvents(upcoming);

        // Featured schools
        let sSnap = await getDocs(
          query(collection(db, 'schools'), where('is_featured', '==', true), limit(60))
        );
        if (sSnap.empty) {
          sSnap = await getDocs(
            query(collection(db, 'Schools'), where('is_featured', '==', true), limit(60))
          );
        }
        const featuredSchools = sSnap.docs.map(mapSchoolDoc);

        // Institutions (for logos merge)
        let instSnap = await getDocs(collection(db, 'institutions'));
        if (instSnap.empty) instSnap = await getDocs(collection(db, 'Institutions'));
        const institutions = instSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const instMap = new Map(
          institutions.map((inst) => {
            const key = normalize(inst.name || inst.institution_name || inst.title || '');
            return [key, inst];
          })
        );
        const merged = featuredSchools.map((s) => {
          const key = normalize(s.school_name || s.institution_name || '');
          const inst = instMap.get(key);
          const logoFromInst = pickFirst(inst?.logoUrl, inst?.logo_url, inst?.image_url, inst?.institution_logo_url);
          return {
            ...s,
            school_image_url: pickFirst(logoFromInst, s.school_image_url, s.institution_logo_url),
            institution_logo_url: pickFirst(logoFromInst, s.institution_logo_url),
          };
        });
        setSchools(merged);

        // Highlighted blog posts — ONLY check isHighlight == true
        const postsRef = collection(db, 'posts');
        const postsSnap = await getDocs(
          query(postsRef, where('isHighlight', '==', true), limit(5))
        );
        const posts = postsSnap.docs.map(mapPostDoc).filter(isHighlightedNow);
        posts.sort((a, b) => toMillisMaybe(b.created_at || b.updated_at) - toMillisMaybe(a.created_at || a.updated_at));
        setHighlightedPosts(posts);
      } catch (err) {
        console.error('Error loading home content:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Hero content={content} />
      <NewsHighlights highlights={highlightedPosts} />
      <PartnersStrip />
      <Stats stats={content?.stats_section} />
      <Features features={content?.features_section} />
      <SchoolProgramsSection content={content} schools={schools} />
      <Testimonials testimonials={content?.testimonials_section} />
      <UpcomingEvents events={events} />
    </div>
  );
}
