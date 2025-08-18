import React from 'react';
import Loader from '../Loader';
import EmptyState from './EmptyState';
import LogCarousel from './LogCarousel';
import AddButton from './AddButton';

const LogSection = ({
  title,
  items = [],
  isLoading = false,
  isError = false,
  error = null,
  showEmptyMessage = false,
  emptyStateConfig = {},
  buttons = [],
  onEdit,
  onView5Rs,
  onRequestAIAnalysis,
  showAIAnalysis = true,
  showCreator = false,
  className = "flex flex-col w-full lg:w-1/2 min-h-0"
}) => {
  const isEmpty = !isLoading && !isError && items.length === 0 && showEmptyMessage;
  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    if (isError && error) {
      return <p className="text-base font-bold">{error.message}</p>;
    }

    if (items.length === 0) {
      if (showEmptyMessage && emptyStateConfig.animationData && emptyStateConfig.message) {
        return (
          <EmptyState
            animationData={emptyStateConfig.animationData}
            message={emptyStateConfig.message}
          />
        );
      }
      return null;
    }

    return (
      <LogCarousel
        items={items}
        onEdit={onEdit}
        onView5Rs={onView5Rs}
        onRequestAIAnalysis={onRequestAIAnalysis}
        showAIAnalysis={showAIAnalysis}
        showCreator={showCreator}
      />
    );
  };

  return (
    <div className={className}>
      {/* Header with title and buttons - only show if title or buttons exist */}
      {(title || buttons.length > 0) && (
        <div className="flex justify-start gap-4 sm:gap-6 items-center mb-4 flex-wrap">
          {title && <h3 className="text-lg sm:text-xl font-bold">{title}</h3>}
          {buttons.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {buttons.map((button, index) => (
                <AddButton
                  key={index}
                  onClick={button.onClick}
                  variant={button.variant}
                  size={button.size}
                  className={button.className}
                  disabled={button.disabled}
                >
                  {button.text}
                </AddButton>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className={
            `flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-full ` +
            (isEmpty ? 'flex items-center justify-center' : '')
          }
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default LogSection;
