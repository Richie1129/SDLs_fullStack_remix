const { DataTypes } = require("sequelize");
const sequelize = require("../util/database");

const UserProject = sequelize.define(
  "UserProject",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    tableName: "user_projects",
    timestamps: true,
  }
);

module.exports = UserProject;
