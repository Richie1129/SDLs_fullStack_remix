// models/announcement.js
const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const Announcement = sequelize.define('Announcement', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'announcements'
});

// 儲存前打印數據
Announcement.beforeCreate((announcement) => {
    console.log("即將儲存的公告數據:", announcement);
});


module.exports = Announcement;
