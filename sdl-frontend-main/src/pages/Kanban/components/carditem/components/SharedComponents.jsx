import React from 'react';
import { BsFillPersonFill } from "react-icons/bs";

/**
 * 共享組件 - 小型 UI 組件集合
 *
 * Linus: "這些小組件足夠簡單，放在一起沒問題"
 */

const personImg = [
  '/person/man1.png', '/person/man2.png', '/person/man3.png',
  '/person/man4.png', '/person/man5.png', '/person/man6.png',
  '/person/woman1.png', '/person/woman2.png', '/person/woman3.png'
];

/**
 * CardImage - 卡片圖片顯示
 */
export const CardImage = ({ image, onClick, additionalCount }) => (
  <div className="relative w-full h-40 group">
    <img
      src={image}
      alt="Card Background"
      className="w-full h-full object-contain rounded-t-lg cursor-pointer bg-gray-50"
      onClick={onClick}
    />
    {additionalCount > 0 && (
      <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
        +{additionalCount}
      </div>
    )}
  </div>
);

/**
 * Tooltip - 工具提示組件
 */
export const Tooltip = ({ children, content }) => {
  return (
    <div className='relative group'>
      {children}
      <div className='absolute hidden group-hover:block'>
        <div className='bg-gray-700 text-white text-xs rounded-lg py-1 px-2 whitespace-nowrap'>
          {content}
        </div>
      </div>
    </div>
  );
};

/**
 * MemberAssignment - 成員指派區塊
 */
export const MemberAssignment = ({
  cardData,
  setAssignMemberModalOpen,
  owner,
  isObservationMode = false
}) => (
  <div className='bg-white rounded-xl border border-gray-100 p-4 mb-4'>
    <div className='flex items-center justify-between mb-3'>
      <h4 className='text-base font-medium text-gray-700'>成員</h4>
      {!isObservationMode && (
        <button
          onClick={() => setAssignMemberModalOpen(true)}
          className='flex items-center space-x-2 px-3 py-1.5 bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition-colors duration-200'
        >
          <BsFillPersonFill size={16} />
          <span className='text-sm font-medium'>指派成員</span>
        </button>
      )}
    </div>

    {owner && (
      <div className='flex items-center space-x-2 mb-3 p-2 bg-gray-50 rounded-lg'>
        <span className='text-sm font-medium text-gray-600'>建立者:</span>
        <span className='text-sm text-gray-500'>{owner}</span>
      </div>
    )}

    {cardData.assignees?.length > 0 ? (
      <div className='flex flex-wrap gap-2'>
        {cardData.assignees.map((assignee, index) => {
          const imgIndex = parseInt(assignee.id) % personImg.length;
          const userImg = personImg[imgIndex];
          return (
            <Tooltip key={index} content={assignee.username}>
              <div className='flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200'>
                <img
                  src={userImg}
                  alt={assignee.username}
                  className='w-6 h-6 rounded-full shadow-sm object-cover'
                />
                <span className='text-sm text-gray-600'>{assignee.username}</span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    ) : (
      <div className='flex items-center justify-center h-20 bg-gray-50 rounded-lg'>
        <p className='text-sm text-gray-400'>尚未指派成員</p>
      </div>
    )}
  </div>
);

// 導出 personImg 供其他組件使用
export { personImg };
