import { format, isValid } from 'date-fns';

/** 安全格式化：無效日期回空字串，不丟例外 */
export function formatDate(value, pattern = 'yyyy/MM/dd') {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? format(d, pattern) : '';
}
