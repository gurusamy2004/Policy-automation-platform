const express = require("express");
const { pool } = require("../db");
const { validateRuleset, RuleValidationError } = require("../rules-engine");

const router = express.Router();

// GET /api/rules - list all rulesets (most recent first)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, version, rules, created_at FROM rulesets ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rulesets." });
  }
});

// POST /api/rules - create a new ruleset from JSON
// body: { name: string, rules: [...] }
router.post("/", async (req, res) => {
  const { name, rules } = req.body;
  if (!name) return res.status(400).json({ error: "'name' is required." });

  try {
    validateRuleset(rules);
  } catch (err) {
    if (err instanceof RuleValidationError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO rulesets (name, rules) VALUES ($1, $2) RETURNING id, name, version, rules, created_at",
      [name, JSON.stringify(rules)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save ruleset." });
  }
});

module.exports = router;
