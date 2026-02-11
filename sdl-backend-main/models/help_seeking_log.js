const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const HelpSeekingLog = sequelize.define('help_seeking_log', {
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
  metacognitiveState: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  helpSeekingType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  askedSources: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('askedSources');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('askedSources', JSON.stringify(value));
    }
  },
  answers: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('answers');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('answers', JSON.stringify(value));
    }
  },
  skippedThinking: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  suggestions: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('suggestions');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('suggestions', value ? JSON.stringify(value) : null);
    }
  },
  // === 求助成效追蹤欄位 ===
  taskStatusBefore: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'task_status_before'
  },
  taskStatusAfter24h: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'task_status_after_24h'
  },
  statusChanged: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'status_changed'
  },
  effectivenessScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    },
    field: 'effectiveness_score'
  },
  followUpNeeded: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    field: 'follow_up_needed'
  },
  effectivenessCheckedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'effectiveness_checked_at'
  },
}, {
  timestamps: true,
});

// 定義關聯
HelpSeekingLog.associate = function(models) {
  HelpSeekingLog.belongsTo(models.User, { foreignKey: 'userId' });
  HelpSeekingLog.belongsTo(models.Task, { foreignKey: 'taskId' });
  HelpSeekingLog.belongsTo(models.Project, { foreignKey: 'projectId' });
};

module.exports = HelpSeekingLog;
