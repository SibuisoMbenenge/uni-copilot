import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  BookmarkIcon,
  EyeIcon,
  ScaleIcon,
  StarIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { searchUniversities, getAllUniversities } from '../services/api';
import { University, SearchFilters, PaginatedResponse } from '../types';

interface SearchState {
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

interface FiltersState extends SearchFilters {
  sortBy: 'ranking' | 'acceptanceRate' | 'gpaRequired' | 'tuition' | 'name';
  sortOrder: 'asc' | 'desc';
}

const INITIAL_FILTERS: FiltersState = {
  minGPA: undefined,
  maxGPA: undefined,
  minSAT: undefined,
  maxSAT: undefined,
  maxAcceptanceRate: undefined,
  location: undefined,
  maxEssays: undefined,
  maxTuition: undefined,
  sortBy: 'ranking',
  sortOrder: 'asc'
};

const Search: React.FC = () => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    pagination: null
  });

  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [savedUniversities, setSavedUniversities] = useState<Set<string>>(new Set());
  const [comparisonList, setComparisonList] = useState<University[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters, page: number = 1) => {
      setSearchState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        let response: PaginatedResponse<University[]>;
        
        if (searchQuery.trim() || Object.values(searchFilters).some(v => v !== undefined && v !== '')) {
          // Clean filters - remove empty values
          const cleanFilters = Object.entries(searchFilters).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== '' && value !== null) {
              acc[key as keyof SearchFilters] = value;
            }
            return acc;
          }, {} as SearchFilters);

          response = await searchUniversities(searchQuery || '*', cleanFilters, page, 20);
        } else {
          response = await getAllUniversities(page, 20);
        }

        if (response.success && response.data) {
          setSearchState(prev => ({
            ...prev,
            results: response.data || [],
            loading: false,
            pagination: response.pagination || null
          }));
        } else {
          throw new Error(response.message || 'Search failed');
        }
      } catch (error: any) {
        setSearchState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'An error occurred during search'
        }));
      }
    }, 300),
    []
  );

  const handleSearch = useCallback((page: number = 1) => {
    const { sortBy, sortOrder, ...searchFilters } = filters;
    debouncedSearch(searchState.query, searchFilters, page);
  }, [searchState.query, filters, debouncedSearch]);

  const handleQueryChange = (value: string) => {
    setSearchState(prev => ({ ...prev, query: value }));
  };

  const handleFilterChange = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const toggleSave = (university: University) => {
    setSavedUniversities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(university.id)) {
        newSet.delete(university.id);
      } else {
        newSet.add(university.id);
      }
      return newSet;
    });
  };

  const addToComparison = (university: University) => {
    if (comparisonList.length >= 4) {
      alert('You can compare up to 4 universities at a time.');
      return;
    }
    
    if (!comparisonList.find(u => u.id === university.id)) {
      setComparisonList(prev => [...prev, university]);
    }
  };

  const removeFromComparison = (universityId: string) => {
    setComparisonList(prev => prev.filter(u => u.id !== universityId));
  };

  // Sort results based on current sort settings
  const sortedResults = useMemo(() => {
    if (!searchState.results.length) return [];
    
    return [...searchState.results].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (filters.sortBy) {
        case 'name':
          aVal = a.universityName.toLowerCase();
          bVal = b.universityName.toLowerCase();
          break;
        case 'ranking':
          aVal = a.ranking || 999999;
          bVal = b.ranking || 999999;
          break;
        case 'acceptanceRate':
          aVal = a.acceptanceRate;
          bVal = b.acceptanceRate;
          break;
        case 'gpaRequired':
          aVal = a.gpaRequired;
          bVal = b.gpaRequired;
          break;
        case 'tuition':
          aVal = a.tuition || 0;
          bVal = b.tuition || 0;
          break;
        default:
          return 0;
      }
      
      if (filters.sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [searchState.results, filters.sortBy, filters.sortOrder]);

  const handlePageChange = (page: number) => {
    handleSearch(page);
  };

  // Initial load
  useEffect(() => {
    handleSearch();
  }, []);

  // Auto-search when filters change
  useEffect(() => {
    handleSearch();
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Search Universities</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              title={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchState.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, location, or program..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          
          <button
            onClick={() => handleSearch()}
            disabled={searchState.loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searchState.loading ? 'Searching...' : 'Search'}
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg flex items-center space-x-2 ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
              <div className="flex space-x-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* GPA Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GPA Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="4"
                    placeholder="Min"
                    value={filters.minGPA || ''}
                    onChange={(e) => handleFilterChange('minGPA', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="4"
                    placeholder="Max"
                    value={filters.maxGPA || ''}
                    onChange={(e) => handleFilterChange('maxGPA', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* SAT Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SAT Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="400"
                    max="1600"
                    placeholder="Min"
                    value={filters.minSAT || ''}
                    onChange={(e) => handleFilterChange('minSAT', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    min="400"
                    max="1600"
                    placeholder="Max"
                    value={filters.maxSAT || ''}
                    onChange={(e) => handleFilterChange('maxSAT', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Acceptance Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Acceptance Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g., 20"
                  value={filters.maxAcceptanceRate || ''}
                  onChange={(e) => handleFilterChange('maxAcceptanceRate', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., California, CA, New York"
                  value={filters.location?.[0] || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value ? [e.target.value] : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Max Essays */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Essays Required
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g., 5"
                  value={filters.maxEssays || ''}
                  onChange={(e) => handleFilterChange('maxEssays', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Max Tuition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tuition ($)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g., 50000"
                  value={filters.maxTuition || ''}
                  onChange={(e) => handleFilterChange('maxTuition', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Bar */}
      {comparisonList.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ScaleIcon className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                Comparing {comparisonList.length} universities
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => {
                  // Navigate to comparison page
                  console.log('Compare universities:', comparisonList);
                }}
              >
                Compare Now
              </button>
              <button
                onClick={() => setComparisonList([])}
                className="text-blue-600 hover:text-blue-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {comparisonList.map(university => (
              <div key={university.id} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border">
                <span className="text-sm">{university.universityName}</span>
                <button
                  onClick={() => removeFromComparison(university.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Results
              {searchState.pagination && (
                <span className="text-gray-500 font-normal">
                  {" "}({searchState.pagination.total} total)
                </span>
              )}
            </h2>
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ranking">Ranking</option>
              <option value="name">Name</option>
              <option value="acceptanceRate">Acceptance Rate</option>
              <option value="gpaRequired">GPA Required</option>
              <option value="tuition">Tuition</option>
            </select>
            <button
              onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {searchState.loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : searchState.error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">{searchState.error}</div>
              <button 
                onClick={() => handleSearch()}
                className="text-blue-600 hover:text-blue-700"
              >
                Try again
              </button>
            </div>
          ) : sortedResults.length > 0 ? (
            <>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
                {sortedResults.map((university) => (
                  <UniversityCard
                    key={university.id}
                    university={university}
                    isSaved={savedUniversities.has(university.id)}
                    onSave={toggleSave}
                    onCompare={addToComparison}
                    isInComparison={comparisonList.some(u => u.id === university.id)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              {searchState.pagination && searchState.pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <div className="flex space-x-1">
                    {searchState.pagination.hasPrev && (
                      <button
                        onClick={() => handlePageChange(searchState.pagination!.page - 1)}
                        className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Previous
                      </button>
                    )}
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, searchState.pagination.totalPages) }, (_, i) => {
                      const pageNum = searchState.pagination!.page - 2 + i;
                      if (pageNum < 1 || pageNum > searchState.pagination!.totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 border rounded ${
                            pageNum === searchState.pagination!.page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {searchState.pagination.hasNext && (
                      <button
                        onClick={() => handlePageChange(searchState.pagination!.page + 1)}
                        className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No universities found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search query or filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// University Card Component
interface UniversityCardProps {
  university: University;
  isSaved: boolean;
  onSave: (university: University) => void;
  onCompare: (university: University) => void;
  isInComparison: boolean;
  viewMode: 'grid' | 'list';
}

const UniversityCard: React.FC<UniversityCardProps> = ({
  university,
  isSaved,
  onSave,
  onCompare,
  isInComparison,
  viewMode
}) => {
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {university.universityName}
              </h3>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <MapPinIcon className="h-4 w-4 mr-1" />
                {university.location}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {university.ranking && (
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  #{university.ranking}
                </span>
              )}
              
              <button
                onClick={() => onSave(university)}
                className="p-1 hover:bg-gray-100 rounded"
                title={isSaved ? 'Remove from saved' : 'Save university'}
              >
                {isSaved ? (
                  <BookmarkSolidIcon className="h-5 w-5 text-blue-600" />
                ) : (
                  <BookmarkIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center">
              <AcademicCapIcon className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <span className="text-xs text-gray-500 block">GPA Required</span>
                <p className="font-medium text-sm">{university.gpaRequired || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <StarIcon className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <span className="text-xs text-gray-500 block">SAT Range</span>
                <p className="font-medium text-sm">{university.satRange || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <EyeIcon className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <span className="text-xs text-gray-500 block">Acceptance Rate</span>
                <p className="font-medium text-sm">{university.acceptanceRate}%</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <span className="text-xs text-gray-500 block">Deadline</span>
                <p className="font-medium text-sm">{university.deadline || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {university.tuition && (
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Tuition: {formatCurrency(university.tuition)}</span>
              </div>
            )}
            
            {university.essaysRequired !== undefined && (
              <div>
                <span className="text-gray-600">Essays Required: {university.essaysRequired}</span>
              </div>
            )}
          </div>
          
          {university.programs && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">Programs: </span>
              <span className="text-sm text-gray-700">{university.programs}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => onCompare(university)}
          disabled={isInComparison}
          className={`px-3 py-1 text-sm rounded border ${
            isInComparison
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {isInComparison ? 'In Comparison' : 'Compare'}
        </button>
        
        <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
          View Details
        </button>
      </div>
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default Search;