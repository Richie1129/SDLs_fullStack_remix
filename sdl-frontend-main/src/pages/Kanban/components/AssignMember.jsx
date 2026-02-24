import React, { useState, useMemo } from 'react';
import { BsFillPersonFill } from 'react-icons/bs';
import { FiSearch, FiCheck } from 'react-icons/fi';
import { GrFormClose } from 'react-icons/gr';

const personImg = [
  '/person/man1.png', '/person/man2.png', '/person/man3.png',
  '/person/man4.png', '/person/man5.png', '/person/man6.png',
  '/person/woman1.png', '/person/woman2.png', '/person/woman3.png',
];

/**
 * AssignMember - 成員指派彈窗（重新設計版）
 *
 * @param {Array}    menberData     - 專案所有成員
 * @param {Function} setCardData    - 更新卡片資料（含 assignees）
 * @param {Array}    cardAssignees  - 當前已指派成員（初始化用）
 * @param {Function} onClose        - 關閉回呼
 */
export default function AssignMember({ menberData = [], setCardData, cardAssignees = [], onClose }) {
  const [searchTerm, setSearchTerm] = useState('');

  // 以 username Set 管理選取狀態，初始化自 cardAssignees
  const [selectedUsernames, setSelectedUsernames] = useState(() =>
    new Set(cardAssignees.map(a => a.username))
  );

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return menberData;
    return menberData.filter(m =>
      m.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [menberData, searchTerm]);

  const allSelected = menberData.length > 0 && menberData.every(m => selectedUsernames.has(m.username));
  const someSelected = !allSelected && menberData.some(m => selectedUsernames.has(m.username));

  const applySelection = (newSelected) => {
    setSelectedUsernames(newSelected);
    const newAssignees = menberData.filter(m => newSelected.has(m.username));
    setCardData(prev => ({ ...prev, assignees: newAssignees }));
  };

  const toggleMember = (member) => {
    const next = new Set(selectedUsernames);
    if (next.has(member.username)) next.delete(member.username);
    else next.add(member.username);
    applySelection(next);
  };

  const toggleAll = () => {
    if (allSelected) {
      applySelection(new Set());
    } else {
      applySelection(new Set(menberData.map(m => m.username)));
    }
  };

  return (
    <div className="w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
      {/* ── 標題列 ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BsFillPersonFill size={15} className="text-customgreen" />
          <span className="text-body font-semibold text-gray-800">指派成員</span>
          {selectedUsernames.size > 0 && (
            <span className="bg-customgreen text-white text-caption font-medium px-1.5 py-0.5 rounded-full leading-none">
              {selectedUsernames.size}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-fast"
          >
            <GrFormClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── 搜尋列 ── */}
      <div className="px-3 py-2 border-b border-gray-50">
        <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 focus-within:bg-white focus-within:ring-1 focus-within:ring-customgreen/40 rounded-lg px-3 py-1.5 transition-colors duration-fast">
          <FiSearch size={13} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜尋成員..."
            className="bg-transparent text-body-sm text-gray-700 placeholder-gray-400 outline-none flex-1 min-w-0"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-gray-300 hover:text-gray-500 transition-colors duration-fast">
              <GrFormClose className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── 全選列 ── */}
      {!searchTerm && menberData.length > 0 && (
        <div
          onClick={toggleAll}
          className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-fast select-none"
        >
          <span className="text-body-sm font-medium text-gray-500">全選</span>
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-fast ${
              allSelected
                ? 'bg-customgreen border-customgreen'
                : someSelected
                  ? 'border-customgreen bg-customgreen/10'
                  : 'border-gray-300 bg-white'
            }`}
          >
            {allSelected && <FiCheck size={11} className="text-white stroke-[3]" />}
            {someSelected && <div className="w-2 h-0.5 bg-customgreen rounded-full" />}
          </div>
        </div>
      )}

      {/* ── 成員列表 ── */}
      <div className="max-h-56 overflow-y-auto py-1">
        {filteredMembers.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-body-sm text-gray-400">
              {searchTerm ? '找不到符合的成員' : '此專案尚無成員'}
            </p>
          </div>
        ) : (
          filteredMembers.map((member, idx) => {
            const isSelected = selectedUsernames.has(member.username);
            const imgIndex = parseInt(member.id ?? idx) % personImg.length;
            return (
              <div
                key={member.username}
                onClick={() => toggleMember(member)}
                className={`flex items-center justify-between mx-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-fast select-none ${
                  isSelected ? 'bg-customgreen/10' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-stack-xs">
                  <img
                    src={personImg[imgIndex]}
                    alt={member.username}
                    className="w-7 h-7 rounded-full object-cover border border-gray-100"
                  />
                  <span className={`text-body-sm transition-colors duration-fast ${
                    isSelected ? 'text-customgreen font-medium' : 'text-gray-700'
                  }`}>
                    {member.username}
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-fast ${
                    isSelected ? 'bg-customgreen border-customgreen' : 'border-gray-300 bg-white'
                  }`}
                >
                  {isSelected && <FiCheck size={11} className="text-white stroke-[3]" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 底部說明 ── */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <p className="text-caption text-gray-400 text-center">
          {selectedUsernames.size > 0
            ? `已選擇 ${selectedUsernames.size} 位成員，儲存卡片後生效`
            : '點擊成員名稱以指派或取消指派'}
        </p>
      </div>
    </div>
  );
}
