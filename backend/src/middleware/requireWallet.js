/**
 * Middleware to extract and validate wallet address from request headers.
 * Must be used after express.json() middleware.
 */
function requireWallet(req, res, next) {
  const wallet = req.headers['x-wallet-address'];

  if (!wallet || typeof wallet !== 'string') {
    return res.status(401).json({ error: 'Wallet address required. Please connect your wallet.' });
  }

  // Normalize wallet address (lowercase, trimmed)
  req.walletAddress = wallet.toLowerCase().trim();

  // Basic validation - Ethereum/Solana addresses are 0x... or base58
  if (!req.walletAddress.startsWith('0x') && req.walletAddress.length < 32) {
    return res.status(400).json({ error: 'Invalid wallet address format' });
  }

  next();
}

/**
 * Optional wallet middleware - sets wallet if provided but doesn't require it
 */
function optionalWallet(req, res, next) {
  const wallet = req.headers['x-wallet-address'];
  if (wallet && typeof wallet === 'string') {
    req.walletAddress = wallet.toLowerCase().trim();
  }
  next();
}

module.exports = { requireWallet, optionalWallet };
