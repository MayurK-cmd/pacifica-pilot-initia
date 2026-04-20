const { verifyMessage } = require("viem");
const User = require("../models/User");
const Config = require("../models/Config");

// In-memory nonce store for signature verification
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
    const signature = req.headers["x-signature"];

    if (!authHeader || !signature) {
      return res.status(401).json({ error: "No auth header or signature" });
    }

    // Extract address from authorization header (format: "0xaddress")
    const address = authHeader.replace("Bearer ", "").trim();

    if (!address || !address.startsWith("0x")) {
      return res.status(401).json({ error: "Invalid address format" });
    }

    // Get or create nonce for this address
    const nonce = getNonce(address);

    // The message that was signed
    const message = `Sign in to PacificaPilot\n\nAddress: ${address}\nNonce: ${nonce}`;

    try {
      // Verify the signature
      const recoveredAddress = await verifyMessage({
        message,
        signature: signature,
      });

      // Check if recovered address matches
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ error: "Signature verification failed" });
      }
    } catch (e) {
      return res.status(401).json({ error: "Invalid signature" });
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
    return res.status(401).json({ error: "Authentication failed" });
  }
}

module.exports = { requireAuth, getNonce };
