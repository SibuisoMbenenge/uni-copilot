import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChartBarIcon, 
  AcademicCapIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  StarIcon,
  ArrowPathIcon,
  FunnelIcon,
  EyeIcon,
  BookmarkIcon,
  ScaleIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  SparklesIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

// Types
interface StudentProfile {
  gpa: number;
  sat?: number;
  act?: number;
  intendedMajor?: string;
  extracurriculars?: string[];
  essays?: number;
  location?: string;
}

interface University {
  id: string;
  universityName: string;
  location: string;
  ranking?: number;
  gpaRequired: string;
  satRange?: string;
  actRange?: string;
  acceptanceRate: number;
  applicationFee: number;
  deadline: string;
  essaysRequired: number;
  tuition: number;
  studentCount: number;
  programs?: string;
  requirements?: string;
}

interface Recommendation {
  university: University;
  matchScore: number;
  category: 'Safety' | 'Target' | 'Reach';
  reasoning: string;
  academicFit?: 'Excellent' | 'Good' | 'Fair';
  financialFit?: 'Good' | 'Moderate' | 'Challenging';
}

interface ProfileAnalysis {
  strengths: string[];
  areasForImprovement: string[];
  suggestions: string[];
}

interface RecommendationFilters {
  categories: ('Safety' | 'Target' | 'Reach')[];
  minMatchScore: number;
  maxApplicationFee: number | null;
  location: string[];
  maxEssays: number | null;
  sortBy: 'matchScore' | 'acceptanceRate' | 'ranking' | 'applicationFee' | 'deadline';
  sortOrder: 'asc' | 'desc';
}

