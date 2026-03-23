import React from "react";
import Modal from "../../../components/Modal";
import { GrFormClose } from "react-icons/gr";
import FiveRsReflectionDisplay from "@/components/FiveRsReflectionDisplay.jsx";

/**
 * Modal component for viewing 5Rs reflection (read-only)
 */
export function FiveRsViewModal({
  open,
  onClose,
  selectedReflection,
  userRole,
}) {
  const isTeacher = userRole === "teacher";

  return (
    <Modal
      open={open}
      onClose={onClose}
      opacity={true}
      position={"justify-center items-center"}
      custom="w-[80vw] max-w-5xl max-h-[88vh] flex flex-col"
      enableScroll={false}
      noPadding={true}
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 固定 header，不隨內容滾動 */}
        <div className="flex justify-between items-center px-component-base py-4 border-b flex-shrink-0">
          <h2 className="text-h2 font-bold text-gray-800">
            {selectedReflection?.title || "5Rs 反思檢視"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            <GrFormClose size={24} />
          </button>
        </div>
        {/* 可滾動內容區 */}
        {selectedReflection && (
          <div className="overflow-y-auto flex-1 p-component-md">
            <FiveRsReflectionDisplay
              content={selectedReflection.content}
              showFeedback={true}
              isTeacher={isTeacher}
              record={selectedReflection}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
