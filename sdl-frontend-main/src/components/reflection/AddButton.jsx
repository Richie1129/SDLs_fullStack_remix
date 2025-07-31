import React from 'react';
import { FaPlus } from 'react-icons/fa';

const AddButton = ({ 
  onClick, 
  children, 
  variant = 'primary',
  size = 'default',
  className = '',
  disabled = false
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-customgreen hover:bg-customgreen/80 text-white';
      case 'teal':
        return 'bg-teal-500 hover:bg-teal-600 text-white';
      case 'secondary':
        return 'bg-gray-500 hover:bg-gray-600 text-white';
      default:
        return 'bg-customgreen hover:bg-customgreen/80 text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-1 text-xs';
      case 'large':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base';
    }
  };

  const baseClasses = `
    flex items-center font-semibold rounded-lg min-w-[70px] 
    transition-colors duration-200 ease-in-out
    disabled:opacity-50 disabled:cursor-not-allowed
  `.replace(/\s+/g, ' ').trim();

  const classes = `
    ${baseClasses} 
    ${getVariantClasses()} 
    ${getSizeClasses()} 
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <button
      onClick={onClick}
      className={classes}
      disabled={disabled}
    >
      <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
      <span className="ml-1 sm:ml-2">{children}</span>
    </button>
  );
};

export default AddButton;