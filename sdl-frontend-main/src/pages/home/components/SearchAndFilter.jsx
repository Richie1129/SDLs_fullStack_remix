import React from 'react';

const SearchAndFilter = ({
  role,
  classFilter,
  setClassFilter,
  searchValue,
  setSearchValue,
  searchPlaceholder = "搜尋名稱或描述...",
  classes = []
}) => {
  return (
    <div className='flex flex-wrap items-center gap-3'>
      {/* 班級篩選 - 僅教師可見 */}
      {role === 'teacher' && (
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white border text-body-sm focus:border-[#5BA491] focus:outline-none"
          title="班級篩選"
        >
          <option value="all">所有班級</option>
          {classes.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      )}

      {/* 搜尋輸入框 */}
      <input
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder={searchPlaceholder}
        className="px-3 py-2 rounded-lg bg-white border text-body-sm flex-1 min-w-[220px] focus:border-[#5BA491] focus:outline-none"
      />
    </div>
  );
};

export default SearchAndFilter;