// Mock data generator
const generateMockRecommendations = (profile: StudentProfile): { 
  recommendations: Recommendation[], 
  profileAnalysis: ProfileAnalysis 
} => {
  const universities: University[] = [
    {
      id: '1',
      universityName: 'University of Cape Town',
      location: 'Cape Town, Western Cape',
      ranking: 1,
      gpaRequired: '3.5+',
      satRange: '1200-1400',
      acceptanceRate: 18,
      applicationFee: 1200,
      deadline: '2024-09-30',
      essaysRequired: 2,
      tuition: 85000,
      studentCount: 29000,
      programs: 'Engineering, Medicine, Commerce, Humanities, Science',
      requirements: 'NSC with Bachelor Pass, English proficiency, Mathematics 70%+'
    },
    {
      id: '2',
      universityName: 'University of the Witwatersrand',
      location: 'Johannesburg, Gauteng',
      ranking: 2,
      gpaRequired: '3.6+',
      satRange: '1250-1450',
      acceptanceRate: 15,
      applicationFee: 1500,
      deadline: '2024-09-30',
      essaysRequired: 1,
      tuition: 92000,
      studentCount: 37000,
      programs: 'Engineering, Health Sciences, Commerce, Law, Humanities',
      requirements: 'NSC with Bachelor Pass, APS 36+, English and Mathematics requirements'
    },
    {
      id: '3',
      universityName: 'Stellenbosch University',
      location: 'Stellenbosch, Western Cape',
      ranking: 3,
      gpaRequired: '3.4+',
      satRange: '1150-1350',
      acceptanceRate: 22,
      applicationFee: 1100,
      deadline: '2024-06-30',
      essaysRequired: 1,
      tuition: 78000,
      studentCount: 32000,
      programs: 'Engineering, AgriSciences, Medicine, Arts, Economic Sciences',
      requirements: 'NSC with Bachelor Pass, Language requirements, Mathematics 60%+'
    },
    {
      id: '4',
      universityName: 'University of Pretoria',
      location: 'Pretoria, Gauteng',
      ranking: 4,
      gpaRequired: '3.3+',
      satRange: '1100-1300',
      acceptanceRate: 25,
      applicationFee: 1000,
      deadline: '2024-08-31',
      essaysRequired: 1,
      tuition: 75000,
      studentCount: 53000,
      programs: 'Engineering, Natural Sciences, Health Sciences, Law, Education',
      requirements: 'NSC with Bachelor Pass, APS 32+, Subject-specific requirements'
    },
    {
      id: '5',
      universityName: 'Rhodes University',
      location: 'Makhanda, Eastern Cape',
      ranking: 5,
      gpaRequired: '3.2+',
      satRange: '1050-1250',
      acceptanceRate: 35,
      applicationFee: 900,
      deadline: '2024-09-30',
      essaysRequired: 2,
      tuition: 68000,
      studentCount: 8200,
      programs: 'Humanities, Science, Commerce, Law, Pharmacy',
      requirements: 'NSC with Bachelor Pass, English 60%+, Subject requirements'
    },
    {
      id: '6',
      universityName: 'University of KwaZulu-Natal',
      location: 'Durban, KwaZulu-Natal',
      ranking: 6,
      gpaRequired: '3.0+',
      satRange: '1000-1200',
      acceptanceRate: 40,
      applicationFee: 800,
      deadline: '2024-09-30',
      essaysRequired: 0,
      tuition: 62000,
      studentCount: 46000,
      programs: 'Agriculture, Engineering, Health Sciences, Humanities, Law',
      requirements: 'NSC with Bachelor Pass, APS 30+, English proficiency'
    },
    {
      id: '7',
      universityName: 'University of the Western Cape',
      location: 'Cape Town, Western Cape',
      ranking: 8,
      gpaRequired: '2.8+',
      satRange: '950-1150',
      acceptanceRate: 45,
      applicationFee: 750,
      deadline: '2024-10-31',
      essaysRequired: 0,
      tuition: 55000,
      studentCount: 24000,
      programs: 'Natural Sciences, Economic Sciences, Law, Education, Community Health',
      requirements: 'NSC with Bachelor Pass, APS 28+, Mathematics or Math Lit'
    },
    {
      id: '8',
      universityName: 'Nelson Mandela University',
      location: 'Port Elizabeth, Eastern Cape',
      ranking: 9,
      gpaRequired: '2.9+',
      satRange: '980-1180',
      acceptanceRate: 42,
      applicationFee: 850,
      deadline: '2024-08-31',
      essaysRequired: 0,
      tuition: 58000,
      studentCount: 27000,
      programs: 'Business, Engineering, Health Sciences, Law, Science',
      requirements: 'NSC with Bachelor Pass, APS 28+, Subject-specific requirements'
    }
  ];

  // Calculate match scores and categorize based on profile
  const recommendations: Recommendation[] = universities.map(uni => {
    let matchScore = 50; // Base score
    let category: 'Safety' | 'Target' | 'Reach' = 'Target';
    let reasoning = '';
    
    // GPA comparison
    const requiredGPA = parseFloat(uni.gpaRequired);
    const gpaGap = profile.gpa - requiredGPA;
    
    if (gpaGap >= 0.5) {
      matchScore += 25;
      category = 'Safety';
      reasoning = `Your GPA of ${profile.gpa} exceeds the typical requirement of ${uni.gpaRequired}. `;
    } else if (gpaGap >= 0) {
      matchScore += 15;
      category = 'Target';
      reasoning = `Your GPA of ${profile.gpa} meets the requirement of ${uni.gpaRequired}. `;
    } else if (gpaGap >= -0.3) {
      matchScore += 5;
      category = 'Target';
      reasoning = `Your GPA is slightly below the typical requirement, but still competitive. `;
    } else {
      matchScore -= 10;
      category = 'Reach';
      reasoning = `This is a reach school given the GPA requirements, but worth applying if you love the program. `;
    }
    
    // SAT comparison if provided
    if (profile.sat && uni.satRange) {
      const [minSAT, maxSAT] = uni.satRange.split('-').map(s => parseInt(s));
      const midSAT = (minSAT + maxSAT) / 2;
      
      if (profile.sat >= maxSAT) {
        matchScore += 15;
        reasoning += `Your SAT score is in the top range for admitted students. `;
      } else if (profile.sat >= midSAT) {
        matchScore += 10;
        reasoning += `Your SAT score is competitive for this university. `;
      } else if (profile.sat >= minSAT) {
        matchScore += 5;
        reasoning += `Your SAT score meets the minimum requirements. `;
      }
    }
    
    // Acceptance rate factor
    if (uni.acceptanceRate < 20) {
      matchScore -= 10;
      if (category === 'Target') category = 'Reach';
      reasoning += `Highly selective with ${uni.acceptanceRate}% acceptance rate. `;
    } else if (uni.acceptanceRate > 35) {
      matchScore += 10;
      reasoning += `Good acceptance rate of ${uni.acceptanceRate}%. `;
    }
    
    // Major alignment (mock)
    if (profile.intendedMajor) {
      matchScore += 5;
      reasoning += `Strong programs in your area of interest. `;
    }
    
    // Normalize score to 0-100
    matchScore = Math.max(20, Math.min(95, matchScore));
    
    // Determine academic and financial fit
    const academicFit: 'Excellent' | 'Good' | 'Fair' = 
      matchScore >= 80 ? 'Excellent' : 
      matchScore >= 60 ? 'Good' : 'Fair';
      
    const financialFit: 'Good' | 'Moderate' | 'Challenging' = 
      uni.tuition < 60000 ? 'Good' :
      uni.tuition < 80000 ? 'Moderate' : 'Challenging';
    
    return {
      university: uni,
      matchScore,
      category,
      reasoning: reasoning.trim(),
      academicFit,
      financialFit
    };
  });

  // Generate profile analysis
  const profileAnalysis: ProfileAnalysis = {
    strengths: [],
    areasForImprovement: [],
    suggestions: []
  };

  // Analyze strengths
  if (profile.gpa >= 3.5) {
    profileAnalysis.strengths.push('Strong academic performance with GPA above 3.5');
  }
  if (profile.sat && profile.sat >= 1300) {
    profileAnalysis.strengths.push('Competitive SAT score for top universities');
  }
  if (profile.extracurriculars && profile.extracurriculars.length > 3) {
    profileAnalysis.strengths.push('Diverse extracurricular activities');
  }

  // Areas for improvement
  if (profile.gpa < 3.0) {
    profileAnalysis.areasForImprovement.push('GPA could be stronger for competitive programs');
  }
  if (!profile.sat && !profile.act) {
    profileAnalysis.areasForImprovement.push('Consider taking SAT or ACT for more opportunities');
  }
  if (!profile.extracurriculars || profile.extracurriculars.length < 2) {
    profileAnalysis.areasForImprovement.push('Limited extracurricular activities');
  }

  // Suggestions
  profileAnalysis.suggestions.push('Apply to a mix of safety, target, and reach schools');
  profileAnalysis.suggestions.push('Start applications early to meet all deadlines');
  if (recommendations.filter(r => r.category === 'Safety').length < 2) {
    profileAnalysis.suggestions.push('Consider adding more safety schools to your list');
  }

  return { recommendations, profileAnalysis };
};

