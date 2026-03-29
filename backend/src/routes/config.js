const express  = require("express");
const router   = express.Router();
const Config   = require("../models/Config");
const { requireWallet } = require("../middleware/requireWallet");

// GET /api/config - Get user's config
router.get("/", requireWallet, async (req, res) => {
  try {
    let cfg = await Config.findOne({ userId: req.walletAddress });
    if (!cfg) {
      cfg = await Config.create({
        userId: req.walletAddress,
        walletAddress: req.walletAddress
      });
    }
    res.json(cfg);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/config - Update user's config
router.post("/", requireWallet, async (req, res) => {
  try {
    const allowed = ["symbols","loopIntervalSeconds","maxPositionUsdc","minConfidence",
                     "dryRun","riskLevel","enabled","agentMode","walletAddress"];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }

    // Ensure symbols are uppercase, trimmed, max 10
    if (update.symbols) {
      update.symbols = update.symbols
        .map(s => String(s).toUpperCase().trim())
        .filter(Boolean)
        .slice(0, 10);
    }

    // Validate ranges
    if (update.loopIntervalSeconds) {
      update.loopIntervalSeconds = Math.max(60, Math.min(3600, +update.loopIntervalSeconds));
    }
    if (update.maxPositionUsdc) {
      update.maxPositionUsdc = Math.max(1, Math.min(10000, +update.maxPositionUsdc));
    }
    if (update.minConfidence) {
      update.minConfidence = Math.max(0.5, Math.min(0.95, +update.minConfidence));
    }

    const cfg = await Config.findOneAndUpdate(
      { userId: req.walletAddress },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json(cfg);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
