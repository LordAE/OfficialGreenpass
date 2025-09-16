
import React, { useState, useEffect } from 'react';
import { HomePageContent } from '@/api/entities';
import { Event } from '@/api/entities';
import { School } from '@/api/entities'; // New import for School entity
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Star, Users, GraduationCap, TrendingUp, Check, BookOpen, School as SchoolIcon, Globe, CheckCircle, MapPin, DollarSign, Calendar } from 'lucide-react'; // Added MapPin, DollarSign, Calendar
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import IconResolver from '../components/IconResolver';
import EventCard from '../components/home/EventCard';
import YouTubeEmbed from '../components/YouTubeEmbed';

// Helper functions for SchoolProgramsSection
const getLevelLabel = (level) => {
  switch (level) {
    case 'undergraduate':
      return 'Undergraduate';
    case 'postgraduate':
      return 'Postgraduate';
    case 'diploma':
      return 'Diploma';
    case 'certificate':
      return 'Certificate';
    case 'vocational':
      return 'Vocational';
    default:
      return level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Program';
  }
};

const getProvinceLabel = (provinceCode) => {
  const provinces = {
    'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick',
    'NL': 'Newfoundland and Labrador', 'NS': 'Nova Scotia', 'ON': 'Ontario',
    'PE': 'Prince Edward Island', 'QC': 'Quebec', 'SK': 'Saskatchewan',
    'NT': 'Northwest Territories', 'NU': 'Nunavut', 'YT': 'Yukon'
  };
  return provinces[provinceCode] || provinceCode;
};


