import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCircleIcon, 
  DocumentArrowUpIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { getProfile, saveProfile, uploadPDF } from '../services/api';
import { 
  StudentProfile, 
  LoadingState, 
  ErrorState, 
  ValidationError,
  PDFUploadResult,
  APP_CONFIG 
} from '../types';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile>({
    gpa: 0,
    locationPreference: [],
    extracurriculars: [],
    awards: [],
    workExperience: []
  });
  
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: true });
  const [savingState, setSavingState] = useState<LoadingState>({ isLoading: false });
  const [uploadingState, setUploadingState] = useState<LoadingState>({ isLoading: false });
  const [errorState, setErrorState] = useState<ErrorState>({ hasError: false });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Custom input states for dynamic arrays
  const [newExtracurricular, setNewExtracurricular] = useState('');
  const [newAward, setNewAward] = useState('');
  const [newWorkExperience, setNewWorkExperience] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Clear success messages after 5 seconds
    if (message?.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadProfile = async () => {
    try {
      setLoadingState({ isLoading: true, message: 'Loading profile...' });
      setErrorState({ hasError: false });
      
      const response = await getProfile();
      
      if (response.success && response.data) {
        setProfile({
          locationPreference: [],
          extracurriculars: [],
          awards: [],
          workExperience: [],
          ...response.data
        });
      } else if (!response.success && response.message) {
        // Profile doesn't exist yet - this is normal for new users
        setMessage({ 
          type: 'info', 
          text: 'Complete your profile to get personalized recommendations' 
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setErrorState({
        hasError: true,
        message: error instanceof Error ? error.message : 'Failed to load profile'
      });
    } finally {
      setLoadingState({ isLoading: false });
    }
  };

  const validateProfile = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!profile.gpa || profile.gpa <= 0) {
      errors.push({ field: 'gpa', message: 'GPA is required and must be greater than 0' });
    }
    
    if (profile.gpa > 4.0) {
      errors.push({ field: 'gpa', message: 'GPA cannot exceed 4.0' });
    }
    
    if (profile.sat && (profile.sat < 400 || profile.sat > 1600)) {
      errors.push({ field: 'sat', message: 'SAT score must be between 400 and 1600' });
    }
    
    if (profile.act && (profile.act < 1 || profile.act > 36)) {
      errors.push({ field: 'act', message: 'ACT score must be between 1 and 36' });
    }
    
    if (profile.budgetRange && profile.budgetRange.min > profile.budgetRange.max) {
      errors.push({ field: 'budget', message: 'Minimum budget cannot exceed maximum budget' });
    }
    
    return errors;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateProfile();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      setMessage({ type: 'error', text: 'Please fix the validation errors before saving' });
      return;
    }
    
    setSavingState({ isLoading: true, message: 'Saving profile...' });
    setMessage(null);
    setErrorState({ hasError: false });

    try {
      const response = await saveProfile(profile);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Profile saved successfully!' });
      } else {
        throw new Error(response.message || 'Failed to save profile');
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to save profile' 
      });
    } finally {
      setSavingState({ isLoading: false });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    e.target.value = '';

    if (!APP_CONFIG.SUPPORTED_FILE_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a PDF file' });
      return;
    }

    if (file.size > APP_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
      setMessage({ 
        type: 'error', 
        text: `File size must be less than ${APP_CONFIG.MAX_FILE_SIZE_MB}MB` 
      });
      return;
    }

    setUploadingState({ isLoading: true, message: 'Processing document...' });
    setMessage(null);

    try {
      const response = await uploadPDF(file);
      
      if (response.success && response.data) {
        const { extractedData } = response.data;
        
        setProfile(prev => ({
          ...prev,
          ...extractedData,
          // Merge arrays instead of replacing
          locationPreference: [
            ...(prev.locationPreference || []),
            ...(extractedData.locationPreference || [])
          ].filter((item, index, arr) => arr.indexOf(item) === index),
          
          extracurriculars: [
            ...(prev.extracurriculars || []),
            ...(extractedData.extracurriculars || [])
          ].filter((item, index, arr) => arr.indexOf(item) === index),
          
          awards: [
            ...(prev.awards || []),
            ...(extractedData.awards || [])
          ].filter((item, index, arr) => arr.indexOf(item) === index),
        }));
        
        setMessage({ 
          type: 'success', 
          text: `Document processed successfully! Processing time: ${response.data.processingTime}ms` 
        });
      } else {
        throw new Error(response.message || 'Failed to process document');
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to process document' 
      });
    } finally {
      setUploadingState({ isLoading: false });
    }
  };

  const handleInputChange = (field: keyof StudentProfile, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(err => err.field !== field));
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      locationPreference: checked 
        ? [...(prev.locationPreference || []), location]
        : (prev.locationPreference || []).filter(l => l !== location)
    }));
  };

  const addArrayItem = (field: 'extracurriculars' | 'awards' | 'workExperience', value: string) => {
    if (!value.trim()) return;
    
    setProfile(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()]
    }));
    
    // Clear the input
    if (field === 'extracurriculars') setNewExtracurricular('');
    if (field === 'awards') setNewAward('');
    if (field === 'workExperience') setNewWorkExperience('');
  };

  const removeArrayItem = (field: 'extracurriculars' | 'awards' | 'workExperience', index: number) => {
    setProfile(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }));
  };

  const profileCompletion = useMemo(() => {
    const fields = [
      profile.name,
      profile.gpa && profile.gpa > 0,
      profile.sat || profile.act,
      profile.intendedMajor,
      profile.locationPreference?.length,
      profile.extracurriculars?.length,
      profile.maxEssays
    ];
    
    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  }, [profile]);

  const getFieldError = (field: string) => {
    return validationErrors.find(err => err.field === field)?.message;
  };

  if (loadingState.isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (errorState.hasError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-red-900">Error Loading Profile</h2>
          </div>
          <p className="text-red-800 mt-2">{errorState.message}</p>
          <button
            onClick={loadProfile}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const locationOptions = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <UserCircleIcon className="h-8 w-8 mr-2 text-blue-600" />
          Student Profile
        </h1>
        <p className="text-gray-600 mb-4">
          Complete your profile to get personalized university recommendations
        </p>
        
        {/* Profile Completion Bar */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
            <span className="text-sm font-bold text-blue-600">{profileCompletion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${profileCompletion}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {profileCompletion < 50 ? 'Add more details to improve recommendations' :
             profileCompletion < 80 ? 'Looking good! A few more details will help' :
             'Excellent! Your profile is very complete'}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-start space-x-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : message.type === 'error' ? (
            <ExclamationCircleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          ) : (
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-800' :
              message.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {message.text}
            </p>
            {message.type === 'success' && (
              <button
                onClick={() => setMessage(null)}
                className="text-xs text-green-700 hover:text-green-900 mt-1"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Document Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DocumentArrowUpIcon className="h-6 w-6 mr-2 text-blue-600" />
          Upload Academic Documents
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload your transcript, test scores, or other academic documents to auto-fill your profile.
          Supported format: PDF (max {APP_CONFIG.MAX_FILE_SIZE_MB}MB)
        </p>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            disabled={uploadingState.isLoading}
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer ${uploadingState.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {uploadingState.isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">{uploadingState.message}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF files only, up to {APP_CONFIG.MAX_FILE_SIZE_MB}MB
                </p>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g., Computer Science, Business, Engineering"
              />
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h2>
          
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
                value={profile.gpa || ''}
                onChange={(e) => handleInputChange('gpa', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                  getFieldError('gpa') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="4.0 scale"
                required
              />
              {getFieldError('gpa') && (
                <p className="text-sm text-red-600 mt-1">{getFieldError('gpa')}</p>
              )}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                  getFieldError('sat') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="400-1600"
              />
              {getFieldError('sat') && (
                <p className="text-sm text-red-600 mt-1">{getFieldError('sat')}</p>
              )}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                  getFieldError('act') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="1-36"
              />
              {getFieldError('act') && (
                <p className="text-sm text-red-600 mt-1">{getFieldError('act')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
          
          <div className="space-y-6">
            {/* Essay Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Essays Willing to Write
              </label>
              <select
                value={profile.maxEssays || ''}
                onChange={(e) => handleInputChange('maxEssays', parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select...</option>
                <option value="1">1 essay</option>
                <option value="2">2 essays</option>
                <option value="3">3 essays</option>
                <option value="4">4 essays</option>
                <option value="5">5 essays</option>
                <option value="10">More than 5 essays</option>
              </select>
            </div>

            {/* Budget Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Annual Budget Range (USD)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={profile.budgetRange?.min || ''}
                    onChange={(e) => handleInputChange('budgetRange', {
                      ...profile.budgetRange,
                      min: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Minimum budget"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={profile.budgetRange?.max || ''}
                    onChange={(e) => handleInputChange('budgetRange', {
                      ...profile.budgetRange,
                      max: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Maximum budget"
                  />
                </div>
              </div>
              {getFieldError('budget') && (
                <p className="text-sm text-red-600 mt-1">{getFieldError('budget')}</p>
              )}
            </div>

            {/* Location Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferred States ({profile.locationPreference?.length || 0} selected)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {locationOptions.map((location) => (
                    <label key={location} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={profile.locationPreference?.includes(location) || false}
                        onChange={(e) => handleLocationChange(location, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div className="space-y-6">
            {/* Extracurriculars */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extracurricular Activities
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newExtracurricular}
                  onChange={(e) => setNewExtracurricular(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('extracurriculars', newExtracurricular))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., Student Government, Soccer Team, Debate Club"
                />
                <button
                  type="button"
                  onClick={() => addArrayItem('extracurriculars', newExtracurricular)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.extracurriculars?.map((item, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('extracurriculars', index)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Awards */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Awards & Honors
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newAward}
                  onChange={(e) => setNewAward(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('awards', newAward))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., National Honor Society, Dean's List, Academic Excellence"
                />
                <button
                  type="button"
                  onClick={() => addArrayItem('awards', newAward)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.awards?.map((item, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('awards', index)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Work Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Experience
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newWorkExperience}
                  onChange={(e) => setNewWorkExperience(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('workExperience', newWorkExperience))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., Summer Intern at Tech Company, Part-time Tutor"
                />
                <button
                  type="button"
                  onClick={() => addArrayItem('workExperience', newWorkExperience)}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.workExperience?.map((item, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('workExperience', index)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Save Profile</h3>
              <p className="text-sm text-gray-600">
                Make sure all information is accurate before saving
              </p>
            </div>
            <button
              type="submit"
              disabled={savingState.isLoading || !profile.gpa || validationErrors.length > 0}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {savingState.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
          
          {validationErrors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">Please fix these errors:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </form>

      {/* Profile Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Academic</h3>
            <div className="space-y-1 text-sm">
              <p className="text-blue-800">GPA: {profile.gpa ? profile.gpa.toFixed(2) : 'Not set'}</p>
              <p className="text-blue-800">
                Test Score: {profile.sat ? `${profile.sat} SAT` : profile.act ? `${profile.act} ACT` : 'Not set'}
              </p>
              <p className="text-blue-800">Major: {profile.intendedMajor || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">Activities</h3>
            <div className="space-y-1 text-sm">
              <p className="text-green-800">
                Extracurriculars: {profile.extracurriculars?.length || 0}
              </p>
              <p className="text-green-800">
                Awards: {profile.awards?.length || 0}
              </p>
              <p className="text-green-800">
                Work Experience: {profile.workExperience?.length || 0}
              </p>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-medium text-purple-900 mb-2">Preferences</h3>
            <div className="space-y-1 text-sm">
              <p className="text-purple-800">
                Locations: {profile.locationPreference?.length || 0} selected
              </p>
              <p className="text-purple-800">
                Max Essays: {profile.maxEssays || 'Not set'}
              </p>
              <p className="text-purple-800">
                Budget: {profile.budgetRange?.min && profile.budgetRange?.max 
                  ? `${profile.budgetRange.min.toLocaleString()}-${profile.budgetRange.max.toLocaleString()}` 
                  : 'Not set'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;