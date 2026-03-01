const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const School = sequelize.define('school', {
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: '教育部學校代碼'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '學校名稱'
    },
    type: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: '公/私立'
    },
    city: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '縣市名稱'
    }
}, {
    tableName: 'schools',
    timestamps: true,
    indexes: [
        { fields: ['city'] },
        { fields: ['name'] }
    ]
});

module.exports = School;
