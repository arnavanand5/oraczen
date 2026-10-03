const fs = require('node:fs/promises');
const path = require('node:path');
const { quotesPath } = require('../config');

let writeQueue = Promise.resolve();

async function ensureFile() {
  await fs.mkdir(path.dirname(quotesPath), { recursive: true });
  try {
    await fs.access(quotesPath);
  } catch {
    await fs.writeFile(quotesPath, '[]\n', 'utf8');
  }
}

async function readAll() {
  await ensureFile();
  const raw = await fs.readFile(quotesPath, 'utf8');
  return JSON.parse(raw);
}

function enqueueWrite(work) {
  writeQueue = writeQueue.then(work, work);
  return writeQueue;
}

async function writeAll(quotes) {
  await fs.writeFile(quotesPath, `${JSON.stringify(quotes, null, 2)}\n`, 'utf8');
}

async function create(quote) {
  return enqueueWrite(async () => {
    const quotes = await readAll();
    quotes.push(quote);
    await writeAll(quotes);
    return quote;
  });
}

async function findById(id) {
  const quotes = await readAll();
  return quotes.find(quote => quote.id === id) || null;
}

async function list() {
  return readAll();
}

async function updateById(id, updater) {
  return enqueueWrite(async () => {
    const quotes = await readAll();
    const index = quotes.findIndex(quote => quote.id === id);
    if (index === -1) return null;
    const updated = updater(quotes[index]);
    quotes[index] = updated;
    await writeAll(quotes);
    return updated;
  });
}

module.exports = { create, findById, list, updateById };
