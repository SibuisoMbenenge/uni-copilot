
// Additional UI-specific types not covered in api.ts
export interface ComparisonResult {
  summary: string;
  highlights?: Array<{
    type: 'success' | 'warning' | 'info';
    text: string;
  }>;
  universities: University[];
  comparison?: any;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationState {
  isValid: boolean;
  errors: ValidationError[];
}

// Component prop types
export interface UniversityCardProps {
  university: University;
  onSelect?: (university: University) => void;
  onCompare?: (university: University) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

export interface SearchResultsProps {
  universities: University[];
  isLoading?: boolean;
  error?: string;
  onUniversitySelect?: (university: University) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  onPageChange?: (page: number) => void;
}

export interface FilterProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset?: () => void;
}

export interface ProfileFormProps {
  profile: StudentProfile;
  onProfileChange: (profile: StudentProfile) => void;
  onSave?: (profile: StudentProfile) => void;
  isLoading?: boolean;
  validationErrors?: ValidationError[];
}

export interface RecommendationCardProps {
  recommendation: Recommendation;
  onViewDetails?: (university: University) => void;
  onAddToComparison?: (university: University) => void;
}

// Navigation and routing types
export interface NavigationItem {
  label: string;
  path: string;
  icon?: string;
  isActive?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

// Modal and dialog types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ConfirmDialogProps extends ModalProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

// Chart and visualization types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ComparisonChartData {
  categories: string[];
  universities: {
    name: string;
    data: number[];
    color: string;
  }[];
}

// File upload types
export interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  onFileSelect: (files: File[]) => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
}

export interface PDFUploadResult {
  extractedData: Partial<StudentProfile>;
  fileName: string;
  fileSize: number;
  processingTime: number;
}

// Utility types
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: keyof University;
  direction: SortDirection;
}

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

// Theme and styling types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Analytics and tracking types
export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

// Constants for enum-like values
export const RECOMMENDATION_CATEGORIES = {
  SAFETY: 'Safety' as const,
  TARGET: 'Target' as const,
  REACH: 'Reach' as const,
} as const;

export const FINANCIAL_FIT_LEVELS = {
  GOOD: 'Good' as const,
  MODERATE: 'Moderate' as const,
  STRETCH: 'Stretch' as const,
} as const;

export const ACADEMIC_FIT_LEVELS = {
  EXCELLENT: 'Excellent' as const,
  GOOD: 'Good' as const,
  COMPETITIVE: 'Competitive' as const,
} as const;

export type RecommendationCategory = typeof RECOMMENDATION_CATEGORIES[keyof typeof RECOMMENDATION_CATEGORIES];
export type FinancialFitLevel = typeof FINANCIAL_FIT_LEVELS[keyof typeof FINANCIAL_FIT_LEVELS];
export type AcademicFitLevel = typeof ACADEMIC_FIT_LEVELS[keyof typeof ACADEMIC_FIT_LEVELS];

// Application-wide constants
export const APP_CONFIG = {
  MAX_COMPARISON_ITEMS: 4,
  DEFAULT_PAGE_SIZE: 20,
  MAX_FILE_SIZE_MB: 10,
  SUPPORTED_FILE_TYPES: ['application/pdf'] as string[],
  API_TIMEOUT: 10000,
  DEBOUNCE_DELAY: 300,
} as const;

export interface SAUniversityCardProps {
  university: University;
  isSaved: boolean;
  onSave: (university: University) => void;
  onCompare: (university: University) => void;
  isInComparison: boolean;
  viewMode: 'grid' | 'list';
}
export interface SearchState {
  query: string;
  results: University[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}

export interface SASearchFilters extends SearchFilters {
  minAPS?: number;
  maxAPS?: number;
  province?: string;
  universityType?: 'Traditional' | 'University of Technology' | 'Comprehensive';
  maxTuitionFees?: number;
  nsfasAccredited?: boolean;
  bachelorPassRequired?: boolean;
  languageMedium?: string;
  accommodationAvailable?: boolean;
  sortBy: 'universityName' | 'apsScoreRequired' | 'tuitionFeesAnnual' | 'establishmentYear';
  sortOrder: 'asc' | 'desc';
}

export interface University {
  content: any;
  summary: any;
  id: string;
  universityName: string;
  location: string;
  province: string;
  city?: string;
  applicationDeadline?: string;
  apsScoreRequired?: number;
  matricRequirements?: string;
  bachelorPassRequired?: boolean;
  subjectRequirements?: string[];
  languageMedium?: string[];
  tuitionFeesAnnual?: number;
  accommodationAvailable?: boolean;
  nsfasAccredited?: boolean;
  bursariesAvailable?: boolean;
  programs?: string[];
  faculties?: string[];
  universityType?: string;
  establishmentYear?: number;
  studentPopulation?: number;
  description?: string;
  // Additional fields from the original interface
  deadline?: string;
  gpaRequired?: number;
  satRange?: string;
  satLow?: number;
  satHigh?: number;
  acceptanceRate?: number;
  essaysRequired?: number;
  applicationFee?: number;
  requirements?: string;
  ranking?: number;
  website?: string;
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

export interface Recommendation {
  university: University;
  matchScore: number;
  category: 'Safety' | 'Target' | 'Reach';
  reasoning: string;
  // Additional recommendation data
  financialFit?: 'Good' | 'Moderate' | 'Stretch';
  academicFit?: 'Excellent' | 'Good' | 'Competitive';
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