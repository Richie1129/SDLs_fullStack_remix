import apiClient from './client';

// Fetch audit events for a target (e.g., daily_personal or daily_team)
export const getAuditEvents = async (params = {}) => {
  const { targetType, targetId, action, limit = 20, offset = 0 } = params;
  const res = await apiClient.get('/audit/events', {
    params: {
      targetType,
      targetId,
      action,
      limit,
      offset,
    },
  });
  return res?.data?.items || [];
};

// Post a client-side audit event (requires auth)
export const postClientAuditEvent = async ({ action, targetType = 'client', targetId = null, projectId = null, metadata = {} }) => {
  const res = await apiClient.post('/audit/client', {
    action,
    targetType,
    targetId,
    projectId,
    metadata,
  });
  return res?.data;
};

// Post batch audit events (requires auth) - Used by TrackingProvider
export const postBatchAuditEvents = async (events = []) => {
  if (!Array.isArray(events) || events.length === 0) {
    console.warn('⚠️ postBatchAuditEvents: events 必須是非空陣列');
    return { ok: false, count: 0 };
  }
  
  const res = await apiClient.post('/audit/batch', { events });
  return res?.data;
};
