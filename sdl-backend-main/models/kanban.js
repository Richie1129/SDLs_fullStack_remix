const {DataTypes} = require('sequelize');
const sequelize = require('../util/database');
const Column = require('./column');

const Kanban = sequelize.define('kanban', {
    column: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull:true
    },  
}, {
    tableName: 'kanbans'
});

Kanban.hasMany(Column);
Column.belongsTo(Kanban);

module.exports = Kanban;

