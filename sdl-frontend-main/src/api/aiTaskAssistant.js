import client from './client';

/**
 * Analyze a task card to detect issues
 */
export const analyzeCard = async (taskId, projectId) => {
  try {
    const response = await client.post('/ai-task-assistant/analyze-card', {
      taskId,
      projectId
    });
    return response.data;
  } catch (error) {
    console.error('Error analyzing card:', error);
    throw error;
  }
};

/**
 * Generate AI suggestions for a task
 */
export const generateSuggestions = async (data) => {
  try {
    const response = await client.post('/ai-task-assistant/generate-suggestions', data);
    return response.data;
  } catch (error) {
    console.error('Error generating suggestions:', error);
    throw error;
  }
};

/**
 * Submit feedback for AI suggestions
 */
export const submitFeedback = async (data) => {
  try {
    const response = await client.post('/ai-task-assistant/feedback', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

/**
 * Get help-seeking stats for a user
 */
export const getHelpSeekingStats = async (userId, timeRange = '7d') => {
  try {
    const response = await client.get(`/ai-task-assistant/help-seeking-stats/${userId}`, {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting help-seeking stats:', error);
    throw error;
  }
};

/**
 * Get help-seeking history for a specific task
 */
export const getTaskHistory = async (taskId, projectId = null) => {
  try {
    const params = projectId ? { projectId } : {};
    const response = await client.get(`/ai-task-assistant/task-history/${taskId}`, { params });
    return response.data;
  } catch (error) {
    console.error('Error getting task history:', error);
    throw error;
  }
};
