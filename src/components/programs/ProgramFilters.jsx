import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import CountrySelector from "@/components/CountrySelector";
import ProvinceSelector from "../ProvinceSelector";

function uniqueSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export default function ProgramFilters({ programs = [], onFilterChange, initialFilters = {} }) {
  // ----- derive options from data -----
  const countryOptions = useMemo(() => {
    const fromData = programs.map((p) => p.school_country).filter(Boolean);
    const priority = ["Australia", "Germany", "Ireland", "United Kingdom", "United States", "New Zealand", "Canada"];
    return uniqueSorted([...fromData, ...priority]);
  }, [programs]);

  const levelOptions = useMemo(
    () => uniqueSorted(programs.map((p) => p.program_level)),
    [programs]
  );

  const disciplineOptions = useMemo(
    () => uniqueSorted(programs.map((p) => p.field_of_study)),
    [programs]
  );

  const cityOptions = useMemo(() => {
    const byCountry = (country) =>
      uniqueSorted(programs.filter((p) => p.school_country === country).map((p) => p.school_city));
    const all = uniqueSorted(programs.map((p) => p.school_city));
    return { byCountry, all };
  }, [programs]);

  // ----- local state (controlled) -----
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [province, setProvince] = useState("all");
  const [city, setCity] = useState("all");
  const [level, setLevel] = useState("all");
  const [discipline, setDiscipline] = useState("all");
  const [tuitionMax, setTuitionMax] = useState("");
  const [scholarships, setScholarships] = useState(false);

  // hydrate from initial filters (URL)
  useEffect(() => {
    setSearch(initialFilters.search || "");
    setCountry(initialFilters.country || "all");
    setProvince(initialFilters.province || "all");
    setCity(initialFilters.city || "all");
    setLevel(initialFilters.level || "all");
    setDiscipline(initialFilters.discipline || "all");
    setTuitionMax(initialFilters.tuitionMax || "");
    setScholarships(initialFilters.scholarships === "true" || initialFilters.scholarships === true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialFilters)]);

  // push up whenever any field changes
  useEffect(() => {
    onFilterChange?.({
      search,
      country,
      province,
      city,
      level,
      discipline,
      tuitionMax,
      scholarships,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, country, province, city, level, discipline, tuitionMax, scholarships]);

  // when country/province changes, reset dependent fields
  useEffect(() => {
    setProvince((prev) => prev); // keep value unless user changes; ProvinceSelector handles “International”
    setCity("all");
  }, [country]);

  // city list reacts to selected country
  const availableCities =
    country !== "all" ? cityOptions.byCountry(country) : cityOptions.all;

  return (
    <div className="mb-6">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="sm:col-span-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schools / programs..."
              className="h-11"
            />
          </div>

          {/* Country (shared component, same as Schools) */}
          <CountrySelector
            value={country}
            onChange={setCountry}
            options={countryOptions}
            includeAll
            allLabel="All Countries"
            placeholder="All Countries"
            className="h-11"
          />

          {/* Province (Canada list + International option) */}
          <ProvinceSelector
            value={province}
            onValueChange={setProvince}
            placeholder="All Provinces"
            includeAll
            includeInternational
            className="h-11"
          />

          {/* City (dependent) */}
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {availableCities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Level */}
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levelOptions.map((lvl) => (
                <SelectItem key={lvl} value={lvl}>
                  {lvl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Discipline */}
          <Select value={discipline} onValueChange={setDiscipline}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="All Disciplines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Disciplines</SelectItem>
              {disciplineOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tuition max (number) */}
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={tuitionMax}
            onChange={(e) => setTuitionMax(e.target.value)}
            placeholder="Max Tuition (CAD)"
            className="h-11"
          />

          {/* Scholarships toggle */}
          <div className="flex items-center gap-2 px-2">
            <Checkbox
              id="scholarships"
              checked={!!scholarships}
              onCheckedChange={(v) => setScholarships(Boolean(v))}
            />
            <label htmlFor="scholarships" className="text-sm text-gray-700 select-none">
              Scholarships Available
            </label>
          </div>
        </div>
      </form>
    </div>
  );
}
