// Complete list of Canadian provinces and territories
export const CANADIAN_PROVINCES = [
  // Provinces
  { value: 'AB', label: 'Alberta', type: 'province', order: 1 },
  { value: 'BC', label: 'British Columbia', type: 'province', order: 2 },
  { value: 'MB', label: 'Manitoba', type: 'province', order: 3 },
  { value: 'NB', label: 'New Brunswick', type: 'province', order: 4 },
  { value: 'NL', label: 'Newfoundland and Labrador', type: 'province', order: 5 },
  { value: 'NS', label: 'Nova Scotia', type: 'province', order: 6 },
  { value: 'ON', label: 'Ontario', type: 'province', order: 7 },
  { value: 'PE', label: 'Prince Edward Island', type: 'province', order: 8 },
  { value: 'QC', label: 'Quebec', type: 'province', order: 9 },
  { value: 'SK', label: 'Saskatchewan', type: 'province', order: 10 },
  
  // Territories
  { value: 'NT', label: 'Northwest Territories', type: 'territory', order: 11 },
  { value: 'NU', label: 'Nunavut', type: 'territory', order: 12 },
  { value: 'YT', label: 'Yukon', type: 'territory', order: 13 }
];

export const PROVINCE_CATEGORIES = {
  province: 'Provinces',
  territory: 'Territories'
};

// Helper functions
export const getProvinceLabel = (value) => {
  const province = CANADIAN_PROVINCES.find(p => p.value === value);
  return province ? province.label : value;
};

export const getProvincesByType = (type) => {
  return CANADIAN_PROVINCES.filter(p => p.type === type);
};

export const getAllProvinceValues = () => {
  return CANADIAN_PROVINCES.map(p => p.value);
};

export const getSortedProvinces = () => {
  return CANADIAN_PROVINCES.sort((a, b) => a.order - b.order);
};

export const isValidProvince = (value) => {
  return CANADIAN_PROVINCES.some(p => p.value === value);
};

// For international use, include common international regions
export const INTERNATIONAL_REGIONS = [
  { value: 'US_CA', label: 'California (USA)', country: 'USA' },
  { value: 'US_NY', label: 'New York (USA)', country: 'USA' },
  { value: 'US_TX', label: 'Texas (USA)', country: 'USA' },
  { value: 'US_FL', label: 'Florida (USA)', country: 'USA' },
  { value: 'UK_EN', label: 'England (UK)', country: 'UK' },
  { value: 'UK_SC', label: 'Scotland (UK)', country: 'UK' },
  { value: 'AU_NSW', label: 'New South Wales (Australia)', country: 'Australia' },
  { value: 'AU_VIC', label: 'Victoria (Australia)', country: 'Australia' },
];

export const ALL_REGIONS = [...CANADIAN_PROVINCES, ...INTERNATIONAL_REGIONS];