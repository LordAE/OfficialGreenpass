import React, { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import {
  GraduationCap,
  MapPin,
  Globe2,
  Clock,
  Euro,
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

export default function StudyIreland() {
  const highlightPoints = [
    "English-speaking, EU country with globally recognised universities.",
    "Strong links to tech & pharma – many global companies have HQs in Ireland.",
    "Post-study work options for international graduates (subject to policy).",
  ];

  const popularCities = [
    { name: "Dublin", note: "Capital, tech & finance hub" },
    { name: "Cork", note: "Lively student city with strong industry links" },
    { name: "Galway", note: "Coastal university town with a creative scene" },
  ];

  const costNotes = [
    "Tuition and living costs can be higher than some European countries.",
    "Part-time work helps many students manage daily expenses.",
    "Student discounts are common for transport and entertainment.",
  ];

  return (
    <div className="bg-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Header */}
        <FadeInSection>
          <header className="mb-10">
            <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-2 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
              <span className="text-2xl">🇮🇪</span>
              <span className="font-semibold">Study in Ireland</span>
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Innovation hub with a vibrant, friendly culture
            </h1>
            <p className="mt-3 text-gray-700 max-w-3xl">
              Ireland combines top-ranked universities, a strong tech
              environment, and a welcoming atmosphere for international
              students. It&apos;s especially popular for business, computing,
              health, and creative programs.
            </p>
          </header>
        </FadeInSection>

        {/* Hero with campus-style image + quick bullets */}
        <FadeInSection delay={0.1}>
          <section className="grid md:grid-cols-[1.4fr,1fr] gap-6 md:gap-8 mb-10">
            {/* Image card */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white">
              {/* Background campus-style image (Ireland) */}
              <img
                src="https://hea.ie/assets/uploads/2022/08/NUIG-2022.jpg"
                alt="Irish university campus"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/70 via-emerald-800/40 to-transparent" />
              <div className="relative p-6 md:p-8 flex flex-col justify-end h-full">
                <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-medium">
                  <GraduationCap className="h-4 w-4" />
                  <span>High-quality education in an English-speaking country</span>
                </div>
                <h2 className="mt-4 text-2xl font-bold">
                  Why students choose Ireland
                </h2>
                <ul className="mt-3 space-y-2 text-sm md:text-[15px] text-emerald-50">
                  {highlightPoints.map((point, idx) => (
                    <li key={idx}>• {point}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Fast facts */}
            <div className="grid grid-rows-3 gap-4">
              <div className="rounded-2xl bg-white ring-1 ring-emerald-200 p-4">
                <p className="text-xs font-medium text-emerald-600 uppercase">
                  Language
                </p>
                <p className="mt-1 text-[15px] font-semibold text-slate-900">
                  English-taught programs
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Most bachelor&apos;s and master&apos;s degrees are fully taught
                  in English.
                </p>
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-emerald-200 p-4">
                <p className="text-xs font-medium text-emerald-600 uppercase">
                  Graduate outcomes
                </p>
                <p className="mt-1 text-[15px] font-semibold text-slate-900">
                  Strong employability
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Home to many tech, pharma, and finance companies that recruit
                  graduates.
                </p>
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-emerald-200 p-4">
                <p className="text-xs font-medium text-emerald-600 uppercase">
                  Lifestyle
                </p>
                <p className="mt-1 text-[15px] font-semibold text-slate-900">
                  Safe & welcoming
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Known for friendly locals, music, culture, and student
                  societies.
                </p>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Cities + system */}
        <FadeInSection delay={0.15}>
          <section className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Cities */}
            <div className="rounded-2xl bg-white ring-1 ring-emerald-200 p-5 md:p-6">
              <div className="flex items-center gap-2 text-emerald-800">
                <MapPin className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Popular student cities</h2>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {popularCities.map((city) => (
                  <li key={city.name}>
                    <span className="font-semibold">{city.name}</span> –{" "}
                    <span className="text-slate-600">{city.note}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                Each city has a different feel: some are big and energetic,
                others smaller and more relaxed. GreenPass can help you compare
                options based on your priorities.
              </p>
            </div>

            {/* System overview */}
            <div className="rounded-2xl bg-white ring-1 ring-emerald-200 p-5 md:p-6">
              <div className="flex items-center gap-2 text-emerald-800">
                <Globe2 className="h-5 w-5" />
                <h2 className="text-lg font-semibold">How the system works</h2>
              </div>
              <ul className="mt-3 text-sm text-slate-700 space-y-2 list-disc pl-5">
                <li>
                  Universities and Institutes of Technology offer bachelor&apos;s,
                  master&apos;s, and some foundation or pathway programs.
                </li>
                <li>
                  Programs usually run 3–4 years for bachelor&apos;s and 1–2 years
                  for master&apos;s.
                </li>
                <li>
                  Entry requirements depend on grades, English level, and the
                  type of program.
                </li>
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                Always follow the exact guidance of your chosen school, as each
                has its own admission rules.
              </p>
            </div>
          </section>
        </FadeInSection>

        {/* Costs & work */}
        <FadeInSection delay={0.2}>
          <section className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Costs */}
            <div className="rounded-2xl bg-white ring-1 ring-emerald-200 p-5 md:p-6 flex flex-col">
              <div className="flex items-center gap-2 text-emerald-800">
                <Euro className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Costs & budgeting</h2>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Tuition and rent can be higher in cities like Dublin, so it&apos;s
                important to have a clear budget before you apply.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5">
                {costNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>

            {/* Work & lifestyle */}
            <div className="rounded-2xl bg-white ring-1 ring-emerald-200 p-5 md:p-6 flex flex-col">
              <div className="flex items-center gap-2 text-emerald-800">
                <Clock className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Work & daily life</h2>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Many students work part-time in cafés, retail, or campus jobs
                while studying. You should always check the latest rules for
                work hours and visa conditions before you rely on part-time
                work.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Student societies, clubs, and sports make it easy to meet
                friends and settle into life in Ireland.
              </p>
            </div>
          </section>
        </FadeInSection>

        {/* CTA info */}
        <FadeInSection delay={0.25}>
          <section className="rounded-2xl bg-emerald-900 text-emerald-50 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Planning to study in Ireland?
              </h2>
              <p className="mt-1 text-sm text-emerald-100 max-w-xl">
                Use GreenPass to shortlist programs, track requirements, and
                stay organised with your Ireland study plan.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-medium bg-emerald-800 px-4 py-2 rounded-full">
              <ArrowRight className="h-4 w-4" />
              <span>Start exploring Ireland inside the app</span>
            </div>
          </section>
        </FadeInSection>
      </div>
    </div>
  );
}
