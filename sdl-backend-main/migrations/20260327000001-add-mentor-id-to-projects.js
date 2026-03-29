'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. 新增 mentorId 欄位（允許 null，先做資料回填後再加約束）
    await queryInterface.addColumn('projects', 'mentorId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 2. 回填現有資料：從 mentor (username) 對應到 users.id
    await queryInterface.sequelize.query(`
      UPDATE projects
      SET "mentorId" = u.id
      FROM users u
      WHERE projects.mentor = u.username
    `);

    // 3. 新增索引（取代舊的 mentor text 索引）
    await queryInterface.addIndex('projects', ['mentorId'], {
      name: 'idx_projects_mentor_id'
    });
    await queryInterface.addIndex('projects', ['mentorId', 'semester'], {
      name: 'idx_projects_mentor_id_semester'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('projects', 'idx_projects_mentor_id_semester');
    await queryInterface.removeIndex('projects', 'idx_projects_mentor_id');
    await queryInterface.removeColumn('projects', 'mentorId');
  }
};
