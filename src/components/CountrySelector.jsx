import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 
  'Bolivia', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada', 'Chile', 'China', 
  'Colombia', 'Costa Rica', 'Croatia', 'Czech Republic', 'Denmark', 'Ecuador', 
  'Egypt', 'Estonia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 
  'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'South Korea', 
  'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Malaysia', 'Mexico', 'Morocco', 
  'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 
  'Peru', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia', 
  'Saudi Arabia', 'Singapore', 'Slovakia', 'South Africa', 'Spain', 
  'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 
  'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 
  'Uruguay', 'Venezuela', 'Vietnam'
];

export default function CountrySelector({ 
  selectedCountry, 
  setSelectedCountry, 
  required = false,
  placeholder = "Select Country",
  className = ""
}) {
  const handleValueChange = (value) => {
    if (setSelectedCountry && typeof setSelectedCountry === 'function') {
      setSelectedCountry(value);
    }
  };

  return (
    <Select 
      value={selectedCountry || ''} 
      onValueChange={handleValueChange}
      required={required}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {countries.map((country) => (
          <SelectItem key={country} value={country}>
            {country}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}