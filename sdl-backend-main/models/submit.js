const { DataTypes} = require('sequelize');
const sequelize = require('../util/database');

const Submit = sequelize.define('submit', {
    stage: {
        type: DataTypes.TEXT,
        allowNull:false,
    },
    content:{
        type: DataTypes.JSON,
        allowNull:false,
    },
    fileData:{
        type: DataTypes.BLOB,
        allowNull:true,
    },
    fileName:{
        type: DataTypes.TEXT,
        allowNull:true,
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
    timestamps: true // 啟用自動時間戳記
});

module.exports = Submit;