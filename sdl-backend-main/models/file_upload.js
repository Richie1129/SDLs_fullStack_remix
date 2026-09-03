const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

/**
 * MinIO 檔案的上傳者紀錄（file_uploads）
 *
 * 用途：檔案在寫進業務表（tasks / submits / 日誌 / 評論附件）之前，讀取授權需要知道它是誰上傳的。
 * 只在 POST /api/upload 寫入、檔案刪除時清掉；不做任何其他業務用途。
 */
const FileUpload = sequelize.define('file_upload', {
    fileName: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'file_uploads',
    timestamps: false
});

module.exports = FileUpload;
