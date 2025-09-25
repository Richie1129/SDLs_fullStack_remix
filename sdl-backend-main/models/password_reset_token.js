const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const PasswordResetToken = sequelize.define('password_reset_token', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'password_reset_tokens',
    indexes: [
        {
            unique: true,
            fields: ['token']
        },
        {
            fields: ['userId']
        },
        {
            fields: ['expiresAt']
        }
    ]
});

module.exports = PasswordResetToken;