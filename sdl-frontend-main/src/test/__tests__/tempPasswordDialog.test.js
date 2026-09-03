/**
 * showTempPasswordDialog 測試
 *
 * 背景：三個管理頁把 data.username 直接拼進 SweetAlert2 html，
 * 學生只要取名為 <img onerror=...> 就能在教師／admin 瀏覽器執行腳本。
 * 這裡驗證：username 一定被跳脫、密碼不進 inline onclick、複製按鈕仍可用。
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));

import Swal from 'sweetalert2';
import { showTempPasswordDialog } from '@/utils/tempPasswordDialog';

const XSS_NAME = `<img src=x onerror="alert('xss')">`;

describe('showTempPasswordDialog', () => {
  beforeEach(() => {
    Swal.fire.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('username 與提示語都被跳脫，不會出現原始標籤', async () => {
    await showTempPasswordDialog({ username: XSS_NAME, tempPassword: 'Ab12Cd34', hint: '請 <b>盡快</b> 修改。' });
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    const { html } = Swal.fire.mock.calls[0][0];
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;');
    expect(html).toContain('Ab12Cd34');
    expect(html).toContain('請 &lt;b&gt;盡快&lt;/b&gt; 修改。');
  });

  test('未帶參數也不會拋錯', async () => {
    await expect(showTempPasswordDialog()).resolves.toBeDefined();
  });

  test('密碼不出現在 inline 事件屬性中', async () => {
    await showTempPasswordDialog({ username: 'u', tempPassword: `x'); alert(1); ('`, hint: 'h' });
    const { html } = Swal.fire.mock.calls[0][0];
    expect(html).not.toMatch(/onclick=/i);
    expect(html).toContain('x&#39;); alert(1); (&#39;');
  });

  test('複製按鈕透過 didOpen 綁定並寫入剪貼簿', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await showTempPasswordDialog({ username: 'u', tempPassword: 'Secret99', hint: 'h' });
    const { html, didOpen } = Swal.fire.mock.calls[0][0];
    expect(typeof didOpen).toBe('function');

    const popup = document.createElement('div');
    popup.innerHTML = html;
    didOpen(popup);

    const button = popup.querySelector('[data-role="copy-temp-password"]');
    expect(button).not.toBeNull();
    button.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('Secret99');
    expect(button.textContent).toBe('已複製');
    vi.advanceTimersByTime(1500);
    expect(button.textContent).toBe('複製');
  });

  test('clipboard 失敗時不拋錯，顯示複製失敗', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    await showTempPasswordDialog({ username: 'u', tempPassword: 'p', hint: 'h' });
    const { html, didOpen } = Swal.fire.mock.calls[0][0];
    const popup = document.createElement('div');
    popup.innerHTML = html;
    didOpen(popup);
    const button = popup.querySelector('[data-role="copy-temp-password"]');
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(button.textContent).toBe('複製失敗');
  });
});
