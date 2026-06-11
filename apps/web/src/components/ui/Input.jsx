import React from 'react';

const Input = ({ 
  label, 
  helper, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="label-sm block px-0.5">
          {label}
        </label>
      )}
      <input
        className={`
          w-full h-10 px-3 bg-background border border-border rounded-input text-[14px] 
          placeholder:text-text-light focus:outline-none focus:border-accent transition-default
          ${error ? 'border-danger focus:border-danger' : ''}
        `}
        {...props}
      />
      {helper && !error && (
        <p className="text-[11px] text-text-light px-0.5">{helper}</p>
      )}
      {error && (
        <p className="text-[11px] text-danger px-0.5">{error}</p>
      )}
    </div>
  );
};

export default Input;
