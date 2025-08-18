const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const ProjectComment = sequelize.define('project_comment', {
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // denormalized author username (optional)
  username: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // denormalized reply target snapshot
  reply_to_username: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reply_to_content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'project_comments',
  timestamps: true,
});

const Project = require('./project');
const User = require('./user');

ProjectComment.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(ProjectComment, { foreignKey: 'projectId' });

ProjectComment.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(ProjectComment, { foreignKey: 'userId' });

module.exports = ProjectComment;
