const DataTypes = require('sequelize');
const sequelize = require('../util/database');

const ColumnChangeLog = sequelize.define('column_change_log', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    columnId: {
        type: DataTypes.INTEGER,
        allowNull: true, // 刪除時 column 可能已不存在
        references: {
            model: 'columns',
            key: 'id'
        },
        comment: '列表 ID'
    },
    changeType: {
        type: DataTypes.ENUM('create', 'update', 'delete', 'reorder'),
        allowNull: false,
        comment: '變更類型: 創建、更新、刪除、重新排序'
    },
    fieldName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '變更的欄位名稱 (例如: name, position)'
    },
    oldValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '舊值'
    },
    newValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '新值'
    },
    changedBy: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '變更者用戶名'
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '所屬專案 ID'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '變更描述'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'column_change_logs',
    timestamps: true,
    indexes: [
        {
            fields: ['projectId', 'createdAt']
        },
        {
            fields: ['columnId']
        },
        {
            fields: ['changeType']
        }
    ]
});

// 建立模型關聯
ColumnChangeLog.belongsTo(require('./column'), { 
    foreignKey: 'columnId',
    as: 'Column',
    onDelete: 'SET NULL'
});

module.exports = ColumnChangeLog;