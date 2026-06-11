import React from 'react';

const Toggle = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled && typeof onChange === 'function') {
          onChange(!checked);
        }
      }}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none
        ${checked ? 'bg-accent' : 'bg-border'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

export default Toggle;
