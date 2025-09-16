import React, { useState, useEffect } from 'react';
import { AboutPageContent } from '@/api/entities';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import IconResolver from '../components/IconResolver';
import YouTubeEmbed from '../components/YouTubeEmbed';

export default function About() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const aboutContent = await AboutPageContent.list();
        if (aboutContent.length > 0) {
          setContent(aboutContent[0]);
        }
      } catch (error) {
        console.error("Error loading about content:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const defaultContent = {
    hero_title: "About GreenPass",
    hero_subtitle: "Empowering students to achieve their international education dreams",
    mission_title: "Our Mission",
    mission_subtitle: "Transforming International Education",
    mission_text: "We believe every student deserves access to quality international education. GreenPass connects students with verified education agents, top institutions, and essential services to make studying abroad accessible, affordable, and successful.",
    values: [
      {
        id: "1",
        icon: "Star",
        title: "Excellence",
        text: "We maintain the highest standards in everything we do, from partner verification to customer service."
      },
      {
        id: "2", 
        icon: "Users",
        title: "Community",
        text: "We foster a supportive community where students, agents, and institutions can connect and thrive."
      },
      {
        id: "3",
        icon: "CheckCircle",
        title: "Trust",
        text: "Transparency and reliability are at the core of our platform. Every partner is verified and vetted."
      }
    ],
    team_title: "Our Team",
    team_text: "GreenPass is built by a diverse team of education professionals, technologists, and international students who understand the challenges and opportunities in global education."
  };

  const pageContent = content || defaultContent;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-green-50 to-blue-50 py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                {pageContent.hero_title}
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                {pageContent.hero_subtitle}
              </p>
              <Link to={createPageUrl('Welcome')}>
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  Join Our Community <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {pageContent.hero_video_url ? (
                <YouTubeEmbed 
                  url={pageContent.hero_video_url} 
                  className="w-full h-64 md:h-80 rounded-lg shadow-xl"
                />
              ) : pageContent.hero_image_url ? (
                <img 
                  src={pageContent.hero_image_url} 
                  alt="About GreenPass" 
                  className="w-full h-auto rounded-lg shadow-xl"
                />
              ) : (
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop" 
                  alt="Team collaboration" 
                  className="w-full h-auto rounded-lg shadow-xl"
                />
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">
              {pageContent.mission_subtitle}
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
              {pageContent.mission_title}
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              {pageContent.mission_text}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Values Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600">The principles that guide everything we do</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {pageContent.values?.map((value, index) => (
              <motion.div
                key={value.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-8">
                    <div className="bg-green-100 rounded-full p-4 w-fit mx-auto mb-6">
                      <IconResolver name={value.icon} className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                    <p className="text-gray-600">{value.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )) || []}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
              {pageContent.team_title}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              {pageContent.team_text}
            </p>
            <Link to={createPageUrl('Contact')}>
              <Button size="lg" variant="outline">
                Get in Touch <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-green-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of students who have achieved their dreams with GreenPass
          </p>
          <Link to={createPageUrl('Welcome')}>
            <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100">
              Get Started Today <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}