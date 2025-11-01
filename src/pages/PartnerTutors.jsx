import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Users, Clock, DollarSign, Video, Star, CheckCircle,
  ArrowRight, BookOpen, TrendingUp, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PartnerTutors() {
  const [hoveredBenefit, setHoveredBenefit] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  // ---- Welcome link + state: preselect TUTOR ----
  const welcomeTutorHref = `${createPageUrl("Welcome")}?userType=tutor`;
  const welcomeTutorState = { preselectUserType: "tutor", forceRole: "tutor" };

  const benefits = [
    { icon: <Clock className="w-6 h-6" />, title: "Flexible Schedule",
      description: "Work from anywhere, set your own hours, and maintain work-life balance",
      detailedInfo: "Average tutors work 15-25 hours per week with complete control over their schedule" },
    { icon: <Globe className="w-6 h-6" />, title: "Global Student Base",
      description: "Connect with students from around the world seeking your expertise",
      detailedInfo: "Teach students from 50+ countries without geographical limitations" },
    { icon: <DollarSign className="w-6 h-6" />, title: "Competitive Earnings",
      description: "Keep 70-80% of session fees with transparent, reliable payment processing",
      detailedInfo: "Top tutors earn $3,000-$8,000 per month with our platform" },
    { icon: <Video className="w-6 h-6" />, title: "Professional Platform",
      description: "Integrated video conferencing, scheduling, and session management tools",
      detailedInfo: "HD video quality, screen sharing, virtual whiteboard, and recording features included" },
    { icon: <Star className="w-6 h-6" />, title: "Build Your Reputation",
      description: "Student reviews and ratings help you build credibility and attract more clients",
      detailedInfo: "Featured tutor program promotes top-rated tutors to new students" },
    { icon: <TrendingUp className="w-6 h-6" />, title: "Marketing Support",
      description: "We promote your profile to help you grow your tutoring business",
      detailedInfo: "Professional marketing, SEO optimization, and social media promotion included" },
  ];

  const subjects = [
    { name: "IELTS Preparation", icon: "🎯", students: "5,000+", avgRate: "$35/hr" },
    { name: "TOEFL Training", icon: "📚", students: "3,500+", avgRate: "$38/hr" },
    { name: "SAT/ACT Prep", icon: "📝", students: "2,800+", avgRate: "$42/hr" },
    { name: "GRE/GMAT", icon: "🎓", students: "2,200+", avgRate: "$45/hr" },
    { name: "General English", icon: "🗣️", students: "8,000+", avgRate: "$30/hr" },
    { name: "Academic Writing", icon: "✍️", students: "4,000+", avgRate: "$35/hr" },
    { name: "French/Spanish", icon: "🌍", students: "3,000+", avgRate: "$32/hr" },
    { name: "Study Skills", icon: "💡", students: "2,500+", avgRate: "$28/hr" },
  ];

  const howItWorks = [
    { step: "1", title: "Create Your Profile",
      description: "Sign up, showcase your qualifications, experience, and teaching specializations",
      details: "Upload certifications, create video introduction, and set your teaching preferences.",
      icon: <Users className="w-6 h-6" /> },
    { step: "2", title: "Get Verified",
      description: "Submit your credentials for verification to build trust with students",
      details: "We verify your education, certifications, and professional experience within 24-48 hours.",
      icon: <CheckCircle className="w-6 h-6" /> },
    { step: "3", title: "Set Your Schedule",
      description: "Define your availability, hourly rates, and preferred teaching methods",
      details: "Flexible scheduling system with automatic timezone conversion and calendar sync.",
      icon: <Clock className="w-6 h-6" /> },
    { step: "4", title: "Connect with Students",
      description: "Receive booking requests from students matched to your expertise",
      details: "AI-powered matching system connects you with students who need your specific skills.",
      icon: <Video className="w-6 h-6" /> },
    { step: "5", title: "Teach & Earn",
      description: "Conduct sessions through our platform and receive payments securely",
      details: "Automatic payments after each session with weekly payouts to your account.",
      icon: <DollarSign className="w-6 h-6" /> },
  ];

  const requirements = [
    "Minimum 2 years of teaching/tutoring experience",
    "Bachelor's degree or equivalent (Master's preferred)",
    "Relevant certifications (TESOL, CELTA, or subject-specific)",
    "Strong communication skills in English or French",
    "Reliable internet connection and professional setup",
    "Passion for teaching and student success",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="bg-white/20 text-white border-white/30 mb-6 text-base px-4 py-2">
                For Tutors & Educators
              </Badge>

              <h1 className="text-4xl md:text-6xl font-extrabold mb-6">Teach Students Worldwide</h1>
              <p className="text-xl md:text-2xl text-green-100 mb-8 leading-relaxed">
                Join GreenPass Tutor Network to share your expertise, help students achieve their dreams, and build a thriving online tutoring business.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {/* Register → Welcome (preselect tutor) */}
                <Link to={welcomeTutorHref} state={welcomeTutorState} aria-label="Register as a Tutor">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-green-600 hover:bg-green-50 px-8 py-6 text-lg font-semibold shadow-xl"
                    >
                      Register as a Tutor
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>

                {/* Keep text visible on gradient */}
                <Link to={createPageUrl("Contact")} aria-label="Learn More">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="w-full sm:w-auto bg-transparent border-2 border-white text-white
                                 hover:bg-white hover:text-green-600 px-8 py-6 text-lg font-semibold"
                    >
                      Learn More
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Teach on GreenPass?
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We provide the platform, students, and support - you provide the expertise and passion for teaching.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -5 }}
              onHoverStart={() => setHoveredBenefit(index)} onHoverEnd={() => setHoveredBenefit(null)}>
              <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-300 cursor-pointer">
                <CardContent className="p-6">
                  <motion.div className="bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mb-4 text-green-600"
                    animate={{ rotate: hoveredBenefit === index ? 360 : 0 }} transition={{ duration: 0.6 }}>
                    {benefit.icon}
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 mb-3">{benefit.description}</p>
                  <AnimatePresence>
                    {hoveredBenefit === index && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} className="text-sm text-green-600 font-medium border-t pt-3 mt-3">
                        💡 {benefit.detailedInfo}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Popular Teaching Subjects
            </motion.h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our students are looking for expert tutors in these high-demand areas.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {subjects.map((subject, index) => (
              <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.05 }}
                onClick={() => setSelectedSubject(selectedSubject === index ? null : index)}
                whileHover={{ scale: 1.05, y: -5 }}>
                <Card className={`text-center hover:shadow-xl transition-all duration-300 cursor-pointer border-2 ${
                  selectedSubject === index ? 'border-green-400 shadow-xl' : 'border-transparent'
                }`}>
                  <CardContent className="p-6">
                    <motion.div className="text-4xl mb-3" animate={{ rotate: selectedSubject === index ? 360 : 0 }}
                      transition={{ duration: 0.6 }}>
                      {subject.icon}
                    </motion.div>
                    <h3 className="font-semibold text-gray-900 mb-2">{subject.name}</h3>
                    <AnimatePresence>
                      {selectedSubject === index && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} className="text-sm space-y-1">
                          <p className="text-green-600 font-medium">{subject.students} students</p>
                          <p className="text-gray-600">{subject.avgRate}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-center mt-8 text-gray-500 text-sm">👆 Click on a subject to see details</p>
        </div>
      </div>

      {/* How it works */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Start teaching online in just a few simple steps.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {howItWorks.map((item, index) => (
            <motion.div key={index} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => setExpandedStep(expandedStep === index ? null : index)}
              className="flex gap-6 mb-8 last:mb-0 cursor-pointer group">
              <div className="flex-shrink-0">
                <motion.div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500
                                       flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }} transition={{ duration: 0.3 }}>
                  {item.step}
                </motion.div>
              </div>
              <div className="flex-1 pb-8 border-l-2 border-gray-200 pl-6 last:border-l-0 group-hover:border-green-400 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <motion.div className="text-green-600" animate={{ rotate: expandedStep === index ? 360 : 0 }}
                    transition={{ duration: 0.6 }}>
                    {item.icon}
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-gray-600 text-lg mb-2">{item.description}</p>
                <AnimatePresence>
                  {expandedStep === index && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="text-sm text-green-600 font-medium bg-green-50 p-4 rounded-lg mt-3">
                      ℹ️ {item.details}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-center mt-8 text-gray-500 text-sm">👆 Click on a step to see more details</p>
      </div>

      {/* Requirements */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ scale: 1.02 }}>
              <Card className="border-2 border-green-200 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    Tutor Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <p className="text-gray-600 mb-6 text-lg">
                    To ensure quality education for our students, we require tutors to meet the following criteria:
                  </p>
                  <ul className="space-y-4">
                    {requirements.map((req, index) => (
                      <motion.li key={index} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ x: 5 }}
                        className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-lg">{req}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Start Teaching?</h2>
            <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
              Join thousands of tutors helping students around the world achieve their academic goals.
            </p>

            <Link to={welcomeTutorHref} state={welcomeTutorState} aria-label="Become a Tutor Today">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-white text-green-600 hover:bg-green-50 px-10 py-6 text-xl font-semibold shadow-2xl">
                  Become a Tutor Today
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {[
            { value: "800+", label: "Active Tutors" },
            { value: "10K+", label: "Sessions Completed" },
            { value: "4.9/5", label: "Average Rating" },
            { value: "$35+", label: "Avg. Hourly Rate" },
          ].map((stat, index) => (
            <motion.div key={index} initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.1, y: -5 }} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-green-600 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
