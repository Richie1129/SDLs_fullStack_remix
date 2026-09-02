import React, { lazy, Suspense, useEffect, useState } from 'react';
import Modal from '../Modal';
import LazyFallback from '../LazyFallback';

/**
 * AITaskAssistantModal - AI 任務助手 Modal（lazy 外殼）
 *
 * 實作本體在 ./AITaskAssistantModalContent（含歷史清單／詳情）改為動態載入：
 * 看板每張卡片都會渲染這個元件，但學生只有按下「AI 助手」才會用到，
 * 所以第一次 open 才下載該 chunk。開啟過後保持掛載，維持原本
 * 「關閉再開啟仍保留步驟與建議」的行為，也保留 Modal 的關閉動畫。
 *
 * 對外 import 路徑與 props（open / onClose / cardData / projectId）不變。
 */
const AITaskAssistantModalContent = lazy(() => import('./AITaskAssistantModalContent'));

const AITaskAssistantModal = (props) => {
  const { open, onClose } = props;
  const [hasOpened, setHasOpened] = useState(Boolean(open));

  useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  if (!hasOpened) return null;

  return (
    <Suspense
      fallback={(
        <Modal open={open} onClose={onClose}>
          <LazyFallback label="載入 AI 助手…" />
        </Modal>
      )}
    >
      <AITaskAssistantModalContent {...props} />
    </Suspense>
  );
};

export default AITaskAssistantModal;
