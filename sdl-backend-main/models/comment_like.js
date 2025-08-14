const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const Comment = require('./comment');
const User = require('./user');

const CommentLike = sequelize.define('comment_like', {
  username: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  comment_content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'comment_likes',
  timestamps: true,
});

CommentLike.belongsTo(Comment, { foreignKey: 'commentId' });
Comment.hasMany(CommentLike, { foreignKey: 'commentId', as: 'likes' });

CommentLike.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(CommentLike, { foreignKey: 'userId' });

module.exports = CommentLike;
