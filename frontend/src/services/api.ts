import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface University {
  id: string;
  universityName: string;
  location: string;
  deadline: string;
  gpaRequired: number;
  satRange: string;
  satLow?: number;
  satHigh?: number;
  acceptanceRate: number;
  essaysRequired: number;
  applicationFee: number;
  requirements: string;
  programs: string;
  ranking?: number;
}

export interface StudentProfile {
  name?: string;
  gpa: number;
  sat?: number;
  act?: number;
  locationPreference?: string[];
  intendedMajor?: string;
  maxEssays?: number;
}

export interface Recommendation {
  university: University;
  matchScore: number;
  category: 'Safety' | 'Target' | 'Reach';
  reasoning: string;
}

// API Functions
export const searchUniversities = async (query: string, filters?: any) => {
  const response = await api.post('/api/search', { query, filters });
  return response.data;
};

export const getAllUniversities = async () => {
  const response = await api.get('/api/universities');
  return response.data;
};

export const getUniversityById = async (id: string) => {
  const response = await api.get(`/api/universities/${id}`);
  return response.data;
};

export const compareUniversities = async (universityIds: string[]) => {
  const response = await api.post('/api/compare', { universityIds });
  return response.data;
};

export const getRecommendations = async (profile: StudentProfile) => {
  const response = await api.post('/api/recommend', profile);
  return response.data;
};

export const saveProfile = async (profile: StudentProfile) => {
  const response = await api.post('/api/profile', profile);
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('/api/profile');
  return response.data;
};

export const uploadPDF = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/api/upload-pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const initializeData = async () => {
  const response = await api.post('/api/initialize');
  return response.data;
};