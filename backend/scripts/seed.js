const { pool } = require("../db");
const fs = require("fs");
const path = require("path");

async function seed() {
  const rules = JSON.parse(fs.readFileSync(path.join(__dirname, "../sample-data/rules.json"), "utf-8"));
  const tickets = JSON.parse(fs.readFileSync(path.join(__dirname, "../sample-data/tickets.json"), "utf-8"));

  await pool.query("INSERT INTO rulesets (name, rules) VALUES ($1, $2)", [
    "default_support_policy",
    JSON.stringify(rules),
  ]);
  console.log(`Inserted ruleset with ${rules.length} rules.`);

  for (const t of tickets) {
    await pool.query(
      "INSERT INTO tickets (city, category, priority, wait_time_minutes, payload) VALUES ($1, $2, $3, $4, $5)",
      [t.city, t.category, t.priority, t.wait_time_minutes, JSON.stringify(t.payload || {})]
    );
  }
  console.log(`Inserted ${tickets.length} tickets.`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
