const {DataTypes} = require('sequelize');
const sequelize = require('../util/database');
const Project = require('./project');
const Threads = require('./threads');
const Threads_Message = require('./threads_message');
const daily_personal = require('./daily_personal');
const daily_team = require('./daily_team');
const Question = require('./question');
const UserProject = require('./user_project');
const RefreshToken = require('./refresh_token'); 
const IdeaWallMessage = require('./idea_wall_message');

const User = sequelize.define('user', {
    username: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    account: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    email: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    password: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    role: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    class: {
        type: DataTypes.TEXT,
        allowNull:true
    },
    seatNumber: {
        type: DataTypes.TEXT,
        allowNull:true
    },
    school_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    passwordResetAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'password_reset_at'
    }
}, {
    tableName: 'users',
    indexes: [
        { fields: ['account'], unique: true },  // 登入查詢
        { fields: ['role'] },                    // 角色篩選
        { fields: ['class'] },                   // 班級分組
        { fields: ['role', 'class'] },          // 複合查詢
        { fields: ['school_id'] }               // 學校篩選
    ]
});

// School 關聯
const School = require('./school');
User.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(User, { foreignKey: 'school_id' });


User.belongsToMany(Project, {through:"UserProject"});
Project.belongsToMany(User, {through:"UserProject"});

User.hasMany(Threads_Message);
User.hasMany(Threads);
// User.hasMany(Chatroom_message);
User.hasMany(daily_personal);
daily_personal.belongsTo(User);
User.hasMany(daily_team);
daily_team.belongsTo(User);
User.hasMany(Question);

// RefreshToken relations
User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens',
    onDelete: 'CASCADE'
});
RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

User.hasMany(IdeaWallMessage, { foreignKey: 'senderId' });
IdeaWallMessage.belongsTo(User, { foreignKey: 'senderId' });

const HelpSeekingLog = require('./help_seeking_log');
User.hasMany(HelpSeekingLog, { foreignKey: 'userId' });
HelpSeekingLog.belongsTo(User, { foreignKey: 'userId' });

const HelpSeekingAvoidanceRisk = require('./help_seeking_avoidance_risk');
User.hasMany(HelpSeekingAvoidanceRisk, { foreignKey: 'userId' });
HelpSeekingAvoidanceRisk.belongsTo(User, { foreignKey: 'userId' });

module.exports = User;
