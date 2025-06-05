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
}, {
    timestamps: true // 啟用自動時間戳記
});

module.exports = Submit;