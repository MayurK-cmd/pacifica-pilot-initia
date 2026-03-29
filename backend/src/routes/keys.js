const express     = require("express");
const router      = express.Router();
const User        = require("../models/User");
const { requireWallet } = require("../middleware/requireWallet");
const { encryptKey, decryptKey } = require("../lib/encryption");

// GET /api/keys - Check which keys are configured
router.get("/", requireWallet, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.walletAddress });
    if (!user) {
      return res.json({
        hasKeys: false,
        configured: {
          pacificaApiKey: false,
          pacificaPrivateKey: false,
          geminiApiKey: false,
          elfaApiKey: false,
        }
      });
    }

    res.json({
      hasKeys: user.hasKeys || false,
      configured: {
        pacificaApiKey: !!user.pacificaApiKey,
        pacificaPrivateKey: !!user.pacificaPrivateKey,
        geminiApiKey: !!user.geminiApiKey,
        elfaApiKey: !!user.elfaApiKey,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/keys - Save encrypted API keys
router.post("/", requireWallet, async (req, res) => {
  try {
    const {
      pacificaApiKey,
      pacificaPrivateKey,
      geminiApiKey,
      elfaApiKey
    } = req.body;

    const update = {};

    if (pacificaApiKey) {
      update.pacificaApiKey = encryptKey(pacificaApiKey);
    }
    if (pacificaPrivateKey) {
      update.pacificaPrivateKey = encryptKey(pacificaPrivateKey);
    }
    if (geminiApiKey) {
      update.geminiApiKey = encryptKey(geminiApiKey);
    }
    if (elfaApiKey) {
      update.elfaApiKey = encryptKey(elfaApiKey);
    }

    const user = await User.findOneAndUpdate(
      { userId: req.walletAddress },
      {
        $set: update,
        $set: { hasKeys: true, lastActiveAt: new Date() }
      },
      { new: true, upsert: true }
    );

    res.json({
      ok: true,
      configured: {
        pacificaApiKey: !!user.pacificaApiKey,
        pacificaPrivateKey: !!user.pacificaPrivateKey,
        geminiApiKey: !!user.geminiApiKey,
        elfaApiKey: !!user.elfaApiKey,
      }
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/keys - Delete all stored keys
router.delete("/", requireWallet, async (req, res) => {
  try {
    await User.findOneAndDelete({ userId: req.walletAddress });
    res.json({ ok: true, message: "Keys deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/keys/verify - Verify keys are valid (decrypt test)
router.post("/verify", requireWallet, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.walletAddress });
    if (!user || !user.hasKeys) {
      return res.status(400).json({ error: "No keys configured" });
    }

    // Test decryption
    const testKey = decryptKey(user.pacificaApiKey);
    res.json({ ok: true, message: "Keys verified successfully" });
  } catch (e) {
    res.status(500).json({ error: "Key verification failed: " + e.message });
  }
});

module.exports = router;
