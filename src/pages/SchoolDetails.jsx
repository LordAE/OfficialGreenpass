import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { School } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Globe, 
  Calendar, 
  DollarSign, 
  Star, 
  Users, 
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Building
} from "lucide-react";
import { createPageUrl } from "@/utils";

export default function SchoolDetails() {
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('id');
  
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [programsPage, setProgramsPage] = useState(1);
  const programsPerPage = 10;

  useEffect(() => {
    const fetchSchool = async () => {
      if (!schoolId) return;
      
      setLoading(true);
      try {
        const schoolData = await School.filter({ id: schoolId });
        if (schoolData && schoolData.length > 0) {
          setSchool(schoolData[0]);
        }
      } catch (error) {
        console.error("Error fetching school:", error);
      }
      setLoading(false);
    };

    fetchSchool();
  }, [schoolId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">School Not Found</h2>
          <p className="text-gray-600">The school you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const programs = school.programs || [];
  const totalPrograms = programs.length;
  const startIndex = (programsPage - 1) * programsPerPage;
  const endIndex = startIndex + programsPerPage;
  const currentPrograms = programs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(totalPrograms / programsPerPage);

  const formatLocation = () => {
    const parts = [school.location, school.province, school.country].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Navigation */}
        <Link to={createPageUrl("Schools")} className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Schools
        </Link>

        {/* School Header Card */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-shrink-0">
                {school.image_url ? (
                  <img 
                    src={school.image_url} 
                    alt={school.name}
                    className="w-48 h-32 object-cover rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-48 h-32 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-grow space-y-4">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h1 className="text-4xl font-bold text-gray-900">{school.name}</h1>
                  <div className="flex gap-2">
                    <Badge className={school.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {school.verification_status === 'verified' ? '✓ Verified' : 'Pending'}
                    </Badge>
                    <Badge className={school.account_type === 'real' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                      {school.account_type === 'real' ? 'Real' : 'Demo'}
                    </Badge>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
                      <span>{formatLocation()}</span>
                    </div>
                    {school.address && (
                      <div className="flex items-start text-gray-600">
                        <Building className="w-5 h-5 mr-2 text-emerald-600 mt-0.5" />
                        <span>{school.address}</span>
                      </div>
                    )}
                    {school.website && (
                      <div className="flex items-center text-gray-600">
                        <Globe className="w-5 h-5 mr-2 text-emerald-600" />
                        <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {school.website}
                        </a>
                      </div>
                    )}
                    {school.founded_year && (
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
                        <span>Founded {school.founded_year}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                      <span className="text-gray-700">Annual Tuition</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(school.tuition_fees)}</span>
                    </div>
                    {school.application_fee && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">Application Fee</span>
                        <span className="font-bold text-blue-600">{formatCurrency(school.application_fee)}</span>
                      </div>
                    )}
                    {school.rating && (
                      <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                        <Star className="w-5 h-5 text-yellow-400 fill-current mr-2" />
                        <span className="font-bold text-yellow-600">{school.rating}/5</span>
                      </div>
                    )}
                    {school.acceptance_rate && (
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-gray-700">Acceptance Rate</span>
                        <span className="font-bold text-purple-600">{school.acceptance_rate}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {school.about && (
                  <div className="border-t pt-4 mt-6">
                    <h3 className="font-semibold text-gray-900 mb-2">About {school.name}</h3>
                    <p className="text-gray-700 leading-relaxed">{school.about}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programs Section */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">Available Programs</CardTitle>
              <span className="text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, totalPrograms)} of {totalPrograms} programs
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Programs Available</h3>
                <p className="text-gray-600">This school hasn't listed any programs yet.</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {currentPrograms.map((program) => (
                    <Card key={program.id} className="border hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">{program.name}</h4>
                            <div className="flex gap-2 mb-2">
                              <Badge variant="secondary">{program.level}</Badge>
                              <Badge variant="outline">{program.duration}</Badge>
                            </div>
                          </div>
                          {program.available_seats !== undefined && (
                            <Badge className={program.available_seats > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {program.available_seats} seats
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tuition per year</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(program.tuition_per_year)}</span>
                          </div>
                          {program.intakes && program.intakes.length > 0 && (
                            <div>
                              <span className="text-gray-600">Intakes: </span>
                              <span className="text-gray-900">{program.intakes.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        <Link to={createPageUrl(`ProgramDetails?schoolId=${school.id}&programId=${program.id}`)}>
                          <Button className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
                            View Program Details
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setProgramsPage(prev => Math.max(1, prev - 1))}
                      disabled={programsPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <span className="text-gray-600">
                      Page {programsPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setProgramsPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={programsPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}