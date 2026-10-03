const path = require('node:path');

module.exports = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  catalogPath: path.join(__dirname, '..', 'data', 'catalog.json'),
  quotesPath: path.join(__dirname, '..', 'data', 'quotes.json')
};
