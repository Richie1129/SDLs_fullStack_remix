const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const SubmitChangeLog = sequelize.define('submit_change_log', {
    submitId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'submits',
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
    tableName: 'submit_change_logs'
});

module.exports = SubmitChangeLog; 
