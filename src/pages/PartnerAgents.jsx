// src/pages/PartnerAgents.jsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Handshake, Users, TrendingUp, Award, Globe, CheckCircle, ArrowRight,
  DollarSign, Briefcase, Target, BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PartnerAgents() {
  const [hoveredBenefit, setHoveredBenefit] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  // ---- Welcome link + state: preselect AGENT ----
  const welcomeAgentHref = `${createPageUrl("Welcome")}?userType=agent`;
  const welcomeAgentState = { preselectUserType: "agent", forceRole: "agent" };

  const benefits = [
    { icon: <Globe className="w-6 h-6" />, title: "Global Network Access",
      description: "Access to 1,200+ partner institutions across Canada, USA, UK, Australia, and more",
      detailedInfo: "Connect with top universities and colleges worldwide with exclusive partnership agreements" },
    { icon: <DollarSign className="w-6 h-6" />, title: "Competitive Commissions",
      description: "Earn 10-15% commission on successful applications with fast, reliable payouts",
      detailedInfo: "Average agents earn $50K-$150K annually with our transparent commission structure" },
    { icon: <Briefcase className="w-6 h-6" />, title: "Professional CRM Tools",
      description: "Dedicated agent dashboard with application tracking, student management, and analytics",
      detailedInfo: "State-of-the-art technology platform with mobile app access and real-time updates" },
    { icon: <Target className="w-6 h-6" />, title: "Quality Leads",
      description: "Receive pre-qualified student leads matched to your expertise and target markets",
      detailedInfo: "AI-powered lead matching ensures you receive students most likely to convert" },
    { icon: <Award className="w-6 h-6" />, title: "Training & Certification",
      description: "Access to comprehensive training programs and professional certification",
      detailedInfo: "Free ongoing training, webinars, and certification programs worth $5,000+" },
    { icon: <BarChart3 className="w-6 h-6" />, title: "Marketing Support",
      description: "Co-branded marketing materials, campaigns, and promotional support",
      detailedInfo: "Professional marketing team provides customized campaigns and promotional materials" },
  ];

  const howItWorks = [
    { step: "1", title: "Register & Get Verified",
      description: "Complete your agent profile and submit your business documentation for verification",
      details: "Submit business license, proof of experience, and professional references. Verification typically takes 3-5 business days.",
      icon: <Users className="w-6 h-6" /> },
    { step: "2", title: "Access the Platform",
      description: "Once verified, access your agent dashboard with full CRM and application management tools",
      details: "Get instant access to our comprehensive platform with training materials and onboarding support.",
      icon: <Briefcase className="w-6 h-6" /> },
    { step: "3", title: "Connect with Students",
      description: "Receive qualified leads and connect with students looking for study abroad guidance",
      details: "Our AI matching system sends you students based on your expertise, target markets, and success rate.",
      icon: <Target className="w-6 h-6" /> },
    { step: "4", title: "Manage Applications",
      description: "Guide students through applications, track progress, and communicate with institutions",
      details: "Use our integrated tools to manage documents, track deadlines, and communicate with schools.",
      icon: <BarChart3 className="w-6 h-6" /> },
    { step: "5", title: "Earn Commissions",
      description: "Receive competitive commissions for successful enrollments with transparent tracking",
      details: "Automatic commission calculation with weekly payouts and detailed earnings reports.",
      icon: <DollarSign className="w-6 h-6" /> },
  ];

  const requirements = [
    "Valid business license (MST for Vietnam)",
    "Minimum 1 year experience in education consulting",
    "Professional office address or online presence",
    "References from previous clients or institutions (preferred)",
    "Clean business record with no regulatory violations",
    "Commitment to ethical student counseling practices",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="bg-white/20 text-white border-white/30 mb-6 text-base px-4 py-2">
                For Education Agents
              </Badge>

              <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
                Join Our Global Agent Network
              </h1>

              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                Partner with GreenPass to expand your reach, access premium institutions worldwide, and grow your education consulting business with our comprehensive platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {/* Register → Welcome (preselect agent) */}
                <Link to={welcomeAgentHref} state={welcomeAgentState} aria-label="Register as an Agent">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-semibold shadow-xl"
                    >
                      Register as an Agent
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>

                {/* Contact button: keep transparent so text is visible */}
                <Link to={createPageUrl("Contact")} aria-label="Contact Us">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="w-full sm:w-auto bg-transparent border-2 border-white text-white
                                 hover:bg-white hover:text-blue-600 px-8 py-6 text-lg font-semibold"
                    >
                      Contact Us
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
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Why Join GreenPass Agent Network?
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We provide everything you need to succeed as an education agent - from technology to training, leads to commissions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              onHoverStart={() => setHoveredBenefit(index)}
              onHoverEnd={() => setHoveredBenefit(null)}
            >
              <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-300 cursor-pointer">
                <CardContent className="p-6">
                  <motion.div
                    className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mb-4 text-blue-600"
                    animate={{ rotate: hoveredBenefit === index ? 360 : 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    {benefit.icon}
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 mb-3">{benefit.description}</p>
                  <AnimatePresence>
                    {hoveredBenefit === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-blue-600 font-medium border-t pt-3 mt-3"
                      >
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

      {/* How it works */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              How It Works
            </motion.h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Getting started as a GreenPass agent is simple and straightforward.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {howItWorks.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                className="flex gap-6 mb-8 last:mb-0 cursor-pointer group"
              >
                <div className="flex-shrink-0">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    {item.step}
                  </motion.div>
                </div>
                <div className="flex-1 pb-8 border-l-2 border-gray-200 pl-6 last:border-l-0 group-hover:border-blue-400 transition-colors duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <motion.div className="text-blue-600" animate={{ rotate: expandedStep === index ? 360 : 0 }} transition={{ duration: 0.6 }}>
                      {item.icon}
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                  </div>
                  <p className="text-gray-600 text-lg mb-2">{item.description}</p>
                  <AnimatePresence>
                    {expandedStep === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-blue-600 font-medium bg-blue-50 p-4 rounded-lg mt-3"
                      >
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
      </div>

      {/* Requirements */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ scale: 1.02 }}>
            <Card className="border-2 border-blue-200 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                  Agent Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-gray-600 mb-6 text-lg">
                  To maintain the quality of our network, we require all agents to meet the following criteria:
                </p>
                <ul className="space-y-4">
                  {requirements.map((req, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-3"
                    >
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

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Join Our Network?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Register now and start connecting students with their dream institutions worldwide.
            </p>

            <Link to={welcomeAgentHref} state={welcomeAgentState} aria-label="Get Started as an Agent">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-white text-blue-600 hover:bg-blue-50 px-10 py-6 text-xl font-semibold shadow-2xl">
                  Get Started as an Agent
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
            { value: "1,200+", label: "Partner Institutions" },
            { value: "500+", label: "Active Agents" },
            { value: "15K+", label: "Students Placed" },
            { value: "96%", label: "Success Rate" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.1, y: -5 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
