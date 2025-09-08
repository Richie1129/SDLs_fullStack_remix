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

// 建立模型關聯
NodeChangeLog.belongsTo(require('./node'), { 
    foreignKey: 'nodeId',
    as: 'Node',
    required: false
});

module.exports = NodeChangeLog; 
