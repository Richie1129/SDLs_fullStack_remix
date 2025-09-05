"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("observation_logs", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      targetType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      targetId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      targetName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("observation_logs", ["userId", "projectId", "createdAt"], {
      name: "observation_logs_user_project_created_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("observation_logs");
  },
};

