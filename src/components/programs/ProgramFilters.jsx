import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { geography } from '../utils/geography';
import { EDUCATION_LEVELS } from '../utils/EducationLevels';
import _ from 'lodash';

export default function ProgramFilters({ programs, onFilterChange, initialFilters }) {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(initialFilters);
  const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);
  const [tuition, setTuition] = useState([initialFilters.tuitionMax || 100000]);

  const uniqueValues = useMemo(() => {
    const countries = Object.keys(geography);
    const provinces = filters.country ? Object.keys(geography[filters.country]) : [];
    const cities = (filters.country && filters.province && geography[filters.country]?.[filters.province]) || [];
    const disciplines = _.uniq(programs.map(p => p.field_of_study).filter(Boolean)).sort();
    
    return { countries, provinces, cities, disciplines };
  }, [programs, filters.country, filters.province]);
  
  useEffect(() => {
    // Sync state with URL params on initial load
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'view') params[key] = value;
    }
    setFilters(params);
    if(params.tuitionMax) setTuition([Number(params.tuitionMax)]);
  }, [searchParams]);

  const handleFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    if (key === 'country') {
      delete newFilters.province;
      delete newFilters.city;
    }
    if (key === 'province') {
      delete newFilters.city;
    }
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  const handleTuitionChange = (value) => {
    setTuition(value);
    handleFilter('tuitionMax', value[0]);
  };
  
  const clearFilters = () => {
    setFilters({});
    setTuition([100000]);
    onFilterChange({});
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4 mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="relative lg:col-span-2">
          <Label htmlFor="search">Search Program or School</Label>
          <Search className="absolute left-3 bottom-2.5 text-gray-400 w-5 h-5" />
          <Input
            id="search"
            placeholder="e.g., 'Bachelor of Commerce' or 'University of Toronto'"
            value={filters.search || ''}
            onChange={(e) => handleFilter('search', e.target.value)}
            className="pl-10 h-11 text-base"
          />
        </div>
        <div>
          <Label htmlFor="level">Program Level</Label>
          <Select value={filters.level || 'all'} onValueChange={(v) => handleFilter('level', v)}>
            <SelectTrigger id="level" className="h-11">
              <SelectValue placeholder="Select Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {EDUCATION_LEVELS.map(level => (
                <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Select value={filters.country || 'all'} onValueChange={(v) => handleFilter('country', v)}>
            <SelectTrigger id="country" className="h-11">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {uniqueValues.countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="province">Province / State</Label>
          <Select value={filters.province || 'all'} onValueChange={(v) => handleFilter('province', v)} disabled={!filters.country || filters.country === 'all'}>
            <SelectTrigger id="province" className="h-11">
              <SelectValue placeholder="Select Province/State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Provinces/States</SelectItem>
              {uniqueValues.provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Select value={filters.city || 'all'} onValueChange={(v) => handleFilter('city', v)} disabled={!filters.province || filters.province === 'all'}>
            <SelectTrigger id="city" className="h-11">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {uniqueValues.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
            <Button variant="outline" className="w-full h-11" onClick={() => setIsAdvancedVisible(!isAdvancedVisible)}>
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Advanced
            </Button>
            <Button variant="ghost" size="icon" onClick={clearFilters} className="h-11">
                <X className="w-4 h-4" />
            </Button>
        </div>
      </div>
      
      <AnimatePresence>
        {isAdvancedVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="discipline">Discipline</Label>
                <Select value={filters.discipline || 'all'} onValueChange={(v) => handleFilter('discipline', v)}>
                  <SelectTrigger id="discipline" className="h-11">
                    <SelectValue placeholder="Select Discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Disciplines</SelectItem>
                    {uniqueValues.disciplines.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-full">
                <Label>Max Tuition (CAD)</Label>
                <div className="flex items-center gap-4">
                    <Slider
                        value={tuition}
                        onValueChange={handleTuitionChange}
                        max={100000}
                        step={1000}
                        className="my-4"
                    />
                    <div className="font-bold text-lg w-32 text-right">${tuition[0].toLocaleString()}</div>
                </div>
              </div>
              {/* TODO: Add other advanced filters here */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}