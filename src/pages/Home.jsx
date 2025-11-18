// src/pages/Home.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useAnimation,
  useInView,
  useScroll,
  useTransform,
} from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Star, Users, GraduationCap, TrendingUp,
  School as SchoolIcon, MapPin, DollarSign, Calendar,
  ChevronLeft, ChevronRight, Clock, Newspaper,
  Megaphone, Compass
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import IconResolver from '../components/IconResolver';
import EventCard from '../components/home/EventCard';
import YouTubeEmbed from '../components/YouTubeEmbed';
import MultilineText from '@/components/MultilineText';

import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

/* ---------- helpers ---------- */
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

/* ---------- replay on scroll ---------- */
const ReplayOnScroll = ({
  children,
  threshold = 0.3,
  margin = '-10% 0% -10% 0%',
  variants,
  delay = 0,
  once = false,
  initial = 'hidden',
  visible = 'visible',
  className,
  ...rest
}) => {
  const ref = React.useRef(null);
  const controls = useAnimation();
  const inView = useInView(ref, { amount: threshold, margin, once });

  const v = variants || {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay } },
  };

  React.useEffect(() => {
    if (inView) controls.start(visible);
    else if (!once) controls.start(initial);
  }, [inView, controls, initial, visible, once]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={controls}
      variants={v}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

/* ---------- content mappers ---------- */
const sanitizeHomeContent = (loaded = {}) => {
  const prev = {
    hero_section: {
      title: '',
      subtitle: '',
      image_url: '',
      video_url: '',
      background_video_url:
        'https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2FGPintro.mp4?alt=media&token=bbcde9d6-a628-429f-9cff-8cad12933cba',
      poster_url: '',
      fit_mode: 'contain' // show whole video by default
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

/* ---------- blog highlight helpers ---------- */
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
   HERO (taller height)
========================= */
/* =========================
   HERO with mute / unmute
========================= */
const DEFAULT_POSTER =
  "https://images.unsplash.com/photo-1529078155058-5d716f45d604?q=80&w=1920&auto=format&fit=crop";

const Hero = ({ content }) => {
  const hero = content?.hero_section || {};
  const bgVideo = hero.background_video_url || hero.video_url || "";
  const poster = hero.poster_url || hero.image_url || DEFAULT_POSTER;
  const fitMode = (hero.fit_mode || "cover").toLowerCase(); // 'cover' | 'contain'

  const [useImage, setUseImage] = React.useState(!bgVideo);
  const [isMuted, setIsMuted] = React.useState(true);
  const videoRef = React.useRef(null);

  // subtle parallax on title
  const { scrollY } = useScroll();
  const titleY = useTransform(scrollY, [0, 300], [0, -24]);
  const titleO = useTransform(scrollY, [0, 300], [1, 0.85]);

  React.useEffect(() => {
    if (!bgVideo || !videoRef.current) return;
    const el = videoRef.current;
    let timer;

    const tryPlay = async () => {
      try {
        el.muted = true;       // must start muted for autoplay
        setIsMuted(true);
        await el.play();
        setUseImage(false);
      } catch {
        setUseImage(true);
      }
    };

    if (el.readyState >= 2) tryPlay();
    else el.addEventListener("canplay", tryPlay, { once: true });

    timer = setTimeout(() => {
      if (el.paused) setUseImage(true);
    }, 1000);

    return () => {
      el.removeEventListener("canplay", tryPlay);
      clearTimeout(timer);
    };
  }, [bgVideo]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);

    // if user unmutes and video is paused, try to play
    if (!nextMuted && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <section className="gp-hero-root">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.gp-hero-root{position:relative;color:#fff}

/* HERO VIDEO HEIGHT */
.gp-videoWrap{
  --gp-fit:${fitMode};
  position:relative;width:100%;
  height:clamp(460px,min(75svh,82dvh),900px);
  overflow:hidden;background:#0a0f12;
}
@supports not (height: 1svh){
  .gp-videoWrap{height:clamp(420px,68vh,820px);}
}

/* Actual video/poster */
.gp-video{
  position:absolute;inset:0;display:block;width:100%;height:100%;
  min-width:100%;min-height:100%;object-fit:var(--gp-fit,cover);
  object-position:center center;background:transparent;
}

/* Vignette & grain */
.gp-vignette{
  position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(120% 80% at 50% 10%, rgba(0,0,0,.0) 0%, rgba(0,0,0,.25) 60%, rgba(0,0,0,.46) 100%),
    linear-gradient(to bottom, rgba(0,0,0,.55) 0%, rgba(0,0,0,.28) 32%, rgba(0,0,0,.45) 100%);
}
.gp-noise{
  position:absolute;inset:0;pointer-events:none;opacity:.05;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.8'/></svg>");
  background-size:340px 340px;
}

/* Centered headline */
.gp-center{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:0 1rem;z-index:3}
.gp-title{font-size:clamp(2rem,3.9vw,3rem);font-weight:800;line-height:1.06;
  text-shadow:0 2px 18px rgba(0,0,0,.35), 0 6px 32px rgba(0,0,0,.28)}
.gp-sub{max-width:72ch;font-size:clamp(1rem,1.2vw,1.1rem);opacity:.97;
  text-shadow:0 1px 12px rgba(0,0,0,.35)}

/* Mute / unmute button */
.gp-audioToggle{
  position:absolute;right:1rem;bottom:1rem;z-index:4;
  display:inline-flex;align-items:center;gap:.4rem;
  padding:.4rem .75rem;border-radius:9999px;
  border:1px solid rgba(255,255,255,.7);
  background:rgba(15,23,42,.80);backdrop-filter:blur(6px);
  color:#fff;font-size:.8rem;font-weight:500;cursor:pointer;
  box-shadow:0 6px 18px rgba(15,23,42,.4);
  transition:background .15s ease, transform .15s ease, box-shadow .15s ease;
}
.gp-audioToggle:hover{
  background:rgba(15,23,42,.95);
  transform:translateY(-1px);
  box-shadow:0 10px 26px rgba(15,23,42,.55);
}

/* Band under hero (cards row) */
.gp-band{
  position:relative;z-index:4;max-width:1320px;
  margin:clamp(-80px,-12vh,-120px) auto 0;
  padding:0 18px;
}
@media(min-width:1024px){.gp-band{padding:0 22px}}

/* Tiles layout + styling (unchanged) */
.gp-tiles{display:grid;grid-template-columns:1fr;gap:18px;align-items:stretch}
@media(min-width:1024px){.gp-tiles{grid-template-columns:repeat(4,1fr);gap:22px}}

.gp-card{position:relative;display:flex;flex-direction:column;color:#fff;border-radius:16px;overflow:hidden;background:var(--tile-fallback,#0f172a);box-shadow:0 8px 24px rgba(2,6,23,.25);min-height:280px;isolation:isolate;}
.gp-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;transform:scale(1.02)}
.gp-tint{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,var(--tile-tint,transparent) 0%,var(--tile-tint,transparent) 44%,var(--tile-tint-bottom,transparent) 100%)}
.gp-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.04) 0%, rgba(0,0,0,.22) 38%, rgba(0,0,0,.60) 100%)}
.gp-cap{position:absolute;left:0;right:0;top:0;height:110px;background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.18)),linear-gradient(165deg, var(--tile-tint,transparent) 0%, transparent 64%);clip-path: polygon(0 0, 100% 0, 100% 66%, 0 86%);display:flex;align-items:center;justify-content:center;}
.gp-ico{width:44px;height:44px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.85);background:rgba(0,0,0,.18);backdrop-filter:blur(2px)}
.gp-body{position:relative;display:flex;flex-direction:column;gap:12px;padding:26px;padding-top:126px;flex:1;}
.gp-ttl{margin:0 0 2px;font-weight:800;letter-spacing:.2px;font-size:1rem}
.gp-hr{height:1px;background:rgba(255,255,255,.28);margin:6px 0 6px}
.gp-desc{margin:0;font-size:.95rem;line-height:1.5;opacity:.95}
.gp-cta{display:inline-flex;align-items:center;gap:10px;margin-top:auto;background:#fff;color:#0f172a;border-radius:12px;padding:12px 18px;font-weight:800;box-shadow:0 2px 0 rgba(0,0,0,.1);transition:transform .2s ease,box-shadow .2s ease}
.gp-cta .chev{display:inline-block;transition:transform .2s ease}
.gp-cta:hover{box-shadow:0 12px 26px rgba(0,0,0,.24);transform:translateY(-2px)}
.gp-cta:hover .chev{transform:translateX(2px)}

/* Mobile tuning */
@media(max-width:640px){
  .gp-videoWrap{height:clamp(380px,70svh,640px)}
  @supports not (height: 1svh){.gp-videoWrap{height:clamp(380px,70vh,640px)}}
  .gp-title{font-size:clamp(1.7rem,6vw,2.3rem)}
  .gp-sub{font-size:clamp(.95rem,3.8vw,1.05rem)}
  .gp-cap{height:96px;clip-path:polygon(0 0,100% 0,100% 64%,0 86%)}
  .gp-body{padding-top:112px}
}
          `,
        }}
      />

      <div className="gp-videoWrap">
        {!useImage && bgVideo ? (
          <video
            key={bgVideo}
            ref={videoRef}
            className="gp-video"
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
          <img src={poster} alt="" className="gp-video" loading="eager" />
        )}

        <div className="gp-vignette" />
        <div className="gp-noise" />

        {/* Mute / Unmute button – only when we actually have a video */}
        {!useImage && bgVideo && (
          <button
            type="button"
            className="gp-audioToggle"
            onClick={toggleMute}
            aria-pressed={!isMuted}
            aria-label={isMuted ? "Unmute hero video" : "Mute hero video"}
          >
            <span>{isMuted ? "🔇" : "🔊"}</span>
            <span>{isMuted ? "Sound off" : "Sound on"}</span>
          </button>
        )}

        <div className="gp-center">
          <motion.div style={{ y: titleY, opacity: titleO }}>
            <h1 className="gp-title">{hero.title || ""}</h1>
            {hero.subtitle ? (
              <p className="gp-sub">
                <MultilineText text={hero.subtitle} />
              </p>
            ) : null}
          </motion.div>
        </div>
      </div>

      <FeatureTiles />
    </section>
  );
};

/* ======= Feature tiles (with robust images + palette tints) ======= */
const TILE_IMAGES = {
  students: "https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop",
  programs: "https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop",
  dates:    "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop",
  tours:    "https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop"
};
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1600&auto=format&fit=crop";

function FeatureTiles() {
  const tiles = [
    {
      icon: <Compass size={22} />,
      title: "FUTURE STUDENTS",
      desc: "Explore programs, admissions, and support designed for international students.",
      href: createPageUrl("Schools"),
      bg: TILE_IMAGES.students,
      theme: {
        base: "#0E6A6B",
        tint: "rgba(14,106,107,.26)",
        tintBottom: "rgba(14,106,107,.52)",
      },
    },
    {
      icon: <GraduationCap size={22} />,
      title: "ACADEMIC PROGRAMS",
      desc: "Compare tuition, duration, and see intake dates and requirements.",
      href: createPageUrl("ComparePrograms"),
      bg: TILE_IMAGES.programs,
      theme: {
        base: "#B08E2C",
        tint: "rgba(176,142,44,.24)",
        tintBottom: "rgba(176,142,44,.50)",
      },
    },
    {
      icon: <Megaphone size={22} />,
      title: "CALENDARS & KEY DATES",
      desc: "Explore key academic dates, campus visits, public events, class schedules, alumni activities, arts, athletics, and more.",
      href: createPageUrl("FairAndEvents"),
      bg: TILE_IMAGES.dates,
      theme: {
        base: "#1789A4",
        tint: "rgba(23,137,164,.24)",
        tintBottom: "rgba(23,137,164,.50)",
      },
    },
    {
      icon: <MapPin size={22} />,
      title: "VIRTUAL CAMPUS TOURS",
      desc: "Take a virtual tour, learn about admission and financial aid, and speak with current students.",
      href: createPageUrl("StudentLife"),
      bg: TILE_IMAGES.tours,
      theme: {
        base: "#7A2F35",
        tint: "rgba(122,47,53,.24)",
        tintBottom: "rgba(122,47,53,.50)",
      },
    },
  ];
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;

  return (
    <div className="gp-band">
      <div className="gp-tiles">
        {tiles.map((t, i) => (
          <ReplayOnScroll
            key={i}
            className="gp-card"
            style={{
              '--tile-fallback': t.theme.base,
              '--tile-tint': t.theme.tint,
              '--tile-tint-bottom': t.theme.tintBottom,
            }}
            threshold={0.3}
            variants={{
              hidden: { opacity: 0, y: 40, x: isMobile ? (i % 2 === 0 ? -24 : 24) : 0 },
              visible: { opacity: 1, y: 0, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
            }}
          >
            <img
              className="gp-bg"
              src={t.bg}
              alt=""
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_IMG;
              }}
            />
            <div className="gp-tint" />
            <div className="gp-scrim" />
            <div className="gp-cap">
              <div className="gp-ico">{t.icon}</div>
            </div>

            <div className="gp-body">
              <h3 className="gp-ttl">{t.title}</h3>
              <div className="gp-hr" />
              <p className="gp-desc">{t.desc}</p>
              <Link className="gp-cta" to={t.href}>
                Learn More <span className="chev">»</span>
              </Link>
            </div>
          </ReplayOnScroll>
        ))}
      </div>
    </div>
  );
}

/* =========================
   News & Highlights
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
                <div className="absolute inset-0 pointer-events-none">
                  <img
                    src={active.cover}
                    alt={active.title}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none" />
                </div>

                {/* caption */}
                <div className="relative z-10 h-full flex items-end sm:items-end pointer-events-auto">
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
                        <Link to={active.href} className="block">
                          <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                            Read more <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* mobile arrows */}
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
   Partners strip
========================= */
function PartnersStrip() {
  const partners = [
    { name: "UWE Bristol", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FUWEBristol.jpg?alt=media&token=0d3c6c10-d925-47d5-bdf7-14a38bcb67dd" },
    { name: "Cape Breton University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FCapeBretonUniveristy.jpg?alt=media&token=f8695d0d-0e13-44be-a319-5b7c262f1d05" },
    { name: "Canterbury Christ Church University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FCanterbury-Christ-Church-University.png?alt=media&token=2235d037-6d1d-43c3-9959-3e6f913ee09f" },
    { name: "University of West Alabama", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FUniversityofWestAlabama.png?alt=media&token=9fc57006-3137-44c5-b888-6c1fcca756b0" },
    { name: "Capilano University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FCapilanoUniversity.jpg?alt=media&token=535e4daa-5673-4ea9-ad2c-7ac4f33d1979" },
    { name: "University of Toronto", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FUniversityofToronto.avif?alt=media&token=687579c2-f19f-483c-a0d6-e8c3ff20b995" },
    { name: "McGill University", logo: "https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2Flogos%2FmcgillUniversity.png?alt=media&token=7f0fcfbd-e7cd-4555-af62-978c308d6dd" },
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

  React.useEffect(() => {
    controls.start({
      x: ["0%", "-50%"],
      transition: { duration: 40, ease: "linear", repeat: Infinity },
    });
  }, [controls]);

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl sm:text-4xl font-bold text-slate-900">
          Top university partners
        </h2>

        <div className="relative mt-10 overflow-hidden pb-10 sm:pb-12">
          <motion.div animate={controls} className="flex gap-6 sm:gap-10 md:gap-12 w-[200%]">
            {marquee.map((p, i) => (
              <motion.div
                key={`${p.name}-${i}`}
                className="shrink-0 w-[200px] sm:w-[220px] lg:w-[230px]"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}   // replay on scroll
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
          onViewportLeave={() => setStart(false)}     // reset so it replays
          viewport={{ once: false, amount: 0.4 }}
        >
          {items.map((it, i) => {
            const Icon = it.icon || Users;
            return (
              <ReplayOnScroll key={i} threshold={0.5} delay={i * 0.05}>
                <div className="flex items-start gap-4">
                  <Icon className="w-12 h-12 text-slate-400" />
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600">
                      <CountUp valueString={it.value} start={start} duration={1.4} />
                    </div>
                    <div className="text-slate-700 text-base sm:text-lg">{it.label}</div>
                  </div>
                </div>
              </ReplayOnScroll>
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
/* ---------- Feature collage media ---------- */
const FEATURE_COLLAGE_DEFAULT = [
  "https://images.pexels.com/photos/1184580/pexels-photo-1184580.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
  "https://images.pexels.com/photos/819753/pexels-photo-819753.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
  "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
  "https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
];

function FeatureMedia({ feature }) {
  const collage =
    Array.isArray(feature.collage_images) && feature.collage_images.length
      ? feature.collage_images
      : FEATURE_COLLAGE_DEFAULT;

  const hasYouTube = !!feature.youtube_url;
  const hasVideo = !!feature.video_url;
  const hasImage = !!feature.image_url;

  // Only show collage when foreground is an IMAGE (no video / YouTube)
  const showCollage = hasImage && !hasYouTube && !hasVideo && collage && collage.length > 0;

  // Positions for overlapping photos
  const frames = [
    { top: "-8%", left: "-6%", width: "55%", height: "55%", transform: "rotate(-9deg)" },
    { top: "0%", right: "-8%", width: "52%", height: "52%", transform: "rotate(8deg)" },
    { bottom: "-10%", left: "-4%", width: "60%", height: "58%", transform: "rotate(6deg)" },
    { bottom: "-6%", right: "-10%", width: "58%", height: "56%", transform: "rotate(-7deg)" },
    { top: "18%", left: "12%", width: "42%", height: "50%", transform: "rotate(3deg)" },
    { top: "18%", right: "14%", width: "44%", height: "48%", transform: "rotate(-3deg)" },
    { bottom: "14%", left: "18%", width: "40%", height: "46%", transform: "rotate(-2deg)" },
    { bottom: "18%", right: "18%", width: "42%", height: "44%", transform: "rotate(2deg)" },
  ];

  return (
    <div
      className={`relative ${
        feature.media_position === "right" ? "lg:order-2" : "lg:order-1"
      }`}
    >
      <div className="relative w-full max-w-xl mx-auto min-h-[280px] sm:min-h-[320px]">
        {/* Collage background – only when main media is an image */}
        {showCollage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
            <div className="relative w-[120%] h-[120%]">
              {collage.slice(0, 8).map((url, idx) => {
                const frame = frames[idx % frames.length];
                return (
                  <div
                    key={idx}
                    className="absolute rounded-[28px] shadow-2xl bg-white border-[7px] border-white"
                    style={frame}
                  >
                    <div className="w-full h-full rounded-2xl overflow-hidden">
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Foreground “main media” card */}
        <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl bg-slate-900 text-white">
          <div className="w-full aspect-[16/9] sm:aspect-[4/3] md:aspect-[16/9] bg-black">
            {hasYouTube ? (
              <YouTubeEmbed url={feature.youtube_url} className="w-full h-full rounded-none" />
            ) : hasVideo ? (
              <video
                className="w-full h-full object-cover"
                src={feature.video_url}
                controls
                playsInline
                preload="metadata"
              />
            ) : hasImage ? (
              <img
                src={feature.image_url}
                alt={feature.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs sm:text-sm text-slate-200 px-4 text-center">
                Upload an image or video in the Home Page editor to show it here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
      description:
        "Explore thousands of programs from top institutions worldwide. Our smart filters help you find the perfect match for your academic and career goals.",
      image_url: "https://images.pexels.com/photos/1184580/pexels-photo-1184580.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
      video_url: "",
      link_url: createPageUrl("Schools"),
      link_text: "Explore Schools",
      media_position: "right",
    },
    {
      icon: "Users",
      title: "Expert Agent Guidance",
      description:
        "Connect with verified education agents who can guide you through every step, from school selection to visa paperwork.",
      youtube_url: "",
      video_url: "",
      link_url: createPageUrl("FindAgent"),
      link_text: "Find an Agent",
      media_position: "left",
    },
    {
      icon: "GraduationCap",
      title: "Recommended For You: University of Toronto",
      description:
        "A world-renowned university in a vibrant, multicultural city.",
      image_url: "",
      video_url: "",
      link_url: createPageUrl("SchoolDetails?id=university-of-toronto"),
      link_text: "View University",
      media_position: "right",
      school_rating: 4.8,
      show_rating: true,
    },
  ];

  const featuresToDisplay =
    features && features.length > 0 ? features : defaultFeatures;

  return (
    <div className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 sm:mb-20 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Everything You Need for Your Study Abroad Journey
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            From finding the perfect program to landing in your new country,
            we've got every step covered.
          </p>
        </div>

        <div className="space-y-16 sm:space-y-24">
          {featuresToDisplay.map((feature, index) => (
            <ReplayOnScroll
              key={index}
              threshold={0.3}
              delay={0.1}
              variants={{
                hidden: { opacity: 0, y: 50 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6 },
                },
              }}
              className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center"
            >
              {/* Text side */}
              <div
                className={`space-y-6 text-center lg:text-left ${
                  feature.media_position === "right"
                    ? "lg:order-1"
                    : "lg:order-2"
                }`}
              >
                {feature.show_rating ? (
                  <div className="inline-flex items-center justify-center bg-green-100 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i <
                              Math.floor(feature.school_rating || 4.5)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
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
                    <IconResolver
                      name={feature.icon}
                      className="h-7 w-7 text-green-700"
                    />
                  </div>
                )}

                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  <Link
                    to={feature.link_url || "#"}
                    className="hover:text-green-700 transition-colors duration-200"
                  >
                    {feature.title}
                  </Link>
                </h3>

                <p className="text-lg text-slate-600 leading-relaxed">
                  <MultilineText text={feature.description} />
                </p>

                {feature.link_url && feature.link_text && (
                  <Link to={feature.link_url}>
                    <Button
                      size="lg"
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white shadow-md"
                    >
                      {feature.link_text}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                )}
              </div>

              {/* Media side with collage background */}
              <FeatureMedia feature={feature} />
            </ReplayOnScroll>
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
                <ReplayOnScroll
                  key={school.id || index}
                  threshold={0.35}
                  delay={Math.min(index * 0.06, 0.24)}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
                  }}
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
                </ReplayOnScroll>
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
   Testimonials & Events
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
          <ReplayOnScroll
            key={i}
            delay={i * 0.1}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
            }}
          >
            <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8">
                {t.video_url && (
                  <div className="mb-6">
                    <YouTubeEmbed url={t.video_url} className="w-full h-48 rounded-lg" />
                  </div>
                )}

                <blockquote className="text-slate-700 mb-6 italic text-lg leading-relaxed">
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
          </ReplayOnScroll>
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
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) navigate(createPageUrl('Dashboard'), { replace: true });
      setAuthChecked(true);
    });
    return unsub;
  }, [navigate]);

  const [content, setContent] = useState(null);
  const [events, setEvents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [highlightedPosts, setHighlightedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const homeSnap = await getDoc(doc(db, 'home_page_contents', 'SINGLETON'));
        const homeData = homeSnap.exists() ? sanitizeHomeContent(homeSnap.data()) : sanitizeHomeContent({});
        setContent(homeData);

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

        let sSnap = await getDocs(
          query(collection(db, 'schools'), where('is_featured', '==', true), limit(60))
        );
        if (sSnap.empty) {
          sSnap = await getDocs(
            query(collection(db, 'Schools'), where('is_featured', '==', true), limit(60))
          );
        }
        const featuredSchools = sSnap.docs.map(mapSchoolDoc);

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


  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

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
