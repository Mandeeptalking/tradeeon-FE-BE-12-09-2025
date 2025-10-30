import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle, className = '' }) => {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium 
        transition-colors duration-200 border
        ${theme === 'dark' 
          ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white' 
          : 'bg-gray-200 hover:bg-gray-300 border-gray-300 text-gray-900'
        }
        ${className}
      `}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <>
          <Moon className="w-4 h-4" />
          <span>Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4" />
          <span>Light</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;


