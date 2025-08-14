const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const Comment = require('./comment');

const CommentAttachment = sequelize.define('comment_attachment', {
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
  tableName: 'comment_attachments',
  timestamps: true,
});

CommentAttachment.belongsTo(Comment, { foreignKey: 'commentId' });
Comment.hasMany(CommentAttachment, { foreignKey: 'commentId', as: 'attachments' });

module.exports = CommentAttachment;
