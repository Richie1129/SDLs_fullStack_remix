import { useEffect, useState } from 'react';
import { getProjectGraph } from '../../../api/knowledgeGraph';
import { normalizeEvents } from '../utils/buildGraph';

export const useKnowledgeGraph = (projectId) => {
  const [state, setState] = useState({
    loading: false,
    error: null,
    project: null,
    members: [],
    nodes: [],
    relations: [],
    events: [],
  });

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, error: null }));
    getProjectGraph(projectId)
      .then(data => {
        if (cancelled) return;
        const events = normalizeEvents(data.events || [], data.nodes || []);
        setState({
          loading: false,
          error: null,
          project: data.project,
          members: data.members || [],
          nodes: data.nodes || [],
          relations: data.relations || [],
          events,
        });
      })
      .catch(err => {
        if (cancelled) return;
        const message = err?.response?.data?.message || err?.message || '載入失敗';
        setState(prev => ({ ...prev, loading: false, error: message }));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return state;
};
