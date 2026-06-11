import React from 'react';

const Card = ({ children, variant = 'default', className = '', ...props }) => {
  const bg = variant === 'surface' ? 'bg-surface' : 'bg-background';
  const hasOverflowClass = className.includes('overflow-');
  const overflowClass = hasOverflowClass ? '' : 'overflow-hidden';
  
  return (
    <div 
      className={`
        ${bg} border border-border rounded-card shadow-card ${overflowClass}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
