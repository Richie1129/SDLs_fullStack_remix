const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const ObservationLog = sequelize.define('observation_log', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  targetType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  targetId: {
    // Use string to be flexible across entities
    type: DataTypes.STRING,
    allowNull: false,
  },
  targetName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true, // createdAt acts as event timestamp
});

module.exports = ObservationLog;
