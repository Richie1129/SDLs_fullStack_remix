'use strict';

/**
 * file_uploads：記錄每個 MinIO 檔案的上傳者
 *
 * 背景：看板卡片附件走 POST /api/upload 先進 MinIO，按下儲存後才寫進 tasks.files/images。
 * 在這段空窗，檔案不存在於任何業務表，讀取授權（utils/fileAccess.js）無法判定歸屬，
 * 學生會連自己剛上傳的圖片都預覽不到、也刪不掉。這張表補上「上傳者」這個來源。
 *
 * 零資料風險：只新增一張表，不動既有資料；down 直接 drop。
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('file_uploads', {
      fileName: { type: Sequelize.STRING(255), primaryKey: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('file_uploads', ['userId'], { name: 'file_uploads_userId_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('file_uploads');
  }
};
