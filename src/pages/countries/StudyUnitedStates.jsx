import React, { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import {
  GraduationCap,
  MapPin,
  Globe2,
  DollarSign,
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

export default function StudyUnitedStates() {
  const keyPoints = [
    "Home to many of the world’s top-ranked universities and community colleges.",
    "Huge variety of programs in STEM, business, health, arts, and more.",
    "Flexible system with options to transfer between schools or change majors.",
    "Strong emphasis on research, innovation, and campus involvement.",
  ];

  const studyPath = [
    "Decide on your major or general area of interest (e.g., STEM, business, health).",
    "Shortlist universities or colleges based on location, budget, and admission difficulty.",
    "Check admission requirements: GPA, English tests (TOEFL/IELTS/Duolingo), SAT/ACT (if needed).",
    "Prepare documents: transcripts, test scores, essays, recommendation letters, and CV/resume.",
    "Apply to multiple schools and compare admission offers and scholarship options.",
    "Use your I-20 from a chosen school to apply for the F-1 student visa and plan your arrival.",
  ];

  return (
    <div className="bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10 md:space-y-12">
        {/* Header */}
        <FadeInSection>
          <header className="mb-2">
            <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-2 bg-red-50 text-red-700 ring-1 ring-red-200">
              <span className="text-2xl">🇺🇸</span>
              <span className="font-semibold">Study in United States</span>
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Leading research, diverse campuses
            </h1>
            <p className="mt-3 text-gray-600 max-w-3xl text-sm md:text-base">
              The United States offers a very wide range of universities and
              colleges, from community colleges to Ivy League institutions.
              Students often choose the US for its research facilities,
              flexible programs, and multicultural campus experience.
            </p>
          </header>
        </FadeInSection>

        {/* Hero: info + image */}
        <FadeInSection delay={0.1}>
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-stretch">
            {/* Left: key points */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 md:p-6">
                <div className="flex items-center gap-2 text-red-700">
                  <GraduationCap className="h-5 w-5" />
                  <h2 className="text-lg md:text-xl font-semibold">
                    Why students choose the US
                  </h2>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  {keyPoints.map((point, idx) => (
                    <li key={idx}>• {point}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-gray-500">
                  Each university has its own requirements and deadlines, so
                  always follow the exact instructions on the official school
                  website.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Study levels
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    Associate to PhD
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Community college (2 years), bachelor&apos;s, master&apos;s,
                    and doctoral programs with many specialisations.
                  </p>
                </div>
                <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Flexibility
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    Change majors
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Many students explore different courses in the first 1–2
                    years before committing to a specific major.
                  </p>
                </div>
                <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Campus life
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    Clubs &amp; activities
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Join student clubs, sports, and events to build networks and
                    experience US culture on campus.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: image card – neutral campus / building, no alcohol */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white min-h-[220px] md:min-h-[260px]">
              {/* External campus-style image */}
              <img
                src="https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Students walking near a university building in the United States"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-900/20" />

              <div className="relative h-full p-5 md:p-6 flex flex-col justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <Building2 className="h-4 w-4" />
                  <span>Diverse campuses across all 50 states</span>
                </div>

                <div className="max-w-xs rounded-2xl bg-black/45 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-wide text-red-100">
                    Study &amp; lifestyle
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    From big-city campuses to quiet college towns, you can find
                    environments that match your personality and goals.
                  </p>
                  <p className="mt-2 text-[11px] text-red-50/90">
                    Campus housing, libraries, labs, and recreation centers help
                    you balance academics, social life, and personal growth.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Info cards: institution types, locations, costs */}
        <FadeInSection delay={0.15}>
          <section className="grid md:grid-cols-3 gap-6">
            {/* Institution types */}
            <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 h-full">
              <div className="flex items-center gap-2 text-red-700">
                <GraduationCap className="h-5 w-5" />
                <h2 className="text-sm font-semibold">Types of institutions</h2>
              </div>
              <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc pl-4">
                <li>
                  Community colleges – 2-year programs, often more affordable,
                  with transfer pathways.
                </li>
                <li>
                  Public universities – large campuses with a wide range of
                  programs.
                </li>
                <li>
                  Private universities – may offer smaller class sizes and
                  specialised programs.
                </li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">
                Many students start at a community college and later transfer to
                a university to complete their bachelor&apos;s degree.
              </p>
            </div>

            {/* Popular regions/cities */}
            <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 h-full">
              <div className="flex items-center gap-2 text-red-700">
                <MapPin className="h-5 w-5" />
                <h2 className="text-sm font-semibold">Popular study regions</h2>
              </div>
              <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc pl-4">
                <li>
                  <span className="font-semibold">California</span> – strong in
                  tech, film, and business; major cities like Los Angeles and
                  San Francisco.
                </li>
                <li>
                  <span className="font-semibold">New York &amp; East Coast</span> – 
                  finance, media, and historic universities.
                </li>
                <li>
                  <span className="font-semibold">Midwest &amp; South</span> – 
                  many public universities, often with lower living costs.
                </li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">
                Climate, cost of living, and local job markets vary a lot by
                region, so it&apos;s important to consider location carefully.
              </p>
            </div>

            {/* Costs */}
            <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 h-full">
              <div className="flex items-center gap-2 text-red-700">
                <DollarSign className="h-5 w-5" />
                <h2 className="text-sm font-semibold">Tuition &amp; costs</h2>
              </div>
              <p className="mt-2 text-sm text-gray-700">
                Tuition can vary widely depending on whether the institution is
                public or private and where it is located.
              </p>
              <ul className="mt-2 text-sm text-gray-700 list-disc pl-4 space-y-1">
                <li>
                  Plan a budget for housing, food, health insurance, transport,
                  and books.
                </li>
                <li>
                  Some schools offer scholarships or on-campus jobs for
                  eligible students.
                </li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">
                Visa rules usually limit how many hours you can work while
                studying, so don&apos;t rely only on part-time work to cover your
                costs.
              </p>
            </div>
          </section>
        </FadeInSection>

        {/* Study path & planning */}
        <FadeInSection delay={0.2}>
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Globe2 className="h-5 w-5 text-red-700" />
                Typical path to study in the US
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-gray-700 list-decimal pl-5">
                {studyPath.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-gray-500">
                Your exact journey will depend on your country of residence,
                target schools, and whether you apply as a freshman, transfer
                student, or graduate student.
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-red-50 via-white to-slate-50 p-5 ring-1 ring-red-100">
              <p className="text-xs font-medium text-red-700 uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Plan ahead
              </p>
              <p className="mt-2 text-sm text-gray-800">
                Many students start preparing{" "}
                <span className="font-semibold">12–18 months</span> before
                their intended start date. This allows time for test dates,
                applications, financial planning, and visa appointments.
              </p>
              <p className="mt-3 text-xs text-gray-600">
                With GreenPass, you can break your US study plan into clear,
                trackable steps so you don&apos;t feel overwhelmed by the process.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-red-800 bg-white px-3 py-2 rounded-full ring-1 ring-red-100">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Turn your US study goal into an organised checklist</span>
              </div>
            </div>
          </section>
        </FadeInSection>
      </div>
    </div>
  );
}
