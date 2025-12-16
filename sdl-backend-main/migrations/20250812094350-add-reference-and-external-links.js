'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 新增 reference_data 欄位（儲存 RAGFlow 參考文獻）
    await queryInterface.addColumn('rag_messages', 'reference_data', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: '儲存 RAGFlow 參考文獻資料（JSON 格式）'
    });

    // 新增 external_links 欄位（儲存 Gemini Grounding 外部連結）
    await queryInterface.addColumn('rag_messages', 'external_links', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: '儲存 Gemini Grounding 外部連結資料（JSON 陣列）'
    });

    console.log('✅ 成功新增 reference_data 和 external_links 欄位到 rag_messages 表');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('rag_messages', 'reference_data');
    await queryInterface.removeColumn('rag_messages', 'external_links');
    console.log('✅ 成功移除 reference_data 和 external_links 欄位');
  }
};
