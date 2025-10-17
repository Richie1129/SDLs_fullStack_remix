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
    }
},{
    timestamps: true,
    tableName: 'projects',
    indexes: [
        { fields: ['mentor'] },                     // 導師查詢
        { fields: ['is_open_for_viewing'] },        // 觀摩篩選
        { fields: ['referral_code'], unique: true }, // 推薦碼查詢
        { fields: ['createdAt'] }                   // 時間排序
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


module.exports = Project;
