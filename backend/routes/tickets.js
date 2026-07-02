const express = require("express");
const { pool } = require("../db");
const { evaluateBatch } = require("../rules-engine");

const router = express.Router();

// GET /api/tickets - list tickets
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tickets ORDER BY created_at DESC LIMIT 200");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tickets." });
  }
});

// POST /api/tickets/evaluate - run a ruleset against tickets, persist results
// body: { rulesetId: number, ticketIds?: number[] }  (omit ticketIds to evaluate all)
router.post("/evaluate", async (req, res) => {
  const { rulesetId, ticketIds } = req.body;
  if (!rulesetId) return res.status(400).json({ error: "'rulesetId' is required." });

  try {
    const rulesetResult = await pool.query("SELECT rules FROM rulesets WHERE id = $1", [rulesetId]);
    if (rulesetResult.rows.length === 0) {
      return res.status(404).json({ error: "Ruleset not found." });
    }
    const rules = rulesetResult.rows[0].rules;

    const ticketQuery = ticketIds && ticketIds.length
      ? { text: "SELECT * FROM tickets WHERE id = ANY($1)", values: [ticketIds] }
      : { text: "SELECT * FROM tickets", values: [] };
    const { rows: tickets } = await pool.query(ticketQuery);

    const results = evaluateBatch(rules, tickets);

    // Persist evaluation results
    for (const r of results) {
      await pool.query(
        "INSERT INTO evaluations (ruleset_id, ticket_id, outcome, matched_rule_name) VALUES ($1, $2, $3, $4)",
        [rulesetId, r.ticketId, r.outcome, r.matchedRuleName]
      );
    }

    const summary = results.reduce((acc, r) => {
      acc[r.outcome] = (acc[r.outcome] || 0) + 1;
      return acc;
    }, {});

    res.json({ results, summary, totalEvaluated: results.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to evaluate tickets." });
  }
});

module.exports = router;
