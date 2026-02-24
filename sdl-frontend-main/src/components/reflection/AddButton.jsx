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
        return 'px-btn-x-sm py-btn-y-sm text-caption';
      case 'large':
        return 'px-btn-x-lg py-btn-y-lg text-body-lg';
      default:
        return 'px-btn-x-sm py-btn-y-sm sm:px-btn-x sm:py-btn-y text-body-sm sm:text-body';
    }
  };

  const baseClasses = `
    flex items-center font-semibold rounded-lg min-w-[70px]
    transition-colors duration-fast ease-in-out
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