import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ScaleIcon, PlusIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { getAllUniversities, compareUniversities } from '../services/api';
import { 
  University, 
  ComparisonResult, 
  LoadingState, 
  ErrorState,
  APP_CONFIG 
} from '../types';

const Compare: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false });
  const [errorState, setErrorState] = useState<ErrorState>({ hasError: false });
  const [universitiesLoading, setUniversitiesLoading] = useState(true);

  const location = useLocation();

  //Parse IDs from query string
  const queryParams = new URLSearchParams(location.search);
  const idsParam = queryParams.get("ids");
  const initialSelectedIds = idsParam ? idsParam.split(",") : [];

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    loadUniversities();
  }, []);

  //If the user navigates with new IDs, update selectedIds
  useEffect(() => {
    if(idsParam){
      setSelectedIds(idsParam.split(","));
    }
  }, [idsParam]);

  const loadUniversities = async () => {
    try {
      setUniversitiesLoading(true);
      setErrorState({ hasError: false });
      
      const response = await getAllUniversities(1, 100); // Get more universities for comparison
      
      if (response.success && response.data) {
        setUniversities(response.data);
      } else {
        throw new Error(response.message || 'Failed to load universities');
      }
    } catch (error) {
      console.error('Error loading universities:', error);
      setErrorState({
        hasError: true,
        message: error instanceof Error ? error.message : 'Failed to load universities'
      });
    } finally {
      setUniversitiesLoading(false);
    }
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      setErrorState({
        hasError: true,
        message: 'Please select at least 2 universities to compare'
      });
      return;
    }
    
    setLoadingState({ isLoading: true, message: 'Comparing universities...' });
    setErrorState({ hasError: false });
    
    try {
      const response = await compareUniversities(selectedIds);
      console.log('Comparison response:', response);
      
      if (response.success && response.data) {
        // Updated to match the new API structure
        setComparisonResult({
          summary: response.data.summary || 'Comparison completed',
          highlights: response.data.highlights || [],
          universities: response.data.universities || [],
          comparison: response.data.analysis || null
        });
      } else {
        throw new Error(response.message || 'Failed to compare universities');
      }
    } catch (error) {
      console.error('Compare error:', error);
      setErrorState({
        hasError: true,
        message: error instanceof Error ? error.message : 'Failed to compare universities'
      });
      setComparisonResult(null);
    } finally {
      setLoadingState({ isLoading: false });
    }
  };

  const addUniversity = (id: string) => {
    if (selectedIds.length < APP_CONFIG.MAX_COMPARISON_ITEMS && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
      setErrorState({ hasError: false }); // Clear any previous errors
    }
  };

  const removeUniversity = (id: string) => {
    const newSelectedIds = selectedIds.filter(sid => sid !== id);
    setSelectedIds(newSelectedIds);
    
    // Clear comparison if we have less than 2 universities
    if (newSelectedIds.length < 2) {
      setComparisonResult(null);
    }
  };

  const getSelectedUniversities = (): University[] => {
    // First try to get universities from comparison result (which should be the most up-to-date)
    if (comparisonResult && comparisonResult.universities && comparisonResult.universities.length > 0) {
      return comparisonResult.universities;
    }
    
    // Fallback to the original universities list
    return selectedIds
      .map(id => universities.find(u => u.id === id))
      .filter((uni): uni is University => uni !== undefined);
  };

  const renderComparisonRow = (
    label: string,
    getValue: (uni: University) => string | number | undefined,
    formatter?: (value: any) => string
  ) => (
    <tr className="even:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {label}
      </td>
      {getSelectedUniversities().map((uni) => {
        const value = getValue(uni);
        const displayValue = formatter ? formatter(value) : value ?? 'N/A';
        return (
          <td key={uni.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {displayValue}
          </td>
        );
      })}
    </tr>
  );

  if (universitiesLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <ScaleIcon className="h-8 w-8 mr-2 text-blue-600" />
          Compare Universities
        </h1>
        
        <p className="text-gray-600 mb-6">
          Select up to {APP_CONFIG.MAX_COMPARISON_ITEMS} universities to compare their key metrics and requirements side by side.
        </p>
        
        {/* Error Display */}
        {errorState.hasError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-800">{errorState.message}</p>
          </div>
        )}
        
        {/* University Selector */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {selectedIds.map(id => {
              const uni = universities.find(u => u.id === id);
              return uni ? (
                <div key={id} className="flex items-center bg-blue-100 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-blue-900" title={uni.universityName}>
                    {uni.universityName.length > 25 
                      ? `${uni.universityName.substring(0, 25)}...` 
                      : uni.universityName}
                  </span>
                  <button
                    onClick={() => removeUniversity(id)}
                    className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                    aria-label={`Remove ${uni.universityName} from comparison`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : null;
            })}
            
            {selectedIds.length < APP_CONFIG.MAX_COMPARISON_ITEMS && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addUniversity(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Add university to comparison"
              >
                <option value="">Add university...</option>
                {universities
                  .filter(u => !selectedIds.includes(u.id))
                  .sort((a, b) => a.universityName.localeCompare(b.universityName))
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.universityName} ({u.location})
                    </option>
                  ))}
              </select>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleCompare}
              disabled={selectedIds.length < 2 || loadingState.isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingState.isLoading ? 'Comparing...' : `Compare Selected (${selectedIds.length})`}
            </button>
            
            {selectedIds.length > 0 && (
              <button
                onClick={() => {
                  setSelectedIds([]);
                  setComparisonResult(null);
                  setErrorState({ hasError: false });
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonResult && (
        <>
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Comparison Summary</h2>
            <p className="text-blue-800">{comparisonResult.summary}</p>
          </div>

          {/* Highlights */}
          {comparisonResult.highlights && comparisonResult.highlights.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparisonResult.highlights.map((highlight, index) => (
                  <div 
                    key={index} 
                    className={`rounded-lg p-4 ${
                      highlight.type === 'success' ? 'bg-green-50 border border-green-200' :
                      highlight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <p className={`text-sm font-medium ${
                      highlight.type === 'success' ? 'text-green-900' :
                      highlight.type === 'warning' ? 'text-yellow-900' :
                      'text-blue-900'
                    }`}>
                      {highlight.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Section - New addition to display the analysis data */}
          {comparisonResult.comparison && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis</h3>
              <div className="text-gray-700">
                {typeof comparisonResult.comparison === 'string' ? (
                  <p>{comparisonResult.comparison}</p>
                ) : (
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                    {JSON.stringify(comparisonResult.comparison, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Comparison Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    {getSelectedUniversities().map((uni) => (
                      <th 
                        key={uni.id} 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        title={uni.universityName || uni.universityName}
                      >
                        {(uni.universityName || uni.universityName || 'Unknown').length > 20 
                          ? `${(uni.universityName || uni.universityName || 'Unknown').substring(0, 20)}...` 
                          : (uni.universityName || uni.universityName || 'Unknown')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renderComparisonRow('Location', (uni) => uni.location)}
                  {renderComparisonRow('GPA Required', (uni) => uni.gpaRequired)}
                  {renderComparisonRow('SAT Range', (uni) => uni.satRange)}
                  {renderComparisonRow('Acceptance Rate', (uni) => uni.acceptanceRate, (val) => val ? `${val}%` : 'N/A')}
                  {renderComparisonRow('Application Fee', (uni) => uni.applicationFee, (val) => val ? `$${val}` : 'N/A')}
                  {renderComparisonRow('Essays Required', (uni) => uni.essaysRequired)}
                  {renderComparisonRow('Deadline', (uni) => uni.deadline)}
                  {renderComparisonRow('Ranking', (uni) => uni.ranking, (val) => val ? `#${val}` : 'N/A')}
                  {renderComparisonRow('Student Count', (uni) => uni.studentCount, (val) => val ? val.toLocaleString() : 'N/A')}
                  {renderComparisonRow('Annual Tuition', (uni) => uni.tuition, (val) => val ? `$${val.toLocaleString()}` : 'N/A')}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      {/* Empty State */}
      {selectedIds.length === 0 && !errorState.hasError && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ScaleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Universities Selected
          </h3>
          <p className="text-gray-500 mb-4">
            Select at least 2 universities from the dropdown above to compare their features and requirements.
          </p>
          <p className="text-sm text-gray-400">
            You can compare up to {APP_CONFIG.MAX_COMPARISON_ITEMS} universities at once.
          </p>
        </div>
      )}

      {/* Loading State for Comparison */}
      {loadingState.isLoading && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">{loadingState.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compare;