/**
 * downloadFileWithAuth / isFileMissingError 測試
 *
 * 背景：伺服器搬遷後有一批附件在 MinIO 已不存在，後端回 404。
 * 下載函式必須自行處理錯誤並顯示明確訊息，不能讓 rejection 漏到呼叫端。
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({ default: { get: vi.fn() } }));
vi.mock('js-file-download', () => ({ default: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import apiClient from '@/api/client';
import FileDownload from 'js-file-download';
import toast from 'react-hot-toast';
import {
  downloadFileWithAuth,
  isFileMissingError,
  MISSING_FILE_MESSAGE,
} from '@/utils/fileUrlBuilder';

const httpError = (status) => ({ response: { status } });

describe('isFileMissingError', () => {
  test('404 視為檔案不存在', () => {
    expect(isFileMissingError(httpError(404))).toBe(true);
  });

  test('其他狀態碼與非 axios 錯誤都不算', () => {
    expect(isFileMissingError(httpError(500))).toBe(false);
    expect(isFileMissingError(new Error('network'))).toBe(false);
    expect(isFileMissingError(undefined)).toBe(false);
  });
});

describe('downloadFileWithAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('成功時觸發下載並以 originalName 命名，回傳 true', async () => {
    const blob = new Blob(['x']);
    apiClient.get.mockResolvedValue({ data: blob });

    const ok = await downloadFileWithAuth('123-abc.pdf', '報告.pdf');

    expect(ok).toBe(true);
    expect(apiClient.get).toHaveBeenCalledWith('/file/direct/123-abc.pdf', { responseType: 'blob' });
    expect(FileDownload).toHaveBeenCalledWith(blob, '報告.pdf');
    expect(toast.error).not.toHaveBeenCalled();
  });

  test('沒有 originalName 時以 fileName 命名', async () => {
    apiClient.get.mockResolvedValue({ data: new Blob(['x']) });

    await downloadFileWithAuth('123-abc.pdf');

    expect(FileDownload).toHaveBeenCalledWith(expect.any(Blob), '123-abc.pdf');
  });

  test('404 時顯示「檔案已遺失」訊息、不下載、不拋出，回傳 false', async () => {
    apiClient.get.mockRejectedValue(httpError(404));

    await expect(downloadFileWithAuth('gone.pdf', '舊檔.pdf')).resolves.toBe(false);

    expect(FileDownload).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(MISSING_FILE_MESSAGE);
  });

  test('其他錯誤顯示一般失敗訊息，回傳 false', async () => {
    apiClient.get.mockRejectedValue(httpError(500));

    await expect(downloadFileWithAuth('x.pdf')).resolves.toBe(false);

    expect(toast.error).toHaveBeenCalledWith('檔案下載失敗');
  });
});
