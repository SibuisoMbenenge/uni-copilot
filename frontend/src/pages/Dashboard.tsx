import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  TrophyIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { getAllUniversities, getProfile, getApiStatistics } from '../services/api';
import type { 
  University, 
  StudentProfile, 
  LoadingState, 
  ErrorState,
  ApiResponse,
  PaginatedResponse 
} from '../types';

interface DeadlineInfo {
  id: string;
  universityName: string;
  deadline: string;
  deadlineDate: Date;
  daysUntil: number;
  location: string;
}

interface DashboardStats {
  totalUniversities: number;
  totalSearches: number;
  totalRecommendations: number;
  lastDataUpdate: string;
}

const Dashboard: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: true });
  const [errorState, setErrorState] = useState<ErrorState>({ hasError: false });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoadingState({ isLoading: true, message: 'Loading dashboard...' });
      setErrorState({ hasError: false });

      const promises = [
        getAllUniversities(1, 50), // Get first 50 universities for overview
        getProfile().catch(() => ({ success: false, data: null })), // Don't fail if no profile
        getApiStatistics().catch(() => ({ success: false, data: null })) // Don't fail if stats unavailable
      ];

      const [univResponse, profileResponse, statsResponse] = await Promise.all(promises);

      // Handle universities response
      if (univResponse.success && Array.isArray(univResponse.data)) {
        setUniversities(univResponse.data);
      } else {
        console.warn('Failed to load universities:', 'message' in univResponse ? univResponse.message : univResponse);
      }

      // Handle profile response
      if (profileResponse.success && profileResponse.data && typeof profileResponse.data === 'object' && !Array.isArray(profileResponse.data) && 'name' in profileResponse.data) {
        setProfile(profileResponse.data as StudentProfile);
      }

      // Handle stats response
      if (
        statsResponse.success &&
        statsResponse.data &&
        typeof statsResponse.data === 'object' &&
        'totalUniversities' in statsResponse.data &&
        'totalSearches' in statsResponse.data &&
        'totalRecommendations' in statsResponse.data &&
        'lastDataUpdate' in statsResponse.data
      ) {
        setDashboardStats(statsResponse.data as DashboardStats);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      setErrorState({
        hasError: true,
        message: error instanceof Error ? error.message : 'Failed to load dashboard data'
      });
    } finally {
      setLoadingState({ isLoading: false });
    }
  };

  const upcomingDeadlines = useMemo((): DeadlineInfo[] => {
    if (!universities.length) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    
    return universities
      .filter((u) => u.deadline)
      .map((u) => {
        // Parse deadline - assume current year if year not specified
        let deadlineDate: Date;
        try {
          deadlineDate = new Date(u.deadline);
          // If year is not in the future, assume next year
          if (deadlineDate.getFullYear() < currentYear || 
              (deadlineDate.getFullYear() === currentYear && deadlineDate < now)) {
            deadlineDate.setFullYear(currentYear + 1);
          }
        } catch {
          // If parsing fails, skip this deadline
          return null;
        }

        const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: u.id,
          universityName: u.universityName,
          deadline: u.deadline,
          deadlineDate,
          daysUntil,
          location: u.location
        };
      })
      .filter((deadline): deadline is DeadlineInfo => 
        deadline !== null && deadline.daysUntil > 0 && deadline.daysUntil <= 365
      )
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [universities]);

  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    
    const fields = [
      profile.name,
      profile.gpa,
      profile.sat || profile.act,
      profile.intendedMajor,
      profile.locationPreference?.length,
      profile.extracurriculars?.length
    ];
    
    const completedFields = fields.filter(field => 
      field !== undefined && field !== null && field !== '' && 
      (typeof field === 'number' || (Array.isArray(field) ? field.length > 0 : true))
    ).length;
    
    return Math.round((completedFields / fields.length) * 100);
  }, [profile]);

  const getDeadlineUrgency = (daysUntil: number) => {
    if (daysUntil <= 7) return { color: 'bg-red-100 text-red-800', label: 'Urgent' };
    if (daysUntil <= 30) return { color: 'bg-yellow-100 text-yellow-800', label: 'Soon' };
    if (daysUntil <= 90) return { color: 'bg-blue-100 text-blue-800', label: 'Upcoming' };
    return { color: 'bg-green-100 text-green-800', label: 'Future' };
  };

  if (loadingState.isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 animate-pulse">
          <div className="h-8 bg-blue-500 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-blue-400 rounded w-1/3"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (errorState.hasError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-red-900">Dashboard Error</h2>
          </div>
          <p className="text-red-800 mt-2">{errorState.message}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome to UniCopilot{profile?.name ? `, ${profile.name}` : ''}!
        </h1>
        <p className="text-blue-100 mb-4">
          Your personalized university application assistant
        </p>
        {profile && profileCompletion < 100 && (
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profile Completion</span>
              <span className="text-sm">{profileCompletion}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Universities</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats?.totalUniversities || universities.length}
              </p>
            </div>
            <AcademicCapIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Your GPA</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile?.gpa ? profile.gpa.toFixed(2) : '--'}
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Test Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile?.sat ? profile.sat : profile?.act ? `${profile.act} ACT` : '--'}
              </p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Deadlines</p>
              <p className="text-2xl font-bold text-gray-900">
                {upcomingDeadlines.length}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <CalendarDaysIcon className="h-6 w-6 mr-2 text-red-600" />
              Upcoming Deadlines
            </h2>
          </div>
          <div className="p-6">
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((deadline) => {
                  const urgency = getDeadlineUrgency(deadline.daysUntil);
                  return (
                    <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 truncate" title={deadline.universityName}>
                          {deadline.universityName}
                        </p>
                        <p className="text-sm text-gray-600">{deadline.location}</p>
                        <p className="text-xs text-gray-500">Due: {deadline.deadline}</p>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgency.color}`}>
                          {deadline.daysUntil} days
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{urgency.label}</p>
                      </div>
                    </div>
                  );
                })}
                <Link
                  to="/search"
                  className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium mt-4"
                >
                  View all universities →
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No upcoming deadlines</p>
                <p className="text-sm text-gray-400 mt-1">
                  Search for universities to see their application deadlines
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            <Link
              to="/search"
              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
            >
              <div className="flex items-center">
                <AcademicCapIcon className="h-5 w-5 text-blue-600 mr-3" />
                <span className="font-medium text-blue-900">Search Universities</span>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/recommendations"
              className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
            >
              <div className="flex items-center">
                <TrophyIcon className="h-5 w-5 text-green-600 mr-3" />
                <span className="font-medium text-green-900">Get Recommendations</span>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-green-600 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/compare"
              className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
            >
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 text-purple-600 mr-3" />
                <span className="font-medium text-purple-900">Compare Universities</span>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            {!profile ? (
              <Link
                to="/profile"
                className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group border-2 border-yellow-200"
              >
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
                  <div>
                    <span className="font-medium text-yellow-900 block">Complete Your Profile</span>
                    <span className="text-sm text-yellow-700">Get personalized recommendations</span>
                  </div>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-yellow-600 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : profileCompletion < 100 && (
              <Link
                to="/profile"
                className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group"
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-yellow-600 mr-3" />
                  <div>
                    <span className="font-medium text-yellow-900 block">Update Profile</span>
                    <span className="text-sm text-yellow-700">{profileCompletion}% complete</span>
                  </div>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-yellow-600 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Footer */}
      {dashboardStats && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalUniversities.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Universities in Database</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalSearches.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Searches</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalRecommendations.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Recommendations Generated</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(dashboardStats.lastDataUpdate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">Last Data Update</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;