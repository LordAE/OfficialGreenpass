import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  School,
  MapPin,
  Globe2,
  Compass,
  Waves,
  Mountain,
} from "lucide-react";

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

export default function StudyNewZealand() {
  return (
    <div className="bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 md:space-y-12">
        {/* Header */}
        <motion.header
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          variants={fadeIn}
          className="mb-2"
        >
          <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-2 bg-green-50 text-green-700 ring-1 ring-green-200">
            <span className="text-2xl">🇳🇿</span>
            <span className="font-semibold">Study in New Zealand</span>
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            World-class education with a natural paradise lifestyle
          </h1>
          <p className="mt-3 text-gray-600 max-w-3xl text-sm md:text-base">
            New Zealand offers globally recognised degrees, supportive
            communities, and incredible outdoor scenery. It&apos;s popular for
            business, IT, hospitality, nursing, and many more fields—with a
            relaxed, safe lifestyle for international students.
          </p>
        </motion.header>

        {/* Hero: text + image with overlay */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={fadeIn}
          className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-stretch"
        >
          {/* Left: key info */}
          <motion.div variants={fadeInUp} className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                Why students choose New Zealand
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>
                  • English-speaking, with teaching styles that encourage
                  critical thinking and practical skills.
                </li>
                <li>
                  • Modern campuses, small class sizes, and accessible academic
                  staff.
                </li>
                <li>
                  • Opportunity to experience beaches, mountains, and outdoor
                  adventures between classes.
                </li>
                <li>
                  • Clear student visa pathways and straightforward processes
                  for most applicants.
                </li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                Details like tuition, work hours, and visa rules can change, so
                always check official government and school websites for the
                latest information.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Popular fields
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Business, IT, hospitality, nursing
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Plus trades, creative arts, and environmental studies.
                </p>
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Study levels
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Diplomas to master&apos;s
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Pathway, undergraduate, postgraduate, and specialised
                  programs.
                </p>
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Environment
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Safe & student-friendly
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Known for friendly locals and a laid-back lifestyle.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: image card */}
          <motion.div
            variants={fadeInUp}
            className="relative overflow-hidden rounded-2xl bg-slate-900 text-white min-h-[220px] md:min-h-[260px]"
          >
            {/* Background image (external) */}
            <img
              src="https://images.pexels.com/photos/4606805/pexels-photo-4606805.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="New Zealand landscape with students enjoying the outdoors"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Dark gradient overlay for text contrast */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-900/20" />

            {/* Content */}
            <div className="relative h-full p-5 md:p-6 flex flex-col justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <Waves className="h-4 w-4" />
                <span>Beaches, mountains, and modern campuses</span>
              </div>

              <div className="max-w-xs rounded-2xl bg-black/40 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-emerald-100">
                  Study & lifestyle in NZ
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Combine high-quality education with hiking, surfing, and city
                  life—often just a short trip apart.
                </p>
                <p className="mt-2 text-[11px] text-emerald-50/90">
                  Many students choose New Zealand for the balance of academic
                  growth, safety, and natural beauty.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Main cards: navigation & info */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={fadeIn}
          className="grid md:grid-cols-3 gap-6"
        >
          {/* Schools & programs */}
          <motion.div variants={fadeInUp}>
            <Link
              to={createPageUrl("Schools")}
              className="group block p-6 rounded-2xl bg-white ring-1 ring-gray-200 hover:ring-green-300 transition-shadow hover:shadow-md"
            >
              <School className="h-6 w-6 text-green-600" />
              <h3 className="mt-3 font-semibold text-gray-900">
                Browse Schools &amp; Programs
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Explore universities, institutes of technology, and private
                colleges across NZ.
              </p>
              <ul className="mt-3 text-xs text-gray-600 list-disc pl-4 space-y-1">
                <li>Filter by field, level, or intake.</li>
                <li>See basic tuition ranges and locations.</li>
              </ul>
              <div className="mt-4 inline-flex items-center gap-1 text-green-700 font-medium">
                Start exploring
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </motion.div>

          {/* Popular cities & lifestyle */}
          <motion.div variants={fadeInUp}>
            <div className="p-6 rounded-2xl bg-white ring-1 ring-gray-200 h-full">
              <div className="flex items-center gap-2">
                <MapPin className="h-6 w-6 text-blue-600" />
                <h3 className="mt-0.5 font-semibold text-gray-900">
                  Popular cities &amp; lifestyle
                </h3>
              </div>
              <ul className="mt-3 text-sm text-gray-700 list-disc pl-4 space-y-1">
                <li>
                  <span className="font-semibold">Auckland</span> – largest
                  city, diverse communities, strong job market.
                </li>
                <li>
                  <span className="font-semibold">Wellington</span> – capital
                  city, arts &amp; culture, film, and government.
                </li>
                <li>
                  <span className="font-semibold">Christchurch</span> – gateway
                  to the South Island, engineering &amp; innovation hub.
                </li>
              </ul>
              <p className="mt-3 text-xs text-gray-600">
                Each city has a different vibe—GreenPass can help you match your
                preferences (big city, quieter town, or nature-focused).
              </p>
            </div>
          </motion.div>

          {/* Visa & support -> Welcome page */}
          <motion.div variants={fadeInUp}>
            <Link
              to={createPageUrl("Welcome")}
              className="group block p-6 rounded-2xl bg-white ring-1 ring-gray-200 hover:ring-green-300 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <Globe2 className="h-6 w-6 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">
                  Visa &amp; Study Support
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                See how GreenPass can guide you through the New Zealand student
                visa journey inside the app.
              </p>
              <ul className="mt-3 text-xs text-gray-600 list-disc pl-4 space-y-1">
                <li>High-level overview of common document requirements.</li>
                <li>Understand intakes, planning timelines, and next steps.</li>
              </ul>
              <div className="mt-4 inline-flex items-center gap-1 text-green-700 font-medium">
                Go to Welcome page
                <Compass className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Sign in or create a free account to unlock detailed visa
                packages and personalised guidance.
              </p>
            </Link>
          </motion.div>
        </motion.section>

        {/* Simple path section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.25 }}
          variants={fadeIn}
          className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start"
        >
          <motion.div variants={fadeInUp}>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
              <Mountain className="h-5 w-5 text-emerald-700" />
              Typical path to study in New Zealand
            </h2>
            <ol className="mt-3 space-y-3 text-sm text-gray-700 list-decimal pl-5">
              <li>
                Choose your study level (certificate, diploma, bachelor&apos;s,
                master&apos;s) and field of interest.
              </li>
              <li>
                Shortlist schools and cities based on budget, climate, and
                lifestyle preferences.
              </li>
              <li>
                Check academic and English language requirements for each
                program.
              </li>
              <li>
                Prepare documents: transcripts, English test scores, CV, and
                personal statement (if required).
              </li>
              <li>
                Apply to your chosen institutions and wait for an offer letter.
              </li>
              <li>
                Use your offer to begin your student visa application and plan
                for accommodation and insurance.
              </li>
            </ol>
            <p className="mt-3 text-xs text-gray-500">
              Your actual steps may vary depending on your home country, age,
              and study background, but this gives you a general idea of the
              flow.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="rounded-2xl bg-gradient-to-br from-green-50 via-white to-sky-50 p-5 ring-1 ring-green-100"
          >
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5" />
              Plan ahead
            </p>
            <p className="mt-2 text-sm text-gray-800">
              It&apos;s common to start planning{" "}
              <span className="font-semibold">8–12 months</span> before your
              intended intake. This gives you enough time to prepare documents,
              apply to schools, and complete your visa application.
            </p>
            <p className="mt-3 text-xs text-gray-600">
              Inside GreenPass, you can keep track of tasks, deadlines, and
              requirements so nothing is missed as you move from &quot;just
              exploring&quot; to &quot;ready to fly.&quot;
            </p>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}
