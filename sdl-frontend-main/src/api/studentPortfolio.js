/**
 * 個人學習歷程 API
 */
import apiClient from './client';
import { authStorage } from '../services/storageService';

const authHeaders = () => {
  const token = authStorage.get('accessToken');
  return token ? { accessToken: token } : {};
};

/**
 * 取得學習敘事草稿
 * @param {number} projectId
 * @param {number} [studentId] - 教師查看特定學生時傳入
 */
export const getNarrativeDraft = async (projectId, studentId) => {
  const params = studentId ? { studentId } : {};
  const response = await apiClient.get(
    `/projects/${projectId}/portfolio/draft`,
    { headers: authHeaders(), params }
  );
  return response.data;
};

/**
 * 儲存學習敘事草稿
 * @param {number} projectId
 * @param {string} narrativeText
 */
export const saveNarrativeDraft = async (projectId, narrativeText) => {
  const response = await apiClient.put(
    `/projects/${projectId}/portfolio/draft`,
    { narrativeText },
    { headers: authHeaders() }
  );
  return response.data;
};

/**
 * 取得個人學習歷程資料
 * @param {number} projectId
 * @param {number} [studentId] - 教師查看特定學生時傳入
 */
export const getStudentPortfolioData = async (projectId, studentId) => {
  const params = studentId ? { studentId } : {};
  const response = await apiClient.get(
    `/projects/${projectId}/portfolio/student`,
    { headers: authHeaders(), params }
  );
  return response.data;
};

/**
 * 共用 SSE 讀取器
 * - 以 buffer 累積跨 chunk 的不完整行，避免邊界截斷
 * - 過濾 Gemini 的 thinking 類型 chunk，不洩漏進輸出
 * @param {Response} res - fetch Response
 * @param {object} callbacks - { onChunk, onDone, onError }
 */
async function readSseStream(res, { onChunk, onDone, onError }) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留最後一筆不完整的行

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { onDone?.(); return; }
        try {
          const parsed = JSON.parse(raw);
          // 過濾 Gemini thinking chunks，只接受 content 類型
          if (parsed.content && parsed.type !== 'thinking') onChunk?.(parsed.content);
          if (parsed.done) { onDone?.(); return; }
        } catch { /* 非 JSON 片段，略過 */ }
      }
    }
    onDone?.();
  } catch (err) {
    if (err.name !== 'AbortError') onError?.(err);
  }
}

/**
 * AI 寫作回饋（SSE 串流）
 * @param {number} projectId
 * @param {string} narrativeText - 學生撰寫的敘事文字
 * @param {object} callbacks - { onChunk, onDone, onError }
 * @returns {function} abort
 */
export const requestFeedback = (projectId, narrativeText, { onChunk, onDone, onError }) => {
  const token = authStorage.get('accessToken');
  const controller = new AbortController();

  fetch(`/api/projects/${projectId}/portfolio/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { accessToken: token })
    },
    body: JSON.stringify({ narrativeText }),
    signal: controller.signal
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await readSseStream(res, { onChunk, onDone, onError });
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err);
    });

  return () => controller.abort();
};

/**
 * AI 段落整合（SSE 串流）
 * @param {number} projectId
 * @param {string} narrativeText - 學生的碎片筆記
 * @param {object} callbacks - { onChunk, onDone, onError }
 * @returns {function} abort
 */
export const organizeNarrative = (projectId, narrativeText, { onChunk, onDone, onError }) => {
  const token = authStorage.get('accessToken');
  const controller = new AbortController();

  fetch(`/api/projects/${projectId}/portfolio/organize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { accessToken: token })
    },
    body: JSON.stringify({ narrativeText }),
    signal: controller.signal
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await readSseStream(res, { onChunk, onDone, onError });
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err);
    });

  return () => controller.abort();
};

/**
 * AI 敘事生成（SSE 串流）
 * @param {number} projectId
 * @param {object} callbacks - { onChunk, onDone, onError }
 * @returns {function} abort
 */
export const generateNarrative = (projectId, { onChunk, onDone, onError }) => {
  const token = authStorage.get('accessToken');
  const controller = new AbortController();

  fetch(`/api/projects/${projectId}/portfolio/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { accessToken: token })
    },
    signal: controller.signal
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await readSseStream(res, { onChunk, onDone, onError });
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err);
    });

  return () => controller.abort();
};
