"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('開始整合想法牆：每個專案只保留一個想法牆...');
      
      // 1. 獲取所有專案及其想法牆
      const projects = await queryInterface.sequelize.query(
        'SELECT DISTINCT "projectId" FROM idea_walls WHERE "projectId" IS NOT NULL',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      for (const project of projects) {
        const projectId = project.projectId;
        
        // 獲取此專案的第一個想法牆（按ID排序）
        const [firstWall] = await queryInterface.sequelize.query(
          'SELECT id FROM idea_walls WHERE "projectId" = ? ORDER BY id ASC LIMIT 1',
          { 
            replacements: [projectId], 
            type: Sequelize.QueryTypes.SELECT, 
            transaction 
          }
        );
        
        if (!firstWall) continue;
        
        const firstWallId = firstWall.id;
        console.log(`專案 ${projectId}: 使用想法牆 ${firstWallId} 作為主想法牆`);
        
        // 獲取專案名稱
        const [projectInfo] = await queryInterface.sequelize.query(
          'SELECT name FROM projects WHERE id = ?',
          { 
            replacements: [projectId], 
            type: Sequelize.QueryTypes.SELECT, 
            transaction 
          }
        );
        
        // 2. 將此專案的所有節點遷移到第一個想法牆
        const [nodesMoved] = await queryInterface.sequelize.query(
          `UPDATE nodes 
           SET "ideaWallId" = ?, "updatedAt" = NOW()
           WHERE "ideaWallId" IN (
             SELECT id FROM idea_walls 
             WHERE "projectId" = ? AND id != ?
           )`,
          { 
            replacements: [firstWallId, projectId, firstWallId], 
            transaction 
          }
        );
        
        // 3. 節點關係表不需要更新，因為它沒有 ideaWallId 欄位
        // node_relations 只有 from_id 和 to_id，通過節點本身就能確定關係
        
        // 4. 更新第一個想法牆的資訊
        const projectName = projectInfo ? projectInfo.name : `專案${projectId}`;
        await queryInterface.sequelize.query(
          `UPDATE idea_walls 
           SET name = ?, stage = NULL, "updatedAt" = NOW()
           WHERE id = ?`,
          { 
            replacements: [`${projectName}-想法牆`, firstWallId], 
            transaction 
          }
        );
        
        console.log(`專案 ${projectId}: 節點遷移完成，想法牆已重新命名`);
      }
      
      // 5. 刪除多餘的想法牆（保留每個專案的第一個）
      const [deleteResult] = await queryInterface.sequelize.query(
        `DELETE FROM idea_walls 
         WHERE id NOT IN (
           SELECT min_id FROM (
             SELECT MIN(id) as min_id
             FROM idea_walls 
             WHERE "projectId" IS NOT NULL 
             GROUP BY "projectId"
           ) as subquery
         ) AND "projectId" IS NOT NULL`,
        { transaction }
      );
      
      console.log(`刪除了 ${deleteResult} 個多餘的想法牆`);
      
      // 6. 輸出最終狀態
      const finalState = await queryInterface.sequelize.query(
        `SELECT 
           p.id as project_id,
           p.name as project_name,
           iw.id as ideawall_id,
           iw.name as ideawall_name,
           COUNT(n.id) as total_nodes
         FROM projects p
         LEFT JOIN idea_walls iw ON p.id = iw."projectId"
         LEFT JOIN nodes n ON iw.id = n."ideaWallId"
         GROUP BY p.id, p.name, iw.id, iw.name
         ORDER BY p.id`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      console.log('=== 想法牆整合完成 ===');
      console.table(finalState);
      
      await transaction.commit();
      console.log('✅ Migration 成功完成');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration 失敗:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // 注意：這個回滾操作會重新創建階段性想法牆，但無法完美還原原始狀態
    console.log('⚠️ 警告：此 migration 的回滾操作會重新創建想法牆結構，但無法完美還原原始資料分佈');
    
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 為每個專案重新創建基本的階段想法牆（1-1 到 5-5）
      const projects = await queryInterface.sequelize.query(
        'SELECT id, name, "currentStage", "currentSubStage" FROM projects',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      const stages = [
        ['1-1', '1-2', '1-3'],
        ['2-1', '2-2', '2-3'], 
        ['3-1', '3-2', '3-3'],
        ['4-1', '4-2'],
        ['5-1', '5-2', '5-3', '5-4', '5-5']
      ];
      
      for (const project of projects) {
        // 保留現有的想法牆，但重新命名
        await queryInterface.sequelize.query(
          `UPDATE idea_walls 
           SET name = NULL, stage = '1-1'
           WHERE "projectId" = ?`,
          { replacements: [project.id], transaction }
        );
        
        // 為其他階段創建新的想法牆
        for (let stageGroup = 0; stageGroup < stages.length; stageGroup++) {
          for (let subStageIdx = 0; subStageIdx < stages[stageGroup].length; subStageIdx++) {
            const stage = stages[stageGroup][subStageIdx];
            if (stage === '1-1') continue; // 已存在
            
            await queryInterface.bulkInsert('idea_walls', [{
              name: null,
              type: 'project',
              stage: stage,
              projectId: project.id,
              createdAt: new Date(),
              updatedAt: new Date()
            }], { transaction });
          }
        }
      }
      
      await transaction.commit();
      console.log('✅ 回滾完成（注意：節點仍在原想法牆中）');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 回滾失敗:', error);
      throw error;
    }
  }
};