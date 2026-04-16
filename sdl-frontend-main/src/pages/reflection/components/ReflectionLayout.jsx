import React, { useState, useMemo } from "react";
import LogSection from "../../../components/reflection/LogSection";
import personalDailyIcon from "../../../assets/AnimationPersonalDaily.json";
import teamDailyIcon from "../../../assets/AnimationTeamDaily.json";
import { ReflectionTypeSelector } from "./ReflectionTypeSelector";
import { SmartReflectionBanner } from "./SmartReflectionBanner";
import { getStageInfo } from '../../../utils/authUtils';

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
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const { currentStage, currentSubStage } = getStageInfo();
  const currentStageFormatted = currentStage && currentSubStage
    ? `${currentStage}-${currentSubStage}`
    : null;

  // 教師模式：從日誌資料提取不重複的學生列表
  const studentOptions = useMemo(() => {
    if (!isTeacher || !personalDaily?.length) return [];
    const map = new Map();
    personalDaily.forEach(d => {
      const u = d.user;
      if (u && !map.has(u.id)) {
        const label = u.class && u.seatNumber
          ? `${u.username}（${u.class} ${u.seatNumber}號）`
          : u.username;
        map.set(u.id, { id: u.id, label });
      }
    });
    return Array.from(map.values());
  }, [isTeacher, personalDaily]);

  // 教師模式：篩選後的日誌
  const filteredPersonalDaily = useMemo(() => {
    if (!isTeacher || selectedStudentId === 'all') return personalDaily;
    return personalDaily.filter(d => d.user?.id === parseInt(selectedStudentId));
  }, [isTeacher, personalDaily, selectedStudentId]);

  // 處理橫幅行動
  const handleBannerAction = (bannerType) => {
    if (bannerType === 'suggest_5rs' || bannerType === 'stage_milestone') {
      onOpen5RsModal();
    } else if (bannerType === 'encourage_logging') {
      setShowTypeSelector(true);
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col">
      {/* 智能橫幅 - 僅學生可見 */}
      {!isTeacher && (
        <div className="flex-shrink-0">
          <SmartReflectionBanner
            recentLogs={personalDaily}
            currentStage={currentStageFormatted}
            onAction={handleBannerAction}
          />
        </div>
      )}

      {/* Two-column layout container */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 min-h-0">
        {/* Left column - Personal Daily */}
        <div className="flex flex-col lg:border-r border-gray-200 bg-white">
          {/* Title section */}
          <div className="flex-shrink-0 p-component-base sm:p-component-md-lg border-b border-gray-100 ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 sm:text-h2 font-bold text-gray-800 flex items-center">
                個人日誌
              </h2>

              {/* 教師成員篩選 */}
              {isTeacher && studentOptions.length > 0 && (
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-body-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-customgreen/30 focus:border-customgreen"
                >
                  <option value="all">全部成員（{studentOptions.length}）</option>
                  {studentOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              )}

              {/* Action Buttons - only students can add */}
              {!isTeacher && !showTypeSelector && (
                <button
                  data-track
                  data-track-action="REFLECTION_WRITE_OPEN"
                  data-track-type="reflection"
                  onClick={() => setShowTypeSelector(true)}
                  className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-[#5BA491] to-[#4A9680] hover:from-[#5BA491]/90 hover:to-[#4A9680]/90 text-white font-medium rounded-lg transition-all duration-fast shadow-sm hover:shadow-md text-body-sm sm:text-body"
                >
                  <svg
                    className="w-5 h-5 mr-2"
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
                  撰寫反思
                </button>
              )}
            </div>

            {/* 雙卡片選擇器 - 僅學生可見 */}
            {!isTeacher && showTypeSelector && (
              <div className="mb-stack-md">
                <ReflectionTypeSelector
                  compact
                  onSelectTraditional={() => {
                    setShowTypeSelector(false);
                    onOpenPersonalModal();
                  }}
                  onSelect5Rs={() => {
                    setShowTypeSelector(false);
                    onOpen5RsModal();
                  }}
                />
                <button
                  data-track
                  data-track-action="REFLECTION_TYPE_BACK"
                  data-track-type="reflection"
                  onClick={() => setShowTypeSelector(false)}
                  className="mt-stack-sm text-body-sm text-gray-500 hover:text-gray-700 transition-colors duration-fast"
                >
                  ← 返回列表
                </button>
              </div>
            )}

            {!showTypeSelector && (
              <p className="text-body-sm text-gray-600 mt-2">
                記錄個人的學習心得和反思，可以選擇傳統日誌或 5Rs 反思格式
              </p>
            )}
          </div>

          {/* Content section */}
          <div className="flex-1 overflow-y-auto">
            <LogSection
              title=""
              items={filteredPersonalDaily}
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
          <div className="flex-shrink-0 p-component-base sm:p-component-md-lg border-b border-gray-100 ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 sm:text-h2 font-bold text-gray-800 flex items-center">
                小組日誌
              </h2>

              {/* Action Button - only students can add */}
              {!isTeacher && (
                <div className="flex">
                  <button
                    data-track
                    data-track-action="REFLECTION_TEAM_CREATE_OPEN"
                    data-track-type="reflection"
                    onClick={onOpenTeamModal}
                    className="flex items-center justify-center px-3 sm:px-4 py-2.5 bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-medium rounded-lg transition-colors duration-fast shadow-sm text-body-sm sm:text-body w-full sm:w-auto"
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
            <p className="text-body-sm text-gray-600 mt-2">
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
