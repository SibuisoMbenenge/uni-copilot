import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchUniversities } from '../services/api';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minGPA: '',
    maxGPA: '',
    minSAT: '',
    maxSAT: '',
    maxAcceptanceRate: '',
    location: '',
    maxEssays: ''
  });

  const handleSearch = async () => {
    setLoading(true);
    try {
      const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {} as any);
      
      const response = await searchUniversities(query || '*', activeFilters);
      setResults(response.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      minGPA: '',
      maxGPA: '',
      minSAT: '',
      maxSAT: '',
      maxAcceptanceRate: '',
      location: '',
      maxEssays: ''
    });
  };

  useEffect(() => {
    // Load initial results
    handleSearch();
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Search Universities</h1>
        
        {/* Search Bar */}
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, location, or program..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <FunnelIcon className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GPA Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Min"
                    value={filters.minGPA}
                    onChange={(e) => handleFilterChange('minGPA', e.target.value)}
                    className="w-1/2 px-3 py-1 border border-gray-300 rounded"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Max"
                    value={filters.maxGPA}
                    onChange={(e) => handleFilterChange('maxGPA', e.target.value)}
                    className="w-1/2 px-3 py-1 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SAT Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minSAT}
                    onChange={(e) => handleFilterChange('minSAT', e.target.value)}
                    className="w-1/2 px-3 py-1 border border-gray-300 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxSAT}
                    onChange={(e) => handleFilterChange('maxSAT', e.target.value)}
                    className="w-1/2 px-3 py-1 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Acceptance Rate (%)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 20"
                  value={filters.maxAcceptanceRate}
                  onChange={(e) => handleFilterChange('maxAcceptanceRate', e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., CA"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Essays
                </label>
                <input
                  type="number"
                  placeholder="e.g., 5"
                  value={filters.maxEssays}
                  onChange={(e) => handleFilterChange('maxEssays', e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded"
                />
              </div>
            </div>
            
            <button
              onClick={handleSearch}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Results ({results.length})
          </h2>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((university) => (
                <div key={university.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {university.universityName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{university.location}</p>
                      
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <span className="text-xs text-gray-500">GPA Required</span>
                          <p className="font-medium">{university.gpaRequired || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">SAT Range</span>
                          <p className="font-medium">{university.satRange || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Acceptance Rate</span>
                          <p className="font-medium">{university.acceptanceRate}%</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Deadline</span>
                          <p className="font-medium">{university.deadline || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {university.programs && (
                        <div className="mt-3">
                          <span className="text-xs text-gray-500">Programs: </span>
                          <span className="text-sm text-gray-700">{university.programs}</span>
                        </div>
                      )}
                    </div>
                    
                    {university.ranking && (
                      <div className="ml-4">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          #{university.ranking}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No universities found. Try adjusting your search or filters.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;