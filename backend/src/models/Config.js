const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  userId:              { type: String, required: true, unique: true }, // wallet address
  symbols:             { type: [String], default: ["BTC","ETH"] },
  loopIntervalSeconds: { type: Number, default: 300 },
  maxPositionUsdc:     { type: Number, default: 50 },
  minConfidence:       { type: Number, default: 0.6 },
  dryRun:              { type: Boolean, default: true },
  riskLevel:           { type: String, enum: ["conservative","balanced","aggressive"], default: "balanced" },
  enabled:             { type: Boolean, default: false },
  agentMode:           { type: String, enum: ["local","hosted"], default: "local" },
  walletAddress:       { type: String, default: null },
}, { timestamps: true });

configSchema.index({ userId: 1 });

module.exports = mongoose.model("Config", configSchema);
