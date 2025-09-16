
import React, { useState, useEffect } from 'react';
import { VisaPackage } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, ArrowRight, Sparkles, FileText } from "lucide-react";
import { Link } from 'react-router-dom'; // useNavigate removed as it's no longer used
import { createPageUrl } from '@/utils';
import IconResolver from '@/components/IconResolver';

export default function VisaPackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const packageData = await VisaPackage.list();
        console.log('Loaded visa packages:', packageData);
        setPackages(packageData);
      } catch (error) {
        console.error("Failed to fetch visa packages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);
  
  const handleGetStarted = (pkg) => { // Removed 'async' keyword as no 'await' calls are made
    try {
      console.log('Getting started with package:', pkg);
      
      // Validate package has ID
      if (!pkg.id && !pkg.name) {
        alert('Package information is incomplete. Please try again.');
        return;
      }
      
      const packageId = pkg.id || pkg.name;
      
      // Use direct URL navigation to avoid any React Router issues
      const checkoutUrl = `/Checkout?type=visa&packageId=${encodeURIComponent(packageId)}`;
      console.log('Direct navigation to:', checkoutUrl);
      
      // Force a direct navigation using window.location
      window.location.href = checkoutUrl;
      
    } catch (error) {
      console.error('Error in handleGetStarted:', error);
      alert('Navigation failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 via-white to-blue-50 min-h-screen">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Canada Visa Application Packages
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Expert guidance for your journey to Canada. Choose a package that fits your needs and let us handle the complexities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`flex flex-col rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
                pkg.popular ? 'border-2 border-green-500 relative' : 'border'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 right-4 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-lg">
                  <Sparkles className="w-4 h-4" />
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <div className="mx-auto bg-green-100 text-green-600 p-4 rounded-full w-fit mb-4">
                   <IconResolver name={pkg.icon || 'GraduationCap'} className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl font-bold">{pkg.name}</CardTitle>
                <CardDescription className="text-gray-600 text-base">{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between px-6 pb-8">
                <div className="mb-8">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">${pkg.price}</span>
                    <span className="text-lg text-gray-500"> USD</span>
                  </div>
                  <ul className="space-y-4">
                    {(pkg.features || []).map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button 
                  onClick={() => handleGetStarted(pkg)} 
                  size="lg" 
                  className="w-full bg-green-600 hover:bg-green-700 text-lg font-semibold group"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {packages.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No packages available</h3>
            <p className="text-gray-600">Visa packages are currently being updated. Please check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
