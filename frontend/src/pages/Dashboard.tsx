import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getAllUniversities, getProfile } from '../services/api';

const Dashboard = () => {
  const [universities, setUniversities] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [univResponse, profileResponse] = await Promise.all([
        getAllUniversities(),
        getProfile()
      ]);
      
      setUniversities(univResponse.universities || []);
      setProfile(profileResponse.profile);
      
      // Calculate upcoming deadlines
      if (univResponse.universities) {
        const deadlines = univResponse.universities
          .filter((u: any) => u.deadline)
          .map((u: any) => ({
            ...u,
            deadlineDate: new Date(u.deadline),
            daysUntil: Math.ceil((new Date(u.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          }))
          .filter((u: any) => u.daysUntil > 0)
          .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
          .slice(0, 5);
        
        setUpcomingDeadlines(deadlines);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <p className="text-blue-100">
          Your personalized university application assistant
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Universities</p>
              <p className="text-2xl font-bold text-gray-900">{universities.length}</p>
            </div>
            <AcademicCapIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Your GPA</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile?.gpa || '--'}
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Your SAT</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile?.sat || '--'}
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
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <ClockIcon className="h-6 w-6 mr-2 text-red-600" />
              Upcoming Deadlines
            </h2>
          </div>
          <div className="p-6">
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{deadline.universityName}</p>
                      <p className="text-sm text-gray-600">{deadline.deadline}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        deadline.daysUntil <= 7 ? 'bg-red-100 text-red-800' :
                        deadline.daysUntil <= 30 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {deadline.daysUntil} days
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No upcoming deadlines</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            <Link
              to="/search"
              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="font-medium text-blue-900">Search Universities</span>
              <ArrowRightIcon className="h-5 w-5 text-blue-600" />
            </Link>
            
            <Link
              to="/recommendations"
              className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="font-medium text-green-900">Get Recommendations</span>
              <ArrowRightIcon className="h-5 w-5 text-green-600" />
            </Link>
            
            <Link
              to="/compare"
              className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span className="font-medium text-purple-900">Compare Universities</span>
              <ArrowRightIcon className="h-5 w-5 text-purple-600" />
            </Link>
            
            {!profile && (
              <Link
                to="/profile"
                className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="font-medium text-yellow-900">Complete Your Profile</span>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-yellow-600" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;