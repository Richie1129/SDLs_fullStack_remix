const {DataTypes} = require('sequelize');
const sequelize = require('../util/database');
const Tag = require('./tag');

const Task = sequelize.define('task', {
    title: {
        type: DataTypes.TEXT,
        allowNull:false
    }, 
    content: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    labels: {
        type: DataTypes.ARRAY(DataTypes.JSONB),
        allowNull:true
    }, 
    owner:{
        type: DataTypes.TEXT,
        allowNull:true
    }, 
    assignees: {
        type: DataTypes.ARRAY(DataTypes.JSONB),
        allowNull:true
    },
    image: {
        type: DataTypes.BLOB,
        allowNull: true,
    },
    images: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
        allowNull: true,
    },
    files: {
        type: DataTypes.ARRAY(DataTypes.JSONB),
        defaultValue: [],
        allowNull: true,
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['columnId'] },  // Column 查詢
        { fields: ['owner'] },     // 擁有者篩選
        { fields: ['createdAt'] }  // 時間排序
    ]
});

Task.belongsToMany(Tag, { through: 'card_tags' });
Tag.belongsToMany(Task, { through: 'card_tags' });

// 建立與 TaskChangeLog 的關聯
const TaskChangeLog = require('./task_change_log');
Task.hasMany(TaskChangeLog, { foreignKey: 'taskId', as: 'changeLogs' });
TaskChangeLog.belongsTo(Task, { foreignKey: 'taskId' });

module.exports = Task;
