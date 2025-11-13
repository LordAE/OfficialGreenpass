import React, { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import {
  GraduationCap,
  Globe2,
  Euro,
  Clock,
  Building2,
  ArrowRight,
} from "lucide-react";

function FadeInSection({ children, delay = 0 }) {
  const controls = useAnimation();
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          controls.start({
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, delay },
          });
        } else {
          controls.start({ opacity: 0, y: 24 });
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [controls, delay]);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={controls}>
      {children}
    </motion.div>
  );
}

export default function StudyGermany() {
  const highlightStats = [
    {
      label: "Focus areas",
      value: "Engineering, IT, Science",
      note: "Research-driven programs & labs",
    },
    {
      label: "Tuition at public schools",
      value: "Low to none",
      note: "You mainly cover semester fees & living costs",
    },
    {
      label: "Work during studies",
      value: "120 full / 240 half days",
      note: "Per year on a student visa",
    },
  ];

  const pathwaySteps = [
    "Choose your program and check entry requirements.",
    "Prepare academic documents and language tests (English and/or German).",
    "Secure admission and arrange proof of funds (e.g., blocked account or sponsorship).",
    "Book health insurance & accommodation, then apply for your student visa.",
  ];

  const livingTips = [
    "Most cities have excellent public transport (semesterticket in many regions).",
    "Part-time work is common in cafés, labs, offices, and campus jobs.",
    "Many universities offer free or low-cost German language courses for students.",
  ];

  return (
    <div className="bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Header */}
        <FadeInSection>
          <header className="mb-10">
            <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-2 bg-slate-100 text-slate-800 ring-1 ring-slate-200">
              <span className="text-2xl">🇩🇪</span>
              <span className="font-semibold">Study in Germany</span>
            </div>

            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Engineering excellence &amp; research-driven education
            </h1>
            <p className="mt-3 text-gray-600 max-w-3xl">
              Germany is known for high-quality public universities, strong
              engineering and STEM programs, and a practical, career-focused
              learning style. Many degrees are offered in English, especially at
              the master&apos;s level.
            </p>
          </header>
        </FadeInSection>

        {/* Hero section with image + quick stats */}
        <FadeInSection delay={0.1}>
          <section className="grid md:grid-cols-[1.4fr,1fr] gap-6 md:gap-8 mb-10">
            {/* HERO CARD WITH YOUR IMAGE + DARK OVERLAY */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white">
              <div className="absolute inset-0">
                <img
                  src="https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Students on a German university campus"
                  className="w-full h-full object-cover"
                />
                {/* stronger gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-slate-900/30" />
              </div>

              <div className="relative p-6 md:p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <GraduationCap className="h-4 w-4" />
                  <span>Top destination for engineering &amp; research</span>
                </div>

                {/* dark panel so text always readable */}
                <div className="mt-4 max-w-xl rounded-2xl bg-black/45 px-4 py-4 md:px-5 md:py-5 backdrop-blur-sm shadow-lg">
                  <h2 className="text-lg md:text-xl font-semibold">
                    Why students choose Germany
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm md:text-[15px] text-slate-100">
                    <li>
                      • Globally respected degrees in engineering, IT, natural
                      sciences, and business.
                    </li>
                    <li>
                      • Public universities with low or no tuition fees for many
                      programs.
                    </li>
                    <li>
                      • Option to stay after graduation and look for work.
                    </li>
                    <li>
                      • Safe, modern cities with strong transport and student
                      discounts.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick stats cards */}
            <div className="grid grid-rows-3 gap-4">
              {highlightStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 flex flex-col justify-center"
                >
                  <p className="text-xs font-medium text-slate-500 uppercase">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-slate-900">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeInSection>

        {/* Types of institutions */}
        <FadeInSection delay={0.15}>
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-700" />
              Types of institutions in Germany
            </h2>
            <div className="mt-4 grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Research Universities
                </h3>
                <p className="mt-2 text-xs text-slate-600">
                  Offer bachelor&apos;s, master&apos;s, and PhDs. Strong focus on
                  theory and research across STEM, social sciences, and
                  humanities.
                </p>
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Universities of Applied Sciences (FH / Hochschule)
                </h3>
                <p className="mt-2 text-xs text-slate-600">
                  Practice-oriented with internships, labs, and project work.
                  Great for IT, engineering, business, and design.
                </p>
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Studienkolleg / Foundation
                </h3>
                <p className="mt-2 text-xs text-slate-600">
                  One-year prep course if your high school curriculum doesn&apos;t
                  directly match German entry standards. Includes subject
                  modules and language.
                </p>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Application + living */}
        <FadeInSection delay={0.2}>
          <section className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Application path */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 md:p-6">
              <div className="flex items-center gap-2 text-slate-800">
                <Globe2 className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  Typical application path
                </h2>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-700 list-decimal pl-5">
                {pathwaySteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-slate-500">
                Exact steps can vary by program and state (Bundesland), so
                always follow your chosen university&apos;s instructions.
              </p>
            </div>

            {/* Living & costs */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 md:p-6 flex flex-col">
              <div className="flex items-center gap-2 text-slate-800">
                <Euro className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  Living costs &amp; daily life
                </h2>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Germany generally requires proof of funds for living costs for
                your visa. Your actual monthly spending will depend on the city,
                housing style, and lifestyle.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5">
                {livingTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
              <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-4 w-4" />
                <span>
                  Tip: apply early for student housing in popular cities like
                  Berlin, Munich, or Frankfurt.
                </span>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* CTA */}
        <FadeInSection delay={0.25}>
          <section className="rounded-2xl bg-slate-900 text-slate-50 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Need help planning your Germany study route?
              </h2>
              <p className="mt-1 text-sm text-slate-200 max-w-xl">
                Use GreenPass to compare programs, understand intakes, and keep
                track of your application steps in one place.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-medium bg-slate-800 px-4 py-2 rounded-full">
              <ArrowRight className="h-4 w-4" />
              <span>Explore Germany options inside the app</span>
            </div>
          </section>
        </FadeInSection>
      </div>
    </div>
  );
}
