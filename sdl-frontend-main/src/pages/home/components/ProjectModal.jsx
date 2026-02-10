import React from 'react';
import Modal from '../../../components/Modal';
import { X } from 'lucide-react';

const ProjectModal = ({
  isOpen,
  onClose,
  isEditMode = false,
  projectName,
  setProjectName,
  projectDescription,
  setProjectDescription,
  selectedMentor,
  setSelectedMentor,
  teachers = [],
  onSubmit,
  isLoading = false
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      opacity={true}
      position={"justify-center items-center"}
    >
      <button
        onClick={handleClose}
        className='absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'
      >
        <X className='w-6 h-6' />
      </button>

      <form onSubmit={handleSubmit} className='flex flex-col p-component-sm'>
        <h3 className='font-bold text-body mb-3'>
          {isEditMode ? "更新活動" : "建立活動"}
        </h3>

        {/* 活動名稱 */}
        <label className='font-bold text-body mb-3'>活動名稱</label>
        <input
          className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
          type="text"
          placeholder="活動名稱..."
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
          disabled={isLoading}
        />

        {/* 活動描述 */}
        <label className='font-bold text-body mb-3'>活動描述</label>
        <textarea
          className="rounded outline-none ring-2 ring-customgreen w-full p-1"
          rows={3}
          placeholder="活動描述..."
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          disabled={isLoading}
        />

        {/* 指導老師選擇 */}
        <div className="mt-4">
          <label className="block text-gray-700 text-body">
            指導老師
            {isEditMode && selectedMentor && (
              <span className="text-body-sm text-gray-500 ml-2">(目前: {selectedMentor})</span>
            )}
          </label>
          <select
            value={selectedMentor}
            onChange={(e) => setSelectedMentor(e.target.value)}
            className="text-body w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-customgreen focus:bg-white focus:outline-none"
            required
            disabled={isLoading}
          >
            {isEditMode ? (
              <>
                <option value={selectedMentor}>
                  {selectedMentor} (保持不變)
                </option>
                {teachers
                  .filter(teacher => teacher.username !== selectedMentor)
                  .map(teacher => (
                    <option key={teacher.id} value={teacher.username}>
                      {teacher.username}
                    </option>
                  ))
                }
              </>
            ) : (
              <>
                <option value="" disabled>- 請選擇指導老師 -</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.username}>
                    {teacher.username}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* 按鈕區域 */}
        <div className='flex justify-end gap-stack-xs mt-4'>
          <button
            type="button"
            data-track
            data-track-action="HOME_PROJECT_MODAL_CANCEL"
            data-track-type="project"
            onClick={handleClose}
            className="flex-1 h-7 mb-2 bg-customgray rounded font-bold text-caption sm:text-body-sm text-black/60"
            disabled={isLoading}
          >
            取消
          </button>
          <button
            type="submit"
            data-track
            data-track-action="HOME_PROJECT_MODAL_SUBMIT"
            data-track-type="project"
            className="flex-1 h-7 mb-2 bg-customgreen rounded font-bold text-caption sm:text-body-sm text-white disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "處理中..." : (isEditMode ? "更新" : "儲存")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectModal;
