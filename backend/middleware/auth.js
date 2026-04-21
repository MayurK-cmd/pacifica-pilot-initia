const User = require("../models/User");
const Config = require("../models/Config");

// Simple nonce store - just for tracking sessions
const nonces = new Map();

function getNonce(address) {
  if (!nonces.has(address)) {
    nonces.set(address, Math.random().toString(36).substring(2, 15));
  }
  return nonces.get(address);
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No auth header" });
    }

    // Extract address from authorization header
    const address = authHeader.replace("Bearer ", "").trim();

    if (!address) {
      return res.status(401).json({ error: "Invalid address format" });
    }

    // For Initia addresses, we just verify the address format (bech32)
    // The actual security comes from the Pacifica private key verification later
    const isCosmosAddress = address.startsWith("init1");

    if (!isCosmosAddress) {
      return res.status(401).json({ error: "Invalid address format" });
    }

    // Find or create user doc
    let user = await User.findOne({ initiaAddress: address });
    if (!user) {
      user = await User.create({
        initiaAddress: address,
        walletAddress: address
      });
      // Auto-create a default config for them
      await Config.create({ userId: user._id });
    }

    req.user = user;
    next();
  } catch (e) {
    console.error("Auth error:", e);
    return res.status(401).json({ error: "Authentication failed: " + e.message });
  }
}

module.exports = { requireAuth, getNonce };
