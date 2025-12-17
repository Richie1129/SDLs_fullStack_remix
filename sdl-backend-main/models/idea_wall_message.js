const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const IdeaWallMessage = sequelize.define('idea_wall_message', {
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    ideaWallId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'idea_walls',
            key: 'id'
        }
    },
    relatedNodeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'nodes',
            key: 'id'
        }
    },
    isAiIntervention: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'idea_wall_messages',
    indexes: [
        { fields: ['ideaWallId'] },
        { fields: ['relatedNodeId'] },
        { fields: ['senderId'] }
    ]
});

module.exports = IdeaWallMessage;
