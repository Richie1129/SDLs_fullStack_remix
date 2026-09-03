/**
 * 將任意值轉成可安全插入 HTML 字串的文字。
 *
 * 用途：SweetAlert2 的 `html:` 會直接以 innerHTML 渲染，凡是把使用者輸入
 * （username 等）或 LLM 回應拼進模板字串，都必須先經過這個函式，
 * 否則就是儲存型／反射型 XSS。
 *
 * - null / undefined 回傳空字串
 * - 其餘型別一律先 String() 再跳脫
 *
 * 適用範圍：只保證 HTML text node 與「加引號的屬性值」安全。
 * 不可用於未加引號的屬性、href/src 的 URL（javascript: 等 scheme）、
 * 或 <script> / on* 事件內的 JS context，那些情境需另行處理。
 */
const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

export default escapeHtml;
