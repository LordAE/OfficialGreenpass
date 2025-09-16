
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from '@/utils';
import { 
  Home, 
  CreditCard, 
  Plane, 
  MapPin, 
  Users, 
  GraduationCap, 
  Heart,
  Coffee,
  Car,
  Phone,
  FileText,
  Globe,
  Building,
  Shield,
  Clock
} from 'lucide-react';

const GuideSection = ({ icon: Icon, title, children, image, imagePosition = 'right' }) => (
  <Card className="mb-8 overflow-hidden">
    <CardContent className="p-0">
      <div className={`grid lg:grid-cols-2 gap-0 items-center ${imagePosition === 'left' ? 'lg:grid-flow-col-reverse' : ''}`}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Icon className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          </div>
          <div className="space-y-4 text-gray-600">
            {children}
          </div>
        </div>
        <div className="relative h-64 lg:h-full min-h-[300px]">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

const QuickTip = ({ icon: Icon, title, description }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-start gap-4">
        <div className="bg-blue-100 p-2 rounded-lg shrink-0">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const TimelineItem = ({ icon: Icon, title, description, isLast = false }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="bg-green-100 p-3 rounded-full">
        <Icon className="w-5 h-5 text-green-600" />
      </div>
      {!isLast && <div className="w-px h-16 bg-gray-200 mt-4" />}
    </div>
    <div className="pb-16">
      <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
);

export default function StudentLife() {
  const [activeSection, setActiveSection] = useState('housing');

  const sections = [
    { id: 'housing', label: 'Housing & Accommodation', icon: Home },
    { id: 'visa', label: 'Visa & Immigration', icon: FileText },
    { id: 'arrival', label: 'Arrival & Settlement', icon: Plane },
    { id: 'life', label: 'Student Life', icon: Users },
    { id: 'health', label: 'Health & Wellness', icon: Heart }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-6">
            Student Life in Canada
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Everything you need to know about living, studying, and thriving as an international student in Canada.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {sections.map(section => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? 'default' : 'outline'}
              onClick={() => setActiveSection(section.id)}
              className="flex items-center gap-2"
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </Button>
          ))}
        </div>

        {/* Housing & Accommodation */}
        {activeSection === 'housing' && (
          <div className="space-y-8">
            <GuideSection 
              icon={Home} 
              title="Housing & Accommodation"
              image="https://images.unsplash.com/photo-1555854877-bab0e460b1e1?w=800&h=600&fit=crop&q=80"
            >
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">On-Campus Housing</h3>
                <p>Most Canadian universities offer residence halls for first-year international students. These typically include meal plans and are a great way to meet other students.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Shared or single rooms available</li>
                  <li>Meal plans often included</li>
                  <li>Close to campus facilities</li>
                  <li>Cost: $8,000-15,000 CAD per year</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Off-Campus Options</h3>
                <p>After your first year, you might consider apartments, shared housing, or homestays for more independence and potentially lower costs.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Apartments: $600-1,200 CAD/month</li>
                  <li>Shared housing: $400-800 CAD/month</li>
                  <li>Homestay: $700-1,000 CAD/month</li>
                  <li>Utilities may or may not be included</li>
                </ul>
              </div>
            </GuideSection>

            <div className="grid md:grid-cols-3 gap-6">
              <QuickTip 
                icon={Globe}
                title="Housing Resources"
                description="Use university housing services, Kijiji, Facebook groups, and Places4Students.com to find accommodation."
              />
              <QuickTip 
                icon={Shield}
                title="Tenant Rights"
                description="Learn about Canadian tenant rights and protections. Each province has different rental laws."
              />
              <QuickTip 
                icon={Phone}
                title="Emergency Contacts"
                description="Keep emergency contacts handy including campus security, local police (911), and your embassy."
              />
            </div>
          </div>
        )}

        {/* Visa & Immigration */}
        {activeSection === 'visa' && (
          <div className="space-y-8">
            <GuideSection 
              icon={FileText} 
              title="Visa & Immigration Process"
              image="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop&q=80"
              imagePosition="left"
            >
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Study Permit Requirements</h3>
                <p>A study permit is required for programs longer than 6 months. Apply as early as possible as processing can take several weeks.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Letter of Acceptance from DLI institution</li>
                  <li>Proof of financial support</li>
                  <li>Medical exam (if required)</li>
                  <li>Police clearance certificate</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Work While Studying</h3>
                <p>With a valid study permit, you can work part-time during studies and full-time during breaks.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Maximum 20 hours/week during classes</li>
                  <li>Full-time during scheduled breaks</li>
                  <li>No separate work permit needed</li>
                  <li>Apply for SIN number upon arrival</li>
                </ul>
              </div>
            </GuideSection>

            <div className="bg-white rounded-xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Immigration Timeline</h3>
              <div className="space-y-4">
                <TimelineItem 
                  icon={FileText}
                  title="1. Get Accepted"
                  description="Receive Letter of Acceptance from a Designated Learning Institution (DLI)"
                />
                <TimelineItem 
                  icon={CreditCard}
                  title="2. Prepare Finances"
                  description="Gather proof of funds, tuition payment, and financial support documents"
                />
                <TimelineItem 
                  icon={Shield}
                  title="3. Apply for Study Permit"
                  description="Submit online application with all required documents and biometrics"
                />
                <TimelineItem 
                  icon={Plane}
                  title="4. Travel to Canada"
                  description="Book flights, arrange temporary accommodation, and prepare for arrival"
                  isLast={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Arrival & Settlement */}
        {activeSection === 'arrival' && (
          <div className="space-y-8">
            <GuideSection 
              icon={Plane} 
              title="Arriving in Canada"
              image="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop&q=80"
            >
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Airport Arrival</h3>
                <p>Upon arrival at a Canadian airport, you'll need to present your documents to immigration officers and officially enter Canada as a student.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Passport with study permit</li>
                  <li>Letter of Acceptance</li>
                  <li>Proof of funds</li>
                  <li>Temporary accommodation address</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">First Week Essentials</h3>
                <p>Focus on these critical tasks in your first week to set yourself up for success.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Apply for Social Insurance Number (SIN)</li>
                  <li>Open a Canadian bank account</li>
                  <li>Get a local phone plan</li>
                  <li>Register for student orientation</li>
                </ul>
              </div>
            </GuideSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <QuickTip 
                icon={CreditCard}
                title="Banking"
                description="Major banks like RBC, TD, and Scotiabank offer student packages with no monthly fees."
              />
              <QuickTip 
                icon={Phone}
                title="Phone Plans"
                description="Compare plans from Rogers, Bell, and Telus. Consider prepaid options initially."
              />
              <QuickTip 
                icon={Car}
                title="Transportation"
                description="Get familiar with public transit. Many cities offer student discounts on transit passes."
              />
              <QuickTip 
                icon={Coffee}
                title="Cultural Integration"
                description="Join student clubs, attend campus events, and explore local community centers."
              />
            </div>
          </div>
        )}

        {/* Student Life */}
        {activeSection === 'life' && (
          <div className="space-y-8">
            <GuideSection 
              icon={Users} 
              title="Campus Life & Community"
              image="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=600&fit=crop&q=80"
              imagePosition="left"
            >
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Student Organizations</h3>
                <p>Join clubs, societies, and student government to make friends and develop leadership skills.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Cultural and international student associations</li>
                  <li>Academic and professional clubs</li>
                  <li>Sports teams and recreational clubs</li>
                  <li>Volunteer opportunities</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Campus Resources</h3>
                <p>Take advantage of student services designed to support your academic and personal success.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Academic support centers and tutoring</li>
                  <li>Career services and job placement</li>
                  <li>Mental health and counseling services</li>
                  <li>International student services</li>
                </ul>
              </div>
            </GuideSection>

            <Card>
              <CardHeader>
                <CardTitle>Canadian Student Lifestyle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Social Activities</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Coffee className="w-5 h-5 text-orange-500" />
                        <span>Coffee culture and study cafes</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-500" />
                        <span>Student mixers and networking events</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-red-500" />
                        <span>City exploration and cultural events</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Academic Culture</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-purple-500" />
                        <span>Punctuality and deadline management</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-green-500" />
                        <span>Group projects and collaboration</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-indigo-500" />
                        <span>Office hours and professor interaction</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Health & Wellness */}
        {activeSection === 'health' && (
          <div className="space-y-8">
            <GuideSection 
              icon={Heart} 
              title="Health & Wellness"
              image="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop&q=80"
            >
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Health Insurance</h3>
                <p>Most provinces provide health coverage for international students, but additional insurance is recommended.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Apply for provincial health coverage immediately</li>
                  <li>Consider supplemental insurance for dental/vision</li>
                  <li>Understand what's covered vs. out-of-pocket</li>
                  <li>Keep insurance cards with you always</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Mental Health Support</h3>
                <p>Canadian universities prioritize mental health with comprehensive support services.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Free counseling services on campus</li>
                  <li>Peer support groups and workshops</li>
                  <li>24/7 crisis support hotlines</li>
                  <li>Academic stress management resources</li>
                </ul>
              </div>
            </GuideSection>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Campus Health Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">Most campuses have on-site health centers providing:</p>
                  <ul className="space-y-2 text-sm">
                    <li>• Routine medical care</li>
                    <li>• Immunizations and health screenings</li>
                    <li>• Mental health counseling</li>
                    <li>• Health education programs</li>
                    <li>• Emergency first aid</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Wellness Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">Stay healthy with campus wellness programs:</p>
                  <ul className="space-y-2 text-sm">
                    <li>• Fitness centers and group classes</li>
                    <li>• Intramural sports leagues</li>
                    <li>• Meditation and mindfulness sessions</li>
                    <li>• Nutrition workshops</li>
                    <li>• Outdoor recreation programs</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Emergency Resources */}
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Phone className="w-5 h-5" />
              Emergency Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">911</div>
                <p className="text-red-700 font-medium">Emergency Services</p>
                <p className="text-sm text-red-600">Police, Fire, Ambulance</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">Campus Security</div>
                <p className="text-red-700 font-medium">24/7 Campus Safety</p>
                <p className="text-sm text-red-600">Check your student handbook</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">Health Link</div>
                <p className="text-red-700 font-medium">Non-Emergency Health</p>
                <p className="text-sm text-red-600">811 (varies by province)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-xl mb-6 text-green-100">Join thousands of successful international students in Canada.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg" asChild>
                <a href={createPageUrl('Schools')}>Explore Schools</a>
              </Button>
              <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-green-600" asChild>
                <a href={createPageUrl('VisaPackages')}>Get Visa Help</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
