const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const TaskChangeLog = sequelize.define('task_change_log', {
    taskId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tasks',
            key: 'id'
        }
    },
    changeType: {
        type: DataTypes.ENUM('create', 'update', 'move', 'delete'),
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
    tableName: 'task_change_logs'
});

module.exports = TaskChangeLog; 
