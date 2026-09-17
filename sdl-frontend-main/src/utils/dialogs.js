import Swal from 'sweetalert2';
const BRAND = '#5BA491';
const DANGER = '#d33';
export async function confirmDialog({ title = '請確認', text = '', confirmText = '確定', cancelText = '取消', icon = 'warning', danger = false } = {}) {
  const result = await Swal.fire({ title, text, icon, showCancelButton: true, confirmButtonColor: danger ? DANGER : BRAND, cancelButtonColor: danger ? BRAND : DANGER, confirmButtonText: confirmText, cancelButtonText: cancelText, reverseButtons: danger });
  return result.isConfirmed;
}
export function alertError(text, title = '發生錯誤') {
  return Swal.fire({ title, text, icon: 'error', confirmButtonColor: BRAND, confirmButtonText: '確定' });
}
export function alertInfo(text, title = '提示') {
  return Swal.fire({ title, text, icon: 'info', confirmButtonColor: BRAND, confirmButtonText: '確定' });
}
