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
    }
}, {
    tableName: 'daily_personals', // 👈 加上這行
    timestamps: true // 啟用自動時間戳記
});

module.exports = Daily_personal;
