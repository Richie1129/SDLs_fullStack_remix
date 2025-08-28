// connection postgres
const Sequelize = require('sequelize');

// Support both PG_NAME (preferred) and legacy PG_DB for database name
const DB_NAME = process.env.PG_NAME || process.env.PG_DB;
const DB_USER = process.env.PG_USER;
const DB_PASS = process.env.PG_PASSWORD;
const DB_HOST = process.env.PG_HOST;
const DB_PORT = process.env.PG_PORT || 5432;

// Minimal startup log to help diagnose env mismatches
console.log('[DB] name=%s host=%s user=%s port=%s', DB_NAME, DB_HOST, DB_USER, DB_PORT);

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
});

module.exports = sequelize;
