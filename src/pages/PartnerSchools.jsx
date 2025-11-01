import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building, Users, Globe, CheckCircle, ArrowRight,
  BarChart3, Calendar, MessageSquare, Megaphone
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PartnerSchools() {
  // ✅ JS state (no TS generics)
  const [hoveredBenefit, setHoveredBenefit] = useState(null);
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  const benefits = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Student Reach",
      description: "Connect with thousands of prospective international students actively searching for programs",
      detailedInfo: "Over 15,000 active student profiles from 50+ countries browsing programs daily"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Agent Network Access",
      description: "Tap into our pre-vetted network of 500+ verified education agents worldwide",
      detailedInfo: "Agents actively refer qualified students to partner institutions"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Student Analytics",
      description: "Track inquiries, applications, and conversions with detailed analytics dashboard",
      detailedInfo: "Real-time insights into student engagement, conversion rates, and ROI tracking"
    },
    {
      icon: <Megaphone className="w-6 h-6" />,
      title: "Marketing Campaigns",
      description: "Featured placements, targeted promotions, and social media campaigns included",
      detailedInfo: "Dedicated marketing team runs campaigns worth $10,000+ annually per institution"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Education Fair Events",
      description: "Participate in virtual and physical education fairs to meet students directly",
      detailedInfo: "20+ education fairs annually across major markets in Asia, Middle East, and Latin America"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Direct Communication",
      description: "Built-in messaging to communicate with prospective students and agents",
      detailedInfo: "Integrated CRM with automated follow-ups and multilingual support"
    }
  ];

  const features = [
    {
      title: "Dedicated School Portal",
      items: [
        "Customizable institution profile with photos and videos",
        "Unlimited program listings with detailed descriptions",
        "Real-time application and inquiry tracking",
        "Document management and verification tools",
        "Student communication center"
      ]
    },
    {
      title: "Recruitment Tools",
      items: [
        "Lead management and CRM system",
        "Agent assignment and commission tracking",
        "Automated email campaigns and follow-ups",
        "Virtual tour and webinar hosting",
        "Scholarship and promotion management"
      ]
    },
    {
      title: "Marketing & Visibility",
      items: [
        "Featured institution placement on homepage",
        "Program showcase in search results",
        "Social media promotion and content sharing",
        "Blog post and success story features",
        "SEO-optimized institution pages"
      ]
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Create Your Profile",
      description: "Register your institution and create a comprehensive profile showcasing programs, campus, and facilities",
      details: "Upload institutional documents, accreditation certificates, and create an engaging profile page.",
      icon: <Building className="w-6 h-6" />
    },
    {
      step: "2",
      title: "List Your Programs",
      description: "Add all your programs with detailed information, admission requirements, and tuition fees",
      details: "Bulk upload programs via CSV or add individually with rich text descriptions and multimedia.",
      icon: <Globe className="w-6 h-6" />
    },
    {
      step: "3",
      title: "Get Verified",
      description: "Submit documentation for DLI verification and institutional authentication",
      details: "Our team verifies institutional credentials and DLI status within 5-7 business days.",
      icon: <CheckCircle className="w-6 h-6" />
    },
    {
      step: "4",
      title: "Receive Inquiries",
      description: "Start receiving qualified leads from students and education agents worldwide",
      details: "AI-powered matching connects your programs with students based on their preferences and qualifications.",
      icon: <Users className="w-6 h-6" />
    },
    {
      step: "5",
      title: "Manage Applications",
      description: "Review applications, communicate with candidates, and process enrollments seamlessly",
      details: "Integrated application management with document verification, offer letters, and enrollment tracking.",
      icon: <BarChart3 className="w-6 h-6" />
    }
  ];

  const institutionTypes = [
    { name: "Universities", count: "400+" },
    { name: "Colleges", count: "350+" },
    { name: "Language Schools", count: "200+" },
    { name: "Vocational Institutes", count: "250+" }
  ];

  const campusImages = [
    { url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800", title: "Modern Campus Facilities" },
    { url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800", title: "Diverse Student Body" },
    { url: "https://images.unsplash.com/photo-1562774053-701939374585?w=800", title: "State-of-the-art Learning" },
    { url: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800", title: "Campus Community" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="w-full h-full bg-center bg-cover opacity-20"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600')"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 to-purple-900/80" />
        </div>

        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="mb-6 text-base px-4 py-2 bg-white/90 text-indigo-700 border border-white shadow-sm backdrop-blur">
                For Educational Institutions
              </Badge>

              <h1 className="text-4xl md:text-6xl font-extrabold mb-6">Expand Your Global Reach</h1>

              <p className="text-xl md:text-2xl text-indigo-100 mb-8 leading-relaxed">
                Partner with GreenPass to connect with international students worldwide, increase enrollments, and diversify your student body through our comprehensive recruitment platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={`${createPageUrl("Welcome")}?as=school`}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-6 text-lg font-semibold shadow-xl">
                      Register Your Institution
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>

                <Link to={createPageUrl("Contact")}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="w-full sm:w-auto bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 px-8 py-6 text-lg font-semibold">
                      Schedule a Demo
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Campus Gallery */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {campusImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer shadow-lg hover:shadow-2xl"
            >
              <img
                src={image.url}
                alt={image.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=800";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-4 transition-all duration-300 group-hover:from-indigo-900/90">
                <p className="text-white font-semibold text-sm">{image.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Partner with GreenPass?
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We provide the technology, marketing, and agent network to help you recruit qualified international students efficiently.
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
              <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-indigo-300 cursor-pointer">
                <CardContent className="p-6">
                  <motion.div className="bg-indigo-100 w-14 h-14 rounded-full flex items-center justify-center mb-4 text-indigo-600" animate={{ rotate: hoveredBenefit === index ? 360 : 0 }} transition={{ duration: 0.6 }}>
                    {benefit.icon}
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 mb-3">{benefit.description}</p>
                  <AnimatePresence>
                    {hoveredBenefit === index && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-indigo-600 font-medium border-t pt-3 mt-3">
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

      {/* Image Break */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="relative h-96 overflow-hidden">
        <motion.img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600"
          alt="Students in Library"
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.6 }}
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1600";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/70 to-purple-900/70 flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center text-white px-4">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Connect with Future Leaders</h2>
            <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto">Your institution deserves to be discovered by ambitious students worldwide</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Features */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Platform Features
            </motion.h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Everything you need to manage international student recruitment in one place.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
                whileHover={{ scale: 1.03 }}
              >
                <Card className={`h-full border-2 hover:shadow-xl transition-all duration-300 cursor-pointer ${expandedFeature === index ? 'border-indigo-400 shadow-xl' : 'border-indigo-100'}`}>
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {feature.items.map((item, idx) => (
                        <motion.li key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} whileHover={{ x: 5 }} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-center mt-8 text-gray-500 text-sm">👆 Click on a feature to highlight it</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Get started recruiting international students in five simple steps.</p>
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
                <motion.div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg" whileHover={{ scale: 1.1, rotate: 5 }} transition={{ duration: 0.3 }}>
                  {item.step}
                </motion.div>
              </div>
              <div className="flex-1 pb-8 border-l-2 border-gray-200 pl-6 last:border-l-0 group-hover:border-indigo-400 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <motion.div className="text-indigo-600" animate={{ rotate: expandedStep === index ? 360 : 0 }} transition={{ duration: 0.6 }}>
                    {item.icon}
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-gray-600 text-lg mb-2">{item.description}</p>
                <AnimatePresence>
                  {expandedStep === index && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-indigo-600 font-medium bg-indigo-50 p-4 rounded-lg mt-3">
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

      {/* Institution Types */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Join Leading Institutions
            </motion.h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Institutions of all types trust GreenPass for international student recruitment.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {institutionTypes.map((type, index) => (
              <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -5 }}>
                <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-300 cursor-pointer">
                  <CardContent className="p-8">
                    <div className="text-4xl font-bold text-indigo-600 mb-2">{type.count}</div>
                    <h3 className="font-semibold text-gray-900 text-lg">{type.name}</h3>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Success Stories */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Success Stories
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">See how institutions are thriving with GreenPass</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} whileHover={{ scale: 1.02 }}>
            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="h-64 overflow-hidden">
                <motion.img
                  src="https://images.unsplash.com/photo-1562774053-701939374585?w=800"
                  alt="University Success Story"
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=800";
                  }}
                />
              </div>
              <CardContent className="p-6">
                <Badge className="bg-indigo-100 text-indigo-800 mb-3">University</Badge>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">250% Increase in International Applications</h3>
                <p className="text-gray-600 mb-4">
                  "GreenPass transformed our recruitment process. We're now reaching students in 40+ countries and our enrollment has tripled in just two years."
                </p>
                <p className="text-sm text-gray-500 font-semibold">- Toronto Metropolitan University</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} whileHover={{ scale: 1.02 }}>
            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="h-64 overflow-hidden">
                <motion.img
                  src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800"
                  alt="College Success Story"
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=800";
                  }}
                />
              </div>
              <CardContent className="p-6">
                <Badge className="bg-purple-100 text-purple-800 mb-3">College</Badge>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Streamlined Application Process</h3>
                <p className="text-gray-600 mb-4">
                  "The platform's CRM and communication tools saved us hundreds of hours. We can now manage 5x more applications with the same team."
                </p>
                <p className="text-sm text-gray-500 font-semibold">- Vancouver Community College</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Grow Your International Enrollment?</h2>
            <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">Join 1,200+ institutions already recruiting students through GreenPass.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={`${createPageUrl("Welcome")}?as=school`}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-indigo-50 px-10 py-6 text-xl font-semibold shadow-2xl">
                    Get Started Now
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </motion.div>
              </Link>

              <Link to={createPageUrl("Contact")}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 px-10 py-6 text-xl font-semibold">
                    Contact Sales
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {[
            { value: "1,200+", label: "Partner Institutions" },
            { value: "15K+", label: "Students Enrolled" },
            { value: "50+", label: "Countries" },
            { value: "92%", label: "Satisfaction Rate" }
          ].map((stat, index) => (
            <motion.div key={index} initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ scale: 1.1, y: -5 }} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-indigo-600 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
