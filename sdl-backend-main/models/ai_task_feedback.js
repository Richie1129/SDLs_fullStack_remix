const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const AITaskFeedback = sequelize.define('ai_task_feedback', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  helpSeekingLogId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  feedbackType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  feedbackDetail: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = AITaskFeedback;
