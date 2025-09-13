// Complete Compare.tsx component (continuing from where it was cut off)

import React, { useState, useEffect } from 'react';
import { ScaleIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getAllUniversities, compareUniversities } from '../services/api';

const Compare = () => {
  const [universities, setUniversities] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = async () => {
    try {
      const response = await getAllUniversities();
      setUniversities(response.universities || []);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    
    setLoading(true);
    try {
      const response = await compareUniversities(selectedIds);
      setComparison(response.comparison);
    } catch (error) {
      console.error('Compare error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addUniversity = (id: string) => {
    if (selectedIds.length < 4 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeUniversity = (id: string) => {
    setSelectedIds(selectedIds.filter(sid => sid !== id));
    if (selectedIds.length <= 2) {
      setComparison(null);
    }
  };

  const getSelectedUniversities = () => {
    return selectedIds.map(id => universities.find(u => u.id === id)).filter(Boolean);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <ScaleIcon className="h-8 w-8 mr-2 text-blue-600" />
          Compare Universities
        </h1>
        
        {/* University Selector */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {selectedIds.map(id => {
              const uni = universities.find(u => u.id === id);
              return uni ? (
                <div key={id} className="flex items-center bg-blue-100 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-blue-900">{uni.universityName}</span>
                  <button
                    onClick={() => removeUniversity(id)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : null;
            })}
            
            {selectedIds.length < 4 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addUniversity(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Add university...</option>
                {universities
                  .filter(u => !selectedIds.includes(u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.universityName}</option>
                  ))}
              </select>
            )}
          </div>
          
          <button
            onClick={handleCompare}
            disabled={selectedIds.length < 2 || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Comparing...' : 'Compare Selected'}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900">{comparison.summary}</p>
          </div>

          {/* Highlights */}
          {comparison.highlights && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {comparison.highlights.map((highlight: any, index: number) => (
                <div key={index} className={`rounded-lg p-4 ${
                  highlight.type === 'success' ? 'bg-green-50 border border-green-200' :
                  highlight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
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
          )}

          {/* Comparison Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    {getSelectedUniversities().map((uni) => (
                      <th key={uni.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {uni.universityName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Location
                    </td>
                    {getSelectedUniversities().map((uni) => (
                      <td key={uni.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {uni.location}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      GPA Required
                    </td>
                    {getSelectedUniversities().map((uni) => (
                      <td key={uni.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {uni.gpaRequired || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      SAT Range
                    </td>
                    {getSelectedUniversities().map((uni) => (
                      <td key={uni.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {uni.satRange || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Acceptance Rate
                    </td>
                    {getSelectedUniversities().map((uni) => (
                      <td key={uni.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {uni.acceptanceRate}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Application Fee
                    </td>
                    {getSelectedUniversities().map((uni) => (
                      <td key={uni.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${uni.applicationFee || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Essays Required
                    </td>
                    {getSelectedUniversities().map((uni) => (
                      <td key={uni.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {uni.essaysRequired || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Deadline
                    </td>
                    {getSelectedUniversities().map((uni) => (
                      <td key={uni.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {uni.deadline || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Ranking
                    </td>
                    {getSelectedUniversities().map((uni) => (
                      <td key={uni.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {uni.ranking ? `#${uni.ranking}` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      {/* Empty State */}
      {selectedIds.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ScaleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Universities Selected
          </h3>
          <p className="text-gray-500">
            Select at least 2 universities to compare their features and requirements.
          </p>
        </div>
      )}
    </div>
  );
};

export default Compare;