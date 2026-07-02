const express = require("express");
const cors = require("cors");
require("dotenv").config();

const rulesRouter = require("./routes/rules");
const ticketsRouter = require("./routes/tickets");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/rules", rulesRouter);
app.use("/api/tickets", ticketsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Policy automation API running on http://localhost:${PORT}`));
