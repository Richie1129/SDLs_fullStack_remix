'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🧹 開始清理重複的外鍵約束...');

    // 定義需要清理的表和重複外鍵
    const duplicateConstraints = {
      'submits': {
        'projectId': ['submits_projectId_fkey2', 'submits_projectId_fkey3', 'submits_projectId_fkey4',
                     'submits_projectId_fkey5', 'submits_projectId_fkey6', 'submits_projectId_fkey7',
                     'submits_projectId_fkey8', 'submits_projectId_fkey9', 'submits_projectId_fkey10',
                     'submits_projectId_fkey11', 'submits_projectId_fkey12', 'submits_projectId_fkey13',
                     'submits_projectId_fkey14', 'submits_projectId_fkey15', 'submits_projectId_fkey16']
      },
      'daily_personals': {
        'projectId': ['daily_personals_projectId_fkey2', 'daily_personals_projectId_fkey3', 
                     'daily_personals_projectId_fkey4', 'daily_personals_projectId_fkey5',
                     'daily_personals_projectId_fkey6', 'daily_personals_projectId_fkey7',
                     'daily_personals_projectId_fkey8', 'daily_personals_projectId_fkey9',
                     'daily_personals_projectId_fkey10', 'daily_personals_projectId_fkey11',
                     'daily_personals_projectId_fkey12', 'daily_personals_projectId_fkey13',
                     'daily_personals_projectId_fkey14', 'daily_personals_projectId_fkey15',
                     'daily_personals_projectId_fkey16'],
        'userId': ['daily_personals_userId_fkey2', 'daily_personals_userId_fkey3',
                  'daily_personals_userId_fkey4', 'daily_personals_userId_fkey5',
                  'daily_personals_userId_fkey6', 'daily_personals_userId_fkey7',
                  'daily_personals_userId_fkey8', 'daily_personals_userId_fkey9',
                  'daily_personals_userId_fkey10', 'daily_personals_userId_fkey11',
                  'daily_personals_userId_fkey12', 'daily_personals_userId_fkey13',
                  'daily_personals_userId_fkey14', 'daily_personals_userId_fkey15',
                  'daily_personals_userId_fkey16', 'daily_personals_userId_fkey17',
                  'daily_personals_userId_fkey18']
      },
      'daily_teams': {
        'projectId': ['daily_teams_projectId_fkey2', 'daily_teams_projectId_fkey3',
                     'daily_teams_projectId_fkey4', 'daily_teams_projectId_fkey5',
                     'daily_teams_projectId_fkey6', 'daily_teams_projectId_fkey7',
                     'daily_teams_projectId_fkey8', 'daily_teams_projectId_fkey9',
                     'daily_teams_projectId_fkey10', 'daily_teams_projectId_fkey11',
                     'daily_teams_projectId_fkey12', 'daily_teams_projectId_fkey13',
                     'daily_teams_projectId_fkey14', 'daily_teams_projectId_fkey15',
                     'daily_teams_projectId_fkey16'],
        'userId': ['daily_teams_userId_fkey2', 'daily_teams_userId_fkey3',
                  'daily_teams_userId_fkey4', 'daily_teams_userId_fkey5',
                  'daily_teams_userId_fkey6', 'daily_teams_userId_fkey7',
                  'daily_teams_userId_fkey8', 'daily_teams_userId_fkey9',
                  'daily_teams_userId_fkey10', 'daily_teams_userId_fkey11',
                  'daily_teams_userId_fkey12', 'daily_teams_userId_fkey13',
                  'daily_teams_userId_fkey14', 'daily_teams_userId_fkey15',
                  'daily_teams_userId_fkey16', 'daily_teams_userId_fkey17',
                  'daily_teams_userId_fkey18']
      }
    };

    try {
      for (const [tableName, constraints] of Object.entries(duplicateConstraints)) {
        console.log(`📝 清理 ${tableName} 表的重複外鍵約束...`);
        
        for (const [fieldName, constraintNames] of Object.entries(constraints)) {
          console.log(`  🔧 處理 ${fieldName} 欄位的重複約束...`);
          
          for (const constraintName of constraintNames) {
            try {
              await queryInterface.removeConstraint(tableName, constraintName);
              console.log(`    ✅ 移除約束 ${constraintName}`);
            } catch (error) {
              if (error.message.includes('does not exist')) {
                console.log(`    ⚠️  約束 ${constraintName} 不存在，跳過`);
              } else {
                console.log(`    ❌ 移除約束 ${constraintName} 失敗:`, error.message);
              }
            }
          }
        }
      }

      console.log('🎉 重複外鍵約束清理完成！');

    } catch (error) {
      console.error('❌ 清理重複外鍵約束失敗:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️  此 migration 的回滾操作需要手動處理');
    console.log('   因為重複的外鍵約束回滾會造成資料庫衝突');
    console.log('   如果需要回滾，請手動使用 sync({ force: true }) 重建資料庫');
    
    // 不執行任何操作，因為重複外鍵的回滾會造成問題
    return Promise.resolve();
  }
}; 