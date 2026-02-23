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
 * 取得個人學習歷程資料
 * @param {number} projectId
 */
export const getStudentPortfolioData = async (projectId) => {
  const response = await apiClient.get(
    `/projects/${projectId}/portfolio/student`,
    { headers: authHeaders() }
  );
  return response.data;
};

/**
 * AI 敘事生成（SSE 串流）
 * @param {number} projectId
 * @param {function} onChunk - 收到每個文字片段時呼叫
 * @param {function} onDone  - 完成時呼叫
 * @param {function} onError - 錯誤時呼叫
 * @returns {function} abort - 呼叫可中止串流
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
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') { onDone?.(); return; }
            try {
              const parsed = JSON.parse(raw);
              if (parsed.content) onChunk?.(parsed.content);
              if (parsed.done) { onDone?.(); return; }
            } catch { /* 非 JSON 片段，略過 */ }
          }
        }
      }
      onDone?.();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err);
    });

  return () => controller.abort();
};
