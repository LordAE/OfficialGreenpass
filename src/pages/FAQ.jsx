// src/pages/FAQ.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, BookOpen, ChevronRight, ArrowUp } from "lucide-react";
import { motion, useMotionValue, useTransform, useSpring, useScroll } from "framer-motion";

/* ----------------------------- Fallback data ----------------------------- */
const fallbackFaqs = [
  { question: "Is the $50 reservation fee refundable?",
    answer: "Reservation fees are non-refundable once the booking is confirmed. If your situation changes, contact support and we can review on a case-by-case basis.",
    category: "reservations", priority: 10,
  },
  { question: "How do school reservations work?",
    answer: "Submit the reservation form, pay the fee, and upload any required documents. We’ll hold your slot and guide you through next steps.",
    category: "reservations", priority: 9,
  },
  { question: "What documents do I need for my visa application?",
    answer: "Typically: Letter of Acceptance from a DLI, proof of funds, passport, biometrics, and medical (if required). Check IRCC for specifics.",
    category: "visa", priority: 10,
  },
  { question: "How long does visa processing take?",
    answer: "Processing times vary by country and season. Always check the IRCC processing-time tool for the latest estimate.",
    category: "visa", priority: 9,
  },
  { question: "How can I check my visa application status?",
    answer: "Use your IRCC account to track real-time updates, biometrics requests, and decision notices.",
    category: "visa", priority: 8,
  },
  { question: "How do I pay for my application?",
    answer: "Payments are processed by our secure gateway. We accept major cards; some regions support additional methods.",
    category: "payments", priority: 7,
  },
];

/* ----------------------------- Small helpers ---------------------------- */
const slug = (s = "") =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

