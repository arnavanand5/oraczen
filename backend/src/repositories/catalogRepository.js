const fs = require('node:fs/promises');
const { catalogPath } = require('../config');

let cachedCatalog;

async function getCatalog() {
  if (!cachedCatalog) {
    const raw = await fs.readFile(catalogPath, 'utf8');
    cachedCatalog = JSON.parse(raw);
  }
  return cachedCatalog;
}

async function getProductMap() {
  const catalog = await getCatalog();
  return new Map(catalog.products.map(product => [product.sku, product]));
}

module.exports = { getCatalog, getProductMap };
