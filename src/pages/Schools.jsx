import React, { useState, useEffect, useCallback, useMemo } from "react";
import { School } from "@/api/entities";
import { Institution } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, GraduationCap, Star, Globe, Loader2, ArrowRight, Building, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from '@/utils';
import ProvinceSelector from '../components/ProvinceSelector';
import CountrySelector from '@/components/CountrySelector';
import { getProvinceLabel } from '../components/utils/CanadianProvinces';
import _ from 'lodash';

const PAGE_SIZE = 15;

/* -----------------------------
   Helpers: name normalization
   ----------------------------- */
const normalize = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(the|of|and|for|at|in|de|la|le|du|des|université|universite)\b/g, "")
    .replace(/\b(university|college|institute|polytechnic|school|academy|centre|center)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

const SchoolCard = ({ school, programCount, isInstitution = false }) => {
  // Choose an id for routing to SchoolDetails
  const targetId = school.id || school.school_id || school.institution_id;
  const schoolName = school.name || school.school_name || school.institution_name;

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-green-300">
      <CardContent className="p-0">
        <div className="aspect-video overflow-hidden rounded-t-lg bg-gradient-to-br from-blue-100 to-green-100 relative">
          <img
            src={
              school.logoUrl ||
              school.school_image_url ||
              school.institution_logo_url ||
              "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=600&fit=crop&q=80"
            }
            alt={schoolName || "Institution logo"}
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
              {isInstitution ? "Institution" : (school.institution_type || "School")}
            </Badge>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
              {schoolName}
            </h3>
          </div>

          <div className="flex items-center text-gray-600 mb-4">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="text-sm">
              {(school.city || school.school_city || "City")},{" "}
              {getProvinceLabel(school.province || school.school_province) || "Province"},{" "}
              {school.country || school.school_country || "Country"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-gray-500">Programs</p>
              <p className="font-bold text-blue-600">{programCount || school.programCount || 0}+</p>
            </div>
            <div>
              <p className="text-gray-500">{isInstitution ? "Type" : "Institution"}</p>
              <p className="font-bold text-gray-800 truncate">
                {isInstitution ? (school.isPublic ? "Public" : "Private") : (school.institution_name || school.school_name)}
              </p>
            </div>
          </div>

          {isInstitution && school.about && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{school.about}</p>
          )}

          <div className="flex flex-col gap-3">
            <Link to={createPageUrl(`SchoolDetails?id=${encodeURIComponent(targetId || "")}`)}>
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
};

export default function Schools() {
  const [allSchools, setAllSchools] = useState([]);
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // pagination
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  // read initial page from URL
  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const updatePage = useCallback((nextPage) => {
    setPage(nextPage);
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolsData, institutionsData] = await Promise.all([
        School.list("-created_date", 2000),
        Institution.list("-created_date", 1000),
      ]);
      setAllSchools(schoolsData || []);
      setAllInstitutions(institutionsData || []);
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

  /** Build a fast lookup map: normalized institution name -> institution row */
  const institutionsByName = useMemo(() => {
    return Object.fromEntries(
      (allInstitutions || []).map((inst) => [normalize(inst.name), inst])
    );
  }, [allInstitutions]);

  // Merge and process schools data (attach logoUrl from institutions when names match)
  const mergedSchools = useMemo(() => {
    // Group program rows by school name
    const schoolGroups = _.groupBy(allSchools, (s) => s.school_name || s.institution_name || "Unknown School");

    // Turn each group into a single card; pull institution fields by name match
    const schoolCards = Object.entries(schoolGroups).map(([schoolKey, schoolPrograms]) => {
      const representative = schoolPrograms[0];

      // Find matching institution by name (normalized)
      const matchKey = normalize(
        representative.institution_name || representative.school_name || representative.name
      );
      const matchedInst = institutionsByName[matchKey];

      return {
        ...representative,
        programCount: schoolPrograms.length,
        school_key: schoolKey,
        isInstitution: false,

        // Pull preferred display fields from institution when available
        logoUrl:
          matchedInst?.logoUrl ||
          representative.logoUrl ||
          representative.school_image_url ||
          representative.institution_logo_url ||
          null,
        website: matchedInst?.website || representative.website || null,
        about: matchedInst?.about || representative.about || null,
        institution_type: matchedInst?.type || representative.institution_type || null,

        // Normalize location for filters
        city: representative.city || representative.school_city || matchedInst?.city || null,
        province: representative.province || representative.school_province || matchedInst?.province || null,
        country: representative.country || representative.school_country || matchedInst?.country || null,
      };
    });

    // Add institutions not represented in school data (so they also appear)
    const schoolInstitutionNames = new Set(
      allSchools.map((s) => (s.institution_name || s.school_name || "").trim()).filter(Boolean)
    );

    const institutionCards = (allInstitutions || [])
      .filter((inst) => !schoolInstitutionNames.has(inst.name))
      .map((inst) => ({
        ...inst,
        logoUrl: inst.logoUrl || null,
        website: inst.website || null,
        institution_type: inst.type || null,
        school_key: inst.name,
        isInstitution: true,
      }));

    return [...schoolCards, ...institutionCards];
  }, [allSchools, allInstitutions, institutionsByName]);

  // Build country options from data + make sure priority countries exist
  const countryOptions = useMemo(() => {
    const fromData = mergedSchools
      .map((s) => s.country || s.school_country)
      .filter(Boolean);
    const priority = ["Australia","Germany","Ireland","United Kingdom","United States","New Zealand","Canada"];
    return Array.from(new Set([...fromData, ...priority]));
  }, [mergedSchools]);

  const handleSearchChange = useCallback((e) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
  }, []);

  const handleCountryChange = useCallback(
    (value) => {
      setSelectedCountry(value);
      if (value !== selectedCountry) {
        setSelectedProvince("all");
        setSelectedCity("all");
      }
    },
    [selectedCountry]
  );

  const handleProvinceChange = useCallback(
    (value) => {
      setSelectedProvince(value);
      if (value !== selectedProvince) {
        setSelectedCity("all");
      }
    },
    [selectedProvince]
  );

  // Reset to page 1 whenever filters/search change
  useEffect(() => {
    updatePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCountry, selectedProvince, selectedCity, selectedType, mergedSchools.length]);

  // Filter schools based on search criteria
  useEffect(() => {
    let filtered = mergedSchools;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((school) =>
        (school.name || school.school_name || school.institution_name || "").toLowerCase().includes(q) ||
        (school.city || school.school_city || "").toLowerCase().includes(q) ||
        (school.program_title || "").toLowerCase().includes(q) ||
        (school.about || "").toLowerCase().includes(q)
      );
    }

    if (selectedCountry !== "all") {
      filtered = filtered.filter((s) => (s.country || s.school_country) === selectedCountry);
    }

    if (selectedProvince !== "all") {
      filtered = filtered.filter((s) => (s.province || s.school_province) === selectedProvince);
    }

    if (selectedCity !== "all") {
      filtered = filtered.filter((s) => (s.city || s.school_city) === selectedCity);
    }

    if (selectedType !== "all") {
      if (selectedType === "institution") {
        filtered = filtered.filter((s) => s.isInstitution);
      } else if (selectedType === "program") {
        filtered = filtered.filter((s) => !s.isInstitution);
      } else {
        // specific institution type
        filtered = filtered.filter(
          (s) => (s.institution_type || "").toLowerCase() === selectedType.toLowerCase()
        );
      }
    }

    setFilteredSchools(filtered);
  }, [mergedSchools, searchTerm, selectedCountry, selectedProvince, selectedCity, selectedType]);

  // Clamp page when filtered length changes
  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) updatePage(totalPages);
    if (page < 1) updatePage(1);
  }, [page, totalPages, updatePage]);

  // Slice for current page
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredSchools.length);
  const pagedSchools = filteredSchools.slice(startIndex, endIndex);

  // Compact page numbers: 1 … (p-1) p (p+1) … N
  const getPageNumbers = (current, total) => {
    const pages = [];
    const add = (x) => pages.push(x);
    const windowSize = 1; // neighbors around current
    if (total <= 7) {
      for (let i = 1; i <= total; i++) add(i);
      return pages;
    }
    add(1);
    if (current - windowSize > 2) add("…");
    for (let i = Math.max(2, current - windowSize); i <= Math.min(total - 1, current + windowSize); i++) add(i);
    if (current + windowSize < total - 1) add("…");
    add(total);
    return pages;
  };

  const pageNumbers = getPageNumbers(page, totalPages);

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

                {/* Country selector (reusable, with All Countries + extended list) */}
                <CountrySelector
                  value={selectedCountry}
                  onChange={handleCountryChange}
                  options={countryOptions}
                  includeAll
                  allLabel="All Countries"
                  placeholder="All Countries"
                  className="h-11"
                />

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
                  {filteredSchools.length > 0 ? (
                    <>
                      Showing <span className="font-medium">{startIndex + 1}</span>–
                      <span className="font-medium">{endIndex}</span> of{" "}
                      <span className="font-medium">{filteredSchools.length}</span> schools & institutions{" "}
                      ({allSchools.length} programs, {allInstitutions.length} institutions)
                    </>
                  ) : (
                    <>
                      Showing 0 of {mergedSchools.length} schools & institutions ({allSchools.length} programs, {allInstitutions.length} institutions)
                    </>
                  )}
                </div>
                <Button type="button" variant="outline" onClick={clearAllFilters} className="text-sm">
                  Clear All Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Grid (paged) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pagedSchools.map((school) => (
            <SchoolCard
              key={school.school_key || school.id}
              school={school}
              programCount={school.programCount}
              isInstitution={school.isInstitution}
            />
          ))}
        </div>

        {/* Pagination Bar */}
        {filteredSchools.length > 0 && totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updatePage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Prev
            </Button>

            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-500 select-none">…</span>
              ) : (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={p === page ? "default" : "outline"}
                  onClick={() => updatePage(p)}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </Button>
              )
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updatePage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </nav>
        )}

        {filteredSchools.length === 0 && (
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
