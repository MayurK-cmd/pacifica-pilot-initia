const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, index: true },
    action: { type: String, enum: ["LONG", "SHORT", "HOLD"], required: true },
    confidence: { type: Number, required: true },
    reasoning: { type: String, required: true },
    size_pct: { type: Number, default: 0 },
    mark_price: { type: Number },
    rsi_14: { type: Number },
    funding_rate: { type: Number },
    change_24h: { type: Number },
    sentiment_score: { type: Number },
    mention_count: { type: Number },
    trending_score: { type: Number },
    order: { type: mongoose.Schema.Types.Mixed, default: null },
    dry_run: { type: Boolean, default: true },
    pnl_usdc: { type: Number, default: null },
  },
  { timestamps: true }
);

// Index for fast recent-trades queries
tradeSchema.index({ createdAt: -1 });
tradeSchema.index({ symbol: 1, createdAt: -1 });

module.exports = mongoose.model("Trade", tradeSchema);