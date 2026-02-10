import React from 'react';
import { useQuery } from 'react-query';
import { getAvailableSemesters } from '../../../api/project';
import { getCurrentSemester, getSemesterLabel } from '../../../utils/semesterUtils';

const SemesterSelector = ({ currentSemester, onSemesterChange, mentorName }) => {
  const { data: semesterData } = useQuery(
    ['availableSemesters', mentorName],
    () => getAvailableSemesters(mentorName),
    {
      enabled: !!mentorName,
      staleTime: 10 * 60 * 1000,
    }
  );

  const currentSem = getCurrentSemester();
  const semesters = semesterData?.semesters || [currentSem];

  // 確保當前學期在列表中
  const uniqueSemesters = [...new Set([currentSem, ...semesters])].sort().reverse();

  return (
    <div className="flex items-center gap-stack-sm">
      <label className="text-body-sm font-medium text-gray-600 whitespace-nowrap">
        學期
      </label>
      <select
        value={currentSemester}
        onChange={(e) => onSemesterChange(e.target.value)}
        className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-body-sm
                   focus:border-[#5BA491] focus:ring-1 focus:ring-[#5BA491] focus:outline-none
                   transition-colors duration-fast"
      >
        {uniqueSemesters.map(sem => (
          <option key={sem} value={sem}>
            {getSemesterLabel(sem)}
            {sem === currentSem ? ' (目前)' : ''}
          </option>
        ))}
        <option value="all">所有學期</option>
      </select>
    </div>
  );
};

export default SemesterSelector;
