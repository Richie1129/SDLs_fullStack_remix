import React from 'react';
import LazyLottie from '../LazyLottie';

const EmptyState = ({
  loadAnimation,
  aspectRatio,
  message,
  className = "flex flex-col items-center justify-center px-4 sm:px-8 lg:px-16"
}) => {
  return (
    <div className={className}>
      <LazyLottie
        className="h-64 sm:h-72 lg:h-80 w-auto"
        aspectRatio={aspectRatio}
        load={loadAnimation}
      />
      <p className="font-bold text-zinc-600 text-body-sm sm:text-body lg:text-body-lg text-center leading-relaxed">
        {message}
      </p>
    </div>
  );
};

export default EmptyState;
