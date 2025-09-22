import React, { useState, useEffect, useCallback, useMemo } from "react";
import { School } from "@/api/entities";
import { Institution } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, GraduationCap, Star, Filter, Globe, Users, Zap, Loader2, ArrowRight, Building, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom"; 
import { createPageUrl } from '@/utils';
import LevelSelector from '../components/LevelSelector';
import ProvinceSelector from '../components/ProvinceSelector';
import { getLevelLabel } from '../components/utils/EducationLevels';
import { getProvinceLabel } from '../components/utils/CanadianProvinces';
import _ from 'lodash';

const SchoolCard = ({ school, programCount, isInstitution = false }) => (
  <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-green-300">
    <CardContent className="p-0">
      <div className="aspect-video overflow-hidden rounded-t-lg bg-gradient-to-br from-blue-100 to-green-100 relative">
        <img
          src={school.logoUrl || school.school_image_url || school.institution_logo_url || 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=600&fit=crop&q=80'}
          alt={school.name || school.school_name || school.institution_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {school.isFeatured && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-yellow-500 text-white">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}
        {school.isDLI && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-green-500 text-white">
              <Award className="w-3 h-3 mr-1" />
              DLI
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="mb-3">
          <Badge className="mb-2" variant="secondary">
            {isInstitution ? 'Institution' : (school.institution_type || 'School')}
          </Badge>
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
            {school.name || school.school_name || school.institution_name}
          </h3>
        </div>
        
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="text-sm">
            {school.city || school.school_city || 'City'}, {getProvinceLabel(school.province || school.school_province) || 'Province'}, {school.country || school.school_country || 'Country'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-gray-500">Programs</p>
            <p className="font-bold text-blue-600">{programCount || school.programCount || 0}+</p>
          </div>
          <div>
            <p className="text-gray-500">{isInstitution ? 'Type' : 'Institution'}</p>
            <p className="font-bold text-gray-800 truncate">
              {isInstitution ? (school.isPublic ? 'Public' : 'Private') : (school.institution_name || school.school_name)}
            </p>
          </div>
        </div>

        {isInstitution && school.about && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{school.about}</p>
        )}

        <div className="flex flex-col gap-3">
          <Link to={createPageUrl(`Programs?school=${encodeURIComponent(school.name || school.school_name || school.institution_name)}`)}>
            <Button variant="outline" className="w-full group-hover:bg-green-50 group-hover:border-green-300">
              <GraduationCap className="w-4 h-4 mr-2" />
              View Programs
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
          {isInstitution && school.website && (
            <Link to={school.website} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="w-full">
                <Globe className="w-4 h-4 mr-2" />
                Visit Website
              </Button>
            </Link>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Schools() {
  const [allSchools, setAllSchools] = useState([]);
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all"); // New filter for institution type

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load both school programs and institutions
      const [schoolsData, institutionsData] = await Promise.all([
        School.list('-created_date', 2000),
        Institution.list('-created_date', 1000)
      ]);
      
      console.log(`Loaded ${schoolsData.length} school records and ${institutionsData.length} institution records`);
      setAllSchools(schoolsData);
      setAllInstitutions(institutionsData);
    } catch (error) {
      console.error("Error loading data:", error);
      setAllSchools([]);
      setAllInstitutions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Merge and process schools data
  const mergedSchools = useMemo(() => {
    console.log(`Processing ${allSchools.length} school records and ${allInstitutions.length} institution records`);
    
    // Group schools by school_name or institution_name
    const schoolGroups = _.groupBy(allSchools, (school) => {
      return school.school_name || school.institution_name || 'Unknown School';
    });
    
    // Convert school groups to unique school cards with program counts
    const schoolCards = Object.entries(schoolGroups).map(([schoolKey, schoolPrograms]) => {
      const representative = schoolPrograms[0];
      return {
        ...representative,
        programCount: schoolPrograms.length,
        school_key: schoolKey,
        isInstitution: false
      };
    });

    // Add institutions that aren't already represented in schools
    const schoolInstitutionNames = new Set(allSchools.map(s => s.institution_name).filter(Boolean));
    
    const institutionCards = allInstitutions
      .filter(inst => !schoolInstitutionNames.has(inst.name)) // Only include institutions not already represented
      .map(institution => ({
        ...institution,
        school_key: institution.name,
        isInstitution: true
      }));

    const combined = [...schoolCards, ...institutionCards];
    console.log(`Created ${combined.length} combined school/institution cards`);
    return combined;
  }, [allSchools, allInstitutions]);

  const getUniqueValues = useCallback((field) => {
    const values = [...new Set(mergedSchools.map(school => {
      if (field === 'country') return school.country || school.school_country;
      if (field === 'province') return school.province || school.school_province;
      if (field === 'city') return school.city || school.school_city;
      return school[field];
    }))].filter(Boolean);
    return values.sort();
  }, [mergedSchools]);
  
  const getUniqueCountries = useCallback(() => getUniqueValues('country'), [getUniqueValues]);
  const getUniqueCities = useCallback(() => getUniqueValues('city'), [getUniqueValues]);

  const handleSearchChange = useCallback((e) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
  }, []);

  const handleCountryChange = useCallback((value) => {
    setSelectedCountry(value);
    if (value !== selectedCountry) {
      setSelectedProvince("all");
      setSelectedCity("all");
    }
  }, [selectedCountry]);

  const handleProvinceChange = useCallback((value) => {
    setSelectedProvince(value);
    if (value !== selectedProvince) {
      setSelectedCity("all");
    }
  }, [selectedProvince]);

  // Filter schools based on search criteria
  useEffect(() => {
    let filtered = mergedSchools;

    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(school =>
        (school.name || school.school_name || school.institution_name || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (school.city || school.school_city || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (school.program_title || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (school.about || '').toLowerCase().includes(lowercasedSearchTerm)
      );
    }

    if (selectedCountry !== "all") {
      filtered = filtered.filter(school => 
        (school.country || school.school_country) === selectedCountry
      );
    }
    
    if (selectedProvince !== "all") {
      filtered = filtered.filter(school => 
        (school.province || school.school_province) === selectedProvince
      );
    }

    if (selectedCity !== "all") {
      filtered = filtered.filter(school => 
        (school.city || school.school_city) === selectedCity
      );
    }

    if (selectedType !== "all") {
      if (selectedType === "institution") {
        filtered = filtered.filter(school => school.isInstitution);
      } else if (selectedType === "program") {
        filtered = filtered.filter(school => !school.isInstitution);
      } else {
        // Filter by specific institution type
        filtered = filtered.filter(school => 
          (school.institution_type || '').toLowerCase() === selectedType.toLowerCase()
        );
      }
    }

    setFilteredSchools(filtered);
  }, [mergedSchools, searchTerm, selectedCountry, selectedProvince, selectedCity, selectedType]);

  const clearAllFilters = useCallback((e) => {
    e.preventDefault();
    setSearchTerm("");
    setSelectedCountry("all");
    setSelectedProvince("all");
    setSelectedCity("all");
    setSelectedType("all");
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading schools and institutions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
            Discover Top Canadian Schools & Institutions
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Find the perfect institution for your academic journey. Browse through schools, colleges, and universities with their programs and detailed information.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="sm:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Search schools, institutions, programs..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="pl-10 h-11 text-base"
                    />
                  </div>
                </div>

                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {getUniqueCountries().map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <ProvinceSelector
                  value={selectedProvince}
                  onValueChange={handleProvinceChange}
                  placeholder="All Provinces"
                  includeAll={true}
                  includeInternational={true}
                  className="h-11"
                />

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="institution">Institutions Only</SelectItem>
                    <SelectItem value="program">Programs Only</SelectItem>
                    <SelectItem value="university">Universities</SelectItem>
                    <SelectItem value="college">Colleges</SelectItem>
                    <SelectItem value="institute">Institutes</SelectItem>
                    <SelectItem value="language school">Language Schools</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {filteredSchools.length} of {mergedSchools.length} schools & institutions ({allSchools.length} programs, {allInstitutions.length} institutions)
                </div>
                <Button type="button" variant="outline" onClick={clearAllFilters} className="text-sm">
                  Clear All Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Schools Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSchools.map((school) => (
            <SchoolCard 
              key={school.school_key || school.id} 
              school={school} 
              programCount={school.programCount} 
              isInstitution={school.isInstitution}
            />
          ))}
        </div>

        {filteredSchools.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No schools or institutions found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search criteria or clear filters to see all available options.</p>
            <Button type="button" onClick={clearAllFilters} variant="outline">
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}