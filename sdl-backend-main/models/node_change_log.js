const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const NodeChangeLog = sequelize.define('node_change_log', {
    nodeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
        allowNull: true // null表示整個節點的變更（如創建、刪除）
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
    timestamps: true
});

module.exports = NodeChangeLog; 