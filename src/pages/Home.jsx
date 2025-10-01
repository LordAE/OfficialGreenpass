// src/pages/Home.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const ensureArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []));

/** Name normalizer (same idea as Schools page) */
const normalize = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(the|of|and|for|at|in|de|la|le|du|des|université|universite)\b/g, "")
    .replace(/\b(university|college|institute|polytechnic|school|academy|centre|center)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

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
      video_url: '',             // (optional) keep if you still embed YouTube in the right card
      background_video_url: 'https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/GreenPass%20Intro.mp4?alt=media&token=b772f97d-eb1a-467d-b2a8-4726026326be',  // NEW: background mp4/webm (loops)
      poster_url: ''             // NEW: poster/fallback image
    },
    features_section: [],
    testimonials_section: [],
    stats_section: [],
    schools_programs_section: { title: '', subtitle: '', show_featured_only: false, max_items: 6 },
    final_cta_section: { title: '', subtitle: '', description: '', primary_button_text: '', primary_button_url: '', secondary_button_text: '', secondary_button_url: '' },
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
    final_cta_section: { ...prev.final_cta_section, ...(loaded.final_cta_section || {}) },
  };
};

const mapSchoolDoc = (snap) => {
  const d = { id: snap.id, ...snap.data() };
  // Map a 'schools' document to the card fields
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
    institution_logo_url: pickFirst(d.institution_logo_url, ''), // will be enriched from institutions
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

/* =========================
   Sections (UI)
========================= */
const DEFAULT_POSTER =
  '';

const Hero = ({ content }) => {
  const hero = content?.hero_section || {};

  // Prefer a dedicated background video; fall back to video_url if present
  const bgVideo = hero.background_video_url || hero.video_url || "";
  const poster = hero.poster_url || hero.image_url || DEFAULT_POSTER;

  const [useImage, setUseImage] = React.useState(!bgVideo);
  const videoRef = React.useRef(null);

  // Encourage autoplay on iOS/Safari
  React.useEffect(() => {
    if (!bgVideo || !videoRef.current) return;
    const el = videoRef.current;
    const tryPlay = () => el.play().catch(() => {});
    if (el.readyState >= 2) tryPlay();
    else el.addEventListener("canplay", tryPlay, { once: true });
    return () => el.removeEventListener("canplay", tryPlay);
  }, [bgVideo]);

  return (
    <div className="relative text-white overflow-hidden">
      {/* Background media */}
      {!useImage && bgVideo ? (
        <video
          key={bgVideo}
          ref={videoRef}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[200%] w-auto"
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
          alt=''
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[200%] w-auto"
          loading="eager"
        />
      )}

      {/* Overlays (MSM Unify vibe) */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
            >
              {hero.title || <>Want to study abroad? Keep calm, let <span className="text-green-400">GreenPass</span> handle it</>}
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-200 leading-relaxed"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
          >
            {hero.subtitle || "Connect with verified schools, agents, and tutors. From visa applications to arrival support - everything you need in one platform."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link to={createPageUrl("Welcome")}>
              <Button size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                Sign Up<ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to={createPageUrl("Programs")}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/20 border-white/50 text-white hover:bg-white/30 px-8 py-4 text-lg font-semibold transition-all duration-200">
                Browse Programs
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   NEW: News & Highlights Carousel
========================= */
const mockNews = [
  {
    id: 'n1',
    title: 'IRCC announces streamlined visa process for students',
    summary: 'Canada introduces faster processing for eligible institutions and programs.',
    image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981d?w=1200&q=80',
    tag: 'Policy Update',
    date: '2 days ago',
    href: '#'
  },
  {
    id: 'n2',
    title: 'University of Toronto ranked top in Canada again',
    summary: 'UofT leads national rankings with strong research and student outcomes.',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80',
    tag: 'Rankings',
    date: '5 days ago',
    href: '#'
  },
  {
    id: 'n3',
    title: 'Scholarships: $10M available for 2025 intakes',
    summary: 'New merit-based scholarships across partner institutions.',
    image: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=1200&q=80',
    tag: 'Scholarships',
    date: '1 week ago',
    href: '#'
  },
];

function NewsHighlights() {
  const items = mockNews;
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef(null);

  const next = () => setIndex((i) => (i + 1) % items.length);
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);

  useEffect(() => {
    timeoutRef.current = setInterval(next, 5500);
    return () => clearInterval(timeoutRef.current);
  }, []);

  const pause = () => clearInterval(timeoutRef.current);
  const resume = () => {
    clearInterval(timeoutRef.current);
    timeoutRef.current = setInterval(next, 5500);
  };

  const active = items[index];

  return (
    <div className="bg-white py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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

        {/* Carousel */}
        <Card className="overflow-hidden border-0 shadow-md">
          <div
            className="relative w-full h-[22rem] sm:h-[26rem] lg:h-[28rem]"
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
                    src={active.image}
                    alt={active.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                </div>

                {/* Content overlay */}
                <div className="relative z-10 h-full flex items-end">
                  <div className="p-6 sm:p-10 text-white w-full">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-white/20 text-white border-white/30">{active.tag}</Badge>
                      <span className="text-white/80 text-sm inline-flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {active.date}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold leading-snug drop-shadow">
                      {active.title}
                    </h3>
                    <p className="mt-2 text-white/90 max-w-2xl">
                      {active.summary}
                    </p>
                    <div className="mt-5">
                      <Link to={active.href}>
                        <Button className="bg-green-600 hover:bg-green-700">
                          Read more <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Controls (mobile) */}
            <div className="sm:hidden absolute inset-x-0 bottom-4 px-4 flex items-center justify-between">
              <button
                aria-label="Previous"
                onClick={prev}
                className="p-2 rounded-full bg-white/90 shadow hover:bg-white"
              >
                <ChevronLeft className="w-5 h-5 text-slate-800" />
              </button>
              <button
                aria-label="Next"
                onClick={next}
                className="p-2 rounded-full bg-white/90 shadow hover:bg-white"
              >
                <ChevronRight className="w-5 h-5 text-slate-800" />
              </button>
            </div>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  onClick={() => setIndex(i)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === index ? 'w-6 bg-white' : 'w-2.5 bg-white/60'
                  }`}
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
   Features
========================= */
const Features = ({ features }) => {
  const defaultFeatures = [
    {
      icon: "School",
      title: "Discover Top Schools",
      description: "Explore thousands of programs from top institutions worldwide. Our smart filters help you find the perfect match for your academic and career goals.",
      image_url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
      link_url: createPageUrl('Schools'),
      link_text: "Explore Schools",
      media_position: 'right'
    },
    {
      icon: "Users",
      title: "Expert Agent Guidance",
      description: "Connect with verified education agents who can guide you through every step, from school selection to visa paperwork.",
      youtube_url: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
      link_url: createPageUrl('FindAgent'),
      link_text: "Find an Agent",
      media_position: 'left'
    },
    {
      icon: "GraduationCap",
      title: "Recommended For You: University of Toronto",
      description: "A world-renowned university in a vibrant, multicultural city.",
      image_url: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80",
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
                            className={`w-5 h-5 ${
                              i < Math.floor(feature.school_rating || 4.5)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
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
                    <IconResolver name={feature.icon} className="h-7 w-7 text-green-700" />
                  </div>
                )}

                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  <Link to={feature.link_url || '#'} className="hover:text-green-700 transition-colors duration-200">
                    {feature.title}
                  </Link>
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed">{feature.description}</p>
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

const SchoolProgramsSection = ({ content, schools }) => (
  <div className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
          {content?.schools_programs_section?.title || "Recommended Schools"}
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          {content?.schools_programs_section?.subtitle ||
            "Discover our personally recommended educational institutions selected for their excellence and student success rates"}
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

                      {/* Rating Badge */}
                      <div className="absolute top-4 right-4">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(school.rating || 4.5)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                }`}
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
   Other sections
========================= */
const Stats = ({ stats }) => (
  <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 py-16 relative overflow-hidden">
    <div className="absolute inset-0 bg-black/10"></div>
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
        {(stats || [
          { value: "96%", label: "Visa Success Rate" },
          { value: "1,200+", label: "Partner Institutions" },
          { value: "15K+", label: "Happy Students" },
        ]).map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="text-white space-y-2"
          >
            <div className="text-3xl md:text-4xl font-bold">{stat.value}</div>
            <div className="text-green-100 font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const Testimonials = ({ testimonials }) => (
  <div className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Success Stories from Our Students</h2>
        <p className="text-xl text-slate-600">Hear from students who achieved their dreams with GreenPass</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(testimonials || [
          {
            author_name: "Sarah Chen",
            author_title: "University of Toronto Student",
            author_image_url:
              "https://images.unsplash.com/photo-1494790108755-2616b612c108?w=150&h=150&fit=crop&crop=face",
            quote: "GreenPass made my dream of studying at UofT a reality. The visa support was incredible!",
          },
          {
            author_name: "Michael Nguyen",
            author_title: "McGill University Student",
            author_image_url:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
            quote:
              "The agent matching service connected me with the perfect counselor. Highly recommended!",
          },
          {
            author_name: "Emily Rodriguez",
            author_title: "UBC Graduate",
            author_image_url:
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
            quote: "From application to arrival, GreenPass supported me every step of the way.",
          },
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
                  "{t.quote}"
                </blockquote>

                <div className="flex items-center">
                  <img
                    src={
                      t.author_image_url ||
                      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face"
                    }
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

const FinalCTA = ({ ctaContent }) => (
  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20"></div>
    <div className="relative z-10 max-w-4xl mx-auto text-center py-20 px-4 sm:py-24 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="space-y-8"
      >
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          <span className="block">{ctaContent?.title || "Ready to start your journey?"}</span>
          <span className="block bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mt-2">
            {ctaContent?.subtitle || "Join thousands of successful students"}
          </span>
        </h2>
        <p className="text-xl text-slate-300 leading-relaxed">
          {ctaContent?.description || "Get started today and take the first step towards your Canadian education dream."}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to={createPageUrl(ctaContent?.primary_button_url || "Welcome")}>
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {ctaContent?.primary_button_text || "Get Started Now"}
            </Button>
          </Link>
          <Link to={createPageUrl(ctaContent?.secondary_button_url || "Programs")}>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-2 border-slate-400 text-slate-300 hover:border-green-400 hover:text-green-400 hover:bg-green-400/10 px-8 py-4 text-lg font-semibold transition-all duration-200"
            >
              {ctaContent?.secondary_button_text || "Browse Programs"}
            </Button>
          </Link>
        </div>
        <p className="text-sm text-slate-400">Free to join • No hidden fees • Trusted by thousands</p>
      </motion.div>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1) Home content
        const homeSnap = await getDoc(doc(db, 'home_page_contents', 'SINGLETON'));
        const homeData = homeSnap.exists() ? sanitizeHomeContent(homeSnap.data()) : sanitizeHomeContent({});
        setContent(homeData);

        // 2) Events (simple fetch, sort client-side)
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

        // 3) Recommended Schools = 'schools' where is_featured == true
        let sSnap = await getDocs(
          query(
            collection(db, 'schools'),
            where('is_featured', '==', true),
            limit(60)
          )
        );
        if (sSnap.empty) {
          // Optional fallback to capitalized collection name
          sSnap = await getDocs(
            query(
              collection(db, 'Schools'),
              where('is_featured', '==', true),
              limit(60)
            )
          );
        }
        const featuredSchools = sSnap.docs.map(mapSchoolDoc);

        // 4) Fetch institutions to enrich logos (logoUrl)
        let instSnap = await getDocs(collection(db, 'institutions'));
        if (instSnap.empty) {
          instSnap = await getDocs(collection(db, 'Institutions'));
        }
        const institutions = instSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Build a fast lookup: normalized name -> institution row
        const instMap = new Map(
          institutions.map((inst) => {
            const key = normalize(inst.name || inst.institution_name || inst.title || '');
            return [key, inst];
          })
        );

        // 5) Merge: prefer institution.logoUrl for images when names match
        const merged = featuredSchools.map((s) => {
          const key = normalize(s.school_name || s.institution_name || '');
          const inst = instMap.get(key);

          const logoFromInst = pickFirst(inst?.logoUrl, inst?.logo_url, inst?.image_url, inst?.institution_logo_url);

          return {
            ...s,
            // Use institution logo first, then existing fields, then placeholder
            school_image_url: pickFirst(logoFromInst, s.school_image_url, s.institution_logo_url),
            institution_logo_url: pickFirst(logoFromInst, s.institution_logo_url),
          };
        });

        setSchools(merged);
      } catch (err) {
        console.error('Error loading home content:', err);
        setSchools([]); // show "no schools" state if query fails
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
      {/* NEW SECTION: News & Highlights carousel */}
      <NewsHighlights />
      <Features features={content?.features_section} />
      <SchoolProgramsSection content={content} schools={schools} />
      <Stats stats={content?.stats_section} />
      <Testimonials testimonials={content?.testimonials_section} />
      <UpcomingEvents events={events} />
      <FinalCTA ctaContent={content?.final_cta_section} />
    </div>
  );
}
