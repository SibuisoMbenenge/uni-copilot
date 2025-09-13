// frontend/src/services/api.ts
import axios, { AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor for adding auth tokens (if needed in future)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status}`, response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    // Handle common HTTP errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Handle unauthorized
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          break;
        case 403:
          // Handle forbidden
          console.error('Access forbidden');
          break;
        case 404:
          // Handle not found
          console.error('Resource not found');
          break;
        case 500:
          // Handle server error
          console.error('Server error occurred');
          break;
        default:
          console.error(`API Error ${status}:`, data);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    } else {
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Enhanced Types
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
  // Additional fields that might be useful
  website?: string;
  description?: string;
  studentCount?: number;
  tuition?: number;
  dormCost?: number;
  averageFinancialAid?: number;
}

export interface StudentProfile {
  name?: string;
  gpa: number;
  sat?: number;
  act?: number;
  locationPreference?: string[];
  intendedMajor?: string;
  maxEssays?: number;
  // Additional profile fields
  extracurriculars?: string[];
  awards?: string[];
  workExperience?: string[];
  budgetRange?: {
    min: number;
    max: number;
  };
}

export interface Recommendation {
  university: University;
  matchScore: number;
  category: 'Safety' | 'Target' | 'Reach';
  reasoning: string;
  // Additional recommendation data
  financialFit?: 'Good' | 'Moderate' | 'Stretch';
  academicFit?: 'Excellent' | 'Good' | 'Competitive';
}

export interface SearchFilters {
  minGPA?: number;
  maxGPA?: number;
  minSAT?: number;
  maxSAT?: number;
  minACT?: number;
  maxACT?: number;
  maxAcceptanceRate?: number;
  location?: string[];
  maxEssays?: number;
  minRanking?: number;
  maxRanking?: number;
  maxTuition?: number;
  programs?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Enhanced API Functions with proper error handling
export const searchUniversities = async (
  query: string, 
  filters?: SearchFilters,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<University[]>> => {
  try {
    const response = await api.post('/api/search', { 
      query, 
      filters, 
      pagination: { page, limit } 
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to search universities');
  }
};

export const getAllUniversities = async (
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<University[]>> => {
  try {
    const response = await api.get('/api/universities', {
      params: { page, limit }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch universities');
  }
};

export const getUniversityById = async (id: string): Promise<ApiResponse<University>> => {
  try {
    if (!id) throw new Error('University ID is required');
    const response = await api.get(`/api/universities/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch university details');
  }
};

export const compareUniversities = async (
  universityIds: string[]
): Promise<ApiResponse<{
  universities: University[];
  comparison: any;
  summary: string;
  highlights: Array<{
    type: 'success' | 'warning' | 'info';
    text: string;
  }>;
}>> => {
  try {
    if (!universityIds.length) throw new Error('At least one university ID is required');
    if (universityIds.length > 4) throw new Error('Cannot compare more than 4 universities');
    
    const response = await api.post('/api/compare', { universityIds });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to compare universities');
  }
};

export const getRecommendations = async (
  profile: StudentProfile
): Promise<ApiResponse<{
  recommendations: Recommendation[];
  summary: string;
  profileAnalysis: {
    strengths: string[];
    areasForImprovement: string[];
    suggestions: string[];
  };
}>> => {
  try {
    if (!profile.gpa) throw new Error('GPA is required for recommendations');
    
    const response = await api.post('/api/recommend', profile);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to get recommendations');
  }
};

export const saveProfile = async (profile: StudentProfile): Promise<ApiResponse<StudentProfile>> => {
  try {
    if (!profile.gpa || profile.gpa < 0 || profile.gpa > 4.0) {
      throw new Error('Valid GPA (0.0-4.0) is required');
    }
    
    const response = await api.post('/api/profile', profile);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to save profile');
  }
};

export const getProfile = async (): Promise<ApiResponse<StudentProfile>> => {
  try {
    const response = await api.get('/api/profile');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch profile');
  }
};

export const uploadPDF = async (
  file: File
): Promise<ApiResponse<{
  extractedData: Partial<StudentProfile>;
  fileName: string;
  fileSize: number;
  processingTime: number;
}>> => {
  try {
    if (!file) throw new Error('File is required');
    if (file.type !== 'application/pdf') throw new Error('Only PDF files are allowed');
    if (file.size > 10 * 1024 * 1024) throw new Error('File size must be less than 10MB');
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds for file upload
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        console.log(`Upload Progress: ${percentCompleted}%`);
      }
    });
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to upload PDF');
  }
};

export const initializeData = async (): Promise<ApiResponse<{
  universitiesLoaded: number;
  dataVersion: string;
  lastUpdated: string;
}>> => {
  try {
    const response = await api.post('/api/initialize');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to initialize data');
  }
};

// Additional utility functions
export const checkApiHealth = async (): Promise<ApiResponse<{
  status: 'healthy' | 'unhealthy';
  version: string;
  uptime: number;
}>> => {
  try {
    const response = await api.get('/api/health');
    return response.data;
  } catch (error: any) {
    throw new Error('API health check failed');
  }
};

export const getApiStatistics = async (): Promise<ApiResponse<{
  totalUniversities: number;
  totalSearches: number;
  totalRecommendations: number;
  lastDataUpdate: string;
}>> => {
  try {
    const response = await api.get('/api/stats');
    return response.data;
  } catch (error: any) {
    throw new Error('Failed to fetch API statistics');
  }
};

// Export the configured axios instance for custom requests
export default api;