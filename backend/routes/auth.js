const express = require("express");
const router  = express.Router();
const { requireAuth, getNonce } = require("../middleware/auth");
const { encrypt, decrypt } = require("../middleware/crypto");
const User = require("../models/User");

// GET /api/auth/nonce
// Returns a nonce for the frontend to include in the signature
router.get("/nonce", (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Address required" });
  }
  res.json({ nonce: getNonce(address) });
});

// POST /api/auth/sync
// Called by frontend after wallet connect — syncs Initia address into our DB
router.post("/sync", requireAuth, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const update = {};
    if (walletAddress) update.walletAddress  = walletAddress;

    const user = await User.findByIdAndUpdate(
      req.user._id, { $set: update }, { new: true }
    ).select("-pacificaPrivateKey -pacificaApiKey");

    res.json({ user, onboarded: user.onboarded });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/keys
// Saves encrypted Pacifica private key (and optional API key) — onboarding step
router.post("/keys", requireAuth, async (req, res) => {
  try {
    const { pacificaPrivateKey, pacificaApiKey, pacificaAddress, initiaAddress } = req.body;

    if (!pacificaAddress) {
      return res.status(400).json({ error: "pacificaAddress is required" });
    }
    if (!pacificaPrivateKey) {
      return res.status(400).json({ error: "pacificaPrivateKey is required" });
    }

    const update = {
      pacificaAddress,                            // plain — it's a public key
      pacificaPrivateKey: encrypt(pacificaPrivateKey),
      onboarded: true,
    };
    if (initiaAddress) update.initiaAddress = initiaAddress;
    if (pacificaApiKey) update.pacificaApiKey = encrypt(pacificaApiKey);

    await User.findByIdAndUpdate(req.user._id, { $set: update });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me
// Returns current user's profile (no keys)
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-pacificaPrivateKey -pacificaApiKey");
  res.json(user);
});


router.post("/wallet", requireAuth, async (req, res) => {
  try {
    const { pacificaAddress } = req.body;
    if (!pacificaAddress || !pacificaAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
      return res.status(400).json({ error: "Invalid Solana address" });
    }
    await User.findByIdAndUpdate(req.user._id, { $set: { pacificaAddress } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
