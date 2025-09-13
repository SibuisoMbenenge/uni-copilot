// frontend/src/services/api.ts
import axios, { AxiosError, AxiosResponse } from 'axios';
import { University, StudentProfile, ApiResponse, SearchFilters, Recommendation, PaginatedResponse } from '../types';
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

export const askAIQuestion = async (question: string): Promise<ApiResponse<{
  answer: string;
  sources: Array<{
    fileName: string;
    universityName: string;
    relevantContent: string;
  }>;
  searchType: string;
}>> => {
  try {
    if (!question.trim()) {
      throw new Error('Question cannot be empty');
    }
    
    const response = await api.post('/api/ask', { question });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to get AI response');
  }
};

  // Updated searchUniversities function for api.ts
  export const searchUniversities = async (
    query: string, 
    filters?: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<University[]>> => {
    try {
      // Ensure query is not empty
      const searchQuery = query?.trim() || '*';
      
      // Clean filters - remove undefined/null values
      const cleanFilters = filters ? Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          (acc as any)[key] = value;
        }
        return acc;
      }, {} as SearchFilters) : {};
      
      console.log('Making search request:', {
        query: searchQuery,
        filters: cleanFilters,
        pagination: { page, limit }
      });
      
      const requestBody = { 
        query: searchQuery, 
        filters: cleanFilters, 
        pagination: { page, limit } 
      };
      
      const response = await api.post('/api/search', requestBody);
      
      // Log the response for debugging
      console.log('Search response received:', response.data);
      
      // Handle different response structures
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data || response.data.results || [],
          pagination: response.data.pagination,
          message: response.data.message || 'Search completed successfully'
        };
      } else {
        throw new Error(response.data.error || 'Search request failed');
      }
      
    } catch (error: any) {
      console.error('Search universities error:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to search universities';
      
      if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again or contact support.';
        
        // Log detailed error for development
        if (process.env.NODE_ENV === 'development') {
          console.error('Server error details:', error.response.data);
        }
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid search request';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      // Return error in expected format
      return {
        success: false,
        data: [],
        pagination: undefined,
        error: errorMessage
      };
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