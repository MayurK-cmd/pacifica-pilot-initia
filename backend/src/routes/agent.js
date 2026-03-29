const express  = require("express");
const router   = express.Router();
const { requireWallet } = require("../middleware/requireWallet");

// In-memory agent status per user
const userStatuses = new Map();

function getStatus(walletAddress) {
  return userStatuses.get(walletAddress) || {
    running: false,
    lastCycleAt: null,
    lastSymbol: null,
    cyclesCompleted: 0,
    errors: []
  };
}

function setStatus(walletAddress, status) {
  userStatuses.set(walletAddress, { ...getStatus(walletAddress), ...status });
}

// GET /api/agent/status - Get agent status for current user
router.get("/status", requireWallet, (req, res) => {
  res.json(getStatus(req.walletAddress));
});

// POST /api/agent/heartbeat - Agent sends heartbeat
router.post("/heartbeat", requireWallet, (req, res) => {
  const { symbol, cyclesCompleted, error } = req.body;
  const status = getStatus(req.walletAddress);

  status.running = true;
  status.lastCycleAt = new Date().toISOString();
  status.lastSymbol = symbol || status.lastSymbol;
  if (cyclesCompleted !== undefined) status.cyclesCompleted = cyclesCompleted;
  if (error) {
    status.errors.unshift({ error, timestamp: new Date().toISOString() });
    status.errors = status.errors.slice(0, 10);
  }

  userStatuses.set(req.walletAddress, status);
  res.json({ ok: true });
});

// POST /api/agent/stop - Stop agent for current user
router.post("/stop", requireWallet, (req, res) => {
  const status = getStatus(req.walletAddress);
  status.running = false;
  userStatuses.set(req.walletAddress, status);
  res.json({ ok: true, status });
});

// POST /api/agent/start - Start hosted agent (for future implementation)
router.post("/start", requireWallet, async (req, res) => {
  // Placeholder - actual implementation spawns Python process
  const status = getStatus(req.walletAddress);
  status.running = true;
  status.lastCycleAt = new Date().toISOString();
  userStatuses.set(req.walletAddress, status);
  res.json({ ok: true, status, message: "Agent started (placeholder)" });
});

module.exports = router;
