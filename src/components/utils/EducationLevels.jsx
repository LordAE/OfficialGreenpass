// Standardized education levels for the entire application
export const EDUCATION_LEVELS = [
  // Secondary Education
  { value: 'grade_9', label: 'Grade 9', category: 'secondary', order: 1 },
  { value: 'grade_10', label: 'Grade 10', category: 'secondary', order: 2 },
  { value: 'grade_11', label: 'Grade 11', category: 'secondary', order: 3 },
  { value: 'grade_12', label: 'Grade 12', category: 'secondary', order: 4 },
  { value: 'high_school', label: 'High School Diploma', category: 'secondary', order: 5 },
  
  // Language & Preparatory
  { value: 'language_school', label: 'Language School', category: 'preparatory', order: 6 },
  { value: 'esl_program', label: 'ESL Program', category: 'preparatory', order: 7 },
  { value: 'pathway_program', label: 'University Pathway', category: 'preparatory', order: 8 },
  
  // Vocational & Trade
  { value: 'trade_certificate', label: 'Trade Certificate', category: 'vocational', order: 9 },
  { value: 'vocational_training', label: 'Vocational Training', category: 'vocational', order: 10 },
  { value: 'professional_certificate', label: 'Professional Certificate', category: 'vocational', order: 11 },
  
  // Post-Secondary
  { value: 'certificate', label: 'Certificate', category: 'postsecondary', order: 12 },
  { value: 'diploma', label: 'Diploma', category: 'postsecondary', order: 13 },
  { value: 'advanced_diploma', label: 'Advanced Diploma', category: 'postsecondary', order: 14 },
  { value: 'associate_degree', label: 'Associate Degree', category: 'postsecondary', order: 15 },
  
  // Undergraduate
  { value: 'bachelor', label: "Bachelor's Degree", category: 'undergraduate', order: 16 },
  { value: 'bachelor_honours', label: "Bachelor's Degree (Honours)", category: 'undergraduate', order: 17 },
  
  // Graduate
  { value: 'graduate_certificate', label: 'Graduate Certificate', category: 'graduate', order: 18 },
  { value: 'graduate_diploma', label: 'Graduate Diploma', category: 'graduate', order: 19 },
  { value: 'master', label: "Master's Degree", category: 'graduate', order: 20 },
  { value: 'doctorate', label: 'Doctorate/PhD', category: 'graduate', order: 21 },
  
  // Professional
  { value: 'professional_degree', label: 'Professional Degree', category: 'professional', order: 22 },
  { value: 'postdoctoral', label: 'Postdoctoral Studies', category: 'professional', order: 23 },
];

export const LEVEL_CATEGORIES = {
  secondary: 'Secondary Education',
  preparatory: 'Language & Preparatory',
  vocational: 'Vocational & Trade',
  postsecondary: 'Post-Secondary',
  undergraduate: 'Undergraduate',
  graduate: 'Graduate Studies',
  professional: 'Professional Studies'
};

// Helper functions
export const getLevelLabel = (value) => {
  const level = EDUCATION_LEVELS.find(l => l.value === value);
  return level ? level.label : value;
};

export const getLevelsByCategory = (category) => {
  return EDUCATION_LEVELS.filter(l => l.category === category);
};

export const getAllLevelValues = () => {
  return EDUCATION_LEVELS.map(l => l.value);
};

export const getSortedLevels = () => {
  return EDUCATION_LEVELS.sort((a, b) => a.order - b.order);
};

export const getLevelOrder = (value) => {
  const level = EDUCATION_LEVELS.find(l => l.value === value);
  return level ? level.order : 999;
};