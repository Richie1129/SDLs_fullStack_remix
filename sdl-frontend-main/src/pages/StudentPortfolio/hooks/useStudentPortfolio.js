import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import { getStudentPortfolioData, generateNarrative, requestFeedback, organizeNarrative, getNarrativeDraft, saveNarrativeDraft } from '../../../api/studentPortfolio';

export function useStudentPortfolio(projectId, studentId) {
  // 敘事狀態
  const [narrative, setNarrative] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const abortRef = useRef(null);

  // 草稿儲存狀態
  const [draftSavedAt, setDraftSavedAt] = useState(null); // Date | null
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const saveTimerRef = useRef(null);
  const draftLoadedRef = useRef(false); // 避免載入後觸發自動儲存

  // 整合狀態
  const [organized, setOrganized] = useState('');
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeError, setOrganizeError] = useState(null);
  const organizeAbortRef = useRef(null);

  // 回饋狀態
  const [feedback, setFeedback] = useState('');
  const [isFeedbackGenerating, setIsFeedbackGenerating] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const feedbackAbortRef = useRef(null);

  // 元件卸載時中止進行中的串流，避免 setState on unmounted component
  useEffect(() => {
    return () => {
      abortRef.current?.();
      organizeAbortRef.current?.();
      feedbackAbortRef.current?.();
      clearTimeout(saveTimerRef.current);
    };
  }, []);

  // 載入草稿：進入頁面時從資料庫還原（只在 narrative 為空時填入）
  useEffect(() => {
    if (!projectId) return;
    getNarrativeDraft(projectId, studentId)
      .then(res => {
        if (res.data?.narrative_draft) {
          // 使用 functional update：若使用者在載入期間已輸入內容，不覆蓋
          setNarrative(prev => prev || res.data.narrative_draft);
          setDraftSavedAt(res.data.draft_updated_at ? new Date(res.data.draft_updated_at) : null);
        }
      })
      .catch(() => { /* 載入草稿失敗時靜默略過，不阻斷主流程 */ })
      .finally(() => { draftLoadedRef.current = true; });
  }, [projectId, studentId]);

  // 自動儲存草稿：narrative 變動後 debounce 1000ms 呼叫 API
  // AI 生成或整合期間跳過，避免每個 chunk 都重設 timer
  // 教師查看模式（有 studentId）不儲存
  useEffect(() => {
    if (!draftLoadedRef.current || isGenerating || isOrganizing || studentId) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSavingDraft(true);
      try {
        await saveNarrativeDraft(projectId, narrative);
        setDraftSavedAt(new Date());
      } catch {
        // 儲存失敗時靜默略過，不干擾學生輸入
      } finally {
        setIsSavingDraft(false);
      }
    }, 1000);
  }, [narrative, projectId, isGenerating, isOrganizing]);

  const {
    data: portfolioData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(
    ['studentPortfolio', projectId, studentId],
    () => getStudentPortfolioData(projectId, studentId),
    {
      enabled: !!projectId,
      select: (res) => res.data,
      staleTime: 5 * 60 * 1000
    }
  );

  // ── 敘事生成 ──────────────────────────────────────────────

  const startGenerate = useCallback(() => {
    if (isGenerating) return;
    setNarrative('');
    setGenerateError(null);
    setIsGenerating(true);

    const abort = generateNarrative(projectId, {
      onChunk: (text) => setNarrative(prev => prev + text),
      onDone: () => setIsGenerating(false),
      onError: (err) => {
        setGenerateError(err.message || '生成失敗，請稍後再試');
        setIsGenerating(false);
      }
    });

    abortRef.current = abort;
  }, [projectId, isGenerating]);

  const stopGenerate = useCallback(() => {
    abortRef.current?.();
    setIsGenerating(false);
  }, []);

  const clearNarrative = useCallback(() => {
    setNarrative('');
    setGenerateError(null);
    setFeedback('');
    setFeedbackError(null);
  }, []);

  // ── AI 段落整合 ───────────────────────────────────────────

  const startOrganize = useCallback((narrativeText) => {
    if (isOrganizing || !narrativeText.trim()) return;
    setOrganized('');
    setOrganizeError(null);
    setIsOrganizing(true);

    const abort = organizeNarrative(projectId, narrativeText, {
      onChunk: (text) => setOrganized(prev => prev + text),
      onDone: () => setIsOrganizing(false),
      onError: (err) => {
        setOrganizeError(err.message || 'AI 整合失敗，請稍後再試');
        setIsOrganizing(false);
      }
    });

    organizeAbortRef.current = abort;
  }, [projectId, isOrganizing]);

  const stopOrganize = useCallback(() => {
    organizeAbortRef.current?.();
    setIsOrganizing(false);
  }, []);

  // cleanText：呼叫端傳入剝除 AI 標記後的乾淨文字
  const acceptOrganized = useCallback((cleanText) => {
    if (cleanText) setNarrative(cleanText);
    setOrganized('');
    setOrganizeError(null);
  }, []);

  const clearOrganized = useCallback(() => {
    setOrganized('');
    setOrganizeError(null);
  }, []);

  // ── AI 寫作回饋 ───────────────────────────────────────────

  const startFeedback = useCallback((narrativeText) => {
    if (isFeedbackGenerating || !narrativeText.trim()) return;
    setFeedback('');
    setFeedbackError(null);
    setIsFeedbackGenerating(true);

    const abort = requestFeedback(projectId, narrativeText, {
      onChunk: (text) => setFeedback(prev => prev + text),
      onDone: () => setIsFeedbackGenerating(false),
      onError: (err) => {
        setFeedbackError(err.message || 'AI 回饋生成失敗，請稍後再試');
        setIsFeedbackGenerating(false);
      }
    });

    feedbackAbortRef.current = abort;
  }, [projectId, isFeedbackGenerating]);

  const stopFeedback = useCallback(() => {
    feedbackAbortRef.current?.();
    setIsFeedbackGenerating(false);
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedback('');
    setFeedbackError(null);
  }, []);

  return {
    portfolioData,
    isLoading,
    isError,
    error,
    refetch,
    // 敘事
    narrative,
    setNarrative,
    isGenerating,
    generateError,
    startGenerate,
    stopGenerate,
    clearNarrative,
    // 草稿儲存
    draftSavedAt,
    isSavingDraft,
    // 整合
    organized,
    isOrganizing,
    organizeError,
    startOrganize,
    stopOrganize,
    acceptOrganized,
    clearOrganized,
    // 回饋
    feedback,
    isFeedbackGenerating,
    feedbackError,
    startFeedback,
    stopFeedback,
    clearFeedback
  };
}
