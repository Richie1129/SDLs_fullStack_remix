'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚀 開始執行 MinIO 欄位 migration...');

    // MinIO 相關欄位定義
    const minioFields = {
      originalName: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '原始檔案名稱'
      },
      fileUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'MinIO 檔案 URL'
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '檔案 MIME 類型'
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '檔案大小 (bytes)'
      }
    };

    try {
      // 為 submits 表添加 MinIO 欄位
      console.log('📝 為 submits 表添加 MinIO 欄位...');
      for (const [fieldName, fieldConfig] of Object.entries(minioFields)) {
        try {
          await queryInterface.addColumn('submits', fieldName, fieldConfig);
          console.log(`  ✅ submits.${fieldName} 添加成功`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`  ⚠️  submits.${fieldName} 已存在，跳過`);
          } else {
            throw error;
          }
        }
      }

      // 為 daily_personals 表添加 fileName 欄位（如果不存在）
      console.log('📝 為 daily_personals 表添加 MinIO 欄位...');
      try {
        await queryInterface.addColumn('daily_personals', 'fileName', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'MinIO 檔案名稱'
        });
        console.log('  ✅ daily_personals.fileName 添加成功');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('  ⚠️  daily_personals.fileName 已存在，跳過');
        } else {
          throw error;
        }
      }

      for (const [fieldName, fieldConfig] of Object.entries(minioFields)) {
        try {
          await queryInterface.addColumn('daily_personals', fieldName, fieldConfig);
          console.log(`  ✅ daily_personals.${fieldName} 添加成功`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`  ⚠️  daily_personals.${fieldName} 已存在，跳過`);
          } else {
            throw error;
          }
        }
      }

      // 為 daily_teams 表添加 fileName 欄位（如果不存在）
      console.log('📝 為 daily_teams 表添加 MinIO 欄位...');
      try {
        await queryInterface.addColumn('daily_teams', 'fileName', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'MinIO 檔案名稱'
        });
        console.log('  ✅ daily_teams.fileName 添加成功');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('  ⚠️  daily_teams.fileName 已存在，跳過');
        } else {
          throw error;
        }
      }

      for (const [fieldName, fieldConfig] of Object.entries(minioFields)) {
        try {
          await queryInterface.addColumn('daily_teams', fieldName, fieldConfig);
          console.log(`  ✅ daily_teams.${fieldName} 添加成功`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`  ⚠️  daily_teams.${fieldName} 已存在，跳過`);
          } else {
            throw error;
          }
        }
      }

      console.log('🎉 MinIO 欄位 migration 執行完成！');

    } catch (error) {
      console.error('❌ MinIO migration 執行失敗:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 開始回滾 MinIO 欄位 migration...');

    const fieldsToRemove = ['originalName', 'fileUrl', 'mimeType', 'fileSize'];
    const tables = ['submits', 'daily_personals', 'daily_teams'];

    try {
      for (const table of tables) {
        console.log(`📝 從 ${table} 表移除 MinIO 欄位...`);
        
        // daily_personals 和 daily_teams 還需要移除 fileName
        if (table !== 'submits') {
          try {
            await queryInterface.removeColumn(table, 'fileName');
            console.log(`  ✅ ${table}.fileName 移除成功`);
          } catch (error) {
            console.log(`  ⚠️  移除 ${table}.fileName 失敗:`, error.message);
          }
        }
        
        for (const field of fieldsToRemove) {
          try {
            await queryInterface.removeColumn(table, field);
            console.log(`  ✅ ${table}.${field} 移除成功`);
          } catch (error) {
            console.log(`  ⚠️  移除 ${table}.${field} 失敗:`, error.message);
          }
        }
      }

      console.log('🎉 MinIO 欄位回滾完成！');

    } catch (error) {
      console.error('❌ MinIO migration 回滾失敗:', error);
      throw error;
    }
  }
}; 