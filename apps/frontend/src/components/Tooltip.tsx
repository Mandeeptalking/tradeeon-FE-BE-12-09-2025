import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, position = 'top', className = '' }) => {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className="cursor-help inline-flex items-center"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
      </div>
      
      {show && (
        <div
          className={`absolute z-[10000] w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg ${positionClasses[position]}`}
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-gray-100 whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
          <div
            className={`absolute w-0 h-0 ${
              position === 'top' ? 'top-full border-t-gray-900 dark:border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent border-4' :
              position === 'bottom' ? 'bottom-full border-b-gray-900 dark:border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent border-4' :
              position === 'left' ? 'left-full border-l-gray-900 dark:border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent border-4' :
              'right-full border-r-gray-900 dark:border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent border-4'
            }`}
            style={
              position === 'top' || position === 'bottom' 
                ? { left: '50%', transform: 'translateX(-50%)' }
                : { top: '50%', transform: 'translateY(-50%)' }
            }
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;

