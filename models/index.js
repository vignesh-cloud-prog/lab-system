const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

module.exports = sequelize;
