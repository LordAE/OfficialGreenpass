// src/pages/TutorNetwork.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Users, Clock, DollarSign, Video, Star,
  CheckCircle, ArrowRight, BookOpen, TrendingUp, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function TutorNetwork() {
  const benefits = [
    { icon: <Clock className="w-6 h-6" />, title: "Flexible Schedule", description: "Work from anywhere, set your own hours, and maintain work-life balance" },
    { icon: <Globe className="w-6 h-6" />, title: "Global Student Base", description: "Connect with students from around the world seeking your expertise" },
    { icon: <DollarSign className="w-6 h-6" />, title: "Competitive Earnings", description: "Keep 70-80% of session fees with transparent, reliable payment processing" },
    { icon: <Video className="w-6 h-6" />, title: "Professional Platform", description: "Integrated video conferencing, scheduling, and session management tools" },
    { icon: <Star className="w-6 h-6" />, title: "Build Your Reputation", description: "Student reviews and ratings help you build credibility and attract more clients" },
    { icon: <TrendingUp className="w-6 h-6" />, title: "Marketing Support", description: "We promote your profile to help you grow your tutoring business" }
  ];

  const subjects = [
    { name: "IELTS Preparation", icon: "🎯" },
    { name: "TOEFL Training", icon: "📚" },
    { name: "SAT/ACT Prep", icon: "📝" },
    { name: "GRE/GMAT", icon: "🎓" },
    { name: "General English", icon: "🗣️" },
    { name: "Academic Writing", icon: "✍️" },
    { name: "French/Spanish", icon: "🌍" },
    { name: "Study Skills", icon: "💡" }
  ];

  const howItWorks = [
    { step: "1", title: "Create Your Profile", description: "Sign up, showcase your qualifications, experience, and teaching specializations" },
    { step: "2", title: "Get Verified", description: "Submit your credentials for verification to build trust with students" },
    { step: "3", title: "Set Your Schedule", description: "Define your availability, hourly rates, and preferred teaching methods" },
    { step: "4", title: "Connect with Students", description: "Receive booking requests from students matched to your expertise" },
    { step: "5", title: "Teach & Earn", description: "Conduct sessions through our platform and receive payments securely" }
  ];

  const requirements = [
    "Minimum 2 years of teaching/tutoring experience",
    "Bachelor's degree or equivalent (Master's preferred)",
    "Relevant certifications (TESOL, CELTA, or subject-specific)",
    "Strong communication skills in English or French",
    "Reliable internet connection and professional setup",
    "Passion for teaching and student success"
  ];

  // ---- Signup routing helpers (pre-seed tutor role) ----
  const signUpHref = `${createPageUrl("Welcome")}?role=tutor`;
  const handleTutorSignupClick = () => {
    try {
      sessionStorage.setItem('onboarding_role', 'tutor');
      sessionStorage.setItem('signup_source', 'tutor_network');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="bg-white/20 text-white border-white/30 mb-6">
                For Tutors & Educators
              </Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
                Teach Students Worldwide
              </h1>
              <p className="text-xl md:text-2xl text-green-100 mb-8 leading-relaxed">
                Join GreenPass Tutor Network to share your expertise, help students achieve their dreams, and build a thriving online tutoring business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={signUpHref} onClick={handleTutorSignupClick}>
                  <Button size="lg" className="bg-white text-green-600 hover:bg-green-50 px-8 py-6 text-lg font-semibold shadow-xl">
                    Register as a Tutor
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to={createPageUrl("Contact")}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold focus-visible:ring-white/50"
                  >
                    Learn More
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
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Teach on GreenPass?
          </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We provide the platform, students, and support — you provide the expertise and passion for teaching.
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
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-200">
                <CardContent className="p-6">
                  <div className="bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mb-4 text-green-600">
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

      {/* Subjects Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Popular Teaching Subjects
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our students are looking for expert tutors in these high-demand areas.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {subjects.map((subject, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Card className="text-center hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-green-300 border-2">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-3">{subject.icon}</div>
                    <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Start teaching online in just a few simple steps.</p>
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
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

      {/* Requirements Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-green-200">
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
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Start Teaching?</h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join thousands of tutors helping students around the world achieve their academic goals.
          </p>
          <Link to={signUpHref} onClick={handleTutorSignupClick}>
            <Button size="lg" className="bg-white text-green-600 hover:bg-green-50 px-10 py-6 text-xl font-semibold shadow-2xl">
              Become a Tutor Today
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-green-600 mb-2">800+</div>
            <div className="text-gray-600">Active Tutors</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-green-600 mb-2">10K+</div>
            <div className="text-gray-600">Sessions Completed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-green-600 mb-2">4.9/5</div>
            <div className="text-gray-600">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-green-600 mb-2">$35+</div>
            <div className="text-gray-600">Avg. Hourly Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
