import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Program } from '@/api/entities';
import { School } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, GraduationCap, Building, DollarSign, Calendar, Info, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReserveSeatModal from '../components/schools/ReserveSeatModal';

export default function ProgramDetails() {
  const [searchParams] = useSearchParams();
  const [program, setProgram] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProgramDetails = async () => {
      const programId = searchParams.get('id');
      if (!programId) {
        setError("No program ID provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Try to find program by ID first
        const allPrograms = await Program.list();
        const fetchedProgram = allPrograms.find(p => p.id === programId);
        
        if (!fetchedProgram) {
          throw new Error("Program not found.");
        }
        
        setProgram(fetchedProgram);

        // Fetch associated school
        if (fetchedProgram.schoolId) {
          const allSchools = await School.list();
          const associatedSchool = allSchools.find(s => s.id === fetchedProgram.schoolId);
          if (associatedSchool) {
            setSchool(associatedSchool);
          }
        }
      } catch (e) {
        console.error("Failed to fetch program details:", e);
        setError(e.message || "An error occurred while fetching program details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProgramDetails();
  }, [searchParams]);

  const handleReserveProgram = () => {
    if (program && school) {
      setIsModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Program Not Found</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to={createPageUrl('Schools')}>
          <Button variant="outline">Back to Schools</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <Badge variant="secondary" className="mb-2">{program?.programLevel}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{program?.programTitle}</h1>
          {school && (
            <Link to={createPageUrl(`SchoolDetails?id=${school.id}`)} className="text-lg text-gray-600 hover:text-green-600 transition-colors flex items-center gap-2 mt-2">
              <Building className="w-5 h-5" />
              <span>{school.name}</span>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Program Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {program?.overview || 'No overview available for this program.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">Duration</p>
                    <p className="text-gray-600">{program?.duration || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Level</p>
                    <p className="text-gray-600">{program?.programLevel}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Tuition Fee</p>
                    <p className="text-gray-600">${program?.tuitionFee?.toLocaleString() || 'Contact school'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Cost of Living</p>
                    <p className="text-gray-600">${program?.costOfLiving?.toLocaleString() || 'Not specified'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {program?.intakeDates?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Intake Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {program.intakeDates.map((date, index) => (
                      <Badge key={index} variant="outline">{date}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {school && (
              <Card>
                <CardHeader>
                  <CardTitle>School Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span>{school.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{school.location}, {school.province}</span>
                  </div>
                  <Link to={createPageUrl(`SchoolDetails?id=${school.id}`)}>
                    <Button variant="outline" className="w-full">
                      View School Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Quick Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleReserveProgram} 
                  className="w-full"
                  disabled={!school}
                >
                  Reserve Program Seat
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <ReserveSeatModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          school={school}
          program={program}
        />
      </div>
    </div>
  );
}