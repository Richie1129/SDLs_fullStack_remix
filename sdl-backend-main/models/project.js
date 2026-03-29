const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const Idea_wall = require('./idea_wall');
const Tag = require('./tag');
const Process = require('./process');
const Daily_personal = require('./daily_personal');
const Daily_team = require('./daily_team');
const Chatroom_message = require('./chatroom_message');
const Kanban = require('./kanban');
const Submit = require('./submit');
const Question = require('./question');

const Project = sequelize.define('project', {
    name: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    describe: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    mentor: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    referral_code:{
        type:DataTypes.TEXT,
        allowNull:true
    },
    currentStage:{
        type:DataTypes.INTEGER,
        allowNull:true
    },
    currentSubStage:{
        type:DataTypes.INTEGER,
        allowNull:true
    },
    ProjectEnd: {  // 新增的欄位
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false  // 假設默認值為 false，意味著項目尚未完成
    },
    is_open_for_viewing: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否開放給其他班級觀摩'
    },
    allowed_classes: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '可觀摩的班級清單'
    },
    semester: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: '學期代碼，例如 114-2'
    },
    school_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '所屬學校（繼承自建立者）'
    },
    course_config: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
            sessions_per_week: 2,           // 每週上課次數
            has_homework: false,            // 是否有課後作業
            stage_duration_weeks: 2,        // 每階段持續週數
            analysis_window_sessions: 2     // 分析窗口（最近 N 堂課）
        },
        comment: '課程設定：用於求助迴避偵測的情境配置'
    },
    mentorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '指導教師 user.id（真正的外鍵，取代 mentor username 字串比對）'
    }
},{
    timestamps: true,
    tableName: 'projects',
    indexes: [
        { fields: ['mentor'] },                     // 導師查詢
        { fields: ['is_open_for_viewing'] },        // 觀摩篩選
        { fields: ['referral_code'], unique: true }, // 推薦碼查詢
        { fields: ['createdAt'] },                  // 時間排序
        { fields: ['semester'] },                   // 學期篩選
        { fields: ['mentor', 'semester'] },         // 導師+學期複合查詢
        { fields: ['school_id'] }                    // 學校篩選
    ]
});

// Project.hasMany(Chatroom_message);
Project.hasMany(Tag);
Project.hasMany(Idea_wall);
Project.hasMany(Process);
Project.hasMany(Daily_personal);
Project.hasMany(Daily_team);
Project.hasOne(Kanban);
Project.hasMany(Submit);
Project.hasMany(Question);

// 建立與 HelpSeekingLog 的關聯
const HelpSeekingLog = require('./help_seeking_log');
Project.hasMany(HelpSeekingLog, { foreignKey: 'projectId' });
HelpSeekingLog.belongsTo(Project, { foreignKey: 'projectId' });

// 建立與 HelpSeekingAvoidanceRisk 的關聯
const HelpSeekingAvoidanceRisk = require('./help_seeking_avoidance_risk');
Project.hasMany(HelpSeekingAvoidanceRisk, { foreignKey: 'projectId' });
HelpSeekingAvoidanceRisk.belongsTo(Project, { foreignKey: 'projectId' });

module.exports = Project;
