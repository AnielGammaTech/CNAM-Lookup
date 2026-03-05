const { Pool } = require('pg');
const { config } = require('../config');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.database.url,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return pool;
}

async function initialize() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS lookups (
      id SERIAL PRIMARY KEY,
      phone_number VARCHAR(20) NOT NULL,
      country_code VARCHAR(5),
      caller_name VARCHAR(255),
      caller_type VARCHAR(50),
      carrier_name VARCHAR(255),
      carrier_type VARCHAR(50),
      mobile_country_code VARCHAR(10),
      mobile_network_code VARCHAR(10),
      line_type VARCHAR(50),
      error_message TEXT,
      looked_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lookups_phone ON lookups(phone_number);
    CREATE INDEX IF NOT EXISTS idx_lookups_date ON lookups(looked_up_at DESC);
  `);
}

async function insertLookup(record) {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO lookups (
      phone_number, country_code, caller_name, caller_type,
      carrier_name, carrier_type, mobile_country_code,
      mobile_network_code, line_type, error_message
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      record.phoneNumber,
      record.countryCode,
      record.callerName,
      record.callerType,
      record.carrierName,
      record.carrierType,
      record.mobileCountryCode,
      record.mobileNetworkCode,
      record.lineType,
      record.errorMessage,
    ]
  );
  return result.rows[0];
}

async function getHistory({ page = 1, limit = 50, search = '' }) {
  const db = getPool();
  const offset = (page - 1) * limit;

  const whereClause = search
    ? `WHERE phone_number ILIKE $3 OR caller_name ILIKE $3 OR carrier_name ILIKE $3`
    : '';
  const params = search
    ? [limit, offset, `%${search}%`]
    : [limit, offset];

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT * FROM lookups ${whereClause} ORDER BY looked_up_at DESC LIMIT $1 OFFSET $2`,
      params
    ),
    db.query(
      `SELECT COUNT(*) as total FROM lookups ${whereClause}`,
      search ? [`%${search}%`] : []
    ),
  ]);

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
    page,
    limit,
  };
}

async function clearHistory() {
  const db = getPool();
  await db.query('DELETE FROM lookups');
}

module.exports = { initialize, insertLookup, getHistory, clearHistory };
