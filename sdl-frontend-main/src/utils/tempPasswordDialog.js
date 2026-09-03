import Swal from 'sweetalert2';
import { escapeHtml } from './htmlEscape';

/**
 * 顯示「重設密碼成功」對話框，附臨時密碼與複製按鈕。
 *
 * 三個管理頁（教師密碼重設、教師儀表板學生列表、Admin 後台）共用。
 * 安全要求：
 * - username 由使用者註冊時自填、未經驗證，必須跳脫後才能進 `html:`
 * - 複製按鈕不再用 inline onclick 拼接密碼，改在 didOpen 綁事件，
 *   密碼只存在 JS 閉包裡，不進 HTML 屬性
 *
 * @param {object} params
 * @param {string} params.username      被重設者的顯示名稱
 * @param {string} params.tempPassword  後端產生的臨時密碼
 * @param {string} params.hint          提示語（例如「請告知學生盡快至個人頁面修改密碼。」）
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export function showTempPasswordDialog({ username, tempPassword, hint } = {}) {
  const password = String(tempPassword ?? '');

  return Swal.fire({
    icon: 'success',
    title: '重設成功',
    html: `
      <p class="text-body-sm text-gray-600 mb-component-sm">
        ${escapeHtml(username)} 的臨時密碼如下，${escapeHtml(hint)}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-stack-xs bg-gray-100 rounded-lg px-component-base py-component-sm">
        <span class="font-mono text-body-lg font-bold tracking-widest text-gray-800">${escapeHtml(password)}</span>
        <button
          type="button"
          data-role="copy-temp-password"
          class="px-btn-x-sm py-btn-y-sm text-ui bg-customgreen text-white rounded hover:bg-customgreen/90 hover:shadow-lg transition-all duration-fast"
        >複製</button>
      </div>
    `,
    confirmButtonText: '關閉',
    confirmButtonColor: '#5BA491',
    didOpen: (popup) => {
      const button = popup?.querySelector?.('[data-role="copy-temp-password"]');
      if (!button) return;
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(password);
          button.textContent = '已複製';
        } catch {
          // 非安全環境（http）或使用者拒絕權限時 clipboard 會 reject
          button.textContent = '複製失敗';
        }
        setTimeout(() => {
          button.textContent = '複製';
        }, 1500);
      });
    },
  });
}

export default showTempPasswordDialog;
