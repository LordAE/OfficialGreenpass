
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, Package, CreditCard } from 'lucide-react';
import { User } from '@/api/entities';
import { VisaPackage } from '@/api/entities';
import { TutorPackage } from '@/api/entities';
import { StudentTutorPackage } from '@/api/entities';
import { TutoringSession } from '@/api/entities'; // Added for new package type
import { Case } from '@/api/entities';
import SharedPaymentGateway from '../components/payments/SharedPaymentGateway';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [packageData, setPackageData] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Get URL parameters with extensive debugging
  const urlParams = new URLSearchParams(window.location.search);
  const packageType = urlParams.get('type');
  const packageId = urlParams.get('packageId') || urlParams.get('package') || urlParams.get('id');
  
  // Debug logging
  console.log('Checkout Debug Info:', {
    fullUrl: window.location.href,
    searchParams: window.location.search,
    packageType,
    packageId,
    allParams: Object.fromEntries(urlParams.entries())
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading checkout data with:', { packageType, packageId });
        console.log('Current URL:', window.location.href);
        console.log('URL Search Params:', window.location.search);

        // Load current user
        const currentUser = await User.me();
        setUser(currentUser);

        // Validate parameters
        if (!packageType) {
          throw new Error(`Package type is missing from URL. Current URL: ${window.location.href}. Expected ?type=visa or ?type=tutor etc.`);
        }

        if (!packageId) {
          throw new Error(`Package ID is missing from URL. Current URL: ${window.location.href}. Expected ?packageId=... parameter.`);
        }

        // Load package data based on type
        let pkg = null;
        let allPackages = [];

        try {
          switch (packageType) {
            case 'visa':
              allPackages = await VisaPackage.list();
              console.log('Available visa packages:', allPackages);
              pkg = allPackages.find(p => p.id === packageId || p.name === packageId);
              break;
              
            case 'tutor':
              allPackages = await TutorPackage.list();
              console.log('Available tutor packages:', allPackages);
              pkg = allPackages.find(p => p.id === packageId || p.name === packageId);
              break;
              
            case 'student_tutor':
              allPackages = await StudentTutorPackage.list();
              console.log('Available student tutor packages:', allPackages);
              pkg = allPackages.find(p => p.id === packageId || p.name === packageId);
              break;

            case 'tutoring_session':
              // Handle tutoring sessions
              const sessions = await TutoringSession.list();
              const session = sessions.find(s => s.id === packageId);
              if (session) {
                pkg = {
                  id: session.id,
                  name: `Tutoring Session - ${session.subject}`,
                  description: `${session.duration} minute session`,
                  price_usd: session.price,
                  features: [`Subject: ${session.subject}`, `Duration: ${session.duration} minutes`],
                  type: 'tutoring_session'
                };
              }
              break;
              
            case 'marketplace_order':
              // Handle marketplace orders
              const { MarketplaceOrder } = await import('@/api/entities');
              const { Service } = await import('@/api/entities');
              
              const orders = await MarketplaceOrder.list();
              const order = orders.find(o => o.id === packageId);
              
              if (order) {
                const services = await Service.list();
                const service = services.find(s => s.id === order.service_id);
                
                if (service) {
                  pkg = {
                    id: order.id,
                    name: service.name,
                    description: service.description,
                    price_usd: order.amount_usd,
                    features: [`Service: ${service.name}`, `Category: ${service.category}`],
                    type: 'marketplace_order'
                  };
                }
              }
              break;
              
            default:
              throw new Error(`Invalid package type: ${packageType}. Expected: visa, tutor, student_tutor, tutoring_session, or marketplace_order`);
          }
        } catch (dbError) {
          console.error('Database error loading packages:', dbError);
          throw new Error(`Failed to load packages from database: ${dbError.message}`);
        }

        console.log('Found package:', pkg);
        console.log('All available packages:', allPackages);

        if (!pkg) {
          const availableIds = allPackages.map(p => p.id || p.name).filter(Boolean);
          throw new Error(`Package not found. Looking for ID: "${packageId}" in type: "${packageType}". Available packages: [${availableIds.join(', ')}]. Current URL: ${window.location.href}`);
        }

        // Ensure package has required fields
        const finalPackage = {
          ...pkg,
          type: packageType,
          price_usd: pkg.price_usd || pkg.price || 0,
          name: pkg.name || 'Unnamed Package',
          description: pkg.description || 'No description available',
          features: pkg.features || pkg.key_benefits || []
        };

        console.log('Final package data:', finalPackage);
        setPackageData(finalPackage);

      } catch (err) {
        console.error('Checkout error details:', err);
        setError(err.message || 'Failed to load package information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [packageType, packageId]);

  // Fixed: Proper payment success handling
  const handlePaymentSuccess = async (paymentData) => {
    try {
      setLoading(true);
      
      // Update user with purchased package
      const currentPackages = user.purchased_packages || [];
      const currentTutorPackages = user.purchased_tutor_packages || [];
      
      let updatedUserData = {};
      
      switch (packageData.type) {
        case 'visa':
          // Add to purchased packages and update user type to student
          updatedUserData = {
            purchased_packages: [...currentPackages, packageData.name],
            user_type: 'student' // Upgrade from 'user' to 'student'
          };
          
          // Create a case for the visa application
          await Case.create({
            student_id: user.id,
            case_type: packageData.name,
            package_id: packageData.id,
            status: 'Application Started',
            case_requirements: packageData.doc_requirements || [],
            case_upload_tips: packageData.upload_tips || [],
            checklist: (packageData.doc_requirements || []).map(req => ({
              task: req.label,
              status: 'pending'
            })),
            timeline: [{
              event: 'Package purchased and case created',
              date: new Date().toISOString(),
              actor: 'system'
            }]
          });
          break;
          
        case 'tutor':
          updatedUserData = {
            purchased_tutor_packages: [...currentTutorPackages, packageData.name],
            user_type: 'tutor' // Set user type to tutor
          };
          break;
          
        case 'student_tutor':
          const sessionCredits = user.session_credits || 0;
          updatedUserData = {
            session_credits: sessionCredits + (packageData.num_sessions || 1)
          };
          break;
        
        case 'tutoring_session':
            // No direct user update needed for a single session purchase, but could add history
            break;
          
        case 'marketplace_order':
          // No specific user data updates needed for marketplace orders
          break;
      }
      
      // Update user data if there's anything to update
      if (Object.keys(updatedUserData).length > 0) {
        await User.updateMyUserData(updatedUserData);
      }
      
      // Redirect to appropriate success page
      switch (packageData.type) {
        case 'visa':
          navigate(createPageUrl('VisaRequests'));
          break;
        case 'tutor':
          navigate(createPageUrl('TutorAvailability'));
          break;
        case 'student_tutor':
          navigate(createPageUrl('Tutors'));
          break;
        case 'tutoring_session':
          navigate(createPageUrl('StudentDashboard')); // Or a specific session confirmation page
          break;
        case 'marketplace_order':
          navigate(createPageUrl('Dashboard'));
          break;
        default:
          navigate(createPageUrl('Dashboard'));
      }
      
    } catch (err) {
      console.error('Error processing successful payment:', err);
      setError('Payment was successful, but there was an error updating your account. Please contact support.');
      setLoading(false);
    }
  };

  // Fixed: Proper payment error handling
  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    setError(error.message || 'Payment failed. Please try again.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Checkout Error</h2>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate(createPageUrl('Dashboard'))} variant="outline">
                Return to Dashboard
              </Button>
              <Button onClick={() => window.location.reload()} size="sm" variant="ghost">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Package Not Found</h2>
            <p className="text-gray-600 mb-4">The requested package could not be found.</p>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
          <p className="text-gray-600">Review your selection and complete payment</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Package Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Package Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{packageData.name}</h3>
                <p className="text-gray-600 mt-1">{packageData.description}</p>
              </div>
              
              {packageData.features && packageData.features.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Included:</h4>
                  <ul className="space-y-1">
                    {packageData.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${packageData.price_usd || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SharedPaymentGateway
                entityType={`${packageData.type}_package_purchase`}
                entityId={packageData.id}
                amount={packageData.price_usd || 0}
                description={`${packageData.name} - ${packageData.type} package`}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
