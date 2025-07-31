import React from 'react';
import Lottie from 'lottie-react';

const EmptyState = ({ 
  animationData, 
  message, 
  className = "flex flex-col items-center justify-center px-4 sm:px-8 lg:px-16" 
}) => {
  return (
    <div className={className}>
      <Lottie
        className="w-48 sm:w-56 md:w-64 lg:w-72 max-w-full h-auto"
        animationData={animationData}
      />
      <p className="font-bold text-zinc-600 text-sm sm:text-base lg:text-lg text-center leading-relaxed">
        {message}
      </p>
    </div>
  );
};

export default EmptyState;