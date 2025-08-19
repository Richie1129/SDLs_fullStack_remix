const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const UsageSession = sequelize.define('usage_session', {
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
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  lastActiveAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  totalSeconds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  timestamps: true,
});

module.exports = UsageSession;

