const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");

// GET /api/trades?symbol=BTC&limit=50&action=SHORT
router.get("/", async (req, res) => {
  try {
    const { symbol, limit = 50, action, page = 1 } = req.query;
    const filter = {};
    if (symbol) filter.symbol = symbol.toUpperCase();
    if (action) filter.action = action.toUpperCase();

    const trades = await Trade.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Trade.countDocuments(filter);

    res.json({ trades, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trades/pnl — summary stats
router.get("/pnl", async (req, res) => {
  try {
    const { symbol } = req.query;
    const filter = symbol ? { symbol: symbol.toUpperCase() } : {};

    const [total, longs, shorts, holds, withPnl] = await Promise.all([
      Trade.countDocuments(filter),
      Trade.countDocuments({ ...filter, action: "LONG" }),
      Trade.countDocuments({ ...filter, action: "SHORT" }),
      Trade.countDocuments({ ...filter, action: "HOLD" }),
      Trade.find({ ...filter, pnl_usdc: { $ne: null } }).lean(),
    ]);

    const totalPnl = withPnl.reduce((sum, t) => sum + (t.pnl_usdc || 0), 0);
    const avgConfidence = await Trade.aggregate([
      { $match: filter },
      { $group: { _id: null, avg: { $avg: "$confidence" } } },
    ]);

    // Last 24h activity
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trades24h = await Trade.countDocuments({
      ...filter,
      createdAt: { $gte: since24h },
    });

    res.json({
      total,
      longs,
      shorts,
      holds,
      totalPnl: parseFloat(totalPnl.toFixed(4)),
      avgConfidence: avgConfidence[0]?.avg
        ? parseFloat(avgConfidence[0].avg.toFixed(3))
        : 0,
      trades24h,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trades/latest — just the most recent trade per symbol
router.get("/latest", async (req, res) => {
  try {
    const symbols = req.query.symbols
      ? req.query.symbols.split(",").map((s) => s.trim().toUpperCase())
      : await Trade.distinct("symbol");

    const latest = await Promise.all(
      symbols.map((sym) =>
        Trade.findOne({ symbol: sym }).sort({ createdAt: -1 }).lean()
      )
    );

    res.json(latest.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trades — called by Python agent to log a decision
router.post("/", async (req, res) => {
  try {
    const trade = new Trade(req.body);
    await trade.save();
    res.status(201).json(trade);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;