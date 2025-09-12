/**
 * 資料處理共用工具
 */

/**
 * 正規化ID，統一轉為字串格式
 */
export const normalizeId = (x) => (x == null ? null : String(x));

/**
 * 安全的篩選函數，避免在資料未載入時出錯
 */
export const safeFilter = (arr, filterFn) => {
  if (!Array.isArray(arr)) return [];
  try {
    return arr.filter(filterFn);
  } catch (error) {
    console.error('篩選錯誤:', error);
    return [];
  }
};

/**
 * 檢查指派者陣列是否包含指定用戶
 */
export const assigneesIncludesUser = (assignees, userId, userName) => {
  if (!Array.isArray(assignees)) return false;
  const meId = normalizeId(userId);
  const meName = userName || '';
  
  return assignees.some((a) => {
    if (a == null) return false;
    if (typeof a === 'string') return a === meName || a === meId;
    if (typeof a === 'number') return String(a) === meId;
    return String(a.id ?? a.userId ?? '') === meId || (a.username ?? a.name ?? a.userName ?? '') === meName;
  });
};

/**
 * 檢查任務是否完成
 */
export const isTaskCompleted = (task) => {
  const status = (task?.status || task?.columnName || '').toLowerCase();
  return status.includes('完成') || status.includes('done') || 
         status.includes('完畢') || status.includes('finished') ||
         status.includes('completed') || status === '完成';
};

/**
 * 檢查項目是否屬於指定用戶
 */
export const isOwnedByUser = (item, userId, userName) => {
  const meId = normalizeId(userId);
  const meName = userName || '';
  
  // 檢查多種可能的用戶標識欄位
  const itemUserId = normalizeId(item?.userId ?? item?.user_id ?? item?.ownerId ?? item?.authorId);
  const itemUserName = item?.userName ?? item?.username ?? item?.author ?? item?.owner ?? item?.user_name ?? '';
  
  return (itemUserId && itemUserId === meId) || (itemUserName && itemUserName === meName);
};

/**
 * 安全獲取時間戳並推入陣列
 */
export const pushTimestamp = (timestamps, timeValue) => {
  if (timeValue) {
    try {
      timestamps.push(new Date(timeValue).getTime());
    } catch (error) {
      console.error('時間戳解析錯誤:', error);
    }
  }
};

/**
 * 獲取專案內的AI互動（根據專案ID篩選）
 */
export const filterAiInteractionsByProject = (interactions, projectId) => {
  if (!Array.isArray(interactions)) return [];
  const projectIdStr = String(projectId || '');
  
  return interactions.filter(interaction => {
    const pid = String(interaction?.projectId ?? interaction?.project_id ?? '');
    return pid && pid === projectIdStr;
  });
};