import React from 'react';

const variants = {
  primary: 'bg-primary text-white hover:bg-[#27272A]',
  secondary: 'bg-surface-2 text-text-primary hover:bg-[#E4E4E7]',
  outline: 'bg-transparent border border-border text-text-primary hover:bg-surface',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-2 hover:text-primary',
  danger: 'bg-transparent text-danger hover:bg-danger/10',
};

const sizes = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-12 px-6 text-[16px]',
  pill: 'h-7 px-3 text-[11px] rounded-full uppercase tracking-wider font-semibold',
};

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled, 
  loading,
  as: Component = 'button',
  ...props 
}) => {
  return (
    <Component
      className={`
        inline-flex items-center justify-center rounded-button font-medium transition-default
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </Component>
  );
};

export default Button;
