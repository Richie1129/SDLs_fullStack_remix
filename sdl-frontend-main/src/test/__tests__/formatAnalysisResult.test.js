/**
 * formatAnalysisResult 測試
 *
 * 背景：5Rs 反思的 AI 分析結果會拼成 SweetAlert2 html。內容來自 LLM，
 * 可被 prompt injection 塞進標籤，這裡鎖住每個欄位都有跳脫。
 */
import { describe, test, expect } from 'vitest';
import { formatAnalysisResult } from '@/utils/formatAnalysisResult';

const PAYLOADS = {
  overall_assessment: '<img src=x onerror=alert(1)>',
  suggestions: ['<svg onload=alert(2)>', '正常建議'],
  strengths: ['<b onmouseover=alert(3)>強項</b>'],
  improvements: ['</li><script>alert(4)</script>'],
  analysisDate: '2026-09-03T00:00:00Z',
};

describe('formatAnalysisResult', () => {
  test('LLM 回應中的標籤全部被跳脫', () => {
    const html = formatAnalysisResult(PAYLOADS, '<script>alert(5)</script>');
    expect(html).not.toMatch(/<img|<svg|<script|<b onmouseover/i);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;svg onload=alert(2)&gt;');
    expect(html).toContain('&lt;b onmouseover=alert(3)&gt;強項&lt;/b&gt;');
    expect(html).toContain('&lt;/li&gt;&lt;script&gt;alert(4)&lt;/script&gt;');
    expect(html).toContain('使用模型：&lt;script&gt;alert(5)&lt;/script&gt;');
  });

  test('正常內容原樣呈現且區塊齊全', () => {
    const html = formatAnalysisResult(
      { overall_assessment: '寫得很完整', suggestions: ['多舉例'], strengths: ['條理清楚'], improvements: ['補證據'] },
      'gemini'
    );
    expect(html).toContain('整體評估');
    expect(html).toContain('寫得很完整');
    expect(html).toContain('個人化建議');
    expect(html).toContain('<li style="margin-bottom: 8px; line-height: 1.5;">多舉例</li>');
    expect(html).toContain('發現的強項');
    expect(html).toContain('改進方向');
    expect(html).toContain('使用模型：gemini');
  });

  test('缺少欄位時不會出錯，也不渲染空區塊', () => {
    const html = formatAnalysisResult({}, undefined);
    expect(html).toContain('使用模型：AI');
    expect(html).not.toContain('整體評估');
    expect(html).not.toContain('個人化建議');
    expect(html).not.toContain('分析時間');
  });
});
