-- PulseTask Marketplace — Complete PostgreSQL Schema
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
