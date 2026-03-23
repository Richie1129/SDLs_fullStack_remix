import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { socket } from "../../utils/socket";
import { getCurrentUsername } from '../../utils/userUtils';
import { getCurrentUserId, getCurrentUserRole, getStageInfo } from '../../utils/authUtils';
import { is5RsFormat } from "@/utils/5RsUtils.js";
import { DAILY_ERROR_CODES } from '@/constants/dailyErrorCodes.js';

// Hooks
import { usePersonalDaily } from "./hooks/usePersonalDaily";
import { useTeamDaily } from "./hooks/useTeamDaily";
import { use5RsReflection } from "./hooks/use5RsReflection";

// Components
import { ReflectionLayout } from "./components/ReflectionLayout";
import { PersonalDailyModal } from "./components/PersonalDailyModal";
import { TeamDailyModal } from "./components/TeamDailyModal";
import { FiveRsModal } from "./components/FiveRsModal";
import { FiveRsViewModal } from "./components/FiveRsViewModal";

/**
 * Main Reflection component (refactored)
 * Orchestrates personal daily, team daily, and 5Rs reflection functionality
 *
 * This is a zero-breaking-change refactor of the original 1408-line Reflection.jsx
 */
export default function ReflectionRefactored() {
  const { projectId } = useParams();
  const userRole = getCurrentUserRole();

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachFile, setAttachFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [dailyData, setDailyData] = useState({});
  const [stage, setStage] = useState("");      // 個人日誌選擇的階段
  const [teamStage, setTeamStage] = useState(""); // 小組日誌選擇的階段
  
  // 智能推薦：從專案進度獲取當前階段
  const { currentStage, currentSubStage } = getStageInfo();
  const recommendedStage = currentStage && currentSubStage 
    ? `${currentStage}-${currentSubStage}` 
    : null;

  // Modal states
  const [personalDailyModalOpen, setPersonalDailyModalOpen] = useState(false);
  const [teamDailyModalOpen, setTeamDailyModalOpen] = useState(false);

  // Custom hooks
  const personalDaily = usePersonalDaily(projectId);
  const teamDaily = useTeamDaily(projectId);
  const fiveRs = use5RsReflection(projectId, personalDaily.updateMutation);

  // Socket connection
  useEffect(() => {
    socket.connect();
  }, [socket]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setDailyData((prev) => ({
      ...prev,
      [name]: value,
      userId: getCurrentUserId(),
    }));
    if (name === "title") setTitle(value);
    if (name === "content") setContent(value);
  };

  const handleAddFileChange = (e) => {
    setAttachFile(e.target.files);
  };

  // Personal Daily handlers
  const handleCreateOrUpdatePersonalDaily = (e) => {
    e.preventDefault();

    if (editingId) {
      handleSaveEdit();
      return;
    }

    if (title.trim() !== "" && content.trim() !== "") {
      const formData = new FormData();
      formData.append("projectId", projectId);      if (stage) {
        formData.append("stage", stage);
      }      if (attachFile) {
        for (let i = 0; i < attachFile.length; i++) {
          formData.append("attachFile", attachFile[i]);
        }
      }
      for (let key in dailyData) {
        formData.append(key, dailyData[key]);
      }
      console.log("創建日誌:", ...formData);
      personalDaily.handleCreate(formData);
      setPersonalDailyModalOpen(false);
    } else {
      toast.error(DAILY_ERROR_CODES.EMPTY_TITLE_AND_CONTENT.zh);
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) {
      toast.error(DAILY_ERROR_CODES.NO_DAILY_SELECTED.zh);
      return;
    }

    const formData = new FormData();
    formData.append("id", Number(editingId));
    formData.append("title", title);
    formData.append("content", content);
    if (stage) {
      formData.append("stage", stage);
    }

    if (attachFile && attachFile.length > 0) {
      for (let i = 0; i < attachFile.length; i++) {
        formData.append("attachFile", attachFile[i]);
      }
    }

    console.log("更新日誌:", formData);
    personalDaily.handleUpdate(formData, {
      onSuccess: () => {
        setEditingId(null);
        setPersonalDailyModalOpen(false);
        setAttachFile(null);
        toast.success("日誌更新成功");
      },
      onError: (error) => {
        console.log('❌ 儲存編輯失敗:', error);
        toast.error("儲存編輯失敗");
      },
    });
  };

  const handleEditClick = (item) => {
    console.log("編輯的日誌:", item);
    setTitle(item.title);
    setContent(item.content);
    setAttachFile(null);
    setEditingId(item.id);
    setStage(item.stage || "");
    setPersonalDailyModalOpen(true);
  };

  const handleViewClick = (item) => {
    console.log("查看日誌:", item);
    setTitle(item.title);
    setContent(item.content);
    setAttachFile(null);
    setEditingId(item.id);
    setPersonalDailyModalOpen(true);
  };

  const handlePersonalLogEdit = (item) => {
    const isTeacher = userRole === "teacher";

    if (isTeacher) {
      if (is5RsFormat(item.content)) {
        fiveRs.handleView5Rs(item);
      } else {
        handleViewClick(item);
      }
    } else {
      if (is5RsFormat(item.content)) {
        fiveRs.handleEdit5Rs(item, setTitle, setEditingId);
      } else {
        handleEditClick(item);
      }
    }
  };

  // Team Daily handlers
  const handleCreateOrUpdateTeamDaily = (e) => {
    e.preventDefault();

    if (editingId) {
      handleSaveTeamEdit();
      return;
    }

    if (title.trim() !== "" && content.trim() !== "") {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("creator", getCurrentUsername());
      if (teamStage) {
        formData.append("stage", teamStage);
      }
      if (attachFile) {
        for (let i = 0; i < attachFile.length; i++) {
          formData.append("attachFile", attachFile[i]);
        }
      }
      for (let key in dailyData) {
        formData.append(key, dailyData[key]);
      }
      teamDaily.handleCreate(formData);
      setTeamDailyModalOpen(false);
    } else {
      toast.error(DAILY_ERROR_CODES.EMPTY_TITLE_AND_CONTENT.zh);
    }
  };

  const handleSaveTeamEdit = () => {
    if (!editingId) {
      toast.error(DAILY_ERROR_CODES.NO_DAILY_SELECTED.zh);
      return;
    }

    const formData = new FormData();
    formData.append("id", Number(editingId));
    formData.append("title", title);
    formData.append("content", content);
    if (teamStage) {
      formData.append("stage", teamStage);
    }

    if (attachFile && attachFile.length > 0) {
      for (let i = 0; i < attachFile.length; i++) {
        formData.append("attachFile", attachFile[i]);
      }
    }

    console.log("更新小組日誌:", formData);
    teamDaily.handleUpdate(formData, {
      onSuccess: () => {
        setEditingId(null);
        setTeamDailyModalOpen(false);
        setAttachFile(null);
        setTeamStage("");
        toast.success("小組日誌更新成功");
      },
      onError: (error) => {
        console.log('❌ 小組日誌更新失敗:', error);
        toast.error("小組日誌更新失敗");
      },
    });
  };

  const handleEditTeamClick = (item) => {
    if (!item) {
      console.error("選擇的日誌為 undefined，請確認 teamDaily 是否有資料");
      return;
    }

    console.log("編輯的小組日誌:", item);
    setTitle(item.title || "");
    setContent(item.content || "");
    setAttachFile(null);
    setEditingId(item.id);
    setTeamStage(item.stage || "");
    setTeamDailyModalOpen(true);
  };

  const handleTeamLogEdit = (item) => {
    const isTeacher = userRole === "teacher";

    if (isTeacher) {
      setTitle(item.title || "");
      setContent(item.content || "");
      setAttachFile(null);
      setEditingId(item.id);
      setTeamDailyModalOpen(true);
    } else {
      handleEditTeamClick(item);
    }
  };

  // Modal open handlers
  const handleOpenPersonalModal = () => {
    setTitle("");
    setContent("");
    setAttachFile(null);
    setEditingId(null);
    setPersonalDailyModalOpen(true);
  };

  const handleOpen5RsModal = () => {
    setTitle("");
    fiveRs.setEditingReflectionData({});
    setEditingId(null);
    fiveRs.setIs5RsModalOpen(true);
  };

  const handleOpenTeamModal = () => {
    setTitle("");
    setContent("");
    setAttachFile(null);
    setTeamStage("");
    setTeamDailyModalOpen(true);
    setDailyData((prev) => ({
      ...prev,
      type: "discuss",
    }));
  };

  // Get current editing records
  const currentEditingPersonal = editingId
    ? personalDaily.personalDaily.find((d) => d.id === editingId)
    : null;
  const currentEditingTeam = editingId
    ? teamDaily.teamDaily.find((d) => d.id === editingId)
    : null;

  return (
    <>
      <ReflectionLayout
        // Personal Daily props
        personalDaily={personalDaily.personalDaily}
        personalIsLoading={personalDaily.isLoading}
        personalIsError={personalDaily.isError}
        personalError={personalDaily.error}
        showPersonalEmptyMessage={personalDaily.showEmptyMessage}
        onPersonalEdit={handlePersonalLogEdit}
        onPersonalDelete={personalDaily.handleDelete}
        onView5Rs={fiveRs.handleView5Rs}
        onRequestAIAnalysis={fiveRs.handleRequestAIAnalysis}
        // Team Daily props
        teamDaily={teamDaily.teamDaily}
        teamIsLoading={teamDaily.isLoading}
        teamIsError={teamDaily.isError}
        teamError={teamDaily.error}
        showTeamEmptyMessage={teamDaily.showEmptyMessage}
        onTeamEdit={handleTeamLogEdit}
        onTeamDelete={teamDaily.handleDelete}
        // Common props
        userRole={userRole}
        onOpenPersonalModal={handleOpenPersonalModal}
        onOpen5RsModal={handleOpen5RsModal}
        onOpenTeamModal={handleOpenTeamModal}
      />

      {/* Personal Daily Modal */}
      <PersonalDailyModal
        open={personalDailyModalOpen}
        onClose={() => {
          setPersonalDailyModalOpen(false);
          setTitle("");
          setContent("");
          setEditingId(null);
          setAttachFile(null);
          setStage("");
        }}
        title={title}
        content={content}
        onChange={handleChange}
        onFileChange={handleAddFileChange}
        onSubmit={(e) => {
          editingId ? handleSaveEdit() : handleCreateOrUpdatePersonalDaily(e);
        }}
        editingId={editingId}
        currentRecord={currentEditingPersonal}
        onRemoveAttachment={() => personalDaily.handleRemoveAttachment(editingId)}
        userRole={userRole}
        stage={stage}
        onStageChange={setStage}
        recommendedStage={recommendedStage}
      />

      {/* Team Daily Modal */}
      <TeamDailyModal
        open={teamDailyModalOpen}
        onClose={() => {
          setTeamDailyModalOpen(false);
          setTitle("");
          setContent("");
          setEditingId(null);
          setAttachFile(null);
          setTeamStage("");
        }}
        title={title}
        content={content}
        onChange={handleChange}
        onFileChange={handleAddFileChange}
        onSubmit={(e) => {
          editingId ? handleSaveTeamEdit() : handleCreateOrUpdateTeamDaily(e);
        }}
        editingId={editingId}
        currentRecord={currentEditingTeam}
        onRemoveAttachment={() => teamDaily.handleRemoveAttachment(editingId)}
        userRole={userRole}
        stage={teamStage}
        onStageChange={setTeamStage}
      />

      {/* 5Rs Edit Modal */}
      <FiveRsModal
        open={fiveRs.is5RsModalOpen}
        onClose={() => fiveRs.handle5RsCancel(setEditingId, setTitle, setAttachFile)}
        editingReflectionData={fiveRs.editingReflectionData}
        onSave={(data) => fiveRs.handle5RsSave(data, editingId, setEditingId, setAttachFile, personalDaily.createMutation)}
        onCancel={() => fiveRs.handle5RsCancel(setEditingId, setTitle, setAttachFile)}
        isEditing={!!editingId}
        title={title}
        onTitleChange={setTitle}
        attachFile={attachFile}
        onFileChange={handleAddFileChange}
        currentRecord={currentEditingPersonal}
        onRemoveAttachment={() => personalDaily.handleRemoveAttachment(editingId)}
        stage={stage}
        onStageChange={setStage}
        recommendedStage={recommendedStage}
      />

      {/* 5Rs View Modal */}
      <FiveRsViewModal
        open={fiveRs.viewReflectionModalOpen}
        onClose={() => fiveRs.setViewReflectionModalOpen(false)}
        selectedReflection={fiveRs.selectedReflectionForView}
        userRole={userRole}
      />

      <Toaster />
    </>
  );
}
