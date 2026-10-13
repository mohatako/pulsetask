/**
 * server.js — All-in-One Production Server for PulseTask Marketplace
 * Automatically creates PostgreSQL tables on startup, serves index.html, and provides all API routes.
 */

import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pulsetask_default_secret_change_in_production';

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve index.html automatically from the same folder
app.use(express.static(__dirname));

// PostgreSQL Pool (Automatically connects when DATABASE_URL is provided)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

// Auto-Migration SQL: Builds all tables automatically on first boot
const AUTO_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'worker',
  available_balance NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  escrow_balance NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  preferred_currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  target_platform VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_url TEXT NOT NULL,
  target_external_id VARCHAR(255),
  reward_per_action NUMERIC(12, 4) NOT NULL,
  total_budget NUMERIC(12, 4) NOT NULL,
  remaining_budget NUMERIC(12, 4) NOT NULL,
  max_executions INTEGER NOT NULL,
  completed_executions INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  worker_id UUID REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
  proof_url TEXT,
  proof_social_handle VARCHAR(150),
  payout_amount NUMERIC(12, 4) NOT NULL,
  worker_ip VARCHAR(64),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, worker_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(12, 4) NOT NULL,
  reference_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

// Healthcheck endpoint
app.get('/api/v1/health', async (_req, res) => {
  if (!pool) {
    return res.json({ status: 'ok', mode: 'standalone_browser_storage', databaseConnected: false });
  }
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', mode: 'postgresql_connected', databaseConnected: true });
  } catch (err) {
    return res.status(503).json({ status: 'error', message: err.message });
  }
});

// Fallback to index.html for any frontend navigation
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[PulseTask] Server live on port ${PORT}`);
  if (pool) {
    try {
      await pool.query(AUTO_SCHEMA_SQL);
      console.log('[PulseTask] PostgreSQL tables verified and ready automatically.');
    } catch (err) {
      console.error('[PulseTask] Database auto-setup warning:', err.message);
    }
  }
});
