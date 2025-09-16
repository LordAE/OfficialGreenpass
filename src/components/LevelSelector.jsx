import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EDUCATION_LEVELS, LEVEL_CATEGORIES, getLevelLabel, getSortedLevels } from './utils/EducationLevels';

export default function LevelSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select Level", 
  includeAll = false,
  categories = null, // Array of category names to include, null for all
  className = ""
}) {
  const sortedLevels = getSortedLevels();
  
  // Filter levels by categories if specified
  const filteredLevels = categories 
    ? sortedLevels.filter(level => categories.includes(level.category))
    : sortedLevels;

  // Group levels by category
  const groupedLevels = filteredLevels.reduce((acc, level) => {
    if (!acc[level.category]) {
      acc[level.category] = [];
    }
    acc[level.category].push(level);
    return acc;
  }, {});

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">All Levels</SelectItem>
        )}
        
        {Object.keys(groupedLevels).map((category) => (
          <React.Fragment key={category}>
            <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">
              {LEVEL_CATEGORIES[category]}
            </div>
            {groupedLevels[category].map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  );
}