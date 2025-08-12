const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const Question_message = sequelize.define('question_message', {
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false
    }

}, {
    tableName: 'question_messages'
});


module.exports = Question_message;
