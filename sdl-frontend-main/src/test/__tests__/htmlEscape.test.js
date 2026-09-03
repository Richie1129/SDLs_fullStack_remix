/**
 * escapeHtml 測試
 *
 * 背景：SweetAlert2 的 html: 直接走 innerHTML，username 與 LLM 回應曾被
 * 未跳脫地拼進去（儲存型 XSS）。這裡鎖住跳脫行為。
 */
import { describe, test, expect } from 'vitest';
import { escapeHtml } from '@/utils/htmlEscape';

describe('escapeHtml', () => {
  test('跳脫 HTML 特殊字元', () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    );
    expect(escapeHtml(`Tom & Jerry's "quote"`)).toBe('Tom &amp; Jerry&#39;s &quot;quote&quot;');
  });

  test('null / undefined 回傳空字串', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('非字串型別先轉字串', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(true)).toBe('true');
  });

  test('已跳脫的字串不會被還原（不做二次解讀）', () => {
    expect(escapeHtml('&lt;b&gt;')).toBe('&amp;lt;b&amp;gt;');
  });

  test('一般中文與空白原樣保留', () => {
    expect(escapeHtml('王小明 的臨時密碼')).toBe('王小明 的臨時密碼');
  });
});
