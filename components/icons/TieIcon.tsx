import React from 'react';

const TieIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    fill="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M19 8H5V10H19V8ZM19 14H5V16H19V14Z"
    />
  </svg>
);

export default TieIcon;