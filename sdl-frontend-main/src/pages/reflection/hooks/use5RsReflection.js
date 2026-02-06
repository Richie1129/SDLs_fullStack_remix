import { useState } from "react";
import toast from "react-hot-toast";
import { is5RsFormat, parse5RsContent } from "@/utils/5RsUtils.js";
import { analyze5RsReflection } from "@/api/llm5Rs.js";
import { postClientAuditEvent } from "@/api/audit.js";
import { DAILY_ERROR_CODES } from '@/constants/dailyErrorCodes.js';
import { getCurrentUserId } from '@/utils/authUtils.js';

/**
 * Hook for managing 5Rs reflection logic
 * Handles 5Rs editing, viewing, and AI analysis
 */
export function use5RsReflection(projectId, updateMutation) {
  // Modal states
  const [is5RsModalOpen, setIs5RsModalOpen] = useState(false);
  const [viewReflectionModalOpen, setViewReflectionModalOpen] = useState(false);

  // Data states
  const [editingReflectionData, setEditingReflectionData] = useState({});
  const [selectedReflectionForView, setSelectedReflectionForView] = useState(null);

  // Open 5Rs edit modal
  const handleEdit5Rs = (item, setTitle, setEditingId) => {
    console.log("編輯 5Rs 反思:", item);
    const parsedContent = parse5RsContent(item.content);
    if (parsedContent) {
      setEditingReflectionData(parsedContent.data);
    } else {
      setEditingReflectionData({});
    }
    setTitle(item.title);
    setEditingId(item.id);
    setIs5RsModalOpen(true);
  };

  // Open 5Rs view modal
  const handleView5Rs = (item) => {
    setSelectedReflectionForView(item);
    setViewReflectionModalOpen(true);
  };

  // Save 5Rs reflection
  const handle5RsSave = (data, editingId, setEditingId, setAttachFile, createMutation) => {
    console.log("儲存 5Rs 反思:", data);

    if (editingId) {
      // Update existing 5Rs reflection
      const formData = new FormData();
      formData.append("id", Number(editingId));
      formData.append("title", data.title);
      formData.append("content", data.content);
      
      // Add stage if provided
      if (data.stage) {
        formData.append("stage", data.stage);
      }

      // Add attachments if any
      if (data.attachFile && data.attachFile.length > 0) {
        for (let i = 0; i < data.attachFile.length; i++) {
          formData.append("attachFile", data.attachFile[i]);
        }
      }

      updateMutation.mutate(formData, {
        onSuccess: () => {
          setEditingId(null);
          setIs5RsModalOpen(false);
          setEditingReflectionData({});
          setAttachFile(null);
          toast.success("5Rs 反思更新成功");
        },
        onError: (error) => {
          console.log('❌ 5Rs 反思更新失敗:', error);
          toast.error("5Rs 反思更新失敗");
        },
      });
    } else {
      // Create new 5Rs reflection
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("title", data.title);
      formData.append("content", data.content);
      formData.append("userId", getCurrentUserId());
      
      // Add stage if provided
      if (data.stage) {
        formData.append("stage", data.stage);
      }

      // Add attachments if any
      if (data.attachFile && data.attachFile.length > 0) {
        for (let i = 0; i < data.attachFile.length; i++) {
          formData.append("attachFile", data.attachFile[i]);
        }
      }

      createMutation.mutate(formData, {
        onSuccess: () => {
          setIs5RsModalOpen(false);
          setEditingReflectionData({});
          setAttachFile(null);
        },
        onError: (error) => {
          console.log('❌ 5Rs 反思創建失敗:', error);
          toast.error("5Rs 反思創建失敗");
        },
      });
    }
  };

  // Cancel 5Rs editing
  const handle5RsCancel = (setEditingId, setTitle, setAttachFile) => {
    setIs5RsModalOpen(false);
    setEditingId(null);
    setEditingReflectionData({});
    setTitle("");
    setAttachFile(null);
  };

  // Request AI analysis for 5Rs reflection
  const handleRequestAIAnalysis = async (item, provider = 'auto') => {
    console.log("=== 前端 AI 分析請求開始 ===")
    console.log("選中的日誌項目:", item);
    console.log("使用的 AI 模型:", provider);

    const parsedContent = parse5RsContent(item.content);
    console.log("解析後的內容:", parsedContent);

    if (!parsedContent || !parsedContent.data) {
      console.error("解析 5Rs 內容失敗");
      toast.error(DAILY_ERROR_CODES.INVALID_5RS_CONTENT.zh);
      return;
    }

    // Allow re-analysis even if feedback exists (saved as history)
    if (
      parsedContent.feedback &&
      (parsedContent.feedback.overall ||
        parsedContent.feedback.suggestions?.length > 0)
    ) {
      console.log("已有 AI 反饋，仍將進行再次分析並保存為歷史");
    }

    console.log("準備發送的反思資料:", parsedContent.data);

    try {
      toast.loading(`正在使用 ${provider === 'auto' ? '自動選擇' : provider} 分析...`, { id: "ai-analysis" });

      console.log("呼叫 AI 分析 API，使用提供者:", provider);
      const result = await analyze5RsReflection(parsedContent.data, provider);
      console.log("AI 分析 API 回應:", result);

      if (result.success) {
        console.log("AI 分析成功，提供者:", result.provider);
        console.log("AI 回饋內容:", result.feedback);

        // Record AI analysis history (audit event)
        try {
          await postClientAuditEvent({
            action: 'DAILY_PERSONAL_5RS_AI_ANALYSIS',
            targetType: 'daily_personal',
            targetId: item.id,
            projectId: projectId,
            metadata: {
              provider: result.provider,
              analysisDate: result.analysisDate || new Date().toISOString(),
              title: item.title,
              inputData: parsedContent.data,
              feedback: result.feedback,
            },
          });
        } catch (e) {
          console.warn('送出 AI 分析審計事件失敗（略過，不影響主流程）', e);
        }

        // Integrate AI feedback into existing content
        const updatedContent = JSON.parse(item.content);
        updatedContent.feedback = {
          ...result.feedback,
          provider: result.provider,
          analysisDate: result.analysisDate || new Date().toISOString(),
        };

        console.log("更新後的內容:", updatedContent);

        // Update daily content
        const updatedData = {
          id: Number(item.id),
          title: item.title,
          content: JSON.stringify(updatedContent, null, 2),
        };

        console.log("準備更新的資料:", updatedData);

        updateMutation.mutate(updatedData, {
          onSuccess: () => {
            console.log("AI 分析結果保存成功");
            toast.success(`AI 分析完成！使用 ${result.provider}`, {
              id: "ai-analysis",
            });
          },
          onError: (error) => {
            console.error("❌ 儲存 AI 分析結果失敗:", error);
            toast.error(DAILY_ERROR_CODES.AI_SAVE_FAILED.zh, { id: "ai-analysis" });
          },
        });
      } else {
        console.error("AI 分析失敗:", result);
        toast.error(DAILY_ERROR_CODES.AI_ANALYSIS_FAILED.zh, { id: "ai-analysis" });
      }
    } catch (error) {
      console.error("AI 分析過程發生錯誤:", error);
      toast.error(DAILY_ERROR_CODES.AI_SERVICE_ERROR.zh, { id: "ai-analysis" });
    }

    console.log("=== 前端 AI 分析請求結束 ===");
  };

  return {
    // Modal states
    is5RsModalOpen,
    setIs5RsModalOpen,
    viewReflectionModalOpen,
    setViewReflectionModalOpen,

    // Data states
    editingReflectionData,
    setEditingReflectionData,
    selectedReflectionForView,

    // Actions
    handleEdit5Rs,
    handleView5Rs,
    handle5RsSave,
    handle5RsCancel,
    handleRequestAIAnalysis,
  };
}
