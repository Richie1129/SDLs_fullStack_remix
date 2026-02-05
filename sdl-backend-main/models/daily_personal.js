const { DataTypes} = require('sequelize');
const sequelize = require('../util/database');

const Daily_personal = sequelize.define('daily_personal', {
    title:{
        type: DataTypes.TEXT,
        allowNull:false,
    },
    content:{
        type: DataTypes.TEXT,
        allowNull:false,
    },
    stage: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: '關聯階段 (例如: 1-1, 2-2, 空值表示通用反思)'
    },
    fileData:{
        type: DataTypes.BLOB,
        allowNull:true,
    },
    filename:{
        type: DataTypes.TEXT,
        allowNull:true,
    },
    fileName: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'MinIO 檔案名稱'
    },
    originalName: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '原始檔案名稱'
    },
    fileUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'MinIO 檔案 URL'
    },
    mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '檔案 MIME 類型'
    },
    fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '檔案大小 (bytes)'
    }
}, {
    tableName: 'daily_personals',
    timestamps: true,
    indexes: [
        { fields: ['projectId'] },               // 專案查詢
        { fields: ['userId'] },                  // 用戶查詢
        { fields: ['projectId', 'userId'] },     // 複合索引最重要
        { fields: ['createdAt'] }                // 時間排序
    ]
});

module.exports = Daily_personal;
