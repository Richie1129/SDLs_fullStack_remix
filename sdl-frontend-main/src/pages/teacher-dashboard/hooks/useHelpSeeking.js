import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { authStorage } from '../../../services/storageService';

/**
 * Help-Seeking 資料 Hook
 * 提供教師端的求助分析資料和迴避風險資料
 */
export const useHelpSeeking = (projectId) => {
  // 資料狀態
  const [overview, setOverview] = useState(null);
  const [projectStats, setProjectStats] = useState(null);
  const [avoidanceRisks, setAvoidanceRisks] = useState([]);
  const [followUpCases, setFollowUpCases] = useState([]);
  
  // UI 狀態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // API 基礎路徑
  const API_BASE = '/api/teacher/help-seeking';

  /**
   * 獲取專案級別的 Help-Seeking 統計
   */
  const fetchProjectStats = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const token = authStorage.get('accessToken');
      const response = await axios.get(`${API_BASE}/project/${projectId}`, {
        headers: { accessToken: token }
      });
      setProjectStats(response.data);
      return response.data;
    } catch (err) {
      console.error('獲取專案統計失敗:', err);
      throw err;
    }
  }, [projectId]);

  /**
   * 獲取教師的 Help-Seeking 總覽
   */
  const fetchOverview = useCallback(async () => {
    try {
      const token = authStorage.get('accessToken');
      const response = await axios.get(`${API_BASE}/overview`, {
        headers: { accessToken: token }
      });
      setOverview(response.data);
      return response.data;
    } catch (err) {
      console.error('獲取總覽失敗:', err);
      throw err;
    }
  }, []);

  /**
   * 獲取迴避風險清單
   */
  const fetchAvoidanceRisks = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const token = authStorage.get('accessToken');
      const response = await axios.get(`${API_BASE}/avoidance-risks/${projectId}`, {
        headers: { accessToken: token }
      });
      setAvoidanceRisks(response.data.risks || []);
      return response.data;
    } catch (err) {
      console.error('獲取迴避風險失敗:', err);
      throw err;
    }
  }, [projectId]);

  /**
   * 獲取需要追蹤的案例
   */
  const fetchFollowUpCases = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const token = authStorage.get('accessToken');
      const response = await axios.get(`${API_BASE}/follow-up-needed/${projectId}`, {
        headers: { accessToken: token }
      });
      setFollowUpCases(response.data.cases || []);
      return response.data;
    } catch (err) {
      console.error('獲取追蹤案例失敗:', err);
      throw err;
    }
  }, [projectId]);

  /**
   * 獲取學生詳細的 Help-Seeking 資料
   */
  const fetchStudentDetails = useCallback(async (studentId, options = {}) => {
    if (!projectId || !studentId) return null;
    
    try {
      const token = authStorage.get('accessToken');
      const params = new URLSearchParams({
        projectId: projectId.toString(),
        ...options
      });
      
      const response = await axios.get(`${API_BASE}/student/${studentId}?${params}`, {
        headers: { accessToken: token }
      });
      return response.data;
    } catch (err) {
      console.error('獲取學生詳細資料失敗:', err);
      throw err;
    }
  }, [projectId]);

  /**
   * 更新迴避風險狀態
   */
  const updateAvoidanceRisk = useCallback(async (riskId, updateData) => {
    try {
      const token = authStorage.get('accessToken');
      const response = await axios.patch(`${API_BASE}/avoidance-risks/${riskId}`, updateData, {
        headers: { accessToken: token }
      });
      
      // 更新本地狀態
      setAvoidanceRisks(prev => 
        prev.map(risk => risk.id === riskId ? { ...risk, ...response.data } : risk)
      );
      
      return response.data;
    } catch (err) {
      console.error('更新迴避風險失敗:', err);
      throw err;
    }
  }, []);

  /**
   * 手動觸發迴避偵測
   */
  const triggerAvoidanceDetection = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const token = authStorage.get('accessToken');
      const response = await axios.post(`${API_BASE}/detect-avoidance/${projectId}`, {}, {
        headers: { accessToken: token }
      });
      
      // 重新獲取風險清單
      await fetchAvoidanceRisks();
      
      setLastUpdate(new Date());
      return response.data;
    } catch (err) {
      console.error('觸發迴避偵測失敗:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchAvoidanceRisks]);

  /**
   * 手動觸發成效檢查
   */
  const triggerEffectivenessCheck = useCallback(async (logId) => {
    if (!logId) return;
    
    try {
      setLoading(true);
      const token = authStorage.get('accessToken');
      const response = await axios.post(`${API_BASE}/check-effectiveness/${logId}`, {}, {
        headers: { accessToken: token }
      });
      
      // 重新獲取追蹤案例
      await fetchFollowUpCases();
      
      setLastUpdate(new Date());
      return response.data;
    } catch (err) {
      console.error('觸發成效檢查失敗:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFollowUpCases]);

  /**
   * 初始載入所有資料
   */
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const loadAllData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 並行獲取所有資料
        await Promise.all([
          fetchOverview(),
          fetchProjectStats(),
          fetchAvoidanceRisks(),
          fetchFollowUpCases()
        ]);
        
        setLastUpdate(new Date());
      } catch (err) {
        setError(err.message || '載入 Help-Seeking 資料失敗');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [projectId, fetchOverview, fetchProjectStats, fetchAvoidanceRisks, fetchFollowUpCases]);

  /**
   * 重新整理所有資料
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchOverview(),
        fetchProjectStats(),
        fetchAvoidanceRisks(),
        fetchFollowUpCases()
      ]);
      
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message || '重新整理失敗');
    } finally {
      setLoading(false);
    }
  }, [fetchOverview, fetchProjectStats, fetchAvoidanceRisks, fetchFollowUpCases]);

  return {
    // 資料
    overview,
    projectStats,
    avoidanceRisks,
    followUpCases,
    
    // UI 狀態
    loading,
    error,
    lastUpdate,
    
    // 操作方法
    fetchStudentDetails,
    updateAvoidanceRisk,
    triggerAvoidanceDetection,
    triggerEffectivenessCheck,
    refresh
  };
};
