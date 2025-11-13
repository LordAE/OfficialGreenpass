import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowRight,
  School,
  MapPin,
  Globe2,
  DollarSign,
  Clock,
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

export default function StudyCanada() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero */}
      <motion.header
        className="mb-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.3 }}
        variants={fadeInUp}
      >
        <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-2 bg-red-50 text-red-700 ring-1 ring-red-200">
          <span className="text-2xl">🇨🇦</span>
          <span className="font-semibold">Study in Canada</span>
        </div>

        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
          High-quality education, welcoming communities, post-grad pathways
        </h1>

        <p className="mt-3 text-gray-600 max-w-3xl">
          Canada offers public colleges and universities known for strong
          academics, work options during and after studies, and safe, diverse
          cities. Use this page to explore schools, basic costs, and visa
          support options.
        </p>

        {/* Quick stats / highlights */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Quality &amp; reputation
            </p>
            <p className="mt-1 text-sm text-gray-800">
              Public colleges and universities follow strict standards and are
              recognized globally, especially in tech, business, and healthcare.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Work while you study
            </p>
            <p className="mt-1 text-sm text-gray-800">
              Many full-time students can work part-time during studies and
              often full-time during scheduled breaks.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Pathways after graduation
            </p>
            <p className="mt-1 text-sm text-gray-800">
              Graduates from eligible programs may qualify for a post-graduation
              work permit, which can support longer-term plans.
            </p>
          </div>
        </div>
      </motion.header>

      {/* Main actions / info cards */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.3 }}
        variants={fadeIn}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Start your Canada study journey
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Browse Schools & Programs */}
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
              <h3 className="mt-4 font-semibold text-gray-900">
                Browse Schools &amp; Programs
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Explore public/private colleges and universities by province,
                intake, and field of study.
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-green-700 font-medium text-sm">
                Start exploring
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </motion.div>

          {/* Funding & basic cost info (static info card) */}
          <motion.div variants={fadeInUp} className="h-full">
            <div className="group flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-gray-200 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <DollarSign className="h-7 w-7 text-amber-600" />
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  Tuition &amp; funding
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">
                Tuition &amp; Funding Overview
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Tuition varies by school, program, and province. Most students
                use a mix of family support, savings, education loans, and
                part-time work to cover costs.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                *Exact fees depend on the school and program you choose. Always
                check the official school website for current amounts.
              </p>
            </div>
          </motion.div>

          {/* Visa & services – now goes to Welcome page */}
          <motion.div variants={fadeInUp} className="h-full">
            <Link
              to={createPageUrl("Welcome")} // changed from "VisaPackages"
              className="group flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-gray-200 hover:ring-green-300 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <Globe2 className="h-7 w-7 text-blue-600" />
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Visa &amp; services
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">
                Visa &amp; Service Packages
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Create an account or sign in to see our structured support for
                study permits and add-on services tailored to your profile.
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-green-700 font-medium text-sm">
                Go to welcome page
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
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
            Typical path to studying in Canada
          </h2>
          <p className="mt-2 text-sm text-gray-600 max-w-xl">
            Steps can change depending on your country and profile, but most
            students follow a similar flow from research to arrival.
          </p>

          <ol className="mt-4 space-y-3">
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Choose a province, city, and program
                </p>
                <p className="text-xs text-gray-600">
                  Decide between provinces like Ontario, British Columbia, and
                  others, then narrow down schools and programs that match your
                  background and budget.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Prepare school application documents
                </p>
                <p className="text-xs text-gray-600">
                  Collect transcripts, passport, language test scores (if
                  required), résumé, and any program-specific requirements.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Receive Letter of Acceptance (LOA)
                </p>
                <p className="text-xs text-gray-600">
                  Once accepted, you&apos;ll receive your official LOA from a
                  Designated Learning Institution (DLI). This is required for
                  your study permit application.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                4
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Apply for your study permit
                </p>
                <p className="text-xs text-gray-600">
                  Prepare proof of funds, supporting documents, biometrics, and
                  medical exams if required. Submit through the official online
                  portal.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                5
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Arrange housing &amp; arrival
                </p>
                <p className="text-xs text-gray-600">
                  Book on- or off-campus housing, plan your airport arrival, and
                  review what to bring for your first months in Canada.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Support highlight */}
        <motion.div
          variants={fadeInUp}
          className="rounded-2xl bg-gradient-to-br from-red-50 via-white to-green-50 p-5 ring-1 ring-red-100"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-100">
            <Clock className="h-3.5 w-3.5" />
            Typical planning timeline: 8–12+ months
          </div>

          <h3 className="mt-4 text-sm font-semibold text-gray-900 flex items-center gap-2">
            How we can support your Canada plan
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </h3>

          <ul className="mt-3 space-y-2 text-xs text-gray-700">
            <li className="flex gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
              <span>
                Helping you shortlist programs and schools aligned with your
                goals and budget.
              </span>
            </li>
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
              <span>
                Basic guidance on choosing provinces and cities based on climate,
                lifestyle, and job market.
              </span>
            </li>
            <li className="flex gap-2">
              <DollarSign className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
              <span>
                High-level budgeting for tuition, rent, and everyday expenses
                (exact figures vary per school).
              </span>
            </li>
            <li className="flex gap-2">
              <Globe2 className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
              <span>
                General information on study permit steps and document
                preparation (not legal advice).
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
          Popular student cities in Canada
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <motion.div
            variants={fadeInUp}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-red-500" /> Toronto, Ontario
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Canada&apos;s largest city with many colleges and universities, a
              strong job market, and higher living costs.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-sky-500" /> Vancouver, BC
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Mild climate, coastal views, and a tech-focused job market, with
              some of the highest housing costs in Canada.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-emerald-500" /> Montreal &amp; others
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Montreal, Calgary, Ottawa, Winnipeg, Halifax, and smaller student
              cities offer varied costs, cultures, and program choices.
            </p>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
