const { DataTypes} = require('sequelize');
const sequelize = require('../util/database');

const NodeRelation = sequelize.define('NodeRelation', {
    from_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'nodes', key: 'id' }
    },
    to_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'nodes', key: 'id' }
    }
}, {
    tableName: 'node_relations',
    timestamps: true
});

module.exports = NodeRelation;
