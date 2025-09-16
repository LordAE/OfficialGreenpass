import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, GraduationCap, CheckCircle, AlertTriangle } from 'lucide-react';
import { School } from '@/api/entities';

const generateSchoolData = () => {
  const institutions = [
    "University of Toronto", "McGill University", "University of British Columbia", 
    "York University", "Seneca College", "George Brown College", "Humber College",
    "Centennial College", "Sheridan College", "Algonquin College"
  ];
  
  const schoolNames = [
    "St. George Campus", "Scarborough Campus", "Mississauga Campus", "Downtown Campus",
    "North Campus", "South Campus", "Main Campus", "Lakeshore Campus", "King Campus"
  ];
  
  const programs = [
    "Bachelor of Commerce", "Master of Business Administration", "Bachelor of Science",
    "Bachelor of Engineering", "Master of Engineering", "Bachelor of Arts",
    "Diploma in Business Administration", "Certificate in Web Development",
    "Advanced Diploma in Computer Programming", "Graduate Certificate in Project Management"
  ];
  
  const cities = ["Toronto", "Vancouver", "Montreal", "Ottawa", "Calgary", "Edmonton", "Winnipeg", "Halifax"];
  const provinces = ["ON", "BC", "QC", "AB", "MB", "NS"];
  const fields = ["Business", "Engineering", "Computer Science", "Arts", "Health Sciences", "Design"];
  const levels = ["bachelor", "master", "diploma", "certificate", "graduate_certificate"];
  
  const schools = [];
  
  for (let i = 0; i < 150; i++) {
    const institution = institutions[Math.floor(Math.random() * institutions.length)];
    const schoolName = schoolNames[Math.floor(Math.random() * schoolNames.length)];
    const program = programs[Math.floor(Math.random() * programs.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const province = provinces[Math.floor(Math.random() * provinces.length)];
    const field = fields[Math.floor(Math.random() * fields.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    
    const intakeYears = ["2026", "2027"];
    const intakeTerms = ["Winter", "Spring", "Summer", "Fall"];
    const intakes = [];
    
    // Generate 2-4 random intakes
    const numIntakes = Math.floor(Math.random() * 3) + 2;
    for (let j = 0; j < numIntakes; j++) {
      const year = intakeYears[Math.floor(Math.random() * intakeYears.length)];
      const term = intakeTerms[Math.floor(Math.random() * intakeTerms.length)];
      intakes.push(`${term} ${year}`);
    }
    
    schools.push({
      institution_name: institution,
      institution_type: Math.random() > 0.3 ? "University" : "College",
      institution_logo_url: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop",
      institution_website: `https://www.${institution.toLowerCase().replace(/\s+/g, '')}.ca`,
      institution_about: `${institution} is a leading educational institution in Canada, offering world-class programs and research opportunities.`,
      is_dli: true,
      dli_number: `O${Math.floor(Math.random() * 900000) + 100000}`,
      school_name: schoolName,
      school_image_url: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=250&fit=crop",
      school_country: "Canada",
      school_province: province,
      school_city: city,
      program_title: program,
      program_level: level,
      field_of_study: field,
      duration_display: level === "bachelor" ? "4 years" : level === "master" ? "2 years" : "1-2 years",
      tuition_fee_cad: Math.floor(Math.random() * 30000) + 15000,
      application_fee: Math.floor(Math.random() * 200) + 100,
      intake_dates: intakes,
      program_overview: `This comprehensive ${program} program at ${institution} provides students with the knowledge and skills needed to excel in ${field.toLowerCase()}.`,
      career_outcomes: [
        `${field} Specialist`,
        `Project Manager`,
        `Research Analyst`,
        `Consultant`
      ],
      entry_requirements: {
        academic: ["High school diploma or equivalent", "Minimum GPA of 3.0"],
        english_proficiency: ["IELTS 6.5 overall", "TOEFL iBT 90", "Duolingo 115"],
        other: ["Personal statement", "Letters of recommendation"]
      },
      is_active: true,
      is_featured: Math.random() > 0.8,
      delivery_mode: Math.random() > 0.2 ? "In-person" : "Online",
      language_of_instruction: "English",
      school_type: Math.random() > 0.3 ? "Public" : "Private",
      scholarships_available: Math.random() > 0.6,
      application_deadline: "Rolling",
      housing_available: Math.random() > 0.4,
      curriculum: "Canadian"
    });
  }
  
  return schools;
};

export default function SchoolDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState(null);

  const seedSchools = async () => {
    setIsSeeding(true);
    setResult(null);
    
    try {
      const schoolsData = generateSchoolData();
      let successCount = 0;
      const errors = [];

      for (const schoolData of schoolsData) {
        try {
          await School.create(schoolData);
          successCount++;
        } catch (error) {
          console.error(`Failed to create school: ${schoolData.school_name}`, error);
          errors.push(`${schoolData.school_name}: ${error.message}`);
        }
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setResult({
        success: true,
        message: `Successfully created ${successCount} school records`,
        details: errors.length > 0 ? `Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}` : null
      });

    } catch (error) {
      console.error('Error seeding schools:', error);
      setResult({
        success: false,
        message: 'Failed to seed schools',
        details: error.message
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          School Data Seeder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-2">
          Use this tool to add comprehensive school and program data into the database.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          This will add 150 school records with intake dates in 2026 and beyond, covering various education levels.
        </p>
        
        {result && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
            result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {result.success ? (
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">{result.message}</p>
              {result.details && <p className="text-sm">{result.details}</p>}
            </div>
          </div>
        )}
        
        <Button 
          onClick={seedSchools}
          disabled={isSeeding}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSeeding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Seed School Data
        </Button>
      </CardContent>
    </Card>
  );
}