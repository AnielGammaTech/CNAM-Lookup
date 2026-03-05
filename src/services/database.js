const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    CREATE TABLE IF NOT EXISTS invite_codes (
      id SERIAL PRIMARY KEY,
      code VARCHAR(64) UNIQUE NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      used_by INTEGER REFERENCES users(id),
      is_used BOOLEAN NOT NULL DEFAULT false,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100),
      detail JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

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
      user_id INTEGER REFERENCES users(id),
      looked_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lookups_phone ON lookups(phone_number);
    CREATE INDEX IF NOT EXISTS idx_lookups_date ON lookups(looked_up_at DESC);
  `);

  // Migration: add user_id column if table already existed without it
  await db.query(`
    DO $$ BEGIN
      ALTER TABLE lookups ADD COLUMN user_id INTEGER REFERENCES users(id);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS idx_lookups_user ON lookups(user_id);
  `);

  await seedAdmin(db);
}

async function seedAdmin(db) {
  const { rows } = await db.query('SELECT COUNT(*) as count FROM users');
  if (parseInt(rows[0].count, 10) > 0) return;

  const password = config.admin.password;
  if (!password) {
    console.warn('No ADMIN_PASSWORD set. Skipping admin seed. Set it to bootstrap the first admin.');
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await db.query(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [config.admin.username, hash, 'admin']
  );
  console.log(`Admin user "${config.admin.username}" created`);
}

async function insertLookup(record, userId) {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO lookups (
      phone_number, country_code, caller_name, caller_type,
      carrier_name, carrier_type, mobile_country_code,
      mobile_network_code, line_type, error_message, user_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      record.phoneNumber, record.countryCode, record.callerName,
      record.callerType, record.carrierName, record.carrierType,
      record.mobileCountryCode, record.mobileNetworkCode,
      record.lineType, record.errorMessage, userId,
    ]
  );
  return result.rows[0];
}

async function getHistory({ page = 1, limit = 50, search = '', userId = null, isAdmin = false }) {
  const db = getPool();
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (!isAdmin && userId) {
    conditions.push(`user_id = $${paramIdx++}`);
    params.push(userId);
  }
  if (search) {
    conditions.push(`(phone_number ILIKE $${paramIdx} OR caller_name ILIKE $${paramIdx} OR carrier_name ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT * FROM lookups ${whereClause} ORDER BY looked_up_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) as total FROM lookups ${whereClause}`,
      params
    ),
  ]);

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
    page,
    limit,
  };
}

async function clearHistory(userId = null, isAdmin = false) {
  const db = getPool();
  if (isAdmin) {
    await db.query('DELETE FROM lookups');
  } else if (userId) {
    await db.query('DELETE FROM lookups WHERE user_id = $1', [userId]);
  }
}

module.exports = { getPool, initialize, insertLookup, getHistory, clearHistory };
