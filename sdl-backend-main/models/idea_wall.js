const { DataTypes} = require('sequelize');
const sequelize = require('../util/database');
const Node = require('./node');

const Idea_wall = sequelize.define('idea_wall', {
    name: {
        type: DataTypes.TEXT,
        allowNull:true
    },
    type:{
        type: DataTypes.TEXT,
        allowNull:false
    },
    stage:{
        type: DataTypes.TEXT,
        allowNull:true
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'idea_walls'
});
Idea_wall.hasMany(Node);
Node.belongsTo(Idea_wall, { foreignKey: 'ideaWallId' });
// Removed invalid association to Node_relation (no ideaWallId in join table)

module.exports = Idea_wall;
