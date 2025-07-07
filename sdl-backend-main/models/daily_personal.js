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
    timestamps: true
});

module.exports = Daily_personal;
