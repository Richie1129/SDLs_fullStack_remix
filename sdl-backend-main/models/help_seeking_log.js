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
}, {
  timestamps: true,
});

module.exports = HelpSeekingLog;
