import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Users, BarChart3, Calendar, MessageSquare, Megaphone,
  CheckCircle, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

/** Simple safe <img> with graceful fallback (prevents invisible sections) */
function SafeImg({ src, alt, className = "", fallbackClassName = "" }) {
  const [ok, setOk] = React.useState(true);
  return ok ? (
    <img
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      className={className}
      onError={() => setOk(false)}
    />
  ) : (
    <div className={fallbackClassName} aria-label={alt} />
  );
}

export default function SchoolNetwork() {
  // Same behavior as Agent/Tutor pages: preselect school role on signup
  const buildSignupUrl = (role = "school") =>
    `${createPageUrl("Welcome")}?mode=signup&role=${encodeURIComponent(role)}`;

  const benefits = [
    { icon: <Globe className="w-6 h-6" />, title: "Global Student Reach", description: "Connect with thousands of prospective international students actively searching for programs" },
    { icon: <Users className="w-6 h-6" />, title: "Agent Network Access", description: "Tap into our pre-vetted network of 500+ verified education agents worldwide" },
    { icon: <BarChart3 className="w-6 h-6" />, title: "Student Analytics", description: "Track inquiries, applications, and conversions with detailed analytics dashboard" },
    { icon: <Megaphone className="w-6 h-6" />, title: "Marketing Campaigns", description: "Featured placements, targeted promotions, and social media campaigns included" },
    { icon: <Calendar className="w-6 h-6" />, title: "Education Fair Events", description: "Participate in virtual and physical education fairs to meet students directly" },
    { icon: <MessageSquare className="w-6 h-6" />, title: "Direct Communication", description: "Built-in messaging to communicate with prospective students and agents" },
  ];

  const features = [
    {
      title: "Dedicated School Portal",
      items: [
        "Customizable institution profile with photos and videos",
        "Unlimited program listings with detailed descriptions",
        "Real-time application and inquiry tracking",
        "Document management and verification tools",
        "Student communication center",
      ],
    },
    {
      title: "Recruitment Tools",
      items: [
        "Lead management and CRM system",
        "Agent assignment and commission tracking",
        "Automated email campaigns and follow-ups",
        "Virtual tour and webinar hosting",
        "Scholarship and promotion management",
      ],
    },
    {
      title: "Marketing & Visibility",
      items: [
        "Featured institution placement on homepage",
        "Program showcase in search results",
        "Social media promotion and content sharing",
        "Blog post and success story features",
        "SEO-optimized institution pages",
      ],
    },
  ];

  const howItWorks = [
    { step: "1", title: "Create Your Profile", description: "Register your institution and create a comprehensive profile showcasing programs, campus, and facilities" },
    { step: "2", title: "List Your Programs", description: "Add all your programs with detailed information, admission requirements, and tuition fees" },
    { step: "3", title: "Get Verified", description: "Submit documentation for DLI verification and institutional authentication" },
    { step: "4", title: "Receive Inquiries", description: "Start receiving qualified leads from students and education agents worldwide" },
    { step: "5", title: "Manage Applications", description: "Review applications, communicate with candidates, and process enrollments seamlessly" },
  ];

  const institutionTypes = [
    { name: "Universities", count: "400+" },
    { name: "Colleges", count: "350+" },
    { name: "Language Schools", count: "200+" },
    { name: "Vocational Institutes", count: "250+" },
  ];

  // Pexels image set (stable hotlinking)
  const heroImg = "https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=1600";
  const imgStudy = "https://images.pexels.com/photos/159844/library-la-trobe-study-students-159844.jpeg?auto=compress&cs=tinysrgb&w=1600";
  const imgAerial = "https://images.pexels.com/photos/356086/pexels-photo-356086.jpeg?auto=compress&cs=tinysrgb&w=1600";

  const campusImages = [
    { url: "https://images.pexels.com/photos/1205651/pexels-photo-1205651.jpeg?auto=compress&cs=tinysrgb&w=800", title: "Modern Campus Facilities" },
    { url: "https://images.pexels.com/photos/3184646/pexels-photo-3184646.jpeg?auto=compress&cs=tinysrgb&w=800", title: "Diverse Student Body" },
    { url: "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800", title: "State-of-the-art Learning" },
    { url: "https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg?auto=compress&cs=tinysrgb&w=800", title: "Campus Community" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white overflow-hidden">
        <div className="absolute inset-0">
          <SafeImg
            src={heroImg}
            alt="University Campus"
            className="w-full h-full object-cover opacity-25"
            fallbackClassName="w-full h-full bg-gradient-to-r from-indigo-700 to-purple-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/70 to-purple-900/70" />
        </div>

        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="bg-white/20 text-white border-white/30 mb-6">For Educational Institutions</Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6">Expand Your Global Reach</h1>
              <p className="text-xl md:text-2xl text-indigo-100 mb-8 leading-relaxed">
                Partner with GreenPass to connect with international students worldwide, increase enrollments,
                and diversify your student body through our comprehensive recruitment platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {/* Register CTA — text is always visible */}
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-indigo-700 hover:bg-indigo-50 px-8 py-6 text-lg font-semibold shadow-xl"
                >
                  <Link to={buildSignupUrl("school")} aria-label="Register your institution as a school">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      Register Your Institution
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </Link>
                </Button>

                {/* Schedule a Demo — outlined and readable */}
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="border-2 border-white bg-transparent text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold"
                >
                  <Link to={createPageUrl("Contact")} aria-label="Schedule a demo">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      Schedule a Demo
                    </span>
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Campus Gallery */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {campusImages.map((image, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative overflow-hidden rounded-lg aspect-video group"
            >
              <SafeImg
                src={image.url}
                alt={image.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                fallbackClassName="w-full h-full bg-gray-200"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                <p className="text-white font-semibold text-sm">{image.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Partner with GreenPass?</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We provide the technology, marketing, and agent network to help you recruit qualified international students efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {benefits.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-200">
                <CardContent className="p-6">
                  <div className="bg-indigo-100 w-14 h-14 rounded-full flex items-center justify-center mb-4 text-indigo-600">{b.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-gray-600">{b.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Image Break — studying */}
      <div className="relative h-96 overflow-hidden">
        <SafeImg
          src={imgStudy}
          alt="Students in Library"
          className="w-full h-full object-cover"
          fallbackClassName="w-full h-full bg-indigo-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/70 to-purple-900/70 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Connect with Future Leaders</h2>
            <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto">
              Your institution deserves to be discovered by ambitious students worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Comprehensive Platform Features</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage international student recruitment in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.12 }}>
                <Card className="h-full border-2 border-indigo-100">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardTitle className="text-xl">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {f.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Image Break — aerial */}
      <div className="relative h-96 overflow-hidden">
        <SafeImg
          src={imgAerial}
          alt="University Campus Aerial View"
          className="w-full h-full object-cover"
          fallbackClassName="w-full h-full bg-purple-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/70 to-indigo-900/70 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Showcase Your Campus to the World</h2>
            <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto">
              Virtual tours, photo galleries, and video content to attract global talent
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Get started recruiting international students in five simple steps.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {howItWorks.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex gap-6 mb-8 last:mb-0"
            >
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
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

      {/* Institution Types */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Join Leading Institutions</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Institutions of all types trust GreenPass for international student recruitment.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {institutionTypes.map((type, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: i * 0.08 }}>
                <Card className="text-center hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-indigo-300">
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

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Grow Your International Enrollment?</h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">Join 1,200+ institutions already recruiting students through GreenPass.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-10 py-6 text-xl font-semibold shadow-2xl"
            >
              <Link to={buildSignupUrl("school")} aria-label="Get started as an institution">
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  Get Started Now
                  <ArrowRight className="h-6 w-6" aria-hidden="true" />
                </span>
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="ghost"
              className="border-2 border-white bg-transparent text-white hover:bg-white/10 px-10 py-6 text-xl font-semibold"
            >
              <Link to={createPageUrl("Contact")} aria-label="Contact sales">
                <span className="inline-flex items-center gap-2 whitespace-nowrap">Contact Sales</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-indigo-600 mb-2">1,200+</div>
            <div className="text-gray-600">Partner Institutions</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-indigo-600 mb-2">15K+</div>
            <div className="text-gray-600">Students Enrolled</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-indigo-600 mb-2">50+</div>
            <div className="text-gray-600">Countries</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-indigo-600 mb-2">92%</div>
            <div className="text-gray-600">Satisfaction Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
