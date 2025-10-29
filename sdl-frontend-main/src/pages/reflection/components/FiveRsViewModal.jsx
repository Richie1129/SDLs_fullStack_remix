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
      custom="w-[60vw] max-w-none"
    >
      <div className="max-w-6xl max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {selectedReflection?.title || "5Rs 反思檢視"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <GrFormClose size={24} />
          </button>
        </div>
        {selectedReflection && (
          <FiveRsReflectionDisplay
            content={selectedReflection.content}
            showFeedback={true}
            isTeacher={isTeacher}
            record={selectedReflection}
          />
        )}
      </div>
    </Modal>
  );
}
