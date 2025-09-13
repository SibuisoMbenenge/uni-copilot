export const APP_CONFIG = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  APP_NAME: 'UniCopilot',
  VERSION: '1.0.0'
};

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/',
  SEARCH: '/search',
  COMPARE: '/compare',
  RECOMMENDATIONS: '/recommendations',
  PROFILE: '/profile'
};

export const UNIVERSITY_CATEGORIES = {
  SAFETY: 'Safety',
  TARGET: 'Target',
  REACH: 'Reach'
} as const;

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
];

export const COMMON_MAJORS = [
  'Computer Science', 'Business Administration', 'Engineering',
  'Biology', 'Psychology', 'Economics', 'Political Science',
  'English', 'Mathematics', 'Chemistry', 'Physics', 'History',
  'Art', 'Music', 'Education', 'Nursing', 'Medicine', 'Law',
  'Architecture', 'Communications', 'Environmental Science',
  'International Relations', 'Philosophy', 'Sociology'
];
