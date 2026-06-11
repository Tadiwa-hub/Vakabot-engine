import React from 'react';

const variants = {
  // Statuses
  connected: 'bg-success/10 text-success',
  connecting: 'bg-warning/10 text-warning',
  disconnected: 'bg-text-light/10 text-text-light',
  banned: 'bg-danger/10 text-danger',
  
  // Plans
  free: 'bg-text-light/10 text-text-secondary',
  business: 'bg-[#3B82F6]/10 text-[#3B82F6]', // Blue
  pro: 'bg-accent/10 text-accent',
  agency: 'bg-warning/10 text-warning', // Gold
  
  // Response Types
  ai: 'bg-accent text-white',
  keyword: 'bg-success text-white',
  fallback: 'bg-text-light text-white',
};

const Badge = ({ children, variant = 'free', pill = false, className = '' }) => {
  return (
    <span className={`
      inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-semibold
      ${pill ? 'rounded-full' : 'rounded-badge'}
      ${variants[variant] || variants.free}
      ${className}
    `}>
      {children}
    </span>
  );
};

export default Badge;
