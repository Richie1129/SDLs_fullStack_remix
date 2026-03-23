const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const TeacherAnalysisReport = sequelize.define('teacher_analysis_report', {
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    model: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    snapshot: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
}, {
    tableName: 'teacher_analysis_reports',
    timestamps: true,
    indexes: [
        { fields: ['projectId', 'createdAt'] },
    ],
});

module.exports = TeacherAnalysisReport;
