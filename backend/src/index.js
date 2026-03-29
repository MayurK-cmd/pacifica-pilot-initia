const express     = require("express");
const cors        = require("cors");
const mongoose    = require("mongoose");
require("dotenv").config();

const tradesRouter = require("./routes/trades");
const configRouter = require("./routes/config");
const agentRouter  = require("./routes/agent");
const keysRouter   = require("./routes/keys");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const API_SECRET = process.env.AGENT_API_SECRET || "";

function requireApiKey(req, res, next) {
  if (!API_SECRET) return next();
  const key = req.headers["x-agent-key"] || req.query.key;
  if (key !== API_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Routes
// GET public (dashboard reads), POST protected (agent writes)
app.use("/api/trades", (req, res, next) => {
  if (req.method === "POST") return requireApiKey(req, res, next);
  next();
}, tradesRouter);

app.use("/api/config", requireApiKey, configRouter);
app.use("/api/agent",  requireApiKey, agentRouter);
app.use("/api/keys",   keysRouter); // Key management routes have their own auth

app.get("/health", (_, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("[DB] Connected");
    app.listen(PORT, () => console.log(`[Server] Port ${PORT}`));
  })
  .catch((e) => { console.error("[DB] Failed:", e.message); process.exit(1); });