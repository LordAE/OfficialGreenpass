
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tutor } from '@/api/entities';
import { User } from '@/api/entities';
import { StudentTutorPackage } from '@/api/entities'; // Import new entity
import { TutoringSession } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Calendar, DollarSign, Clock, BookOpen, Languages, User as UserIcon, Check, Award, Sparkles, Rocket, Target, Users as UsersIcon } from 'lucide-react';
import BookingModal from '../components/tutors/BookingModal';
import { createPageUrl } from '@/utils';

const StudentPackageCard = ({ pkg, onSelect }) => {
    const ICONS = { Sparkles, Book:BookOpen, Rocket, Target, Users:UsersIcon };
    const Icon = ICONS[pkg.icon] || Award; // Fallback to Award if icon not found
    return (
        <Card className="bg-white/95 backdrop-blur-sm hover:shadow-lg transition-all duration-300 border rounded-xl flex flex-col">
          <CardContent className="p-6 flex flex-col flex-grow">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
              <p className="text-sm text-gray-500">{pkg.target_user}</p>
              <p className="text-2xl font-bold text-green-600 my-2">{pkg.price_display}</p>
            </div>
            <div className="space-y-2 mb-4 flex-grow">
              {pkg.key_benefits.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => onSelect(pkg)}
              className="w-full mt-4 font-semibold bg-green-600 hover:bg-green-700 text-white"
              disabled={pkg.price_usd === 0}
            >
              {pkg.price_usd === 0 ? 'Free Trial' : 'Purchase Package'}
            </Button>
          </CardContent>
        </Card>
    );
};

export default function TutorDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // Keep navigate as it might be used by other features, though not for student package selection anymore
  const tutorId = searchParams.get('id');
  
  const [tutor, setTutor] = useState(null);
  const [tutorUser, setTutorUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [error, setError] = useState(null);
  const [studentPackages, setStudentPackages] = useState([]);

  useEffect(() => {
    const fetchTutorDetails = async () => {
      if (!tutorId) {
        setError('No tutor ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // First, get the tutor record
        const tutorData = await Tutor.filter({ id: tutorId });
        
        if (!tutorData || tutorData.length === 0) {
          setError('Tutor not found');
          setLoading(false);
          return;
        }

        const tutorRecord = tutorData[0];
        setTutor(tutorRecord);

        // Then, get the user data using the user_id from the tutor record
        if (tutorRecord.user_id) {
          try {
            // Validate that user_id is a proper ObjectId format
            const validObjectIdRegex = /^[a-fA-F0-9]{24}$/;
            if (validObjectIdRegex.test(tutorRecord.user_id)) {
              const userData = await User.filter({ id: tutorRecord.user_id });
              if (userData && userData.length > 0) {
                setTutorUser(userData[0]);
              }
            } else {
              console.warn('Invalid user_id format:', tutorRecord.user_id);
            }
          } catch (userError) {
            console.error('Error fetching user data:', userError);
            // Continue without user data rather than failing completely
          }
        }
        
        // Fetch student packages
        try {
            const packages = await StudentTutorPackage.list();
            setStudentPackages(packages);
        } catch(e) {
            console.error("Could not load student packages", e);
        }

      } catch (error) {
        console.error('Failed to fetch tutor details:', error);
        setError('Failed to load tutor details');
      }
      
      setLoading(false);
    };

    fetchTutorDetails();
  }, [tutorId]);

  const handleSelectStudentPackage = (pkg) => {
    if (pkg.price_usd === 0) {
      alert('Free trial will be available soon!');
    } else {
      try {
        console.log('Purchasing student package:', pkg);
        const packageId = pkg.id || pkg.name; // Use pkg.id, falling back to name if ID is somehow missing
        
        // Use direct URL navigation
        const checkoutUrl = `/Checkout?type=student_tutor&packageId=${encodeURIComponent(packageId)}`;
        console.log('Direct navigation to:', checkoutUrl);
        window.location.href = checkoutUrl;
        
      } catch (error) {
        console.error('Error navigating to checkout:', error);
        alert('Navigation failed. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Tutor</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tutor Not Found</h2>
          <p className="text-gray-600">The tutor you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BookingModal 
        open={showBookingModal} 
        onOpenChange={setShowBookingModal}
        tutor={tutor}
        tutorUser={tutorUser}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Tutor Profile Header */}
          <Card className="mb-8 bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <img 
                  src={tutorUser?.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${tutorUser?.full_name || 'Tutor'}`} 
                  alt={tutorUser?.full_name || 'Tutor'}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                />
                
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {tutorUser?.full_name || 'Professional Tutor'}
                  </h1>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="font-semibold text-lg">{tutor.rating || 4.5}</span>
                    <span className="text-gray-500">({tutor.total_students || 0} students)</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(tutor.specializations || ['IELTS']).map(spec => (
                      <Badge key={spec} className="bg-purple-100 text-purple-800">
                        {spec}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-gray-600 mb-6">
                    {tutor.bio || 'Experienced tutor ready to help you achieve your language learning goals.'}
                  </p>

                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">
                        ${tutor.hourly_rate || 25}/hr
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-600">
                        {tutor.experience_years || 0} years experience
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setShowBookingModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 text-lg"
                  >
                    Book a Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Qualifications */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tutor.qualifications && tutor.qualifications.length > 0 ? (
                  <ul className="space-y-2">
                    {tutor.qualifications.map((qual, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span>{qual}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No qualifications listed</p>
                )}
              </CardContent>
            </Card>

            {/* Languages */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-blue-600" />
                  Languages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tutor.languages && tutor.languages.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tutor.languages.map(lang => (
                      <Badge key={lang} variant="outline" className="border-blue-200 text-blue-800">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No languages listed</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Student Packages Section */}
          <div className="mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Need more than one session?</h2>
              <p className="text-lg text-gray-600">Purchase a package to save on fees and get extra benefits.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentPackages.map(pkg => (
                <StudentPackageCard key={pkg.id} pkg={pkg} onSelect={handleSelectStudentPackage} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
