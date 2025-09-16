import React from 'react';

const EyeIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={1.5}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.43-7.581a5.063 5.063 0 0 1 9.07 0l4.43 7.581a1.012 1.012 0 0 1 0 .639l-4.43 7.581a5.063 5.063 0 0 1-9.07 0l-4.43-7.581z" 
    />
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" 
    />
  </svg>
);

export default EyeIcon;