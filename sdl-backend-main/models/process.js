const { DataTypes} = require('sequelize');
const sequelize = require('../util/database');
const Stage = require('./stage');

const Process = sequelize.define('process', {
    stage: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull:false,
    }
}, {
    tableName: 'processes'
});
Process.hasMany(Stage);

module.exports = Process;

