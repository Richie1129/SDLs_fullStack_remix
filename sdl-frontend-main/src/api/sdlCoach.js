import apiClient from './client';

const STAGE_LABELS = {
  1: '定標',
  2: '擇策',
  3: '監評',
  4: '調節',
};

export const stageNumberToLabel = (stage) => STAGE_LABELS[stage] || null;

export const askSdlCoach = async ({ question, currentStage, context, projectId, sessionId }) => {
  const stageLabel = typeof currentStage === 'number' ? stageNumberToLabel(currentStage) : currentStage;
  const res = await apiClient.post('/sdl-coach/ask', {
    question,
    currentStage: stageLabel || undefined,
    context: context || undefined,
    projectId: projectId || undefined,
    sessionId: sessionId || undefined,
  }, {
    timeout: 60000,
  });
  return res.data;
};

export const checkSdlCoachHealth = async () => {
  const res = await apiClient.get('/sdl-coach/health');
  return res.data;
};
