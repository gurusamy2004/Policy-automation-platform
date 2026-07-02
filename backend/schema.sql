-- Policy Automation Platform schema

CREATE TABLE IF NOT EXISTS rulesets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  rules JSONB NOT NULL,          -- array of rule objects, validated by rules-engine.js
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  category TEXT NOT NULL,        -- e.g. 'fare_dispute', 'safety', 'lost_item'
  priority TEXT NOT NULL,        -- 'low' | 'medium' | 'high'
  wait_time_minutes INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  ruleset_id INTEGER REFERENCES rulesets(id),
  ticket_id INTEGER REFERENCES tickets(id),
  outcome TEXT NOT NULL,         -- 'auto_resolve' | 'escalate' | 'no_match'
  matched_rule_name TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_evaluations_ruleset ON evaluations(ruleset_id);
