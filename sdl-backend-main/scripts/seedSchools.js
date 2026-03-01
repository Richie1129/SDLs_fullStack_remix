/**
 * 將 schools.json 匯入資料庫 schools 表
 * 執行方式：node scripts/seedSchools.js
 */
const path = require('path');
const sequelize = require('../util/database');

async function seedSchools() {
    const schools = require('./schools.json');

    await sequelize.authenticate();
    console.log('資料庫連線成功');

    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM schools');
    const existingCount = parseInt(results[0].count);
    if (existingCount > 0) {
        console.log(`schools 表已有 ${existingCount} 筆資料，使用 upsert 更新...`);
    }

    let inserted = 0;
    let updated = 0;

    for (const school of schools) {
        const [, created] = await sequelize.query(
            `INSERT INTO schools (code, name, type, city, "createdAt", "updatedAt")
             VALUES (:code, :name, :type, :city, NOW(), NOW())
             ON CONFLICT (code) DO UPDATE SET
               name = EXCLUDED.name,
               type = EXCLUDED.type,
               city = EXCLUDED.city,
               "updatedAt" = NOW()`,
            {
                replacements: {
                    code: school.code,
                    name: school.name,
                    type: school.type || null,
                    city: school.city || null
                },
                type: sequelize.QueryTypes.RAW
            }
        );
        // PostgreSQL upsert 沒有直接的 created 標記，用簡單計數
        inserted++;
    }

    console.log(`\n匯入完成：共處理 ${inserted} 筆學校資料`);

    const [countResult] = await sequelize.query('SELECT COUNT(*) as count FROM schools');
    console.log(`schools 表目前共 ${countResult[0].count} 筆`);

    await sequelize.close();
}

seedSchools().catch(err => {
    console.error('Seed 失敗:', err);
    process.exit(1);
});
