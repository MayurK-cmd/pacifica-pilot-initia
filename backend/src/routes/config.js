const express = require("express");
const router = express.Router();
const Config = require("../models/Config");

// GET /api/config — get current config (default user)
router.get("/", async (req, res) => {
  try {
    let config = await Config.findOne({ userId: "default" });
    if (!config) {
      config = await Config.create({ userId: "default" });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config — update config
router.post("/", async (req, res) => {
  try {
    const allowed = [
      "symbols",
      "loopIntervalSeconds",
      "maxPositionUsdc",
      "minConfidence",
      "dryRun",
      "riskLevel",
      "enabled",
    ];

    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // Validate symbols — only allow known Pacifica markets
    if (update.symbols) {
      update.symbols = update.symbols
        .map((s) => s.toString().toUpperCase().trim())
        .filter((s) => s.length > 0)
        .slice(0, 10); // max 10 symbols
    }

    // Validate ranges
    if (update.loopIntervalSeconds)
      update.loopIntervalSeconds = Math.max(60, Math.min(3600, update.loopIntervalSeconds));
    if (update.maxPositionUsdc)
      update.maxPositionUsdc = Math.max(1, Math.min(10000, update.maxPositionUsdc));
    if (update.minConfidence)
      update.minConfidence = Math.max(0.5, Math.min(0.95, update.minConfidence));

    const config = await Config.findOneAndUpdate(
      { userId: "default" },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;