const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Lab = sequelize.define('Lab', {
  courseId: DataTypes.INTEGER,
  type: DataTypes.STRING,
  configData: DataTypes.JSON,
  defaultCpu: DataTypes.INTEGER,
  defaultRam: DataTypes.INTEGER,
  setupScript: DataTypes.TEXT,
  files: DataTypes.TEXT,
});

module.exports = Lab;
