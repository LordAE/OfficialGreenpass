import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, School, CheckCircle, AlertTriangle } from 'lucide-react';
import { SchoolProfile } from '@/api/entities';
import { User } from '@/api/entities';

const generateSchoolProfileData = () => {
  const schoolNames = [
    "Toronto International Academy", "Vancouver Global College", "Montreal Excellence School",
    "Calgary Advanced Institute", "Ottawa Premier College", "Mississauga International School",
    "Markham Elite Academy", "Richmond Hill Global School", "Burnaby International College",
    "Scarborough Advanced Academy"
  ];
  
  const provinces = ["ON", "BC", "QC", "AB"];
  const cities = {
    "ON": ["Toronto", "Ottawa", "Mississauga", "Markham", "Scarborough"],
    "BC": ["Vancouver", "Burnaby", "Richmond"],
    "QC": ["Montreal", "Quebec City"],
    "AB": ["Calgary", "Edmonton"]
  };
  
  const schoolLevels = ["University", "College", "High School"];
  const schoolTypes = ["Public", "Private"];
  
  const profiles = [];
  
  for (let i = 0; i < 50; i++) {
    const schoolName = schoolNames[Math.floor(Math.random() * schoolNames.length)];
    const province = provinces[Math.floor(Math.random() * provinces.length)];
    const city = cities[province][Math.floor(Math.random() * cities[province].length)];
    const level = schoolLevels[Math.floor(Math.random() * schoolLevels.length)];
    const type = schoolTypes[Math.floor(Math.random() * schoolTypes.length)];
    
    // Generate programs for the school
    const programTypes = [
      "Business Administration", "Computer Science", "Engineering", "Arts & Sciences",
      "Health Sciences", "Design", "Hospitality", "Culinary Arts"
    ];
    
    const programs = [];
    const numPrograms = Math.floor(Math.random() * 5) + 2; // 2-6 programs
    
    for (let j = 0; j < numPrograms; j++) {
      const programType = programTypes[Math.floor(Math.random() * programTypes.length)];
      programs.push({
        name: `${programType} Program`,
        level: level === "High School" ? "Secondary" : level === "College" ? "Diploma" : "Bachelor",
        duration: level === "High School" ? "1 year" : level === "College" ? "2 years" : "4 years",
        tuition: Math.floor(Math.random() * 25000) + 15000,
        available_seats: Math.floor(Math.random() * 100) + 20
      });
    }
    
    profiles.push({
      user_id: `school_${i + 1}_placeholder`, // This will need to be replaced with actual user IDs
      name: schoolName,
      school_level: level,
      location: city,
      province: province,
      country: "Canada",
      founded_year: Math.floor(Math.random() * 50) + 1970, // 1970-2020
      address: `${Math.floor(Math.random() * 9999) + 1} ${city} Street, ${city}, ${province}, Canada`,
      about: `${schoolName} is a prestigious ${level.toLowerCase()} located in ${city}, ${province}. We offer world-class education with a focus on academic excellence and student success.`,
      website: `https://www.${schoolName.toLowerCase().replace(/\s+/g, '')}.ca`,
      image_url: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=250&fit=crop",
      rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
      acceptance_rate: Math.floor(Math.random() * 40) + 60, // 60-100%
      tuition_fees: Math.floor(Math.random() * 20000) + 18000,
      application_fee: Math.floor(Math.random() * 150) + 100,
      cost_of_living: Math.floor(Math.random() * 10000) + 12000,
      programs: programs,
      verification_status: Math.random() > 0.3 ? "verified" : "pending"
    });
  }
  
  return profiles;
};

export default function SchoolProfileDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState(null);

  const seedSchoolProfiles = async () => {
    setIsSeeding(true);
    setResult(null);
    
    try {
      // Get some admin users to use as placeholder school users
      const users = await User.list('', 20);
      const adminUsers = users.filter(u => u.user_type === 'admin' || u.user_type === 'school');
      
      if (adminUsers.length === 0) {
        setResult({
          success: false,
          message: 'No admin or school users found',
          details: 'Please create some admin users first to associate with school profiles'
        });
        setIsSeeding(false);
        return;
      }
      
      const profilesData = generateSchoolProfileData();
      let successCount = 0;
      const errors = [];

      for (let i = 0; i < profilesData.length; i++) {
        const profileData = profilesData[i];
        
        // Use a real user ID
        profileData.user_id = adminUsers[i % adminUsers.length].id;
        
        try {
          await SchoolProfile.create(profileData);
          successCount++;
        } catch (error) {
          console.error(`Failed to create school profile: ${profileData.name}`, error);
          errors.push(`${profileData.name}: ${error.message}`);
        }
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      setResult({
        success: true,
        message: `Successfully created ${successCount} school profile records`,
        details: errors.length > 0 ? `Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}` : null
      });

    } catch (error) {
      console.error('Error seeding school profiles:', error);
      setResult({
        success: false,
        message: 'Failed to seed school profiles',
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
          <School className="w-5 h-5" />
          School Profile Data Seeder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-2">
          Use this tool to add comprehensive school profile data into the database.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          This will add 50 school profile records with detailed information and program offerings.
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
          onClick={seedSchoolProfiles}
          disabled={isSeeding}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isSeeding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Seed School Profile Data
        </Button>
      </CardContent>
    </Card>
  );
}