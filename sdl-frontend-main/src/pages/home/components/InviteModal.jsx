import React, { useState } from 'react';
import Modal from '../../../components/Modal';
import { X } from 'lucide-react';

const InviteModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [referralCode, setReferralCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (referralCode.trim()) {
      onSubmit(referralCode.trim());
      setReferralCode(''); // 清空輸入
    }
  };

  const handleClose = () => {
    setReferralCode('');
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

      <form onSubmit={handleSubmit} className='flex flex-col p-3'>
        <h3 className='font-bold text-base mb-3'>活動邀請碼</h3>

        <input
          className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
          type="text"
          minLength="6"
          placeholder="輸入活動邀請碼..."
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          required
          disabled={isLoading}
        />

        <div className='flex justify-end'>
          <button
            type="submit"
            className="w-1/4 h-7 mb-2 bg-customgreen rounded font-bold text-xs sm:text-sm text-white disabled:opacity-50"
            disabled={isLoading || !referralCode.trim()}
          >
            {isLoading ? "加入中..." : "加入"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteModal;
