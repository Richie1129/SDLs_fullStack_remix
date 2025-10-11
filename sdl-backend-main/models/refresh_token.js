const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const RefreshToken = sequelize.define('refresh_token', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    token: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'refresh_tokens',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['token']
        },
        {
            fields: ['userId', 'expiresAt']
        }
    ]
});

module.exports = RefreshToken;
