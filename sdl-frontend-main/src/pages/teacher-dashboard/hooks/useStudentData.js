import { useState, useEffect } from "react";
import { apiAdapter } from "../utils/apiAdapter";
import { DataNormalizer } from "../utils/DataNormalizer";
import { getCurrentUserId, getCurrentUserRole } from "../../../utils/authUtils";

/**
 * 學生相關資料的專門 Hook
 * 負責獲取和管理所有學生相關的資料
 */
export const useStudentData = (projectId, userRole) => {
  const [studentData, setStudentData] = useState({
    students: [],
    reflections: [],
    submissions: [],
    aiCountByUserId: {},
    usageByUserId: {},
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!projectId) {
      console.warn("❌ projectId 未定義");
      setStudentData(prev => ({ ...prev, loading: false, error: "缺少 projectId" }));
      return;
    }

    const fetchStudentData = async () => {
      try {
        setStudentData(prev => ({ ...prev, loading: true, error: null }));

        const normalizer = new DataNormalizer();
        const currentUserId = getCurrentUserId();
        const isTeacher = userRole === 'teacher';

        console.log("🧑‍🎓 開始獲取學生相關資料...", { projectId, userRole });

        // 並行獲取學生基本資料
        const [studentsResult, reflectionsResult, submissionsResult] = await Promise.all([
          apiAdapter.getStudentData(projectId),
          apiAdapter.getReflectionData(projectId, currentUserId, isTeacher),
          apiAdapter.getSubmissionData(projectId)
        ]);

        // 正規化學生資料
        const students = normalizer.normalizeStudentData(
          studentsResult.success ? studentsResult.data : []
        );

        // 獲取學生指標（AI互動和使用時長）
        const metricsResult = await apiAdapter.getStudentMetrics(students, projectId);

        // 正規化其他資料
        const reflections = normalizer.normalizeReflections(
          reflectionsResult.success ? reflectionsResult.data : []
        );

        const submissions = normalizer.normalizeSubmissions(
          submissionsResult.success ? submissionsResult.data : []
        );

        const { aiCountByUserId, usageByUserId } = metricsResult.success 
          ? metricsResult.data 
          : { aiCountByUserId: {}, usageByUserId: {} };

        const result = {
          students,
          reflections,
          submissions,
          aiCountByUserId,
          usageByUserId,
          loading: false,
          error: null
        };

        console.log("✅ 學生資料獲取完成:", {
          學生數量: students.length,
          反思記錄: reflections.length,
          提交記錄: submissions.length
        });

        setStudentData(result);

      } catch (error) {
        console.error("❌ 學生資料獲取失敗:", error);
        setStudentData(prev => ({
          ...prev,
          loading: false,
          error: error.message || "學生資料獲取失敗"
        }));
      }
    };

    fetchStudentData();
  }, [projectId, userRole]);

  return studentData;
};