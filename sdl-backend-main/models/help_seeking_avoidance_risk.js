const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const HelpSeekingAvoidanceRisk = sequelize.define('help_seeking_avoidance_risk', {
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
    allowNull: true,
  },
  riskLevel: {
    type: DataTypes.ENUM('low', 'low_medium', 'medium', 'high'),
    allowNull: false,
  },
  riskScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  struggleScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  helpActivityScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  signals: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  struggleSignals: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  riskDetails: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  detectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  teacherViewed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  teacherConfirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  teacherNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  resolved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'help_seeking_avoidance_risks'
});

// 定義關聯
HelpSeekingAvoidanceRisk.associate = function(models) {
  HelpSeekingAvoidanceRisk.belongsTo(models.User, { foreignKey: 'userId' });
  HelpSeekingAvoidanceRisk.belongsTo(models.Project, { foreignKey: 'projectId' });
  HelpSeekingAvoidanceRisk.belongsTo(models.Task, { foreignKey: 'taskId' });
};

module.exports = HelpSeekingAvoidanceRisk;
