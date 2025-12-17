const { DataTypes} = require('sequelize');
const sequelize = require('../util/database');
const Node = require('./node');
const IdeaWallMessage = require('./idea_wall_message');

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

Idea_wall.hasMany(IdeaWallMessage, { foreignKey: 'ideaWallId' });
IdeaWallMessage.belongsTo(Idea_wall, { foreignKey: 'ideaWallId' });

module.exports = Idea_wall;
