// connection postgres
require('dotenv').config();
const Sequelize = require('sequelize');

const sequelize = new Sequelize(
    process.env.PG_DB || process.env.PG_NAME,
    process.env.PG_USER,
    process.env.PG_PASSWORD,
    {
        host: process.env.PG_HOST,
        dialect: 'postgres',
        pool: {
            max: 20,
            min: 2,
            acquire: 30000,
            idle: 10000,
        },
    },
);

module.exports = sequelize;