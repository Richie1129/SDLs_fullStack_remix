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
        className="h-64 sm:h-72 lg:h-80 w-auto"
        animationData={animationData}
      />
      <p className="font-bold text-zinc-600 text-sm sm:text-base lg:text-lg text-center leading-relaxed">
        {message}
      </p>
    </div>
  );
};

export default EmptyState;