const toTitleCase = (str = "") =>
  str
    .split(/[\s_-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");

const renderAnswer = (text = "") =>
  text.split(/\n+/).map((p, i) => (
    <p key={i} className={i ? "mt-3" : ""}>
      {p}
    </p>
  ));

/* -------- Multi-source image (tries local then remote, graceful fallback) -------- */
const MultiSourceImage = ({ sources = [], alt, className }) => {
  const [i, setI] = useState(0);
  const src = sources[i];
  if (!src) {
    return (
      <div
        className={
          "bg-gradient-to-br from-white to-gray-100 border flex items-center justify-center text-gray-400 " +
          className
        }
      >
        <span className="text-sm flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          {alt || "Image"}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setI((v) => v + 1)}
    />
  );
};

/* ----------------- 3-image collage with tilt/parallax & float loops ----------------- */
const Collage3 = ({
  a = ["/img/faq-hero-1.jpg", "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop"],
  b = ["/img/faq-hero-2.jpg", "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1200&auto=format&fit=crop"],
  c = ["/img/faq-hero-3.jpg", "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop"],
}) => {
  const wrapRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Card tilt from mouse
  const rx = useTransform(my, [-0.5, 0.5], [8, -8]);
  const ry = useTransform(mx, [-0.5, 0.5], [-8, 8]);
  const tiltX = useSpring(rx, { stiffness: 180, damping: 20 });
  const tiltY = useSpring(ry, { stiffness: 180, damping: 20 });

  // Parallax for children
  const xParallax = (mult) => useSpring(useTransform(mx, [-0.5, 0.5], [-12 * mult, 12 * mult]), { stiffness: 160, damping: 18 });
  const yParallax = (mult) => useSpring(useTransform(my, [-0.5, 0.5], [-10 * mult, 10 * mult]), { stiffness: 160, damping: 18 });

  const onMove = (e) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0); my.set(0);
  };

  return (
    <div style={{ perspective: 1200 }}>
      <motion.div
        ref={wrapRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative h-[260px] sm:h-[320px] lg:h-[380px] w-full"
        style={{ transformStyle: "preserve-3d", rotateX: tiltX, rotateY: tiltY }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
      >
        {/* Floating glow behind */}
        <motion.div
          className="absolute inset-0 -z-10 rounded-[28px] blur-2xl"
          style={{ background: "radial-gradient(1200px 240px at 70% 10%, rgba(16,185,129,.15), transparent)" }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Large left tile */}
        <motion.div
          className="absolute left-0 top-0 h-[68%] w-[60%] rounded-2xl overflow-hidden ring-1 ring-black/10 shadow-lg -rotate-[2.5deg] hover:rotate-0 bg-white"
          style={{ x: xParallax(0.6), y: yParallax(0.6) }}
          whileHover={{ y: -6, scale: 1.02 }}
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
        >
          <MultiSourceImage sources={a} alt="FAQ collage 1" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
        </motion.div>

        {/* Tall right tile */}
        <motion.div
          className="absolute right-0 top-3 h-[98%] w-[36%] rounded-2xl overflow-hidden ring-1 ring-black/10 shadow-xl rotate-[1.75deg] hover:rotate-0 bg-white z-10"
          style={{ x: xParallax(1), y: yParallax(1) }}
          whileHover={{ y: -6, scale: 1.02 }}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 8.5, ease: "easeInOut" }}
        >
          <MultiSourceImage sources={b} alt="FAQ collage 2" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        </motion.div>

        {/* Small bottom tile */}
        <motion.div
          className="absolute left-8 bottom-0 h-[38%] w-[48%] rounded-2xl overflow-hidden ring-1 ring-black/10 shadow-lg rotate-[2.25deg] hover:rotate-0 bg-white z-20"
          style={{ x: xParallax(0.8), y: yParallax(0.8) }}
          whileHover={{ y: -6, scale: 1.03 }}
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut" }}
        >
          <MultiSourceImage sources={c} alt="FAQ collage 3" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
        </motion.div>
      </motion.div>
    </div>
  );
};

/* ------------------------------ Page ------------------------------------ */
export default function FAQ() {
  const [faqs, setFaqs] = useState(null); // null = loading
  const [activeId, setActiveId] = useState(null);
  const [showTop, setShowTop] = useState(false);
  const lang = useMemo(() => "en", []);

  // scroll progress bar
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 20, mass: 0.2 });

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "faqs"));
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        const filtered = items
          .filter((x) => (x.lang || "en") === lang)
          .map((x) => ({
            question: x.title || "",
            answer: x.body || "",
            category: (x.category || "general").toString(),
            priority: x.priority ?? 0,
          }));
        setFaqs(filtered.length ? filtered : []);
      } catch {
        setFaqs([]); // fallback below
      }
    })();
  }, [lang]);

  const list = faqs && faqs.length ? faqs : fallbackFaqs;

  // group by category
  const grouped = useMemo(() => {
    const map = new Map();
    for (const f of list) {
      const key = (f.category || "general").toString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    const cats = [...map.keys()].sort((a, b) => {
      const ap = Math.max(...map.get(a).map((x) => x.priority ?? 0)) || 0;
      const bp = Math.max(...map.get(b).map((x) => x.priority ?? 0)) || 0;
      if (bp !== ap) return bp - ap;
      return a.localeCompare(b);
    });
    return cats.map((c) => ({
      category: c,
      title: toTitleCase(c),
      id: slug(c),
      items: map.get(c).slice().sort((x, y) => (y.priority ?? 0) - (x.priority ?? 0)),
    }));
  }, [list]);

  // scrollspy + back-to-top visibility
  useEffect(() => {
    if (!grouped.length) return;
    const ids = grouped.map((g) => g.id);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [grouped]);

  const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top scroll progress */}
      <motion.div
        className="fixed left-0 top-0 h-1 w-full z-40 origin-left bg-gradient-to-r from-green-500 via-blue-500 to-cyan-400"
        style={{ scaleX: progress }}
      />

      {/* Hero */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 grid lg:grid-cols-2 gap-8 items-center"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <Badge className="mb-3 bg-green-600">FAQs</Badge>
            <h1 className="text-4xl font-extrabold sm:text-5xl tracking-tight text-gray-900">
              Any Questions?
              <br />
              <span className="text-green-700">We can help you</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl">
              If you are looking for quick, credible answers about studying in Canada,
              dive into our comprehensive FAQ section.
            </p>
          </motion.div>

          <Collage3 />
        </motion.div>
      </div>

      {/* Main two-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar TOC */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="sticky top-24">
                <CardContent className="p-0">
                  <div className="px-5 pt-5 pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-700" />
                      <h2 className="font-semibold">Table of contents</h2>
                    </div>
                  </div>
                  {faqs === null ? (
                    <div className="p-4 space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
                      ))}
                    </div>
                  ) : (
                    <nav className="relative p-2">
                      {grouped.map((g, i) => {
                        const active = g.id === activeId || (!activeId && i === 0);
                        return (
                          <motion.a
                            key={g.id}
                            href={`#${g.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              const t = document.getElementById(g.id);
                              if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className={`relative flex items-center justify-between rounded-md pl-6 pr-3 py-2 text-sm
                              ${active ? "bg-green-50 text-green-800" : "hover:bg-gray-100"}`}
                            whileHover={{ x: 4 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{ transitionDelay: `${i * 30}ms` }}
                          >
                            {active && (
                              <motion.span
                                layoutId="tocActive"
                                className="absolute left-3 inset-y-2 w-[3px] rounded bg-green-600"
                              />
                            )}
                            <span className="truncate">{g.title}</span>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </motion.a>
                        );
                      })}
                    </nav>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </aside>

          {/* Content column */}
          <section className="lg:col-span-8 xl:col-span-9">
            {faqs === null ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-xl border animate-pulse" />
                ))}
              </div>
            ) : (
              grouped.map((group, gi) => (
                <motion.div
                  key={group.id}
                  id={group.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ type: "spring", stiffness: 200, damping: 24 }}
                >
                  <Card className="mb-8">
                    <CardContent className="p-0">
                      <div className="px-4 sm:px-6 py-5 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <HelpCircle className="h-5 w-5 text-green-700" />
                          <h3 className="text-xl font-semibold">{group.title}</h3>
                          <Badge variant="outline" className="text-gray-600 ml-2">
                            {group.items.length} Q&A
                          </Badge>
                        </div>
                      </div>

                      <div className="px-2 sm:px-4 md:px-6 py-4">
                        <Accordion type="single" collapsible className="w-full">
                          {group.items.map((faq, i) => {
                            const value = `g${gi}-q${i}`;
                            return (
                              <AccordionItem key={value} value={value} className="border-b last:border-b-0">
                                <AccordionTrigger
                                  className="group text-left text-base sm:text-lg font-medium py-4 relative overflow-hidden"
                                >
                                  {/* Hover sweep highlight */}
                                  <motion.span
                                    className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-slate-100 to-transparent"
                                    initial={{ x: "-120%" }}
                                    whileHover={{ x: "120%" }}
                                    transition={{ duration: 0.65, ease: "easeOut" }}
                                  />
                                  <motion.span
                                    initial={{ opacity: 0.9 }}
                                    whileHover={{ x: 2, opacity: 1 }}
                                    className="mr-2"
                                  >
                                    {faq.question}
                                  </motion.span>
                                  <span className="ml-auto text-lg group-data-[state=open]:hidden">+</span>
                                  <span className="ml-2 text-base hidden group-data-[state=open]:inline">−</span>
                                </AccordionTrigger>
                                <AccordionContent className="text-gray-600 pb-5">
                                  <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.18 }}
                                  >
                                    {renderAnswer(faq.answer)}
                                  </motion.div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </section>
        </div>
      </div>

      {/* Back to top FAB */}
      <motion.button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-green-600 hover:bg-green-700 text-white p-3 shadow-lg"
        initial={false}
        animate={showTop ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
