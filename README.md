# Policy Automation Platform

A small full-stack system that mirrors how a Trust & Safety / CommOps policy team
"codifies" rules and automates ticket triage: define policy rules as structured
JSON, run them against support tickets, and see which tickets auto-resolve vs
escalate — with results persisted to PostgreSQL.

Built to directly demonstrate: JavaScript (Node/Express), JSON manipulation,
relational database work, automated testing, and a working end-to-end
architecture — not just a script.

## Architecture

```
frontend/index.html  →  fetch()  →  backend/server.js (Express)
                                          │
                              ┌───────────┼────────────┐
                        routes/rules.js   routes/tickets.js
                              │                  │
                        rules-engine.js  ←────────┘  (pure logic, unit tested)
                              │
                         db.js → PostgreSQL (rulesets, tickets, evaluations)
```

- **`rules-engine.js`** is deliberately framework-free and side-effect-free —
  it's the piece that gets unit tested (`tests/rules-engine.test.js`, 11 tests)
  and is the most interview-relevant file to walk through.
- **`routes/`** are thin HTTP wrappers around the engine + database.
- **`frontend/index.html`** is a single-file vanilla JS dashboard — no build
  step, so it's trivial to run and easy to explain end-to-end in an interview.
  (Swap in React later if you want; see "Extending" below.)

## Setup

### 1. Database
```bash
createdb policy_automation
psql policy_automation -f backend/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env        # set DATABASE_URL if not using the default
npm run seed                # loads sample-data/rules.json + tickets.json
npm start                   # runs on http://localhost:4000
```

### 3. Frontend
Just open `frontend/index.html` in a browser (or serve it with any static
server). It talks to `http://localhost:4000/api`.

### 4. Tests
```bash
cd backend
npm test
```

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/rules` | List saved rulesets |
| POST | `/api/rules` | Save a new ruleset (validates JSON structure first) |
| GET | `/api/tickets` | List tickets |
| POST | `/api/tickets/evaluate` | Run a ruleset against tickets, persist + return results |

## Rule format

```json
{
  "name": "auto_resolve_low_priority_short_wait",
  "conditions": [
    { "field": "priority", "operator": "equals", "value": "low" },
    { "field": "wait_time_minutes", "operator": "lte", "value": 10 }
  ],
  "match": "all",
  "action": "auto_resolve"
}
```
Supported operators: `equals`, `not_equals`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`.
Rules are evaluated in order; first match wins (standard policy-engine convention worth
mentioning in an interview — it's the same pattern firewall rules and spam filters use).

## What this project is meant to demonstrate

- **JavaScript proficiency** — not just syntax, but a real Node/Express service
  with routing, validation, and error handling.
- **JSON manipulation** — the core object of the system is a JSON schema you
  designed, validated, and evaluated.
- **Database work** — normalized schema, indexes, JSONB usage, parameterized
  queries (no SQL injection holes).
- **Testable, well-designed code** — the engine is isolated from HTTP/DB so
  it's unit tested in isolation; 11 passing tests included.
- **Process/policy automation framing** — the domain model (rules → tickets →
  auto-resolve/escalate) directly mirrors what a CommOps-style policy team does.

## Extending this (optional next steps)

1. **Swap frontend for React** — the API is already decoupled, so you can drop
   in `create-react-app` or Vite and point it at the same `/api` routes.
2. **Add rule versioning UI** — rulesets already store a `version` column;
   surface a diff view between versions.
3. **Add role-based conditions** — e.g. rules that vary by `city`, to mirror
   "regional vs global policy" language from real CommOps job descriptions.
4. **CI** — add a GitHub Actions workflow that runs `npm test` on every push;
   takes 10 minutes and is a strong signal of engineering hygiene.
