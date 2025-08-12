const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const QuestionMessage = require('./question_message');

const Question = sequelize.define('question', {
    title: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'questions'
});
Question.hasMany(QuestionMessage, {
    foreignKey: 'questionId',
    onDelete: 'CASCADE'
});
QuestionMessage.belongsTo(Question, {
    foreignKey: 'questionId'
});
module.exports = Question;
