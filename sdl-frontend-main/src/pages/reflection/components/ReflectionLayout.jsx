import React from "react";
import LogSection from "../../../components/reflection/LogSection";
import personalDailyIcon from "../../../assets/AnimationPersonalDaily.json";
import teamDailyIcon from "../../../assets/AnimationTeamDaily.json";

/**
 * Two-column layout for personal and team daily logs
 * Left: Personal Daily | Right: Team Daily
 */
export function ReflectionLayout({
  // Personal Daily props
  personalDaily,
  personalIsLoading,
  personalIsError,
  personalError,
  showPersonalEmptyMessage,
  onPersonalEdit,
  onPersonalDelete,
  onView5Rs,
  onRequestAIAnalysis,

  // Team Daily props
  teamDaily,
  teamIsLoading,
  teamIsError,
  teamError,
  showTeamEmptyMessage,
  onTeamEdit,
  onTeamDelete,

  // Common props
  userRole,
  onOpenPersonalModal,
  onOpen5RsModal,
  onOpenTeamModal,
}) {
  const isTeacher = userRole === "teacher";

  return (
    <div className="h-full w-full bg-gray-50">
      {/* Two-column layout container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
        {/* Left column - Personal Daily */}
        <div className="flex flex-col lg:border-r border-gray-200 bg-white">
          {/* Title section */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100 ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
                個人日誌
              </h2>

              {/* Action Buttons - only students can add */}
              {!isTeacher && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={onOpenPersonalModal}
                    className="flex items-center justify-center px-3 sm:px-4 py-2 bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm text-sm sm:text-base"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    傳統日誌
                  </button>

                  <button
                    onClick={onOpen5RsModal}
                    className="flex items-center justify-center px-3 sm:px-4 py-2 bg-[#5BA491] hover:bg-[#5BA491] text-white font-medium rounded-lg transition-colors duration-200 shadow-sm text-sm sm:text-base"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    +5Rs 反思
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              記錄個人的學習心得和反思，可以選擇傳統日誌或 5Rs 反思格式
            </p>
          </div>

          {/* Content section */}
          <div className="flex-1 overflow-y-auto">
            <LogSection
              title=""
              items={personalDaily}
              isLoading={personalIsLoading}
              isError={personalIsError}
              error={personalError}
              showEmptyMessage={showPersonalEmptyMessage}
              emptyStateConfig={{
                animationData: personalDailyIcon,
                message:
                  "還沒新增過個人日誌 ! 趕快新增你的第一個【個人日誌】吧 ~",
              }}
              buttons={[]}
              onEdit={onPersonalEdit}
              onDelete={onPersonalDelete}
              onView5Rs={onView5Rs}
              onRequestAIAnalysis={onRequestAIAnalysis}
              showAIAnalysis={true}
              showCreator={isTeacher}
              className="h-full flex flex-col"
            />
          </div>
        </div>

        {/* Right column - Team Daily */}
        <div className="flex flex-col bg-white border-t lg:border-t-0 border-gray-200">
          {/* Title section */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100 ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
                小組日誌
              </h2>

              {/* Action Button - only students can add */}
              {!isTeacher && (
                <div className="flex">
                  <button
                    onClick={onOpenTeamModal}
                    className="flex items-center justify-center px-3 sm:px-4 py-2 bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm text-sm sm:text-base w-full sm:w-auto"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    新增
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              記錄小組討論和協作的成果，與團隊成員分享經驗
            </p>
          </div>

          {/* Content section */}
          <div className="flex-1 overflow-y-auto">
            <LogSection
              title=""
              items={teamDaily}
              isLoading={teamIsLoading}
              isError={teamIsError}
              error={teamError}
              showEmptyMessage={showTeamEmptyMessage}
              emptyStateConfig={{
                animationData: teamDailyIcon,
                message:
                  "還沒新增過小組日誌 ! 趕快新增你的第一個【小組日誌】吧 ~",
              }}
              buttons={[]}
              onEdit={onTeamEdit}
              onDelete={onTeamDelete}
              showAIAnalysis={false}
              showCreator={true}
              className="h-full flex flex-col"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
