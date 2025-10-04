const {DataTypes} = require('sequelize');
const sequelize = require('../util/database');
const Project = require('./project');
const Threads = require('./threads');
const Threads_Message = require('./threads_message');
const daily_personal = require('./daily_personal');
const daily_team = require('./daily_team');
const Question = require('./question');
const UserProject = require('./user_project'); 

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
    }
}, {
    tableName: 'users'
});


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

module.exports = User;
