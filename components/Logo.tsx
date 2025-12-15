
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="4" 
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Logo ChecklistIA"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
