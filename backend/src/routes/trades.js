const express  = require("express");
const router   = express.Router();
const Trade    = require("../models/Trade");
const { requireWallet, optionalWallet } = require("../middleware/requireWallet");

// GET /api/trades - Get user's trades
router.get("/", optionalWallet, async (req, res) => {
  try {
    const { symbol, limit = 100, action, page = 1 } = req.query;
    const filter = { userId: req.walletAddress || "anonymous" };

    if (symbol) filter.symbol = symbol.toUpperCase();
    if (action) filter.action = action.toUpperCase();

    const [trades, total] = await Promise.all([
      Trade.find(filter).sort({ createdAt: -1 }).limit(+limit).skip((+page-1) * +limit).lean(),
      Trade.countDocuments(filter),
    ]);
    res.json({ trades, total, page: +page, limit: +limit });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/trades/pnl - Get user's PnL stats
router.get("/pnl", optionalWallet, async (req, res) => {
  try {
    const { symbol } = req.query;
    const filter = { userId: req.walletAddress || "anonymous" };
    if (symbol) filter.symbol = symbol.toUpperCase();

    const since24h = new Date(Date.now() - 86400000);

    const [total, longs, shorts, holds, exits, trades24h, withPnl, avgConf] = await Promise.all([
      Trade.countDocuments(filter),
      Trade.countDocuments({ ...filter, action: "LONG" }),
      Trade.countDocuments({ ...filter, action: "SHORT" }),
      Trade.countDocuments({ ...filter, action: "HOLD" }),
      Trade.countDocuments({ ...filter, action: "EXIT" }),
      Trade.countDocuments({ ...filter, createdAt: { $gte: since24h } }),
      Trade.find({ ...filter, pnl_usdc: { $ne: null } }).lean(),
      Trade.aggregate([{ $match: filter }, { $group: { _id: null, avg: { $avg: "$confidence" } } }]),
    ]);

    const totalPnl = withPnl.reduce((s, t) => s + (t.pnl_usdc || 0), 0);
    res.json({
      total, longs, shorts, holds, exits, trades24h,
      totalPnl: parseFloat(totalPnl.toFixed(4)),
      avgConfidence: avgConf[0]?.avg ? parseFloat(avgConf[0].avg.toFixed(3)) : 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/trades/latest - Get latest trade per symbol for user
router.get("/latest", optionalWallet, async (req, res) => {
  try {
    const filter = { userId: req.walletAddress || "anonymous" };
    const syms = req.query.symbols
      ? req.query.symbols.split(",").map(s => s.trim().toUpperCase())
      : await Trade.distinct("symbol", filter);

    const latest = await Promise.all(
      syms.map(s => Trade.findOne({ ...filter, symbol: s }).sort({ createdAt: -1 }).lean())
    );
    res.json(latest.filter(Boolean));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/trades - Create a new trade (agent writes here)
router.post("/", requireWallet, async (req, res) => {
  try {
    const tradeData = { ...req.body, userId: req.walletAddress };
    const trade = await Trade.create(tradeData);
    res.status(201).json(trade);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
