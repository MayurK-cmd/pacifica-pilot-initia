const express = require("express");
const router = express.Router();

// In-memory agent status (the actual agent runs as a separate Python process)
// The Python agent polls /api/config and posts to /api/trades
// This route just exposes status for the dashboard

let agentStatus = {
  running: false,
  lastCycleAt: null,
  lastSymbol: null,
  cyclesCompleted: 0,
  errors: [],
};

// GET /api/agent/status
router.get("/status", (req, res) => {
  res.json(agentStatus);
});

// POST /api/agent/heartbeat — called by Python agent each cycle
router.post("/heartbeat", (req, res) => {
  const { symbol, cyclesCompleted, error } = req.body;
  agentStatus.running = true;
  agentStatus.lastCycleAt = new Date().toISOString();
  agentStatus.lastSymbol = symbol || agentStatus.lastSymbol;
  if (cyclesCompleted !== undefined) agentStatus.cyclesCompleted = cyclesCompleted;
  if (error) {
    agentStatus.errors.unshift({ error, timestamp: new Date().toISOString() });
    agentStatus.errors = agentStatus.errors.slice(0, 10); // keep last 10 errors
  }
  res.json({ ok: true });
});

// POST /api/agent/stop — mark agent as stopped
router.post("/stop", (req, res) => {
  agentStatus.running = false;
  res.json({ ok: true, status: agentStatus });
});

module.exports = router;