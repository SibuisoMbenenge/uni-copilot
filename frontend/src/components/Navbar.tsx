import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  AcademicCapIcon, 
  ChartBarIcon,
  UserCircleIcon,
  HomeIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: HomeIcon },
    { path: '/search', label: 'Search', icon: MagnifyingGlassIcon },
    { path: '/compare', label: 'Compare', icon: ScaleIcon },
    { path: '/recommendations', label: 'Recommendations', icon: ChartBarIcon },
    { path: '/profile', label: 'Profile', icon: UserCircleIcon },
  ];
  
  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2">
            <AcademicCapIcon className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">UniCopilot</span>
          </Link>
          
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden md:block">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;