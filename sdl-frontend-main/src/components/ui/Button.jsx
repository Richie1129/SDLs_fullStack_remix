import React, { forwardRef } from 'react';

const VARIANT = {
  primary: 'bg-customgreen text-white hover:bg-customgreen/90 hover:shadow-lg active:bg-customgreen/80',
  secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-300/80',
  danger: 'bg-red-600 text-white hover:bg-red-600/90 hover:shadow-lg active:bg-red-700',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
};
const SIZE = {
  sm: 'px-btn-x-sm py-btn-y-sm text-body-sm',
  md: 'px-btn-x py-btn-y text-ui',
  lg: 'px-btn-x-lg py-btn-y-lg text-body',
};

/** 共用按鈕：variant + size，內建 focus-visible ring 與按壓回饋（DESIGN_SYSTEM 只禁 hover 用 scale） */
const Button = forwardRef(function Button({ variant = 'primary', size = 'md', className = '', type = 'button', children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-stack-xs rounded-lg font-semibold cursor-pointer transition-all duration-fast ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-customgreen focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT[variant] || VARIANT.primary} ${SIZE[size] || SIZE.md} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
export default Button;
