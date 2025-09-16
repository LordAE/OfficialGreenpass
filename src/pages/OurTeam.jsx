import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Linkedin, MessageCircle } from "lucide-react";
import { OurTeamPageContent } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function OurTeam() {
  const [teamContent, setTeamContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flippedCard, setFlippedCard] = useState(null);

  useEffect(() => {
    loadTeamContent();
  }, []);

  const loadTeamContent = async () => {
    try {
      const content = await OurTeamPageContent.list();
      if (content.length > 0) {
        setTeamContent(content[0]);
      }
    } catch (error) {
      console.error("Error loading team content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardFlip = (memberId) => {
    setFlippedCard(flippedCard === memberId ? null : memberId);
  };

  const groupedMembers = teamContent?.team_members?.reduce((acc, member) => {
    const category = member.category || 'Team Member';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(member);
    return acc;
  }, {}) || {};

  // Sort categories: Founder first, then Leadership, then Team Member
  const sortedCategories = Object.keys(groupedMembers).sort((a, b) => {
    const order = { 'Founder': 1, 'Leadership': 2, 'Team Member': 3 };
    return (order[a] || 999) - (order[b] || 999);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-600 opacity-90"></div>
        {teamContent?.hero_image_url && (
          <img 
            src={teamContent.hero_image_url} 
            alt="Our Team" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center text-white">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6"
            >
              {teamContent?.hero_title || 'Meet Our Team'}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl sm:text-2xl max-w-3xl mx-auto leading-relaxed"
            >
              {teamContent?.hero_subtitle || 'Meet the passionate people behind our success'}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {sortedCategories.map((category) => (
          <div key={category} className="mb-16">
            <motion.h2 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12"
            >
              {category === 'Team Member' ? 'Our Team' : category}
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {groupedMembers[category]
                .sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99))
                .map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="perspective-1000"
                    style={{ perspective: '1000px' }}
                  >
                    <Card 
                      className="relative h-96 cursor-pointer transform-style-preserve-3d transition-transform duration-700 hover:shadow-2xl"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: flippedCard === member.id ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                      onClick={() => handleCardFlip(member.id)}
                    >
                      {/* Front Side */}
                      <div 
                        className="absolute inset-0 backface-hidden"
                        style={{ backfaceVisibility: 'hidden' }}
                      >
                        <CardContent className="p-0 h-full">
                          <div className="relative h-full overflow-hidden rounded-lg">
                            <img
                              src={member.image_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=60'}
                              alt={member.name}
                              className="w-full h-64 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                              <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                              <p className="text-sm opacity-90">{member.title}</p>
                              <div className="mt-4 flex items-center text-xs opacity-75">
                                <span>Click to learn more</span>
                                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </div>

                      {/* Back Side */}
                      <div 
                        className="absolute inset-0 backface-hidden bg-gradient-to-br from-green-500 to-blue-600 text-white rounded-lg"
                        style={{ 
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      >
                        <CardContent className="p-6 h-full flex flex-col">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold">{member.name}</h3>
                              <p className="text-sm opacity-90">{member.title}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardFlip(member.id);
                              }}
                              className="text-white hover:bg-white/20"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto">
                            <p className="text-sm leading-relaxed mb-4 opacity-95">
                              {member.bio || 'Passionate about helping students achieve their dreams of studying abroad.'}
                            </p>
                          </div>

                          <div className="mt-4 pt-4 border-t border-white/20">
                            {teamContent?.contact_email && (
                              <a 
                                href={`mailto:${teamContent.contact_email}`}
                                className="flex items-center text-sm hover:bg-white/10 p-2 rounded transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Contact Us
                              </a>
                            )}
                            <a 
                              href={`https://wa.me/1234567890?text=Hi ${member.name}, I'd like to learn more about your services.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm hover:bg-white/10 p-2 rounded transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              WhatsApp
                            </a>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </motion.div>
                ))}
            </div>
          </div>
        ))}

        {/* Contact Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mt-16 p-8 bg-white rounded-2xl shadow-lg"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Your Journey?</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our team is here to help you every step of the way. From program selection to visa application, 
            we're committed to making your study abroad dreams come true.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {teamContent?.contact_email && (
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <a href={`mailto:${teamContent.contact_email}`}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email Us
                </a>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={createPageUrl('Contact')}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Form
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}