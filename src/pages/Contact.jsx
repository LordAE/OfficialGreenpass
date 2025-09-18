// src/pages/ContactPage.jsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock, Loader2, CheckCircle } from 'lucide-react';
import { getLang, getText } from '@/pages/Layout';

// --- Firebase ---
import { db } from '@/firebase';
import {
  collection,
  addDoc,
  getDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

const CONTACTS_COLLECTION = 'contacts';
const CONTENT_COLLECTION = 'contact_page_content';
const CONTENT_DOC_ID = 'SINGLETON';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [content, setContent] = useState(null);

  const lang = getLang();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Try to read the singleton content doc
        const ref = doc(db, CONTENT_COLLECTION, CONTENT_DOC_ID);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setContent({ id: snap.id, ...snap.data() });
        } else {
          // Fallback defaults (matches your current UI copy)
          setContent({
            hero_title: getText('contactUs'),
            hero_subtitle: getText('getInTouch'),
            form_title: 'Send a Message',
            info_title: 'Contact Information',
            office_hours_title: 'Office Hours',
            email: 'info@greenpassgroup.com',
            phone: '(+84) 123 456 789',
            address: 'Ho Chi Minh City, Vietnam\nToronto, Canada',
            office_hours_vietnam: '<strong>Vietnam Office:</strong> Mon - Fri, 9:00 AM - 6:00 PM (GMT+7)',
            office_hours_canada: '<strong>Canada Office:</strong> Mon - Fri, 9:00 AM - 5:00 PM (EST)',
          });
        }
      } catch (e) {
        console.error('Failed to load contact page content:', e);
        // still provide safe defaults so the page renders
        setContent({
          hero_title: getText('contactUs'),
          hero_subtitle: getText('getInTouch'),
          form_title: 'Send a Message',
          info_title: 'Contact Information',
          office_hours_title: 'Office Hours',
        });
      }
    };

    fetchContent();
  }, [lang]);

  const handleChange = (e) => {
    const { name, value } = e.target || {};
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitted(false);

    try {
      await addDoc(collection(db, CONTACTS_COLLECTION), {
        ...formData,
        status: 'new',                  // optional: for triage
        created_at: serverTimestamp(),  // Firestore server time
        meta: {
          lang,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          path: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
        },
      });

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="relative bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 pt-32 pb-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
            {content.hero_title || getText('contactUs')}
          </h1>
          <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">
            {content.hero_subtitle || getText('getInTouch')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Contact Form */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{content.form_title || 'Send a Message'}</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center p-8 bg-green-50 rounded-lg">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold">Message Sent!</h3>
                  <p className="text-gray-600 mt-2">Thank you for reaching out. We will get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Your Email</Label>
                      <Input
                        type="email"
                        name="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      type="text"
                      name="subject"
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Regarding my application"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      name="message"
                      id="message"
                      rows={5}
                      required
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Your message here..."
                    />
                  </div>
                  <div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>Send Message</>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">{content.info_title || 'Contact Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Mail className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-gray-600">{content.email || 'info@greenpassgroup.com'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Phone className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <p className="text-gray-600">{content.phone || '(+84) 123 456 789'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <MapPin className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold">Address</p>
                    <p className="text-gray-600 whitespace-pre-line">
                      {content.address || 'Ho Chi Minh City, Vietnam\nToronto, Canada'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">{content.office_hours_title || 'Office Hours'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-4">
                  <Clock className="w-6 h-6 text-green-600 mt-1" />
                  <div className="space-y-2">
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          content.office_hours_vietnam ||
                          '<strong>Vietnam Office:</strong> Mon - Fri, 9:00 AM - 6:00 PM (GMT+7)',
                      }}
                    />
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          content.office_hours_canada ||
                          '<strong>Canada Office:</strong> Mon - Fri, 9:00 AM - 5:00 PM (EST)',
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
