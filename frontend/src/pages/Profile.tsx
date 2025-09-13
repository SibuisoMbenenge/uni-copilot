// frontend/src/pages/Profile.tsx
import React, { useState, useEffect } from 'react';
import { 
  UserCircleIcon, 
  DocumentArrowUpIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import { getProfile, saveProfile, uploadPDF } from '../services/api';
import type { StudentProfile } from '../services/api';

const Profile = () => {
  const [profile, setProfile] = useState<StudentProfile>({
    gpa: 0,
    locationPreference: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await getProfile();
      if (response.profile) {
        setProfile(response.profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await saveProfile(profile);
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'Please upload a PDF file' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const response = await uploadPDF(file);
      if (response.extractedData) {
        setProfile(prev => ({
          ...prev,
          ...response.extractedData
        }));
        setMessage({ type: 'success', text: 'Document processed and profile updated!' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to process document' });
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (field: keyof StudentProfile, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      locationPreference: checked 
        ? [...(prev.locationPreference || []), location]
        : (prev.locationPreference || []).filter(l => l !== location)
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const locationOptions = [
    'California', 'New York', 'Texas', 'Florida', 'Illinois', 'Pennsylvania',
    'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'Massachusetts', 'Washington'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <UserCircleIcon className="h-8 w-8 mr-2 text-blue-600" />
          Student Profile
        </h1>
        <p className="text-gray-600">
          Complete your profile to get personalized university recommendations
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
          )}
          <span className={`text-sm ${
            message.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {message.text}
          </span>
        </div>
      )}

      {/* Document Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DocumentArrowUpIcon className="h-6 w-6 mr-2 text-blue-600" />
          Upload Documents
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload your transcript or other academic documents to automatically fill your profile
        </p>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <label className="cursor-pointer">
              <span className="text-sm text-gray-600">
                {uploading ? 'Processing...' : 'Click to upload or drag and drop'}
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">PDF files only</p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Academic Information</h2>
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intended Major
            </label>
            <input
              type="text"
              value={profile.intendedMajor || ''}
              onChange={(e) => handleInputChange('intendedMajor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Computer Science"
            />
          </div>
        </div>

        {/* Academic Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GPA <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="4.0"
              value={profile.gpa}
              onChange={(e) => handleInputChange('gpa', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 3.8"
              required
            />
            <p className="text-xs text-gray-500 mt-1">On a 4.0 scale</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SAT Score
            </label>
            <input
              type="number"
              min="400"
              max="1600"
              value={profile.sat || ''}
              onChange={(e) => handleInputChange('sat', parseInt(e.target.value) || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 1450"
            />
            <p className="text-xs text-gray-500 mt-1">400-1600 scale</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ACT Score
            </label>
            <input
              type="number"
              min="1"
              max="36"
              value={profile.act || ''}
              onChange={(e) => handleInputChange('act', parseInt(e.target.value) || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 32"
            />
            <p className="text-xs text-gray-500 mt-1">1-36 scale</p>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Essays Willing to Write
          </label>
          <input
            type="number"
            min="0"
            max="20"
            value={profile.maxEssays || ''}
            onChange={(e) => handleInputChange('maxEssays', parseInt(e.target.value) || undefined)}
            className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 8"
          />
          <p className="text-xs text-gray-500 mt-1">This will help filter university recommendations</p>
        </div>

        {/* Location Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Location Preferences
          </label>
          <p className="text-xs text-gray-500 mb-3">Select states where you'd like to study</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {locationOptions.map((location) => (
              <label key={location} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(profile.locationPreference || []).includes(location)}
                  onChange={(e) => handleLocationChange(location, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{location}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t">
          <button
            type="submit"
            disabled={saving || !profile.gpa}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>

      {/* Profile Completeness */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Completeness</h2>
        
        <div className="space-y-3">
          {[
            { field: 'name', label: 'Full Name', completed: !!profile.name },
            { field: 'gpa', label: 'GPA', completed: !!profile.gpa },
            { field: 'sat', label: 'SAT Score', completed: !!profile.sat },
            { field: 'intendedMajor', label: 'Intended Major', completed: !!profile.intendedMajor },
            { field: 'locationPreference', label: 'Location Preferences', completed: (profile.locationPreference?.length || 0) > 0 }
          ].map((item) => (
            <div key={item.field} className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${
                item.completed ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {item.completed && (
                  <CheckCircleIcon className="w-4 h-4 text-white" />
                )}
              </div>
              <span className={`text-sm ${
                item.completed ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Complete more fields to get better university recommendations!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;