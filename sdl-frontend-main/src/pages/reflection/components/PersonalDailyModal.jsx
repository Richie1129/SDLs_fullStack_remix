import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { GrFormClose, GrCircleQuestion } from "react-icons/gr";
import { motion } from "framer-motion";
import { is5RsFormat } from "@/utils/5RsUtils.js";
import { DailyFormFields } from "./DailyFormFields";
import AuditHistoryPanel from "@/components/reflection/AuditHistoryPanel.jsx";
import AIAnalysisHistoryPanel from "@/components/reflection/AIAnalysisHistoryPanel.jsx";

// Animation configuration
const fadeInOut = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

/**
 * Modal component for personal daily log (traditional format only)
 * For 5Rs format, use FiveRsModal instead
 */
export function PersonalDailyModal({
  open,
  onClose,
  title,
  content,
  onChange,
  onFileChange,
  onSubmit,
  editingId,
  currentRecord,
  onRemoveAttachment,
  userRole,
}) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');

  const isTeacher = userRole === "teacher";
  const isCurrent5Rs = currentRecord ? is5RsFormat(currentRecord.content) : false;

  // Reset tab when opening modal
  useEffect(() => {
    if (open) setActiveTab('edit');
  }, [open]);

  const toggleTooltip = () => setIsTooltipVisible(!isTooltipVisible);
  const closeTooltip = () => setIsTooltipVisible(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      opacity={true}
      position={"justify-center items-center"}
      custom="w-[80vw] max-w-5xl"
    >
      <button
        onClick={onClose}
        className="absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200"
      >
        <GrFormClose className="w-6 h-6" />
      </button>
      <div className="flex flex-col px-2 sm:px-4 lg:px-6 py-2 sm:py-4 min-h-[60vh]">
        <h3 className="font-bold text-body sm:text-body-lg mb-3 text-center">
          {isTeacher ? "查看個人反思日誌" : "個人反思日誌"}
        </h3>
        <div className="flex items-center mb-3">
          <p className="font-bold text-body-sm sm:text-body">日誌內容</p>
          <button onClick={toggleTooltip} className="ml-2 p-1">
            <GrCircleQuestion className="w-4 h-4 text-[#5BA491] hover:text-[#5BA491]/60" />
          </button>
        </div>
        {isTooltipVisible && (
          <motion.div
            className="absolute z-10 bg-white p-component-md-lg rounded shadow-lg text-body-sm"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={fadeInOut}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <button onClick={closeTooltip} className="absolute top-1 right-1">
              <GrFormClose className="w-4 h-4" />
            </button>
            <p className=" font-bold text-body ">日誌內容可以撰寫以下項目:</p>
            <ul>
              <li className="  text-body-sm pt-2">1.最近完成的進度內容。</li>
              <li className="  text-body-sm ">2.完成的心得反思。</li>
              <li className="  text-body-sm ">3.下次的預計完成的進度內容。</li>
              <li className="  text-body-sm ">4.是否遇到新的問題。</li>
            </ul>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 font-medium text-body-sm ${activeTab === 'edit' ? 'text-customgreen border-b-2 border-customgreen' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {isTeacher ? "查看日誌" : "編輯日誌"}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium text-body-sm ${activeTab === 'history' ? 'text-customgreen border-b-2 border-customgreen' : 'text-gray-500 hover:text-gray-700'}`}
          >
            變更歷史
          </button>
          {isCurrent5Rs && (
            <button
              onClick={() => setActiveTab('aiHistory')}
              className={`px-4 py-2 font-medium text-body-sm ${activeTab === 'aiHistory' ? 'text-customgreen border-b-2 border-customgreen' : 'text-gray-500 hover:text-gray-700'}`}
            >
              AI 分析歷史
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'edit' && (
          <>
            <DailyFormFields
              title={title}
              content={content}
              onChange={onChange}
              onFileChange={onFileChange}
              disabled={isTeacher}
              currentRecord={currentRecord}
              editingId={editingId}
              onRemoveAttachment={onRemoveAttachment}
              userRole={userRole}
            />
            <div className="flex justify-end m-2">
              <button
                onClick={onClose}
                className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-caption sm:text-body-sm text-black/60 mr-2"
              >
                {isTeacher ? "關閉" : "取消"}
              </button>
              {!isTeacher && (
                <button
                  onClick={onSubmit}
                  type="submit"
                  className="mx-auto w-full h-7 mb-2 bg-[#5BA491] rounded font-bold text-caption sm:text-body-sm text-white"
                >
                  {editingId ? "更新" : "儲存"}
                </button>
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && editingId && (
          isCurrent5Rs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-stack-sm">
              <div>
                <h4 className="text-body-sm font-medium text-gray-700 mb-2">變更歷史</h4>
                <AuditHistoryPanel targetType="daily_personal" targetId={editingId} defaultOpen={true} />
              </div>
              <div>
                <h4 className="text-body-sm font-medium text-gray-700 mb-2">AI 分析歷史</h4>
                <AIAnalysisHistoryPanel targetId={editingId} title={title || currentRecord?.title} />
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-body-sm font-medium text-gray-700 mb-2">變更歷史</h4>
              <AuditHistoryPanel targetType="daily_personal" targetId={editingId} defaultOpen={true} />
            </div>
          )
        )}

        {activeTab === 'aiHistory' && editingId && isCurrent5Rs && (
          <AIAnalysisHistoryPanel targetId={editingId} title={title || currentRecord?.title} />
        )}
      </div>
    </Modal>
  );
}
