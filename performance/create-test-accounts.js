/**
 * 建立效能測試專用帳號
 * 執行方式：node performance/create-test-accounts.js
 */
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: './sdl-backend-main/.env' });

const sequelize = new Sequelize(
  process.env.PG_NAME || 'postgres',
  process.env.PG_USER || 'postgres',
  process.env.PG_PASSWORD || 'postgres',
  {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5433,
    dialect: 'postgres',
    logging: false,
  }
);

async function main() {
  await sequelize.authenticate();
  console.log('✅ DB 連線成功');

  const hashedPassword = await bcrypt.hash('Perf@Test2026', 12);

  const accounts = [
    {
      account: 'perf_student_01',
      username: '效能測試學生',
      email: 'perf_student_01@test.sdl',
      password: hashedPassword,
      role: 'student',
    },
    {
      account: 'perf_student_02',
      username: '效能測試學生2',
      email: 'perf_student_02@test.sdl',
      password: hashedPassword,
      role: 'student',
    },
    {
      account: 'perf_teacher_01',
      username: '效能測試教師',
      email: 'perf_teacher_01@test.sdl',
      password: hashedPassword,
      role: 'teacher',
    },
  ];

  for (const acc of accounts) {
    const [, created] = await sequelize.query(
      `INSERT INTO users (account, username, email, password, role, "createdAt", "updatedAt")
       VALUES (:account, :username, :email, :password, :role, NOW(), NOW())
       ON CONFLICT (account) DO UPDATE SET "updatedAt" = NOW()
       RETURNING account, role`,
      { replacements: acc, type: Sequelize.QueryTypes.UPSERT }
    );
    console.log(`${created ? '✅ 新建' : '🔄 已存在'}: ${acc.account} (${acc.role})`);
  }

  // 驗證登入
  const verifyRes = await sequelize.query(
    `SELECT account, role FROM users WHERE account LIKE 'perf_%'`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.log('\n建立的測試帳號：');
  verifyRes.forEach(u => console.log(`  - ${u.account} [${u.role}]`));
  console.log('\n密碼：Perf@Test2026');

  await sequelize.close();
}

main().catch(err => {
  console.error('❌ 錯誤：', err.message);
  process.exit(1);
});
