const pool = require('../config/db');

async function generateNumber(prefix, tableName, client = null) {
  const db = client || pool;
  const result = await db.query(`SELECT COUNT(*) FROM ${tableName}`);
  const count = parseInt(result.rows[0].count, 10) + 1;
  return `${prefix}-${String(count).padStart(3, '0')}`;
}

module.exports = { generateNumber };
