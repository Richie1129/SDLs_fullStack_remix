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
    }
}, {
    tableName: 'daily_teams', // 👈 加上這行
    timestamps: true // 啟用自動時間戳記
});

module.exports = Daily_team;