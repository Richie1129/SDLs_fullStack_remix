import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { GrFormClose } from "react-icons/gr";
import FiveRsReflectionForm from "@/components/FiveRsReflectionForm.jsx";
import AuditHistoryPanel from "@/components/reflection/AuditHistoryPanel.jsx";

/**
 * Modal component for editing 5Rs reflection
 */
export function FiveRsModal({
  open,
  onClose,
  editingReflectionData,
  onSave,
  onCancel,
  isEditing,
  title,
  onTitleChange,
  attachFile,
  onFileChange,
  currentRecord,
  onRemoveAttachment,
  stage,
  onStageChange,
  recommendedStage,
}) {
  const [activeTab, setActiveTab] = useState('edit');

  // Reset tab when opening modal
  useEffect(() => {
    if (open) setActiveTab('edit');
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      opacity={true}
      position={"justify-center items-center"}
      custom="w-[80vw] max-w-5xl max-h-[88vh] flex flex-col"
    >
      <div className="w-full flex flex-col flex-1 overflow-y-auto relative">
        <button
          onClick={onCancel}
          className="absolute top-0 right-0 rounded-lg bg-white hover:bg-slate-200 z-10 p-1"
        >
          <GrFormClose className="w-6 h-6" />
        </button>
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-3 flex-shrink-0 mr-8">
          <button
            data-track
            data-track-action="REFLECTION_5RS_TAB_SWITCH"
            data-track-type="daily_personal"
            data-track-meta-tab="edit"
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 font-medium text-body-sm ${activeTab === 'edit' ? 'text-customgreen border-b-2 border-customgreen' : 'text-gray-500 hover:text-gray-700'}`}
          >
            編輯 5Rs 反思
          </button>
          <button
            data-track
            data-track-action="REFLECTION_5RS_TAB_SWITCH"
            data-track-type="daily_personal"
            data-track-meta-tab="history"
            onClick={() => setActiveTab('history')}
          >
            變更歷史
          </button>
        </div>
        <div className={`flex-1 ${activeTab === 'edit' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {activeTab === 'edit' && (
            <FiveRsReflectionForm
              initialData={editingReflectionData}
              onSave={onSave}
              onCancel={onCancel}
              isEditing={isEditing}
              title={title}
              onTitleChange={onTitleChange}
              attachFile={attachFile}
              onFileChange={onFileChange}
              existingRecord={currentRecord}
              onRemoveAttachment={onRemoveAttachment}
              stage={stage}
              onStageChange={onStageChange}
              recommendedStage={recommendedStage}
            />
          )}
          {activeTab === 'history' && isEditing && currentRecord && (
            <AuditHistoryPanel targetType="daily_personal" targetId={currentRecord.id} defaultOpen={true} />
          )}
        </div>
      </div>
    </Modal>
  );
}
