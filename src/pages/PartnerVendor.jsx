// src/pages/PartnerVendor.jsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store, ShoppingCart, TrendingUp, Award, Globe, CheckCircle,
  ArrowRight, DollarSign, Users, Package, Smartphone, Home,
  Plane, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PartnerVendor() {
  // no TS generics in .jsx
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hoveredBenefit, setHoveredBenefit] = useState(null);

  // Pass vendor preselection to Welcome
  const welcomeVendorHref = `${createPageUrl("Welcome")}?role=vendor`;
  const welcomeVendorState = { preselectUserType: "vendor", forceRole: "vendor" };

  const benefits = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Access International Students",
      description: "Connect with thousands of international students arriving in Canada who need essential services",
      detailedInfo: "Over 15,000 active students on our platform looking for reliable service providers",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Verified Platform",
      description: "Join a trusted marketplace where students feel safe to purchase services from verified vendors",
      detailedInfo: "All vendors undergo thorough verification to ensure quality and trustworthiness",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Secure Payments",
      description: "Receive payments securely through our platform with transparent transaction tracking",
      detailedInfo: "Integrated payment processing with automatic payouts and full transaction history",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Business Growth",
      description: "Scale your business by reaching new customers through our growing student network",
      detailedInfo: "Average vendor sees 3x growth in first 6 months with access to targeted customer base",
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Easy Listing Management",
      description: "Simple dashboard to manage your services, pricing, availability, and orders",
      detailedInfo: "User-friendly interface with real-time notifications and mobile app support",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Rating & Reviews",
      description: "Build credibility through customer reviews and ratings visible to all students",
      detailedInfo: "Transparent rating system helps you build reputation and attract more customers",
    },
  ];

  const serviceCategories = [
    {
      icon: <Plane className="w-8 h-8" />,
      title: "Airport Pickup & Transport",
      description: "Provide reliable transportation services for new arrivals",
      examples: ["Airport shuttle services", "City transportation", "Long-distance travel"],
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "SIM Cards & Mobile Plans",
      description: "Help students get connected with local phone services",
      examples: ["Prepaid SIM cards", "Monthly plans", "Data packages"],
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: <Home className="w-8 h-8" />,
      title: "Accommodation Services",
      description: "Assist students in finding temporary or permanent housing",
      examples: ["Short-term rentals", "Roommate matching", "Furniture rental"],
      color: "from-orange-500 to-red-500",
    },
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "Shopping & Delivery",
      description: "Offer shopping assistance and delivery services",
      examples: ["Grocery delivery", "Essential items", "Document pickup"],
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Banking & Financial",
      description: "Help with banking setup and financial services",
      examples: ["Bank account opening", "Money transfer", "Financial planning"],
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Tours & Activities",
      description: "Provide orientation tours and cultural experiences",
      examples: ["City tours", "Cultural events", "Social activities"],
      color: "from-teal-500 to-cyan-500",
    },
  ];

  const howItWorks = [
    { step: "1", title: "Register Your Business", description: "Create your vendor account and submit your business license for verification", icon: <Users className="w-6 h-6" /> },
    { step: "2", title: "List Your Services", description: "Add your services with descriptions, pricing, photos, and availability", icon: <Package className="w-6 h-6" /> },
    { step: "3", title: "Get Verified", description: "Our team reviews your business documentation and approves your vendor profile", icon: <CheckCircle className="w-6 h-6" /> },
    { step: "4", title: "Receive Orders", description: "Students discover and book your services directly through the marketplace", icon: <ShoppingCart className="w-6 h-6" /> },
    { step: "5", title: "Fulfill & Get Paid", description: "Complete the service, upload proof of delivery, and receive payment to your account", icon: <DollarSign className="w-6 h-6" /> },
  ];

  const requirements = [
    "Valid business license or registration",
    "Professional liability insurance (for applicable services)",
    "Clear pricing and service descriptions",
    "Ability to serve international students",
    "Commitment to quality service delivery",
    "Responsive communication with customers",
  ];

  const pricingInfo = {
    commissionRate: "15%",
    payoutSchedule: "Weekly",
    minimumPayout: "$50 CAD",
    disputeProtection: "Included",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1600"
            alt="Business Services"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-pink-900/80" />
        </div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="bg-white/20 text-white border-white/30 mb-6 text-base px-4 py-2">
                For Service Providers
              </Badge>

              <h1 className="text-4xl md:text-6xl font-extrabold mb-6">Join Our Vendor Network</h1>

              <p className="text-xl md:text-2xl text-purple-100 mb-8 leading-relaxed">
                Connect with international students arriving in Canada and offer essential services through our trusted marketplace platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {/* Register as Vendor → Welcome (preselect vendor) */}
                <Link to={welcomeVendorHref} state={welcomeVendorState} aria-label="Register as a Vendor">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-purple-600 hover:bg-purple-50 hover:scale-105 px-8 py-6 text-lg font-semibold shadow-xl transition-all duration-300"
                  >
                    Register as a Vendor
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>

                {/* Learn More — force transparent background so text is visible on gradient */}
                <Link to={createPageUrl("Contact")} aria-label="Learn More about vendor onboarding">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 hover:scale-105 px-8 py-6 text-lg font-semibold transition-all duration-300"
                  >
                    <Info className="mr-2 h-5 w-5" />
                    Learn More
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Quick showcase */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {[
            { url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800", title: "Transportation", subtitle: "Airport & City Rides" },
            { url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800", title: "Mobile Services", subtitle: "SIM Cards & Plans" },
            { url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800", title: "Accommodation", subtitle: "Housing Solutions" },
            { url: "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=800", title: "Shopping", subtitle: "Delivery Services" },
          ].map((image, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer shadow-lg hover:shadow-2xl"
            >
              <img src={image.url} alt={image.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-end p-4 transition-all duration-300 group-hover:from-purple-900/90">
                <p className="text-white font-bold text-base mb-1">{image.title}</p>
                <p className="text-purple-200 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">{image.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Join GreenPass Marketplace?
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Reach thousands of international students who need your services when they arrive in Canada.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              onHoverStart={() => setHoveredBenefit(i)}
              onHoverEnd={() => setHoveredBenefit(null)}
            >
              <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-300 cursor-pointer">
                <CardContent className="p-6">
                  <motion.div className="bg-purple-100 w-14 h-14 rounded-full flex items-center justify-center mb-4 text-purple-600" animate={{ rotate: hoveredBenefit === i ? 360 : 0 }} transition={{ duration: 0.6 }}>
                    {b.icon}
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-gray-600 mb-3">{b.description}</p>
                  <AnimatePresence>
                    {hoveredBenefit === i && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-purple-600 font-medium border-t pt-3 mt-3">
                        💡 {b.detailedInfo}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Image break */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="relative h-96 overflow-hidden">
        <motion.img
          src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600"
          alt="Customer Service"
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.6 }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/70 to-pink-900/70 flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center text-white px-4">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Grow Your Business with GreenPass</h2>
            <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto">Join hundreds of vendors already serving international students</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Categories */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Service Categories We Support
            </motion.h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Offer essential services that international students need when arriving in Canada.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {serviceCategories.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setSelectedCategory(selectedCategory === i ? null : i)}
              >
                <Card className={`h-full hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedCategory === i ? 'ring-2 ring-purple-500 shadow-xl' : ''}`}>
                  <CardHeader className={`bg-gradient-to-r ${c.color} text-white`}>
                    <div className="flex items-center gap-3 mb-2">
                      <motion.div animate={{ rotate: selectedCategory === i ? 360 : 0 }} transition={{ duration: 0.6 }}>
                        {c.icon}
                      </motion.div>
                      <CardTitle className="text-xl">{c.title}</CardTitle>
                    </div>
                    <p className="text-sm text-white/90">{c.description}</p>
                  </CardHeader>

                  <AnimatePresence>
                    {selectedCategory === i && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <CardContent className="p-6">
                          <p className="text-sm font-semibold text-gray-700 mb-3">What you can offer:</p>
                          <ul className="space-y-2">
                            {c.examples.map((ex, idx) => (
                              <motion.li key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="flex items-center gap-2 text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                <span>{ex}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>

          <p className="text-center mt-8 text-gray-500 text-sm">👆 Click on a category to see more details</p>
        </div>
      </div>

      {/* How it works */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Start selling your services to international students in five simple steps.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {howItWorks.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ x: 10 }}
              className="flex gap-6 mb-8 last:mb-0 group cursor-pointer"
            >
              <div className="flex-shrink-0">
                <motion.div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg" whileHover={{ scale: 1.1, rotate: 5 }} transition={{ duration: 0.3 }}>
                  {item.step}
                </motion.div>
              </div>
              <div className="flex-1 pb-8 border-l-2 border-gray-200 pl-6 last:border-l-0 group-hover:border-purple-400 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <motion.div className="text-purple-600" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                    {item.icon}
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-gray-600 text-lg">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pricing & requirements */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ scale: 1.02 }}>
              <Card className="border-2 border-purple-200 h-full hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-purple-600" />
                    Vendor Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <p className="text-gray-600 mb-6">To maintain quality standards, we require vendors to meet the following criteria:</p>
                  <ul className="space-y-4">
                    {requirements.map((req, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ x: 5 }} className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{req}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ scale: 1.02 }}>
              <Card className="border-2 border-purple-200 h-full hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-purple-600" />
                    Pricing & Payouts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <motion.div whileHover={{ scale: 1.05 }} className="transition-transform">
                      <p className="text-sm font-semibold text-gray-500 mb-1">Platform Commission</p>
                      <p className="text-4xl font-bold text-purple-600">{pricingInfo.commissionRate}</p>
                      <p className="text-sm text-gray-600 mt-1">Per transaction (you keep 85%)</p>
                    </motion.div>
                    <motion.div whileHover={{ x: 5 }} className="border-t pt-4">
                      <p className="text-sm font-semibold text-gray-500 mb-1">Payout Schedule</p>
                      <p className="text-xl font-bold text-gray-900">{pricingInfo.payoutSchedule}</p>
                    </motion.div>
                    <motion.div whileHover={{ x: 5 }} className="border-t pt-4">
                      <p className="text-sm font-semibold text-gray-500 mb-1">Minimum Payout</p>
                      <p className="text-xl font-bold text-gray-900">{pricingInfo.minimumPayout}</p>
                    </motion.div>
                    <motion.div whileHover={{ x: 5 }} className="border-t pt-4">
                      <p className="text-sm font-semibold text-gray-500 mb-1">Dispute Protection</p>
                      <Badge className="bg-green-100 text-green-800 text-base px-3 py-1">{pricingInfo.disputeProtection}</Badge>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Success story */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ scale: 1.02 }} transition={{ duration: 0.6 }}>
            <Card className="overflow-hidden border-2 border-purple-200 hover:shadow-2xl transition-all duration-300">
              <div className="grid md:grid-cols-2">
                <div className="h-full min-h-[400px] overflow-hidden">
                  <motion.img
                    src="https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800"
                    alt="Successful Vendor"
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <Badge className="bg-purple-100 text-purple-800 mb-4 w-fit text-base px-3 py-1">Success Story</Badge>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">"My Business Grew 300% in 6 Months"</h3>
                  <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                    "Joining GreenPass was the best decision for my transportation business. I now serve 50+ international students every month, and my revenue has tripled. The platform makes everything so easy - from receiving orders to getting paid."
                  </p>
                  <div className="flex items-center gap-4">
                    <motion.div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl" whileHover={{ scale: 1.1, rotate: 5 }}>
                      JL
                    </motion.div>
                    <div>
                      <p className="font-semibold text-gray-900">John Lee</p>
                      <p className="text-sm text-gray-600">Airport Transfer Services, Toronto</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Start Serving International Students?</h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">Join our marketplace and connect with students who need your services.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Register Now → Welcome with vendor role */}
              <Link to={welcomeVendorHref} state={welcomeVendorState} aria-label="Register Now as Vendor">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="w-full sm:w-auto bg-white text-purple-600 hover:bg-purple-50 px-10 py-6 text-xl font-semibold shadow-2xl">
                    Register Now
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </motion.div>
              </Link>

              {/* Browse Marketplace — keep text visible */}
              <Link to={createPageUrl("Marketplace")} aria-label="Browse Marketplace">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 px-10 py-6 text-xl font-semibold"
                  >
                    Browse Marketplace
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
            { value: "500+", label: "Active Vendors" },
            { value: "15K+", label: "Student Customers" },
            { value: "$2M+", label: "Transactions Processed" },
            { value: "4.8/5", label: "Average Rating" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} whileHover={{ scale: 1.1, y: -5 }} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-purple-600 mb-2">{s.value}</div>
              <div className="text-gray-600">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
