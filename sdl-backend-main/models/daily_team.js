const { DataTypes} = require('sequelize');
const sequelize = require('../util/database');

const Daily_team = sequelize.define('daily_team', {
    
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
    creator:{
        type: DataTypes.TEXT,
        allowNull:false,
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
    tableName: 'daily_teams', // 👈 加上這行
    timestamps: true // 啟用自動時間戳記
});

module.exports = Daily_team;