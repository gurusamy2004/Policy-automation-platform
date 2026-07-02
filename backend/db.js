const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/policy_automation",
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error on idle client", err);
});

module.exports = { pool };
