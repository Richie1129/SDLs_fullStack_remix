import React, { useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import LogCard from './LogCard';

const DRAG_BUFFER = 50;
const SPRING_OPTIONS = {
  type: "spring",
  mass: 3,
  stiffness: 400,
  damping: 50,
};

const LogCarousel = ({ 
  items = [], 
  onEdit,
  onView5Rs,
  onRequestAIAnalysis,
  showAIAnalysis = true,
  showCreator = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const dragX = useMotionValue(0);

  const onDragEnd = () => {
    const x = dragX.get();

    if (x <= -DRAG_BUFFER && currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (x >= DRAG_BUFFER && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden w-full py-4 sm:py-6 lg:py-8">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x: dragX }}
        animate={{ translateX: `-${currentIndex * 100}%` }}
        transition={SPRING_OPTIONS}
        onDragEnd={onDragEnd}
        className="flex cursor-grab items-center active:cursor-grabbing"
      >
        {items.map((item, index) => (
          <LogCard
            key={item.id || index}
            item={item}
            index={index}
            isActive={currentIndex === index}
            onEdit={onEdit}
            onView5Rs={onView5Rs}
            onRequestAIAnalysis={onRequestAIAnalysis}
            showAIAnalysis={showAIAnalysis}
            showCreator={showCreator}
            SPRING_OPTIONS={SPRING_OPTIONS}
          />
        ))}
      </motion.div>
      
      {/* Pagination dots */}
      <div className="mt-4 flex w-full justify-center gap-2">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-3 w-3 rounded-full transition-colors ${
              idx === currentIndex ? "bg-customgreen" : "bg-neutral-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default LogCarousel;