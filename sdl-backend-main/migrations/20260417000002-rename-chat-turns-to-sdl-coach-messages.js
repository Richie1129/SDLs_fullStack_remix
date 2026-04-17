'use strict';

// Rename chat_turns → sdl_coach_messages
// 目的：表名對齊實際用途（僅 SDL Coach 寫入）。欄位不動，URL 不變。
// 安全性：PG ALTER TABLE RENAME 是原子操作，索引會自動跟著 table 綁定，
//   但 index 本身的名字仍留原名，本 migration 一併改成新名方便日後查找。

module.exports = {
    up: async (queryInterface) => {
        await queryInterface.renameTable('chat_turns', 'sdl_coach_messages');

        // Rename the composite index for session query
        try {
            await queryInterface.sequelize.query(
                'ALTER INDEX idx_chat_turns_project_session RENAME TO idx_sdl_coach_messages_project_session'
            );
        } catch (err) {
            // 若 index 不存在（極少數 dev 環境漏跑舊 migration），吞掉
            console.warn('[migration] rename index skipped:', err.message);
        }

        // 主鍵索引名 chat_turns_pkey → 保留原名也不影響功能，但統一一下
        try {
            await queryInterface.sequelize.query(
                'ALTER INDEX chat_turns_pkey RENAME TO sdl_coach_messages_pkey'
            );
        } catch (err) {
            console.warn('[migration] rename pkey index skipped:', err.message);
        }

        // FK constraint 名稱 chat_turns_projectId_fkey / chat_turns_userId_fkey 也同步
        try {
            await queryInterface.sequelize.query(
                'ALTER TABLE sdl_coach_messages RENAME CONSTRAINT "chat_turns_projectId_fkey" TO "sdl_coach_messages_projectId_fkey"'
            );
        } catch (err) {
            console.warn('[migration] rename projectId FK skipped:', err.message);
        }
        try {
            await queryInterface.sequelize.query(
                'ALTER TABLE sdl_coach_messages RENAME CONSTRAINT "chat_turns_userId_fkey" TO "sdl_coach_messages_userId_fkey"'
            );
        } catch (err) {
            console.warn('[migration] rename userId FK skipped:', err.message);
        }

        // sequence: chat_turns_id_seq → sdl_coach_messages_id_seq
        try {
            await queryInterface.sequelize.query(
                'ALTER SEQUENCE chat_turns_id_seq RENAME TO sdl_coach_messages_id_seq'
            );
        } catch (err) {
            console.warn('[migration] rename sequence skipped:', err.message);
        }
    },

    down: async (queryInterface) => {
        // 反向全部還原
        try {
            await queryInterface.sequelize.query(
                'ALTER SEQUENCE sdl_coach_messages_id_seq RENAME TO chat_turns_id_seq'
            );
        } catch (err) {
            console.warn('[migration down] rename sequence skipped:', err.message);
        }
        try {
            await queryInterface.sequelize.query(
                'ALTER TABLE sdl_coach_messages RENAME CONSTRAINT "sdl_coach_messages_userId_fkey" TO "chat_turns_userId_fkey"'
            );
        } catch (err) {
            console.warn('[migration down] rename userId FK skipped:', err.message);
        }
        try {
            await queryInterface.sequelize.query(
                'ALTER TABLE sdl_coach_messages RENAME CONSTRAINT "sdl_coach_messages_projectId_fkey" TO "chat_turns_projectId_fkey"'
            );
        } catch (err) {
            console.warn('[migration down] rename projectId FK skipped:', err.message);
        }
        try {
            await queryInterface.sequelize.query(
                'ALTER INDEX sdl_coach_messages_pkey RENAME TO chat_turns_pkey'
            );
        } catch (err) {
            console.warn('[migration down] rename pkey index skipped:', err.message);
        }
        try {
            await queryInterface.sequelize.query(
                'ALTER INDEX idx_sdl_coach_messages_project_session RENAME TO idx_chat_turns_project_session'
            );
        } catch (err) {
            console.warn('[migration down] rename session index skipped:', err.message);
        }

        await queryInterface.renameTable('sdl_coach_messages', 'chat_turns');
    },
};
