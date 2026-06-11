import React from 'react';

const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-badge bg-surface-2 ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
