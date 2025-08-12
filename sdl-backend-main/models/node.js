const { DataTypes} = require('sequelize');
const sequelize = require('../util/database');
const NodeRelation = require('./node_relation');

const Node = sequelize.define('node', {
    title: {
        type: DataTypes.TEXT,
        allowNull:false
    },
    content:{
        type: DataTypes.TEXT,
        allowNull:true
    },
    owner:{
        type: DataTypes.TEXT,
        allowNull:false
    },
    colorindex:{
        type: DataTypes.INTEGER,
        allowNull:true
    }
}, {
    tableName: 'nodes'
});

// Self-referential many-to-many via node_relations
Node.belongsToMany(Node, {
    as: 'successors',
    through: NodeRelation,
    foreignKey: 'from_id',
    otherKey: 'to_id'
});

Node.belongsToMany(Node, {
    as: 'predecessors',
    through: NodeRelation,
    foreignKey: 'to_id',
    otherKey: 'from_id'
});

module.exports = Node;
