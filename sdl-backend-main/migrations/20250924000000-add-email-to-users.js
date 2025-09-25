'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'email', {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: '',
      after: 'account'
    });

    // 為現有用戶設定臨時email，讓他們可以稍後更新
    await queryInterface.sequelize.query(
      "UPDATE users SET email = CONCAT(account, '@example.com') WHERE email = '' OR email IS NULL"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'email');
  }
};