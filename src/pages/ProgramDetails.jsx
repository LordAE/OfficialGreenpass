import React, { useState, useEffect, useCallback } from 'react';
import { School } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   Loader2, DollarSign, Calendar, GraduationCap, Info, MapPin, Award,
   ArrowRight, Globe, Clock, Users, CheckCircle, FileText
 } from 'lucide-react';
import ReserveSeatModal from '../components/schools/ReserveSeatModal';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getProvinceLabel } from '../components/utils/CanadianProvinces';
import { getLevelLabel } from '../components/utils/EducationLevels';

/* ---------------- UI helpers (unchanged look) ---------------- */
const RequirementSection = ({ title, requirements, icon: Icon }) => {
  if (!requirements || requirements.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-5 h-5 text-green-600" />}
        <h4 className="font-semibold text-lg text-gray-800">{title}</h4>
      </div>
      <ul className="space-y-2">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
            <span className="text-gray-700">{req}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const InfoCard = ({ icon: Icon, title, value, subtitle, className = "" }) => (
  <Card className={`h-full ${className}`}>
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <Icon className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="font-bold text-lg text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const safeGet = (obj, path, fallback = 'Not specified') => {
  const value = path.split('.').reduce((current, key) => current?.[key], obj);
  return (value ?? '') !== '' ? value : fallback;
};
const formatTuition = (fee) => (!fee || fee === 0 ? 'Contact School' : `$${Number(fee).toLocaleString()}`);
const formatLocation = (city, province, country) => {
  const parts = [];
  if (city?.trim()) parts.push(city);
  if (province?.trim()) parts.push(getProvinceLabel(province));
  if (country?.trim()) parts.push(country);
  return parts.length ? parts.join(', ') : 'Location not specified';
};

export default function ProgramDetail() {
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProgramDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgram(null);

    try {
      const url = new URLSearchParams(window.location.search);
      // Accept multiple param names (matches how SchoolDetails links)
      const programId =
        url.get('programId') || url.get('programid') || url.get('id');
      const schoolIdParam =
        url.get('schoolId') || url.get('schoolid') || url.get('school');

      if (!programId) {
        setError('No program ID provided in URL.');
        return;
      }

      console.log('Looking for program with ID:', programId);

      // Try direct fetch if available
      let foundProgram = null;
      if (typeof School.get === 'function') {
        try {
          const one = await School.get(programId);
          if (one && (one.id === programId || one.program_id === programId)) {
            foundProgram = one;
          }
        } catch (e) {
          // ignore; will fall back to list
        }
      }

      // Fall back to list search
      if (!foundProgram) {
        const allPrograms = await School.list('', 1000);
        console.log('Total programs found:', allPrograms?.length || 0);
        if (!allPrograms || allPrograms.length === 0) {
          setError('No programs are currently available.');
          return;
        }
        foundProgram = allPrograms.find(
          (p) => p.id === programId || p.program_id === programId
        );
      }

      if (foundProgram) {
        // Normalize a couple of fields the UI expects
        const normalized = {
          ...foundProgram,
          id: foundProgram.id || foundProgram.program_id,
          program_title:
            foundProgram.program_title || foundProgram.title || foundProgram.name,
          institution_name:
            foundProgram.institution_name || foundProgram.school_name,
          intake_dates:
            Array.isArray(foundProgram.intake_dates)
              ? foundProgram.intake_dates
              : foundProgram.intake_dates
              ? [foundProgram.intake_dates]
              : [],
        };

        setProgram(normalized);
        setError(null);
      } else {
        setError('Program not found. The program may have been removed or the link is invalid.');
      }
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('permission')) {
        setError('Missing or insufficient permissions.');
      } else {
        setError('Failed to load program details. Please try again.');
      }
      console.error('Error loading program:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgramDetails();
  }, [loadProgramDetails]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading program details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Info className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Program Not Available</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to={createPageUrl('Programs')}>
            <Button>Browse All Programs</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Program data not available.</p>
        </div>
      </div>
    );
  }

  // Extract and format (kept UI exactly the same)
  const programTitle = safeGet(program, 'program_title', 'Program Title Not Available');
  const schoolName = safeGet(program, 'school_name', 'School Name Not Available');
  const institutionName = safeGet(program, 'institution_name', schoolName);
  const programLevel = safeGet(program, 'program_level', '');
  const tuitionFee = program.tuition_fee_cad || program.tuition_fee || 0;
  const applicationFee = program.application_fee || 0;
  const duration = safeGet(program, 'duration_display', safeGet(program, 'duration', 'Contact School'));
  const deliveryMode = safeGet(program, 'delivery_mode', 'In-person');
  const location = formatLocation(program.school_city, program.school_province, program.school_country);
  const fieldOfStudy = safeGet(program, 'field_of_study', '');
  const programOverview = safeGet(program, 'program_overview', '');
  const institutionType = safeGet(program, 'institution_type', 'University');
  const schoolType = safeGet(program, 'school_type', 'Public');

  // Data passed to modal (stable regardless of param names)
  const url = new URLSearchParams(window.location.search);
  const schoolIdParam =
    url.get('schoolId') || url.get('schoolid') || url.get('school') || null;

  const modalProgramData = {
    id: program.id,
    program_title: programTitle,
    institution_name: institutionName,
    school_id: program.school_id || schoolIdParam || program.institution_id || program.id,
    institution_logo_url: program.institution_logo_url,
    school_city: program.school_city,
    school_province: program.school_province,
    school_country: program.school_country,
  };

  return (
    <>
      <ReserveSeatModal
        program={modalProgramData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <img
                  src={program.institution_logo_url || 'https://images.unsplash.com/photo-1562774053-701939374585?w=100&h=100&fit=crop'}
                  alt={`${institutionName} logo`}
                  className="w-20 h-20 object-contain bg-white border rounded-lg p-2"
                />
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{programTitle}</h1>
                  <p className="text-lg text-green-600 font-semibold">{institutionName}</p>
                  <p className="text-gray-600 flex items-center gap-2 mt-2">
                    <MapPin className="w-4 h-4" />
                    {location}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => setIsModalOpen(true)} className="mt-6 bg-green-600 hover:bg-green-700">
            Reserve Your Seat
          </Button>

          <div className="grid lg:grid-cols-3 gap-8 mt-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Facts Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard icon={DollarSign} title="Annual Tuition" value={formatTuition(tuitionFee)} subtitle={tuitionFee > 0 ? "CAD per year" : ""} />
                <InfoCard icon={Clock} title="Duration" value={duration} />
                <InfoCard icon={Globe} title="Delivery Mode" value={deliveryMode} />
                <InfoCard icon={FileText} title="Application Fee" value={applicationFee > 0 ? `$${applicationFee}` : 'Contact School'} subtitle={applicationFee > 0 ? 'CAD' : ''} />
              </div>

              {/* Program Overview Tabs */}
              <Card>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="careers">Careers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Program Description</h3>
                        {programOverview && programOverview !== 'Not specified' ? (
                          <p className="text-gray-700 leading-relaxed">{programOverview}</p>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">Detailed program description not available.</p>
                            <p className="text-gray-500 text-sm mt-2">Contact the school for more information about this program.</p>
                          </div>
                        )}
                      </div>

                      {fieldOfStudy && fieldOfStudy !== 'Not specified' && (
                        <div>
                          <h4 className="font-semibold text-lg mb-2">Field of Study</h4>
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            {fieldOfStudy}
                          </Badge>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Program Features</h4>
                          <ul className="space-y-2">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm">{safeGet(program, 'language_of_instruction', 'English')} instruction</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm">{schoolType} institution</span>
                            </li>
                            {program.housing_available && (
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm">Housing available</span>
                              </li>
                            )}
                            {program.is_dli && (
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm">DLI certified</span>
                              </li>
                            )}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Important Dates</h4>
                          <div className="space-y-2">
                            {program.application_deadline && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-red-500" />
                                <span className="text-sm">Application deadline: {program.application_deadline}</span>
                              </div>
                            )}
                            {(program.intake_dates || []).map((intake) => (
                              <div key={intake} className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-green-500" />
                                <span className="text-sm">Intake: {intake}</span>
                              </div>
                            ))}
                            {(!program.application_deadline && (!program.intake_dates || program.intake_dates.length === 0)) && (
                              <p className="text-gray-500 text-sm italic">Contact school for admission dates and deadlines.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="requirements" className="p-6">
                    {program.entry_requirements ? (
                      <div className="space-y-6">
                        <RequirementSection
                          title="Academic Requirements"
                          requirements={program.entry_requirements.academic}
                          icon={Award}
                        />
                        <RequirementSection
                          title="English Proficiency"
                          requirements={program.entry_requirements.english_proficiency}
                          icon={Globe}
                        />
                        <RequirementSection
                          title="Additional Requirements"
                          requirements={program.entry_requirements.other}
                          icon={FileText}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Specific admission requirements are not listed.</p>
                        <p className="text-gray-500 text-sm mt-2">Please contact the school directly for detailed requirements.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="details" className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Program Information</h4>
                        <div className="space-y-3">
                          {programLevel && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Level:</span>
                              <span className="font-medium">{getLevelLabel(programLevel)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-medium">{duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Delivery:</span>
                            <span className="font-medium">{deliveryMode}</span>
                          </div>
                          {program.curriculum && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Curriculum:</span>
                              <span className="font-medium">{program.curriculum}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Institution Information</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium">{institutionType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">School Type:</span>
                            <span className="font-medium">{schoolType}</span>
                          </div>
                          {program.is_dli && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">DLI Number:</span>
                              <span className="font-medium">{safeGet(program, 'dli_number', 'Certified')}</span>
                            </div>
                          )}
                          {program.institution_website && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Website:</span>
                              <a
                                href={program.institution_website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-green-600 hover:underline"
                              >
                                Visit Website
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="careers" className="p-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Career Opportunities</h3>
                      {program.career_outcomes?.length ? (
                        <div className="grid md:grid-cols-2 gap-4">
                          {program.career_outcomes.map((career, index) => (
                            <div key={index} className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                              <Award className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                              <span className="text-gray-700">{career}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Career outcome information is not available.</p>
                          <p className="text-gray-500 text-sm mt-2">Contact the school to learn about graduate opportunities and career paths.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader className="p-0">
                  <img
                    src={program.school_image_url || program.institution_logo_url || 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=250&fit=crop'}
                    alt={schoolName}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                </CardHeader>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2">{schoolName}</h3>
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <MapPin className="w-4 h-4 mr-1" />
                    {location}
                  </div>
                  {program.institution_about && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{program.institution_about}</p>
                  )}

                  {/* Quick Stats */}
                  <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Institution Type:</span>
                      <span className="font-medium">{institutionType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">School Type:</span>
                      <span className="font-medium">{schoolType}</span>
                    </div>
                    {program.housing_available && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Housing:</span>
                        <span className="font-medium text-green-600">Available</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 p-4">
                  <Button
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white hover:opacity-90"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Reserve Your Seat
                  </Button>
                  <Link to={createPageUrl(`Programs?school=${encodeURIComponent(schoolName)}`)} className="w-full">
                    <Button variant="outline" className="w-full">
                      More from this School <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Additional Info Card */}
              {program.intake_dates?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      Upcoming Intakes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {program.intake_dates.map((intake) => (
                        <Badge key={intake} variant="outline" className="block w-fit">
                          {intake}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
