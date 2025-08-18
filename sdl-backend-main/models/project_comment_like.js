const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const ProjectComment = require('./project_comment');
const User = require('./user');

const ProjectCommentLike = sequelize.define('project_comment_like', {
}, {
  tableName: 'project_comment_likes',
  timestamps: true,
});

ProjectCommentLike.belongsTo(ProjectComment, { foreignKey: 'commentId' });
ProjectComment.hasMany(ProjectCommentLike, { foreignKey: 'commentId', as: 'likes' });

ProjectCommentLike.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(ProjectCommentLike, { foreignKey: 'userId' });

module.exports = ProjectCommentLike;

