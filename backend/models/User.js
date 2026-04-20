const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  initiaAddress:    { type: String, required: true, unique: true },
  email:            { type: String, default: null },
  walletAddress:    { type: String, default: null },
  // AES-256 encrypted — never stored plain
  pacificaAddress: { type: String, default: null }, // Pacifica/Phantom wallet pubkey
  pacificaPrivateKey: { type: String, default: null },
  pacificaApiKey:     { type: String, default: null },
  onboarded:        { type: Boolean, default: false }, // true once key is saved
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);