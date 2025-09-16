import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Building, CheckCircle, AlertTriangle } from 'lucide-react';
import { Institution } from '@/api/entities';

const sampleInstitutions = [
  {
    name: "University of Toronto",
    city: "Toronto",
    province: "ON",
    country: "Canada",
    logoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop",
    about: "The University of Toronto is a public research university in Toronto, Ontario, Canada, located on the grounds that surround Queen's Park.",
    website: "https://www.utoronto.ca",
    isFeatured: true,
    popularityScore: 95,
    rankScore: 88,
    tags: ["Research", "Public", "Top Ranked"],
    programCount: 50,
    avgTuition: 35000,
    isPublic: true,
    hasCoop: true,
    isDLI: true
  },
  {
    name: "McGill University",
    city: "Montreal",
    province: "QC",
    country: "Canada",
    logoUrl: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=200&h=200&fit=crop",
    about: "McGill University is an English-language public research university located in Montreal, Quebec, Canada.",
    website: "https://www.mcgill.ca",
    isFeatured: true,
    popularityScore: 90,
    rankScore: 85,
    tags: ["Research", "Public", "Bilingual"],
    programCount: 45,
    avgTuition: 32000,
    isPublic: true,
    hasCoop: true,
    isDLI: true
  },
  {
    name: "University of British Columbia",
    city: "Vancouver",
    province: "BC",
    country: "Canada",
    logoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop",
    about: "The University of British Columbia is a public research university with campuses near Vancouver and in Kelowna, British Columbia.",
    website: "https://www.ubc.ca",
    isFeatured: true,
    popularityScore: 88,
    rankScore: 82,
    tags: ["Research", "Public", "Coastal"],
    programCount: 48,
    avgTuition: 34000,
    isPublic: true,
    hasCoop: true,
    isDLI: true
  },
  {
    name: "York University",
    city: "Toronto",
    province: "ON",
    country: "Canada",
    logoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop",
    about: "York University is a public research university in Toronto, Ontario, Canada, with a satellite campus in Costa Rica.",
    website: "https://www.yorku.ca",
    isFeatured: false,
    popularityScore: 75,
    rankScore: 70,
    tags: ["Public", "Diverse", "Large"],
    programCount: 42,
    avgTuition: 28000,
    isPublic: true,
    hasCoop: true,
    isDLI: true
  },
  {
    name: "Seneca College",
    city: "Toronto",
    province: "ON",
    country: "Canada",
    logoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop",
    about: "Seneca College is a public college located in Toronto, Ontario, Canada, with campuses throughout the Greater Toronto Area.",
    website: "https://www.senecacollege.ca",
    isFeatured: false,
    popularityScore: 72,
    rankScore: 68,
    tags: ["College", "Applied Learning", "Career-Focused"],
    programCount: 35,
    avgTuition: 22000,
    isPublic: true,
    hasCoop: true,
    isDLI: true
  }
];

export default function InstitutionDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState(null);

  const seedInstitutions = async () => {
    setIsSeeding(true);
    setResult(null);
    
    try {
      let successCount = 0;
      const errors = [];

      for (const institutionData of sampleInstitutions) {
        try {
          await Institution.create(institutionData);
          successCount++;
        } catch (error) {
          console.error(`Failed to create institution: ${institutionData.name}`, error);
          errors.push(`${institutionData.name}: ${error.message}`);
        }
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setResult({
        success: true,
        message: `Successfully created ${successCount} institutions`,
        details: errors.length > 0 ? `Errors: ${errors.join(', ')}` : null
      });

    } catch (error) {
      console.error('Error seeding institutions:', error);
      setResult({
        success: false,
        message: 'Failed to seed institutions',
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
          <Building className="w-5 h-5" />
          Institution Data Seeder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-2">
          Use this tool to add sample institution data into the database.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          This will add {sampleInstitutions.length} institution records with comprehensive details.
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
          onClick={seedInstitutions}
          disabled={isSeeding}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          {isSeeding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Seed Institution Data
        </Button>
      </CardContent>
    </Card>
  );
}