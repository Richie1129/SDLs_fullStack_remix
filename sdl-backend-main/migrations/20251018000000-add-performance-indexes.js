"use strict";

/**
 * Migration: 加入效能索引
 *
 * 為經常查詢的欄位建立索引，提升查詢效能 10-100 倍
 *
 * 影響的表:
 * - users: account (unique), role, class, role+class
 * - projects: mentor, is_open_for_viewing, referral_code (unique), createdAt
 * - daily_personals: projectId, userId, projectId+userId, createdAt
 * - tasks: columnId, owner, createdAt
 * - nodes: ideaWallId, owner
 *
 * 零破壞性：索引只影響查詢效能，不改變資料
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Users 表索引
    await queryInterface.addIndex('users', ['account'], {
      unique: true,
      name: 'users_account_unique_idx',
      concurrently: true  // 不鎖表建立索引 (PostgreSQL)
    }).catch(err => {
      // 索引可能已存在，忽略錯誤
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('users', ['role'], {
      name: 'users_role_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('users', ['class'], {
      name: 'users_class_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('users', ['role', 'class'], {
      name: 'users_role_class_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    // 2. Projects 表索引
    await queryInterface.addIndex('projects', ['mentor'], {
      name: 'projects_mentor_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('projects', ['is_open_for_viewing'], {
      name: 'projects_is_open_for_viewing_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('projects', ['referral_code'], {
      unique: true,
      name: 'projects_referral_code_unique_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('projects', ['createdAt'], {
      name: 'projects_createdAt_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    // 3. Daily_personals 表索引
    await queryInterface.addIndex('daily_personals', ['projectId'], {
      name: 'daily_personals_projectId_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('daily_personals', ['userId'], {
      name: 'daily_personals_userId_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('daily_personals', ['projectId', 'userId'], {
      name: 'daily_personals_projectId_userId_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('daily_personals', ['createdAt'], {
      name: 'daily_personals_createdAt_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    // 4. Tasks 表索引
    await queryInterface.addIndex('tasks', ['columnId'], {
      name: 'tasks_columnId_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('tasks', ['owner'], {
      name: 'tasks_owner_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('tasks', ['createdAt'], {
      name: 'tasks_createdAt_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    // 5. Nodes 表索引
    await queryInterface.addIndex('nodes', ['ideaWallId'], {
      name: 'nodes_ideaWallId_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    await queryInterface.addIndex('nodes', ['owner'], {
      name: 'nodes_owner_idx',
      concurrently: true
    }).catch(err => {
      if (!err.message.includes('already exists')) throw err;
    });

    console.log('✅ 效能索引建立完成');
  },

  async down(queryInterface, Sequelize) {
    // 回滾：移除所有索引

    // Users
    await queryInterface.removeIndex('users', 'users_account_unique_idx').catch(() => {});
    await queryInterface.removeIndex('users', 'users_role_idx').catch(() => {});
    await queryInterface.removeIndex('users', 'users_class_idx').catch(() => {});
    await queryInterface.removeIndex('users', 'users_role_class_idx').catch(() => {});

    // Projects
    await queryInterface.removeIndex('projects', 'projects_mentor_idx').catch(() => {});
    await queryInterface.removeIndex('projects', 'projects_is_open_for_viewing_idx').catch(() => {});
    await queryInterface.removeIndex('projects', 'projects_referral_code_unique_idx').catch(() => {});
    await queryInterface.removeIndex('projects', 'projects_createdAt_idx').catch(() => {});

    // Daily_personals
    await queryInterface.removeIndex('daily_personals', 'daily_personals_projectId_idx').catch(() => {});
    await queryInterface.removeIndex('daily_personals', 'daily_personals_userId_idx').catch(() => {});
    await queryInterface.removeIndex('daily_personals', 'daily_personals_projectId_userId_idx').catch(() => {});
    await queryInterface.removeIndex('daily_personals', 'daily_personals_createdAt_idx').catch(() => {});

    // Tasks
    await queryInterface.removeIndex('tasks', 'tasks_columnId_idx').catch(() => {});
    await queryInterface.removeIndex('tasks', 'tasks_owner_idx').catch(() => {});
    await queryInterface.removeIndex('tasks', 'tasks_createdAt_idx').catch(() => {});

    // Nodes
    await queryInterface.removeIndex('nodes', 'nodes_ideaWallId_idx').catch(() => {});
    await queryInterface.removeIndex('nodes', 'nodes_owner_idx').catch(() => {});

    console.log('✅ 效能索引已回滾');
  }
};
