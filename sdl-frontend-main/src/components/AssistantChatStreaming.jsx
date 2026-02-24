/**
 * AssistantChatStreaming - 專案助理聊天介面
 *
 * 此文件已重構為模組化結構，類似 DraggableImage 的組織方式。
 * 舊版本已備份至 AssistantChatStreaming.jsx.old
 *
 * 新結構：
 * - AssistantChatStreaming/
 *   ├── index.jsx           (主組裝器，使用 hooks)
 *   └── components/
 *       ├── ChatWindow.jsx  (視窗容器)
 *       ├── ChatContent.jsx (消息顯示)
 *       ├── ChatInput.jsx   (輸入框)
 *       └── ChatSidebar.jsx (對話列表)
 */
export { default } from './AssistantChatStreaming/index';
