const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const NodeChangeLog = sequelize.define('node_change_log', {
    nodeId: {
        type: DataTypes.INTEGER,
        allowNull: true,  // 改為允許為 null
        references: {
            model: 'nodes',
            key: 'id'
        }
    },
    changeType: {
        type: DataTypes.ENUM('create', 'update', 'delete'),
        allowNull: false
    },
    fieldName: {
        type: DataTypes.STRING,
        allowNull: true 
    },
    oldValue: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    newValue: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    changedBy: {
        type: DataTypes.STRING,
        allowNull: false
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'node_change_logs'
});

// 建立模型關聯 - 設定為非必須，以支援節點刪除後的記錄保留
NodeChangeLog.belongsTo(require('./node'), { 
    foreignKey: 'nodeId',
    as: 'Node',
    required: false,  // 明確設定為非必須關聯
    constraints: false  // 不強制外鍵約束，避免級聯刪除
});

module.exports = NodeChangeLog; 
