const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const Comment = sequelize.define('comment', {
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  task_title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  task_content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'comments',
  timestamps: true,
});

// Associations are defined after other models are loaded to avoid circular requires
const Task = require('./task');
const User = require('./user');

Comment.belongsTo(Task, { foreignKey: 'taskId' });
Task.hasMany(Comment, { foreignKey: 'taskId' });

Comment.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Comment, { foreignKey: 'userId' });

module.exports = Comment;
