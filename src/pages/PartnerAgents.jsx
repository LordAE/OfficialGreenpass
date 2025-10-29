// src/pages/AgentNetwork.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Handshake, Users, TrendingUp, Award, Globe, CheckCircle, ArrowRight, DollarSign, Briefcase, Target, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function PartnerAgents() {
  const benefits = [
    { icon: <Globe className="w-6 h-6" />, title: "Global Network Access", description: "Access to 1,200+ partner institutions across Canada, USA, UK, Australia, and more" },
    { icon: <DollarSign className="w-6 h-6" />, title: "Competitive Commissions", description: "Earn 10-15% commission on successful applications with fast, reliable payouts" },
    { icon: <Briefcase className="w-6 h-6" />, title: "Professional CRM Tools", description: "Dedicated agent dashboard with application tracking, student management, and analytics" },
    { icon: <Target className="w-6 h-6" />, title: "Quality Leads", description: "Receive pre-qualified student leads matched to your expertise and target markets" },
    { icon: <Award className="w-6 h-6" />, title: "Training & Certification", description: "Access to comprehensive training programs and professional certification" },
    { icon: <BarChart3 className="w-6 h-6" />, title: "Marketing Support", description: "Co-branded marketing materials, campaigns, and promotional support" }
  ];

  const howItWorks = [
    { step: "1", title: "Register & Get Verified", description: "Complete your agent profile and submit your business documentation for verification" },
    { step: "2", title: "Access the Platform", description: "Once verified, access your agent dashboard with full CRM and application management tools" },
    { step: "3", title: "Connect with Students", description: "Receive qualified leads and connect with students looking for study abroad guidance" },
    { step: "4", title: "Manage Applications", description: "Guide students through applications, track progress, and communicate with institutions" },
    { step: "5", title: "Earn Commissions", description: "Receive competitive commissions for successful enrollments with transparent tracking" }
  ];

  const requirements = [
    "Valid business license (MST for Vietnam)",
    "Minimum 1 year experience in education consulting",
    "Professional office address or online presence",
    "References from previous clients or institutions (preferred)",
    "Clean business record with no regulatory violations",
    "Commitment to ethical student counseling practices"
  ];

  // ---- Signup routing helpers (pre-seed agent role) ----
  const signUpHref = `${createPageUrl("Welcome")}?role=agent`;
  const handleAgentSignupClick = () => {
    try {
      sessionStorage.setItem('onboarding_role', 'agent');
      sessionStorage.setItem('signup_source', 'agent_network');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="bg-white/20 text-white border-white/30 mb-6">For Education Agents</Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6">Join Our Global Agent Network</h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                Partner with GreenPass to expand your reach, access premium institutions worldwide, and grow your education consulting business with our comprehensive platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={signUpHref} onClick={handleAgentSignupClick}>
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-semibold shadow-xl">
                    Register as an Agent
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to={createPageUrl("Contact")}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold focus-visible:ring-white/50"
                  >
                    Contact Us
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Join GreenPass Agent Network?</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We provide everything you need to succeed as an education agent - from technology to training, leads to commissions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200">
                <CardContent className="p-6">
                  <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mb-4 text-blue-600">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Getting started as a GreenPass agent is simple and straightforward.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {howItWorks.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-6 mb-8 last:mb-0"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {item.step}
                  </div>
                </div>
                <div className="flex-1 pb-8 border-l-2 border-gray-200 pl-6 last:border-l-0">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-lg">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Requirements Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-blue-200">
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
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-lg">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Join Our Network?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Register now and start connecting students with their dream institutions worldwide.
          </p>
          <Link to={signUpHref} onClick={handleAgentSignupClick}>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-10 py-6 text-xl font-semibold shadow-2xl">
              Get Started as an Agent
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">1,200+</div>
            <div className="text-gray-600">Partner Institutions</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">500+</div>
            <div className="text-gray-600">Active Agents</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">15K+</div>
            <div className="text-gray-600">Students Placed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">96%</div>
            <div className="text-gray-600">Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
