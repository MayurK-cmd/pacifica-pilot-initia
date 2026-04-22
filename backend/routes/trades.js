const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const { requireAuth } = require("../middleware/auth");
const { contractLogger } = require("../services/contractLogger");

const tradeSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  symbol:          { type: String, required: true, uppercase: true, trim: true },
  action:          { type: String, required: true, enum: ["LONG","SHORT","HOLD","EXIT"] },
  confidence:      { type: Number, default: null },
  reasoning:       { type: String, default: "" },
  size_pct:        { type: Number, default: 0 },
  mark_price:      { type: Number, default: null },
  rsi_14:          { type: Number, default: null },
  rsi_1h:          { type: Number, default: null },
  funding_rate:    { type: Number, default: null },
  change_24h:      { type: Number, default: null },
  sentiment_score: { type: Number, default: null },
  mention_count:   { type: Number, default: null },
  trending_score:  { type: Number, default: null },
  order:           { type: mongoose.Schema.Types.Mixed, default: null },
  dry_run:         { type: Boolean, default: true },
  pnl_usdc:        { type: Number, default: null },
  open_position:   { type: String, default: null },
  unrealized_pnl:  { type: String, default: null },
}, { timestamps: true });

tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ userId: 1, symbol: 1 });

const Trade = mongoose.models.Trade || mongoose.model("Trade", tradeSchema);

// GET /api/trades - requires JWT
router.get("/", requireAuth, async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.symbol) filter.symbol = req.query.symbol.toUpperCase();
    if (req.query.action) filter.action = req.query.action.toUpperCase();

    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const skip  = parseInt(req.query.skip) || 0;

    const [trades, total] = await Promise.all([
      Trade.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Trade.countDocuments(filter),
    ]);
    res.json({ total, limit, skip, trades });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/trades/stats - requires JWT
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const uid = req.user._id;
    const [total, byAction, withPnl] = await Promise.all([
      Trade.countDocuments({ userId: uid }),
      Trade.aggregate([{ $match: { userId: uid } }, { $group: { _id: "$action", count: { $sum: 1 } } }]),
      Trade.find({ userId: uid, pnl_usdc: { $ne: null } }).select("pnl_usdc").lean(),
    ]);
    const totalPnl = withPnl.reduce((s, t) => s + (t.pnl_usdc || 0), 0);
    res.json({
      totalDecisions: total,
      byAction: Object.fromEntries(byAction.map(r => [r._id, r.count])),
      totalPnlUsdc: parseFloat(totalPnl.toFixed(4)),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/trades/:id - requires JWT
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!trade) return res.status(404).json({ error: "Not found" });
    res.json(trade);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/trades — called by Python agent (uses x-agent-key, not JWT)
// Agent passes userId in the body so we can scope it correctly
router.post("/", async (req, res) => {
  try {
    const { symbol, action, userId } = req.body;
    if (!symbol || !action || !userId) {
      return res.status(400).json({ error: "symbol, action and userId are required" });
    }

    // Create trade in database first
    const trade = await Trade.create(req.body);

    // Log to contract (best effort, don't block response)
    contractLogger.logDecision(trade).then(receipt => {
      if (receipt) {
        console.log("[Trades] Logged to contract:", receipt.transactionHash);
        // Optionally update trade with contract tx hash
        Trade.findByIdAndUpdate(trade._id, { contractTxHash: receipt.transactionHash }).catch(() => {});
      }
    }).catch(err => console.error("[Trades] Contract log error:", err));

    res.status(201).json({ ...trade, contractLogging: "pending" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;