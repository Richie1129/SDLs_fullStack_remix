const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const AuditEvent = sequelize.define('audit_event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  actorId: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  actorRole: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  actorName: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '使用者名稱（username）'
  },
  action: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  targetType: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  targetId: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  projectId: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  requestId: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  source: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'server',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = AuditEvent;
