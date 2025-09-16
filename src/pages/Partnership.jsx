import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, GraduationCap, Building, LifeBuoy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const partnershipTiers = [
  {
    icon: <Users className="w-8 h-8 text-blue-500" />,
    title: "Become an Education Agent",
    description: "Join our global network of certified education agents. You'll gain access to our extensive portfolio of partner institutions, a steady stream of student leads, and a powerful platform to manage applications and commissions. We provide training, marketing support, and a competitive commission structure to help you grow your business.",
    link: createPageUrl("Welcome"),
    linkText: "Register as an Agent",
  },
  {
    icon: <GraduationCap className="w-8 h-8 text-green-500" />,
    title: "Become a Tutor",
    description: "Are you an expert in test preparation (IELTS, TOEFL, etc.) or language training? Partner with us to connect with students from around the world. Our platform offers a flexible way to manage your schedule, conduct online sessions, and receive payments, allowing you to focus on what you do best: teaching.",
    link: createPageUrl("Welcome"),
    linkText: "Register as a Tutor",
  },
  {
    icon: <Building className="w-8 h-8 text-indigo-500" />,
    title: "For Institutions",
    description: "Partner with GreenPass to expand your global reach and diversify your student body. Showcase your institution and programs to a vast audience of prospective international students and connect with our pre-vetted network of agents. We offer marketing solutions and application management tools to streamline your recruitment efforts.",
    link: createPageUrl("Welcome"),
    linkText: "Register your Institution",
  },
  {
    icon: <LifeBuoy className="w-8 h-8 text-red-500" />,
    title: "Offer Student Services",
    description: "From accommodation and airport transfers to SIM cards and banking, international students have diverse needs upon arrival. If you are a trusted provider of student-essential services, our marketplace is the perfect platform to reach them. List your services and connect with students before they even arrive.",
    link: createPageUrl("Welcome"),
    linkText: "Register as a Vendor",
  },
];

export default function Partnership() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-16 text-center">
        <Handshake className="w-16 h-16 mx-auto text-blue-600 mb-6" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
          Partner with GreenPass
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          We are building a comprehensive ecosystem to support students on their journey to study abroad. Join us to expand your reach and grow your business.
        </p>
      </div>

      <div className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {partnershipTiers.map((tier) => (
            <Card key={tier.title} className="flex flex-col">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    {tier.icon}
                </div>
                <CardTitle className="text-2xl">{tier.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-gray-600 text-center">
                  {tier.description}
                </p>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to={tier.link}>
                  <Button className="w-full">{tier.linkText}</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}