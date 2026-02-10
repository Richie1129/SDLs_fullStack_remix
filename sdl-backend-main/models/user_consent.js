const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const UserConsent = sequelize.define('user_consent', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true,
    comment: '使用者 ID',
  },
  consentLevel: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'full',
    comment: '同意等級: essential | functional | analytics | full (學習平台預設全同意)','
    validate: {
      isIn: [['essential', 'functional', 'analytics', 'full']],
    },
  },
  consentedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '同意時間',
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '撤銷時間',
  },
  ipAtConsent: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '同意時的 IP 地址',
  },
}, {
  timestamps: true,
  tableName: 'user_consents',
});

module.exports = UserConsent;
