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
  AcademicCapIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { searchUniversities, getAllUniversities } from '../services/api';
import { University, SearchFilters, PaginatedResponse, SAUniversityCardProps, SearchState, SASearchFilters } from '../types';

const INITIAL_FILTERS: SASearchFilters = {
  minAPS: undefined,
  maxAPS: undefined,
  province: undefined,
  universityType: undefined,
  maxTuitionFees: undefined,
  nsfasAccredited: undefined,
  bachelorPassRequired: undefined,
  languageMedium: undefined,
  accommodationAvailable: undefined,
  sortBy: 'universityName',
  sortOrder: 'asc'
};

const SA_PROVINCES = [
  'Eastern Cape',
  'Free State', 
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape'
];

const UNIVERSITY_TYPES = [
  'Traditional',
  'University of Technology', 
  'Comprehensive'
];

const LANGUAGE_MEDIUMS = [
  'English',
  'Afrikaans',
  'Dual Medium'
];

// Debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const Search: React.FC = () => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    pagination: null
  });

  const [filters, setFilters] = useState<SASearchFilters>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [savedUniversities, setSavedUniversities] = useState<Set<string>>(new Set());
  const [comparisonList, setComparisonList] = useState<University[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SASearchFilters, page: number = 1) => {
      console.log('Debounced search triggered:', { searchQuery, searchFilters, page });
      
      setSearchState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const response = await searchUniversities(
          searchQuery || '*', 
          searchFilters, 
          page, 
          20
        );

        console.log('Search response received:', response);

        if (response.success) {
          setSearchState(prev => ({
            ...prev,
            results: response.data || [],
            loading: false,
            error: null,
            pagination: response.pagination || null
          }));
        } else {
          // Handle unsuccessful response
          setSearchState(prev => ({
            ...prev,
            results: [],
            loading: false,
            error: response.error || 'Search failed',
            pagination: null
          }));
        }
      } catch (error: any) {
        console.error('Search error in component:', error);
        setSearchState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'An error occurred during search',
          results: [],
          pagination: null
        }));
      }
    }, 500), // Increased debounce time to reduce server load
    []
  );

  const handleSearch = useCallback((page: number = 1) => {
    console.log('Search initiated:', { query: searchState.query, filters, page });
    debouncedSearch(searchState.query, filters, page);
  }, [searchState.query, filters, debouncedSearch]);

  const handleQueryChange = (value: string) => {
    setSearchState(prev => ({ ...prev, query: value }));
  };

  const handleFilterChange = <K extends keyof SASearchFilters>(key: K, value: SASearchFilters[K]) => {
    console.log('Filter changed:', key, value);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    console.log('Clearing all filters');
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
        case 'universityName':
          aVal = (a.universityName || '').toLowerCase();
          bVal = (b.universityName || '').toLowerCase();
          break;
        case 'apsScoreRequired':
          aVal = a.apsScoreRequired || 0;
          bVal = b.apsScoreRequired || 0;
          break;
        case 'tuitionFeesAnnual':
          aVal = a.tuitionFeesAnnual || 0;
          bVal = b.tuitionFeesAnnual || 0;
          break;
        case 'establishmentYear':
          aVal = a.establishmentYear || 0;
          bVal = b.establishmentYear || 0;
          break;
        default:
          return 0;
      }
      
      if (filters.sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });
  }, [searchState.results, filters.sortBy, filters.sortOrder]);

  const handlePageChange = (page: number) => {
    handleSearch(page);
  };

  const retrySearch = () => {
    console.log('Retrying search...');
    setSearchState(prev => ({ ...prev, error: null }));
    handleSearch();
  };

  // Initial load - only search when the component mounts
  useEffect(() => {
    if (isFirstLoad) {
      console.log('Initial load - performing first search');
      setIsFirstLoad(false);
      handleSearch();
    }
  }, [isFirstLoad, handleSearch]);

  // Auto-search when filters change (but not on initial load)
  useEffect(() => {
    if (!isFirstLoad) {
      console.log('Filters changed - performing search');
      handleSearch();
    }
  }, [filters, isFirstLoad]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Search South African Universities</h1>
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
              {/* APS Score Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  APS Score Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="20"
                    max="50"
                    placeholder="Min"
                    value={filters.minAPS || ''}
                    onChange={(e) => handleFilterChange('minAPS', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    min="20"
                    max="50" 
                    placeholder="Max"
                    value={filters.maxAPS || ''}
                    onChange={(e) => handleFilterChange('maxAPS', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Province
                </label>
                <select
                  value={filters.province || ''}
                  onChange={(e) => handleFilterChange('province', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Provinces</option>
                  {SA_PROVINCES.map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>
              
              {/* University Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  University Type
                </label>
                <select
                  value={filters.universityType || ''}
                  onChange={(e) => handleFilterChange('universityType', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {UNIVERSITY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              {/* Max Tuition Fees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tuition Fees (ZAR)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g., 80000"
                  value={filters.maxTuitionFees || ''}
                  onChange={(e) => handleFilterChange('maxTuitionFees', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Language Medium */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language Medium
                </label>
                <select
                  value={filters.languageMedium || ''}
                  onChange={(e) => handleFilterChange('languageMedium', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Languages</option>
                  {LANGUAGE_MEDIUMS.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              
              {/* Boolean Filters */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="nsfas"
                    checked={filters.nsfasAccredited === true}
                    onChange={(e) => handleFilterChange('nsfasAccredited', e.target.checked ? true : undefined)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nsfas" className="ml-2 block text-sm text-gray-700">
                    NSFAS Accredited
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="accommodation"
                    checked={filters.accommodationAvailable === true}
                    onChange={(e) => handleFilterChange('accommodationAvailable', e.target.checked ? true : undefined)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="accommodation" className="ml-2 block text-sm text-gray-700">
                    Accommodation Available
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="bachelorPass"
                    checked={filters.bachelorPassRequired === true}
                    onChange={(e) => handleFilterChange('bachelorPassRequired', e.target.checked ? true : undefined)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="bachelorPass" className="ml-2 block text-sm text-gray-700">
                    Bachelor Pass Required
                  </label>
                </div>
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
              <option value="universityName">Name</option>
              <option value="apsScoreRequired">APS Score Required</option>
              <option value="tuitionFeesAnnual">Tuition Fees</option>
              <option value="establishmentYear">Establishment Year</option>
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
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Searching universities...</p>
            </div>
          ) : searchState.error ? (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search Error</h3>
              <p className="text-red-600 mb-4">{searchState.error}</p>
              <div className="space-x-2">
                <button 
                  onClick={retrySearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Try Again
                </button>
                <button 
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : sortedResults.length > 0 ? (
            <>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
                {sortedResults.map((university) => (
                  <SAUniversityCard
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
                    
                    {Array.from({ length: Math.min(5, searchState.pagination.totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, searchState.pagination!.page - 2 + i);
                      if (pageNum > searchState.pagination!.totalPages) return null;
                      
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
              <button 
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SAUniversityCard: React.FC<SAUniversityCardProps> = ({
  university,
  isSaved,
  onSave,
  onCompare,
  isInComparison,
  viewMode
}) => {
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
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
                {university.location}, {university.province}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {university.universityType && (
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {university.universityType}
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
                <span className="text-xs text-gray-500 block">APS Required</span>
                <p className="font-medium text-sm">{university.apsScoreRequired || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <span className="text-xs text-gray-500 block">Student Pop.</span>
                <p className="font-medium text-sm">{university.studentPopulation?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <span className="text-xs text-gray-500 block">Annual Fees</span>
                <p className="font-medium text-sm">{formatCurrency(university.tuitionFeesAnnual)}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <span className="text-xs text-gray-500 block">Deadline</span>
                <p className="font-medium text-sm">{university.applicationDeadline || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {university.nsfasAccredited && (
              <div className="flex items-center text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">
                <CheckBadgeIcon className="h-3 w-3 mr-1" />
                <span>NSFAS Accredited</span>
              </div>
            )}
            {university.bursariesAvailable && (
              <div className="flex items-center text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded-full">
                <StarIcon className="h-3 w-3 mr-1" />
                <span>Bursaries Available</span>
              </div>
            )}
            {university.accommodationAvailable && (
              <div className="flex items-center text-purple-600 text-xs bg-purple-50 px-2 py-1 rounded-full">
                <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                <span>Accommodation Available</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={() => onCompare(university)}
          disabled={isInComparison}
          className={`px-4 py-2 border rounded text-sm font-medium transition-colors ${
            isInComparison 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
              : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
          }`}
        >
          {isInComparison ? 'Added to Compare' : 'Add to Compare'}
        </button>
        <button
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
          onClick={() => console.log('View details:', university.id)}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default Search;