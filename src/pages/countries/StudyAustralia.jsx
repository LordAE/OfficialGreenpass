import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowRight,
  School,
  Globe2,
  DollarSign,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export default function StudyAustralia() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.3 }}
        variants={fadeInUp}
      >
        <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-2 bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200">
          <span className="text-2xl">🇦🇺</span>
          <span className="font-semibold">Study in Australia</span>
        </div>

        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900">
          Globally recognized degrees &amp; a sunny, student-friendly lifestyle
        </h1>

        <p className="mt-3 text-gray-600 max-w-3xl">
          Australia is a top choice for international students seeking quality
          education, post-study work options, and vibrant multicultural cities.
          Explore schools, tuition guidance, and general visa pathways in one place.
        </p>

        {/* Quick stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Graduate Outcomes
            </p>
            <p className="mt-1 text-sm text-gray-800">
              Degrees recognized worldwide with strong employment prospects in
              IT, health, business, and engineering.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Post-Study Work
            </p>
            <p className="mt-1 text-sm text-gray-800">
              Many graduates qualify for post-study work visas, giving a pathway
              to Australian work experience.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Lifestyle &amp; Safety
            </p>
            <p className="mt-1 text-sm text-gray-800">
              Warm climate, safe cities, and a welcoming community of students
              from all over the world.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Main Actions */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.3 }}
        variants={fadeIn}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Start your Australia study journey
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Browse Schools */}
          <motion.div variants={fadeInUp} className="h-full">
            <Link
              to={createPageUrl("Schools")}
              className="group flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-gray-200 hover:ring-green-300 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <School className="h-7 w-7 text-green-600" />
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  Programs &amp; intakes
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                Browse Schools &amp; Programs
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Compare universities, TAFEs, and colleges by location, intake,
                and field of study.
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm text-green-700 font-medium">
                Start exploring
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </motion.div>

          {/* Scholarships & funding */}
          <motion.div variants={fadeInUp} className="h-full">
            <div className="group flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-gray-200 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <DollarSign className="h-7 w-7 text-amber-600" />
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  Scholarships &amp; funding
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                Scholarships &amp; Funding Basics
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Learn about common scholarship types, typical requirements, and
                how students often combine savings, family support, and part-time
                work to fund their studies.
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                <span>General guidance only – details vary by school</span>
              </div>
            </div>
          </motion.div>

          {/* Campus life & support */}
          <motion.div variants={fadeInUp} className="h-full">
            <div className="group flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-gray-200 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <Globe2 className="h-7 w-7 text-blue-600" />
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Life on campus
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                Campus Life &amp; Support Services
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Most institutions offer orientation, academic support, counseling,
                career services, and clubs to help you adjust to Australian
                student life.
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                <span>Experiences differ by city and school</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Step-by-step process */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.3 }}
        variants={fadeIn}
        className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start"
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Simple path to studying in Australia
          </h2>
          <p className="mt-2 text-sm text-gray-600 max-w-xl">
            Here’s a straightforward overview of what most students do from
            research to arrival.
          </p>

          <ol className="mt-4 space-y-3">
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Explore programs &amp; short-list schools
                </p>
                <p className="text-xs text-gray-600">
                  Match your background and goals with the right level (VET,
                  bachelor, master) and city.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Prepare documents &amp; English test
                </p>
                <p className="text-xs text-gray-600">
                  Academic transcripts, passport, proof of funds, and language
                  scores (usually IELTS/TOEFL/PTE).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Receive offer &amp; Confirmation of Enrollment (CoE)
                </p>
                <p className="text-xs text-gray-600">
                  Once accepted, you pay initial fees and receive your CoE, a
                  key document for your visa.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                4
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Apply for your student visa
                </p>
                <p className="text-xs text-gray-600">
                  Submit your online visa application, biometrics, and health
                  check as required.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                5
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Plan accommodation &amp; arrival
                </p>
                <p className="text-xs text-gray-600">
                  Book housing, arrange airport pick-up if needed, and prepare
                  for your first weeks in Australia.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Quick highlight card */}
        <motion.div
          variants={fadeInUp}
          className="rounded-2xl bg-gradient-to-br from-blue-50 via-white to-green-50 p-5 ring-1 ring-blue-100"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
            <Clock className="h-3.5 w-3.5" />
            Typical timeline: 6–12 months
          </div>

          <h3 className="mt-4 text-sm font-semibold text-gray-900 flex items-center gap-2">
            How we can support you
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </h3>

          <ul className="mt-3 space-y-2 text-xs text-gray-700">
            <li className="flex gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
              <span>Short-listing programs based on your budget and goals.</span>
            </li>
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
              <span>City guidance: Sydney, Melbourne, Brisbane, Perth, and more.</span>
            </li>
            <li className="flex gap-2">
              <DollarSign className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
              <span>
                Basic budgeting for tuition, rent, food, and part-time work
                expectations.
              </span>
            </li>
            <li className="flex gap-2">
              <Globe2 className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
              <span>
                Guidance on visa steps and required documents (no legal advice,
                just general information).
              </span>
            </li>
          </ul>
        </motion.div>
      </motion.section>

      {/* Popular cities */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        variants={fadeIn}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Popular student cities in Australia
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <motion.div
            variants={fadeInUp}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-red-500" /> Sydney
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Financial &amp; tech hub, iconic landmarks, strong job market, but
              higher living costs.
            </p>
          </motion.div>
          <motion.div
            variants={fadeInUp}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-purple-500" /> Melbourne
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Known for culture, research universities, and a large international
              student community.
            </p>
          </motion.div>
          <motion.div
            variants={fadeInUp}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-emerald-500" /> Brisbane &amp; others
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Slightly lower cost of living with great weather and growing study
              options.
            </p>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
