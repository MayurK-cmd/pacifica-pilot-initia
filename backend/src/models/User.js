const mongoose = require("mongoose");

const encryptedFieldSchema = {
  iv: { type: String, required: true },
  encrypted: { type: String, required: true },
  authTag: { type: String, required: true }
};

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // wallet address

  // Encrypted API keys
  pacificaApiKey: { type: encryptedFieldSchema, default: null },
  pacificaPrivateKey: { type: encryptedFieldSchema, default: null },
  geminiApiKey: { type: encryptedFieldSchema, default: null },
  elfaApiKey: { type: encryptedFieldSchema, default: null },

  // Metadata
  hasKeys: { type: Boolean, default: false },
  lastActiveAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.index({ userId: 1 });

module.exports = mongoose.model("User", userSchema);