const Hero = ({ content }) => (
  <div className="relative text-white overflow-hidden">
    <div className="absolute inset-0">
      <img
        src={content?.hero_section?.image_url || "https://images.unsplash.com/photo-1523240795612-9a054b0db644"}
        alt="Study Abroad Students"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/60 bg-gradient-to-r from-black/70 to-transparent"></div>
    </div>
    
    <div className="relative z-10 max-w-7xl mx-auto py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>
              {content?.hero_section?.title || (
                <>
                  Want to study abroad? Keep calm, let{" "}
                  <span className="text-green-400">
                    GreenPass
                  </span>{" "}
                  handle it
                </>
              )}
            </h1>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-200 leading-relaxed max-w-xl"
             style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}
          >
            {content?.hero_section?.subtitle || 
              "Connect with verified schools, agents, and tutors. From visa applications to arrival support - everything you need in one platform."
            }
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link to={createPageUrl("Welcome")}>
              <Button
                size="lg"
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to={createPageUrl("Programs")}>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto bg-white/20 border-white/50 text-white hover:bg-white/30 px-8 py-4 text-lg font-semibold transition-all duration-200"
              >
                Browse Programs
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative"
        >
          <div className="relative bg-white/10 backdrop-blur-sm p-2 rounded-2xl shadow-2xl">
            {content?.hero_section?.video_url ? (
              <YouTubeEmbed
                url={content.hero_section.video_url}
                className="w-full h-64 md:h-80 rounded-xl"
              />
            ) : (
              <img
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=400&fit=crop"
                alt="Students studying abroad"
                className="w-full h-auto rounded-xl"
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  </div>
);

const Features = ({ features }) => {
  const defaultFeatures = [
    {
      icon: "School",
      title: "Discover Top Schools",
      description: "Explore thousands of programs from top institutions worldwide. Our smart filters help you find the perfect match for your academic and career goals.",
      image_url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
      link_url: createPageUrl('Schools'),
      link_text: "Explore Schools",
      media_position: 'right'
    },
    {
      icon: "Users",
      title: "Expert Agent Guidance",
      description: "Connect with verified education agents who can guide you through every step, from school selection to visa paperwork.",
      youtube_url: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
      link_url: createPageUrl('FindAgent'),
      link_text: "Find an Agent",
      media_position: 'left'
    },
    {
      icon: "GraduationCap",
      title: "Recommended For You: University of Toronto",
      description: "A world-renowned university in a vibrant, multicultural city. Known for its research and innovation. Explore programs in engineering, business, and more.",
      image_url: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80",
      link_url: createPageUrl('SchoolDetails?id=university-of-toronto'),
      link_text: "View University",
      media_position: 'right',
      school_rating: 4.8,
      show_rating: true
    }
  ];

  const featuresToDisplay = (features && features.length > 0) ? features : defaultFeatures;

  return (
    <div className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 sm:mb-20 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Top Leading Schools
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            From finding the perfect program to landing in your new country, we've got every step covered with our comprehensive toolkit for international students.
          </p>
        </div>

        <div className="space-y-16 sm:space-y-24">
          {featuresToDisplay.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true, amount: 0.3 }}
              className={`grid lg:grid-cols-2 gap-10 sm:gap-16 items-center`}
            >
              <div className={`space-y-6 text-center lg:text-left ${feature.media_position === 'right' ? 'lg:order-1' : 'lg:order-2'}`}>
                {feature.show_rating ? (
                  <div className="inline-flex items-center justify-center bg-green-100 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(feature.school_rating || 4.5) 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {(feature.school_rating || 4.5).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center bg-green-100 rounded-xl p-3">
                    <IconResolver name={feature.icon} className="h-7 w-7 text-green-700" />
                  </div>
                )}
                
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  <Link to={feature.link_url || '#'} className="hover:text-green-700 transition-colors duration-200">
                    {feature.title}
                  </Link>
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed">{feature.description}</p>
                {feature.link_url && feature.link_text && (
                  <Link to={feature.link_url}>
                    <Button size="lg" className="mt-4 bg-green-600 hover:bg-green-700 text-white shadow-md">
                      {feature.link_text}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                )}
              </div>
              
              <div className={`relative ${feature.media_position === 'right' ? 'lg:order-2' : 'lg:order-1'}`}>
                 <div className="bg-white p-2 rounded-2xl shadow-2xl border border-gray-100">
                    {feature.youtube_url ? (
                        <YouTubeEmbed url={feature.youtube_url} className="w-full h-56 sm:h-80 rounded-xl overflow-hidden"/>
                    ) : feature.image_url ? (
                        <img 
                            src={feature.image_url} 
                            alt={feature.title}
                            className="w-full h-auto object-cover rounded-xl"
                        />
                    ) : (
                        <div className="w-full h-56 sm:h-80 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                            <IconResolver name={feature.icon} className="h-16 w-16 text-slate-400" />
                        </div>
                    )}
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};


const SchoolProgramsSection = ({ content, schools }) =>
<div className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
          {content?.schools_programs_section?.title || "Recommended Schools"}
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          {content?.schools_programs_section?.subtitle || "Discover our personally recommended educational institutions selected for their excellence and student success rates"}
        </p>
      </div>

      {schools && schools.length > 0 ?
    <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {schools.slice(0, content?.schools_programs_section?.max_items || 6).map((school, index) =>
        <motion.div
          key={school.id || index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          viewport={{ once: true }}>

                <Card className="h-full border-0 shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden">
                  <div className="relative h-48 overflow-hidden">
                    <img
                src={school.school_image_url || school.institution_logo_url || 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=250&fit=crop'}
                alt={school.school_name || school.institution_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Rating Badge - Replaced Star */}
                    <div className="absolute top-4 right-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) =>
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                      i < Math.floor(school.rating || 4.5) ?
                      'text-yellow-400 fill-yellow-400' :
                      'text-gray-300'}`
                      } />

                    )}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 ml-1">
                          {(school.rating || 4.5).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">
                        {school.school_name || school.institution_name}
                      </h3>
                      <p className="text-white/90 text-sm flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {school.school_city}, {getProvinceLabel(school.school_province)}
                      </p>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-100 text-green-800">
                          {getLevelLabel(school.program_level)}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          Recommended
                        </Badge>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 line-clamp-2 min-h-[3rem]">
                        {school.program_title}
                      </h4>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          <span>{school.institution_type || 'University'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span>${(school.tuition_fee_cad || 0).toLocaleString()} CAD/year</span>
                        </div>
                        {school.intake_dates && school.intake_dates.length > 0 &&
                  <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Next: {school.intake_dates[0]}</span>
                          </div>
                  }
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <Link to={createPageUrl(`ProgramDetail?id=${school.id}`)}>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                          View Program Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
        )}
          </div>
          
          <div className="text-center">
            <Link to={createPageUrl("Schools")}>
              <Button
            size="lg"
            variant="outline"
            className="border-2 border-green-600 text-green-700 hover:bg-green-50 px-8 py-3 font-semibold transition-all duration-200">

                View All Schools & Programs
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </> :

    <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
            <SchoolIcon className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-600 text-lg">No schools available at this time. Check back soon!</p>
        </div>
    }
    </div>
  </div>;


const Stats = ({ stats }) =>
<div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 py-16 relative overflow-hidden">
    <div className="absolute inset-0 bg-black/10"></div>
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
        {(stats || [
      { value: "96%", label: "Visa Success Rate" },
      { value: "1,200+", label: "Partner Institutions" },
      { value: "15K+", label: "Happy Students" }]).
      map((stat, index) =>
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        viewport={{ once: true }}
        className="text-white space-y-2">

            <div className="text-3xl md:text-4xl font-bold">{stat.value}</div>
            <div className="text-green-100 font-medium">{stat.label}</div>
          </motion.div>
      )}
      </div>
    </div>
  </div>;


const Testimonials = ({ testimonials }) =>
<div className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
          Success Stories from Our Students
        </h2>
        <p className="text-xl text-slate-600">
          Hear from students who achieved their dreams with GreenPass
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(testimonials || [
      {
        author_name: "Sarah Chen",
        author_title: "University of Toronto Student",
        author_image_url: "https://images.unsplash.com/photo-1494790108755-2616b612c108?w=150&h=150&fit=crop&crop=face",
        quote: "GreenPass made my dream of studying at UofT a reality. The visa support was incredible!"
      },
      {
        author_name: "Michael Nguyen",
        author_title: "McGill University Student",
        author_image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        quote: "The agent matching service connected me with the perfect counselor. Highly recommended!"
      },
      {
        author_name: "Emily Rodriguez",
        author_title: "UBC Graduate",
        author_image_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        quote: "From application to arrival, GreenPass supported me every step of the way."
      }]).
      map((testimonial, index) =>
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        viewport={{ once: true }}>

            <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8">
                {testimonial.video_url &&
            <div className="mb-6">
                    <YouTubeEmbed
                url={testimonial.video_url}
                className="w-full h-48 rounded-lg" />

                  </div>
            }

                <blockquote className="text-slate-700 mb-6 italic text-lg leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>

                <div className="flex items-center">
                  <img
                src={testimonial.author_image_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face"}
                alt={testimonial.author_name}
                className="w-12 h-12 rounded-full mr-4 object-cover" />

                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.author_name}</div>
                    <div className="text-sm text-slate-600">{testimonial.author_title}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
      )}
      </div>
    </div>
  </div>;


const UpcomingEvents = ({ events }) =>
<div className="py-20 bg-slate-50/50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
          Upcoming Events & Fairs
        </h2>
        <p className="text-xl text-slate-600">
          Join our education fairs and connect with schools directly
        </p>
      </div>

      {events && events.length > 0 ?
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.slice(0, 3).map((event) =>
      <EventCard key={event.id} event={event} />
      )}
        </div> :

    <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-600 text-lg">No upcoming events at this time. Check back soon!</p>
        </div>
    }

      <div className="text-center mt-12">
        <Link to={createPageUrl("FairAndEvents")}>
          <Button
          variant="outline"
          size="lg"
          className="border-2 border-slate-300 text-slate-700 hover:border-green-600 hover:text-green-700 hover:bg-green-50 px-8 py-3 font-semibold transition-all duration-200">

            View All Events <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  </div>;


const FinalCTA = ({ ctaContent }) =>
<div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20"></div>
    <div className="relative z-10 max-w-4xl mx-auto text-center py-20 px-4 sm:py-24 sm:px-6 lg:px-8">
      <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="space-y-8">

        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          <span className="block">{ctaContent?.title || "Ready to start your journey?"}</span>
          <span className="block bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mt-2">
            {ctaContent?.subtitle || "Join thousands of successful students"}
          </span>
        </h2>
        <p className="text-xl text-slate-300 leading-relaxed">
          {ctaContent?.description || "Get started today and take the first step towards your Canadian education dream."}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to={createPageUrl(ctaContent?.primary_button_url || "Welcome")}>
            <Button
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200">

              {ctaContent?.primary_button_text || "Get Started Now"}
            </Button>
          </Link>
          <Link to={createPageUrl(ctaContent?.secondary_button_url || "Programs")}>
            <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto border-2 border-slate-400 text-slate-300 hover:border-green-400 hover:text-green-400 hover:bg-green-400/10 px-8 py-4 text-lg font-semibold transition-all duration-200">

              {ctaContent?.secondary_button_text || "Browse Programs"}
            </Button>
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          Free to join • No hidden fees • Trusted by thousands
        </p>
      </motion.div>
    </div>
  </div>;


export default function Home() {
  const [content, setContent] = useState(null);
  const [events, setEvents] = useState([]);
  const [schools, setSchools] = useState([]); // New state for schools
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [homeContent, eventData, schoolData] = await Promise.all([
        HomePageContent.list(),
        Event.list('sort_order'),
        School.list() // Load schools for the new section
        ]);

        let currentHomeContent = homeContent.length > 0 ? homeContent[0] : {};

        // Sanitization Fix: Ensure every feature has the required properties
        const sanitizedFeatures = (currentHomeContent.features_section || []).map((feature) => ({
          icon: 'Star',
          title: 'Default Title',
          description: 'Default description.',
          media_position: 'left',
          show_rating: false,
          school_rating: 4.5,
          ...feature
        }));

        currentHomeContent.features_section = sanitizedFeatures;
        setContent(currentHomeContent);

        // Sort events: first by sort_order, then by start date
        const sortedEvents = [...eventData].sort((a, b) => {
          const orderA = a.sort_order || 999;
          const orderB = b.sort_order || 999;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return new Date(a.start) - new Date(b.start);
        });

        // Filter for upcoming events only
        const now = new Date();
        const upcomingEvents = sortedEvents.filter((event) => {
          const endDate = new Date(event.end);
          const isArchived = event.archive_at && new Date(event.archive_at) < now;
          return endDate >= now && !isArchived;
        });

        setEvents(upcomingEvents);

        // Filter schools for featured or limit display based on fetched content
        let finalSchoolsToSet = schoolData;
        if (currentHomeContent?.schools_programs_section?.show_featured_only) {
          const featuredSchools = schoolData.filter((school) => school.is_featured);
          if (featuredSchools.length > 0) {
            finalSchoolsToSet = featuredSchools;
          } else {
            // Fallback to first few regular schools if 'show_featured_only' is true but no featured schools exist
            finalSchoolsToSet = schoolData.slice(0, 6);
          }
        }
        // If show_featured_only is false or not set, finalSchoolsToSet remains all schools, and the component will slice by max_items

        setSchools(finalSchoolsToSet);
      } catch (error) {
        console.error("Error loading home content:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>);

  }

  return (
    <div className="min-h-screen">
      <Hero content={content} />
      <Features features={content?.features_section} />
      <SchoolProgramsSection content={content} schools={schools} /> {/* New component added */}
      <Stats stats={content?.stats_section} />
      <Testimonials testimonials={content?.testimonials_section} />
      <UpcomingEvents events={events} />
      <FinalCTA ctaContent={content?.final_cta_section} />
    </div>);

}
