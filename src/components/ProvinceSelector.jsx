import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CANADIAN_PROVINCES, PROVINCE_CATEGORIES, getProvinceLabel, getSortedProvinces, ALL_REGIONS } from './utils/CanadianProvinces';

export default function ProvinceSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select Province", 
  includeAll = false,
  includeInternational = false,
  className = ""
}) {
  const provinces = includeInternational ? ALL_REGIONS : getSortedProvinces();
  
  // Group provinces by type if showing Canadian only
  const groupedProvinces = !includeInternational 
    ? provinces.reduce((acc, province) => {
        if (!acc[province.type]) {
          acc[province.type] = [];
        }
        acc[province.type].push(province);
        return acc;
      }, {})
    : null;

  // Group international regions by country if including international
  const groupedInternational = includeInternational
    ? provinces.reduce((acc, region) => {
        const category = region.country || 'Canada';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(region);
        return acc;
      }, {})
    : null;

  const renderGroupedOptions = (grouped, categoryMap) => {
    return Object.keys(grouped).map((category) => (
      <React.Fragment key={category}>
        <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">
          {categoryMap ? categoryMap[category] : category}
        </div>
        {grouped[category].map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </React.Fragment>
    ));
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">All Provinces</SelectItem>
        )}
        
        {!includeInternational && groupedProvinces && renderGroupedOptions(groupedProvinces, PROVINCE_CATEGORIES)}
        {includeInternational && groupedInternational && renderGroupedOptions(groupedInternational)}
      </SelectContent>
    </Select>
  );
}