import { useState, useCallback, useRef } from 'react';
import { useQuery } from 'react-query';
import { getStudentPortfolioData, generateNarrative } from '../../../api/studentPortfolio';

export function useStudentPortfolio(projectId) {
  const [narrative, setNarrative] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const abortRef = useRef(null);

  const {
    data: portfolioData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(
    ['studentPortfolio', projectId],
    () => getStudentPortfolioData(projectId),
    {
      enabled: !!projectId,
      select: (res) => res.data,
      staleTime: 5 * 60 * 1000
    }
  );

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
  }, []);

  return {
    portfolioData,
    isLoading,
    isError,
    error,
    refetch,
    narrative,
    isGenerating,
    generateError,
    startGenerate,
    stopGenerate,
    clearNarrative
  };
}
