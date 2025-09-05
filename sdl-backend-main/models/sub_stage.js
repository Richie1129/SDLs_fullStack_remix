const { DataTypes} = require('sequelize');
const sequelize = require('../util/database');

const Sub_stage = sequelize.define('sub_stage', {
    name: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    description:{
        type: DataTypes.TEXT,
        allowNull:false
    },
    userSubmit:{
        type: DataTypes.JSON,
        allowNull:false
    },
    stageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'stages',
            key: 'id'
        }
    }
}, {
    tableName: 'sub_stages'
});

module.exports = Sub_stage;
