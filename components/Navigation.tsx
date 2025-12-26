
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex gap-4">
      <Link
        to="/"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive('/') 
            ? 'bg-indigo-50 text-indigo-700' 
            : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
        }`}
      >
        <i className="fas fa-video mr-2"></i>
        Sign to Text
      </Link>
      <Link
        to="/speech-to-sign"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive('/speech-to-sign') 
            ? 'bg-indigo-50 text-indigo-700' 
            : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
        }`}
      >
        <i className="fas fa-microphone mr-2"></i>
        Speech to Sign
      </Link>
    </nav>
  );
};

export default Navigation;
