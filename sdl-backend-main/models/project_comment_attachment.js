const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const ProjectComment = require('./project_comment');

const ProjectCommentAttachment = sequelize.define('project_comment_attachment', {
  fileName: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  originalName: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  fileUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  comment_content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'project_comment_attachments',
  timestamps: true,
});

ProjectCommentAttachment.belongsTo(ProjectComment, { foreignKey: 'commentId' });
ProjectComment.hasMany(ProjectCommentAttachment, { foreignKey: 'commentId', as: 'attachments' });

module.exports = ProjectCommentAttachment;

