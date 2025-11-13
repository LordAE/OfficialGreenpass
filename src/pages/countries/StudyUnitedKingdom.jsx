import React, { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import {
  GraduationCap,
  MapPin,
  Globe2,
  Clock,
  Landmark,
  BookOpen,
  PoundSterling,
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

export default function StudyUnitedKingdom() {
  const keyPoints = [
    "Home to historic universities like Oxford, Cambridge, and many modern institutions.",
    "Globally recognised degrees in business, health, IT, engineering, arts, and more.",
    "Flexible study options: foundation, bachelor’s, master’s, PhD, and professional diplomas.",
    "Strong focus on research, critical thinking, and employability skills.",
  ];

  const studyPath = [
    "Choose your course, university, and city based on goals and budget.",
    "Check academic and English language requirements (e.g., IELTS, PTE, or other accepted tests).",
    "Prepare documents: transcripts, reference letters, CV, personal statement, and test scores.",
    "Apply to your chosen universities and wait for offers (unconditional or conditional).",
    "Use your offer letter to start your UK student visa application, including financial proof.",
    "Arrange accommodation, insurance, and arrival plans before your course start date.",
  ];

  return (
    <div className="bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10 md:space-y-12">
        {/* Header */}
        <FadeInSection>
          <header className="mb-2">
            <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-2 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
              <span className="text-2xl">🇬🇧</span>
              <span className="font-semibold">Study in United Kingdom</span>
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Historic universities &amp; global careers
            </h1>
            <p className="mt-3 text-gray-600 max-w-3xl text-sm md:text-base">
              The UK combines centuries-old institutions with modern campuses,
              offering degrees that are recognised worldwide. Many programs are
              designed to build strong academic skills and prepare you for
              competitive international careers.
            </p>
          </header>
        </FadeInSection>

        {/* Hero: info + image */}
        <FadeInSection delay={0.1}>
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-stretch">
            {/* Left: key points */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 md:p-6">
                <div className="flex items-center gap-2 text-indigo-800">
                  <GraduationCap className="h-5 w-5" />
                  <h2 className="text-lg md:text-xl font-semibold">
                    Why students choose the UK
                  </h2>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  {keyPoints.map((point, idx) => (
                    <li key={idx}>• {point}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-gray-500">
                  Entry requirements, tuition, and visa rules can change over
                  time, so always follow the latest details on official
                  university and government websites.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Study levels
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    Foundation to PhD
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Pathway/foundation, bachelor’s (usually 3 years),
                    master’s (1 year), and research options.
                  </p>
                </div>
                <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Language
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    English-taught
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Most programs require proof of English using IELTS, PTE, or
                    similar tests.
                  </p>
                </div>
                <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Duration
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    Short, focused degrees
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Many UK degrees are shorter than in other countries, which
                    can save time overall.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: image card (non-alcohol, city/architecture) */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white min-h-[220px] md:min-h-[260px]">
              {/* External image – city/landmark, no alcohol */}
              <img
                src="https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Cityscape and historic architecture in the United Kingdom"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-900/20" />

              <div className="relative h-full p-5 md:p-6 flex flex-col justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <Landmark className="h-4 w-4" />
                  <span>Historic campuses &amp; modern student life</span>
                </div>

                <div className="max-w-xs rounded-2xl bg-black/45 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-wide text-indigo-100">
                    Study &amp; lifestyle
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    Learn in cities filled with history, museums, libraries, and
                    vibrant student communities on and off campus.
                  </p>
                  <p className="mt-2 text-[11px] text-indigo-50/90">
                    Whether you prefer a busy city or a quieter university
                    town, the UK offers different environments that still share
                    strong academic standards.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Info cards: academics, cities, costs */}
        <FadeInSection delay={0.15}>
          <section className="grid md:grid-cols-3 gap-6">
            {/* Academics */}
            <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 h-full">
              <div className="flex items-center gap-2 text-indigo-800">
                <BookOpen className="h-5 w-5" />
                <h2 className="text-sm font-semibold">Academic structure</h2>
              </div>
              <p className="mt-2 text-sm text-gray-700">
                Many bachelor’s degrees last 3 years, with an optional
                placement year. Master’s degrees are often 1 year, making the UK
                a time-efficient option for postgraduate study.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Teaching combines lectures, seminars, tutorials, and
                independent research or projects.
              </p>
            </div>

            {/* Cities */}
            <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 h-full">
              <div className="flex items-center gap-2 text-indigo-800">
                <MapPin className="h-5 w-5" />
                <h2 className="text-sm font-semibold">
                  Popular student cities
                </h2>
              </div>
              <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc pl-4">
                <li>
                  <span className="font-semibold">London</span> – major global
                  city with many universities, highest living costs.
                </li>
                <li>
                  <span className="font-semibold">Manchester</span> – large
                  student population, strong music and sports culture.
                </li>
                <li>
                  <span className="font-semibold">
                    Birmingham, Leeds, Glasgow
                  </span>{" "}
                  – big-city feel with strong universities and generally lower
                  costs than London.
                </li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">
                Smaller towns also offer a close-knit campus experience and can
                be more budget-friendly.
              </p>
            </div>

            {/* Costs */}
            <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 h-full">
              <div className="flex items-center gap-2 text-indigo-800">
                <PoundSterling className="h-5 w-5" />
                <h2 className="text-sm font-semibold">Tuition &amp; costs</h2>
              </div>
              <p className="mt-2 text-sm text-gray-700">
                Tuition fees vary by course, university, and location. Living
                costs are generally higher in London and lower in other cities
                and towns.
              </p>
              <ul className="mt-2 text-sm text-gray-700 list-disc pl-4 space-y-1">
                <li>Budget for rent, food, transport, and study materials.</li>
                <li>
                  Many students work part-time, but you must follow visa work
                  rules.
                </li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">
                Always check the latest visa guidance for financial
                requirements, including proof of funds.
              </p>
            </div>
          </section>
        </FadeInSection>

        {/* Study path & planning */}
        <FadeInSection delay={0.2}>
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Globe2 className="h-5 w-5 text-indigo-700" />
                Typical path to study in the UK
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-gray-700 list-decimal pl-5">
                {studyPath.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-gray-500">
                The exact steps depend on your home country, academic
                background, and the specific course you choose, but this gives a
                clear overview of the journey.
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-5 ring-1 ring-indigo-100">
              <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Plan early
              </p>
              <p className="mt-2 text-sm text-gray-800">
                Many students start planning{" "}
                <span className="font-semibold">9–12 months</span> before their
                course begins. This helps with test dates, applications,
                scholarship opportunities, and visa processing.
              </p>
              <p className="mt-3 text-xs text-gray-600">
                Using a tool like GreenPass, you can track your UK study plan,
                compare options, and break the process into smaller, manageable
                steps.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-indigo-800 bg-white px-3 py-2 rounded-full ring-1 ring-indigo-100">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Turn your UK study idea into a step-by-step plan</span>
              </div>
            </div>
          </section>
        </FadeInSection>
      </div>
    </div>
  );
}