const INITIAL_FILTERS: RecommendationFilters = {
  categories: ['Safety', 'Target', 'Reach'],
  minMatchScore: 0,
  maxApplicationFee: null,
  location: [],
  maxEssays: null,
  sortBy: 'matchScore',
  sortOrder: 'desc'
};

const Recommendations: React.FC = () => {
  // Default profile - in real app, this would come from API/context
  const [profile] = useState<StudentProfile>({
    gpa: 3.4,
    sat: 1250,
    act: 28,
    intendedMajor: 'Computer Science',
    extracurriculars: ['Debate Club', 'Chess Team', 'Volunteer Work', 'Part-time Job'],
    essays: 3,
    location: 'Gauteng'
  });

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RecommendationFilters>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [savedUniversities, setSavedUniversities] = useState<Set<string>>(new Set());
  const [comparisonList, setComparisonList] = useState<string[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const { recommendations: recs, profileAnalysis: analysis } = generateMockRecommendations(profile);
      setRecommendations(recs);
      setProfileAnalysis(analysis);
      setLoading(false);
    }, 1500);
  };

  const refreshRecommendations = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  // Filter and sort recommendations
  const filteredAndSortedRecommendations = useMemo(() => {
    let filtered = recommendations.filter(rec => {
      if (!filters.categories.includes(rec.category)) return false;
      if (rec.matchScore < filters.minMatchScore) return false;
      if (filters.maxApplicationFee !== null && rec.university.applicationFee > filters.maxApplicationFee) return false;
      if (filters.location.length > 0) {
        const hasMatchingLocation = filters.location.some(loc => 
          rec.university.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (!hasMatchingLocation) return false;
      }
      if (filters.maxEssays !== null && rec.university.essaysRequired > filters.maxEssays) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (filters.sortBy) {
        case 'matchScore':
          aVal = a.matchScore;
          bVal = b.matchScore;
          break;
        case 'acceptanceRate':
          aVal = a.university.acceptanceRate;
          bVal = b.university.acceptanceRate;
          break;
        case 'ranking':
          aVal = a.university.ranking || 999999;
          bVal = b.university.ranking || 999999;
          break;
        case 'applicationFee':
          aVal = a.university.applicationFee || 0;
          bVal = b.university.applicationFee || 0;
          break;
        case 'deadline':
          aVal = new Date(a.university.deadline || '9999-12-31').getTime();
          bVal = new Date(b.university.deadline || '9999-12-31').getTime();
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

    return filtered;
  }, [recommendations, filters]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Safety':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Target':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Reach':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Safety':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'Target':
        return <AcademicCapIcon className="h-5 w-5" />;
      case 'Reach':
        return <StarIcon className="h-5 w-5" />;
      default:
        return <ChartBarIcon className="h-5 w-5" />;
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const toggleSaved = (universityId: string) => {
    setSavedUniversities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(universityId)) {
        newSet.delete(universityId);
      } else {
        newSet.add(universityId);
      }
      return newSet;
    });
  };

  const toggleComparison = (universityId: string) => {
    setComparisonList(prev => {
      if (prev.includes(universityId)) {
        return prev.filter(id => id !== universityId);
      } else if (prev.length < 4) {
        return [...prev, universityId];
      } else {
        alert('You can compare up to 4 universities at a time.');
        return prev;
      }
    });
  };

  const toggleCardExpansion = (universityId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(universityId)) {
        newSet.delete(universityId);
      } else {
        newSet.add(universityId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return `R${amount.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const safetySchools = filteredAndSortedRecommendations.filter(r => r.category === 'Safety');
  const targetSchools = filteredAndSortedRecommendations.filter(r => r.category === 'Target');
  const reachSchools = filteredAndSortedRecommendations.filter(r => r.category === 'Reach');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your personalized recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <SparklesIcon className="h-8 w-8 mr-3" />
              Your University Recommendations
            </h1>
            <p className="text-blue-100 text-lg">
              Personalized recommendations based on your academic profile
            </p>
          </div>
          <button
            onClick={refreshRecommendations}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        {profile && (
          <div className="bg-white/10 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-white mb-3 flex items-center">
              <InformationCircleIcon className="h-5 w-5 mr-2" />
              Based on Your Profile
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-100">
              <div>
                <span className="block text-blue-200">GPA</span>
                <span className="text-white font-semibold text-lg">{profile.gpa}</span>
              </div>
              {profile.sat && (
                <div>
                  <span className="block text-blue-200">SAT</span>
                  <span className="text-white font-semibold text-lg">{profile.sat}</span>
                </div>
              )}
              {profile.act && (
                <div>
                  <span className="block text-blue-200">ACT</span>
                  <span className="text-white font-semibold text-lg">{profile.act}</span>
                </div>
              )}
              {profile.intendedMajor && (
                <div>
                  <span className="block text-blue-200">Intended Major</span>
                  <span className="text-white font-semibold">{profile.intendedMajor}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile Analysis */}
      {profileAnalysis && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <TrophyIcon className="h-6 w-6 mr-2 text-yellow-600" />
            Profile Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-green-800 mb-2 flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Strengths
              </h3>
              <ul className="space-y-1">
                {profileAnalysis.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="w-1 h-1 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-orange-800 mb-2 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                Areas for Improvement
              </h3>
              <ul className="space-y-1">
                {profileAnalysis.areasForImprovement.map((area, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="w-1 h-1 bg-orange-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                Suggestions
              </h3>
              <ul className="space-y-1">
                {profileAnalysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Safety Schools</p>
              <p className="text-3xl font-bold text-green-600">{safetySchools.length}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">High chance of admission</p>
          {safetySchools.length > 0 && (
            <p className="text-xs text-green-600 mt-1 font-medium">
              Avg. Match Score: {Math.round(safetySchools.reduce((acc, s) => acc + s.matchScore, 0) / safetySchools.length)}%
            </p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Target Schools</p>
              <p className="text-3xl font-bold text-blue-600">{targetSchools.length}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <AcademicCapIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Good fit for your profile</p>
          {targetSchools.length > 0 && (
            <p className="text-xs text-blue-600 mt-1 font-medium">
              Avg. Match Score: {Math.round(targetSchools.reduce((acc, s) => acc + s.matchScore, 0) / targetSchools.length)}%
            </p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reach Schools</p>
              <p className="text-3xl font-bold text-orange-600">{reachSchools.length}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <StarIcon className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Stretch goals worth applying to</p>
          {reachSchools.length > 0 && (
            <p className="text-xs text-orange-600 mt-1 font-medium">
              Avg. Match Score: {Math.round(reachSchools.reduce((acc, s) => acc + s.matchScore, 0) / reachSchools.length)}%
            </p>
          )}
        </div>
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
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Compare Now
              </button>
              <button
                onClick={() => setComparisonList([])}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            All Recommendations ({filteredAndSortedRecommendations.length})
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <div className="space-y-2">
                  {['Safety', 'Target', 'Reach'].map((category) => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({
                              ...prev,
                              categories: [...prev.categories, category as any]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              categories: prev.categories.filter(c => c !== category)
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Match Score Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Match Score: {filters.minMatchScore}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.minMatchScore}
                  onChange={(e) => setFilters(prev => ({ ...prev, minMatchScore: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex space-x-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="matchScore">Match Score</option>
                    <option value="acceptanceRate">Acceptance Rate</option>
                    <option value="ranking">Ranking</option>
                    <option value="applicationFee">Application Fee</option>
                    <option value="deadline">Deadline</option>
                  </select>
                  <button
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {filters.sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setFilters(INITIAL_FILTERS)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Recommendations List */}
        <div className="space-y-4">
          {filteredAndSortedRecommendations.length > 0 ? (
            filteredAndSortedRecommendations.map((rec) => (
              <RecommendationCard
                key={rec.university.id}
                recommendation={rec}
                isSaved={savedUniversities.has(rec.university.id)}
                isInComparison={comparisonList.includes(rec.university.id)}
                isExpanded={expandedCards.has(rec.university.id)}
                onSave={() => toggleSaved(rec.university.id)}
                onCompare={() => toggleComparison(rec.university.id)}
                onToggleExpansion={() => toggleCardExpansion(rec.university.id)}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getCategoryColor={getCategoryColor}
                getCategoryIcon={getCategoryIcon}
                getMatchScoreColor={getMatchScoreColor}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recommendations match your filters</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Recommendation Card Component
interface RecommendationCardProps {
  recommendation: Recommendation;
  isSaved: boolean;
  isInComparison: boolean;
  isExpanded: boolean;
  onSave: () => void;
  onCompare: () => void;
  onToggleExpansion: () => void;
  formatCurrency: (amount?: number) => string;
  formatDate: (date?: string) => string;
  getCategoryColor: (category: string) => string;
  getCategoryIcon: (category: string) => React.ReactNode;
  getMatchScoreColor: (score: number) => string;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation: rec,
  isSaved,
  isInComparison,
  isExpanded,
  onSave,
  onCompare,
  onToggleExpansion,
  formatCurrency,
  formatDate,
  getCategoryColor,
  getCategoryIcon,
  getMatchScoreColor
}) => {
  return (
    <div className="border border-gray-200 rounded-lg hover:shadow-lg transition-shadow bg-white">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {rec.university.universityName}
                </h3>
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">{rec.university.location}</span>
                  {rec.university.ranking && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-sm">#{rec.university.ranking} ranked</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 ml-4">
                <div className={`px-4 py-2 rounded-full text-center ${getMatchScoreColor(rec.matchScore)}`}>
                  <div className="text-2xl font-bold">{rec.matchScore}%</div>
                  <div className="text-xs font-medium">Match Score</div>
                </div>
                
                <div className={`px-3 py-1 rounded-full border flex items-center space-x-1 ${getCategoryColor(rec.category)}`}>
                  {getCategoryIcon(rec.category)}
                  <span className="text-sm font-medium">{rec.category}</span>
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={onSave}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <AcademicCapIcon className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">GPA Required</div>
              <div className="font-semibold">{rec.university.gpaRequired || 'N/A'}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <StarIcon className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">SAT Range</div>
              <div className="font-semibold">{rec.university.satRange || 'N/A'}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <EyeIcon className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Acceptance Rate</div>
              <div className="font-semibold">{rec.university.acceptanceRate}%</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Application Fee</div>
              <div className="font-semibold">{formatCurrency(rec.university.applicationFee)}</div>
            </div>
          </div>
        </div>

        {/* Recommendation Reasoning */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Why it's recommended:</h4>
              <p className="text-sm text-blue-800">{rec.reasoning}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={onCompare}
              disabled={isInComparison}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                isInComparison
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ScaleIcon className="h-4 w-4 inline mr-1" />
              {isInComparison ? 'In Comparison' : 'Compare'}
            </button>
            
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <EyeIcon className="h-4 w-4 inline mr-1" />
              View Details
            </button>
          </div>

          <button
            onClick={onToggleExpansion}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Show Less</span>
                <ChevronUpIcon className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                <span>Show More</span>
                <ChevronDownIcon className="h-4 w-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Additional University Details */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">University Details</h4>
              <div className="space-y-3">
                {rec.university.deadline && (
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <strong>Deadline:</strong> {formatDate(rec.university.deadline)}
                    </span>
                  </div>
                )}
                
                {rec.university.essaysRequired !== undefined && (
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <strong>Essays Required:</strong> {rec.university.essaysRequired}
                    </span>
                  </div>
                )}
                
                {rec.university.tuition && (
                  <div className="flex items-center space-x-2">
                    <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <strong>Annual Tuition:</strong> {formatCurrency(rec.university.tuition)}
                    </span>
                  </div>
                )}

                {rec.university.studentCount && (
                  <div className="flex items-center space-x-2">
                    <AcademicCapIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <strong>Student Population:</strong> {rec.university.studentCount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Fit Analysis */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Fit Analysis</h4>
              <div className="space-y-3">
                {rec.academicFit && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Academic Fit:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rec.academicFit === 'Excellent' ? 'bg-green-100 text-green-800' :
                      rec.academicFit === 'Good' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {rec.academicFit}
                    </span>
                  </div>
                )}

                {rec.financialFit && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Financial Fit:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rec.financialFit === 'Good' ? 'bg-green-100 text-green-800' :
                      rec.financialFit === 'Moderate' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {rec.financialFit}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Match:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          rec.matchScore >= 85 ? 'bg-green-500' :
                          rec.matchScore >= 70 ? 'bg-blue-500' :
                          rec.matchScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${rec.matchScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold">{rec.matchScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Programs and Requirements */}
          {(rec.university.programs || rec.university.requirements) && (
            <div className="mt-6 pt-4 border-t border-gray-300">
              {rec.university.programs && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Programs Offered</h4>
                  <p className="text-sm text-gray-700">{rec.university.programs}</p>
                </div>
              )}
              
              {rec.university.requirements && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Additional Requirements</h4>
                  <p className="text-sm text-gray-700">{rec.university.requirements}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Recommendations;