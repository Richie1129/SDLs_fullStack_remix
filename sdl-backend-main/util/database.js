// connection postgres
require('dotenv').config();
const Sequelize = require('sequelize');
const { buildSequelizeLoggingOptions } = require('./sqlLogger');

// 生產只印慢查詢、測試關閉、開發全印；詳見 util/sqlLogger.js
const loggingOptions = buildSequelizeLoggingOptions(process.env.NODE_ENV);

const sequelize = new Sequelize(
    process.env.PG_DB || process.env.PG_NAME,
    process.env.PG_USER,
    process.env.PG_PASSWORD,
    {
        host: process.env.PG_HOST,
        port: Number(process.env.PG_PORT) || 5432,
        dialect: 'postgres',
        ...loggingOptions,
        pool: {
            max: 20,
            min: 2,
            acquire: 30000,
            idle: 10000,
        },
    },
);

module.exports = sequelize;
