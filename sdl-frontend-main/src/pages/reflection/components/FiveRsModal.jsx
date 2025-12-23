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
      custom="w-11/12 md:w-3/4 lg:w-[60vw] max-w-none"
    >
      <div className="w-full h-[80vh] flex flex-col relative">
        <button
          onClick={onCancel}
          className="absolute top-0 right-0 rounded-lg bg-white hover:bg-slate-200 z-10 p-1"
        >
          <GrFormClose className="w-6 h-6" />
        </button>
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-3 flex-shrink-0 mr-8">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'edit' ? 'text-customgreen border-b-2 border-customgreen' : 'text-gray-500 hover:text-gray-700'}`}
          >
            編輯 5Rs 反思
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'history' ? 'text-customgreen border-b-2 border-customgreen' : 'text-gray-500 hover:text-gray-700'}`}
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
