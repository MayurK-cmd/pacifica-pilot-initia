const express = require("express");
const router  = express.Router();
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");

const BASE_URL = process.env.PACIFICA_BASE_URL || "https://test-api.pacifica.fi/api/v1";

router.use(requireAuth);

// Helper: fetch + log full raw response for debugging
async function pacificaGet(label, url) {
  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    const text = await res.text(); // read as text first so we can log it raw
    console.log(`\n[Pacifica:${label}] Status: ${res.status}`);
    console.log(`[Pacifica:${label}] URL: ${url}`);
    console.log(`[Pacifica:${label}] Body: ${text.slice(0, 800)}`);

    if (!res.ok) {
      console.error(`[Pacifica:${label}] NON-OK status ${res.status}`);
      return { ok: false, status: res.status, data: null, raw: text };
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error(`[Pacifica:${label}] JSON parse failed:`, e.message);
      return { ok: false, status: res.status, data: null, raw: text };
    }

    return { ok: true, status: res.status, json, data: json.data ?? null };
  } catch (e) {
    console.error(`[Pacifica:${label}] Fetch error:`, e.message);
    return { ok: false, status: 0, data: null, error: e.message };
  }
}

// GET /api/portfolio?time_range=7d
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const pacificaAddress = user.pacificaAddress;

    if (!pacificaAddress) {
      return res.status(400).json({
        error: "Solana wallet address not configured.",
        hint:  "Add your Phantom wallet pubkey to your user record as 'pacificaAddress'.",
      });
    }

    const timeRange = req.query.time_range || "all";

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[Portfolio] Fetching for: ${pacificaAddress}`);
    console.log(`[Portfolio] Time range: ${timeRange}`);
    console.log(`${"=".repeat(60)}`);

    // Fire all requests in parallel
    const [acc, pos, ord, fund, trades, portfolio] = await Promise.all([
      pacificaGet("account",        `${BASE_URL}/account?account=${pacificaAddress}`),
      pacificaGet("positions",      `${BASE_URL}/positions?account=${pacificaAddress}`),
      pacificaGet("orders",         `${BASE_URL}/orders?account=${pacificaAddress}&status=OPEN`),
      pacificaGet("funding",        `${BASE_URL}/funding/history?account=${pacificaAddress}&limit=50`),
      pacificaGet("trades",         `${BASE_URL}/trades/history?account=${pacificaAddress}&limit=100`),
      pacificaGet("portfolio",      `${BASE_URL}/portfolio?account=${pacificaAddress}&time_range=${timeRange}`),
    ]);

    const accData       = acc.data       || {};
    const positionsData = pos.data       || [];
    const ordersData    = ord.data       || [];
    const fundingData   = fund.data      || [];
    const tradesData    = trades.data    || [];
    const portfolioData = portfolio.data || [];

    // Log first item of each to confirm actual field names from API
    if (positionsData.length > 0) console.log(`[Portfolio] First position:`, JSON.stringify(positionsData[0]));
    if (fundingData.length   > 0) console.log(`[Portfolio] First funding:`,  JSON.stringify(fundingData[0]));
    if (tradesData.length    > 0) console.log(`[Portfolio] First trade:`,    JSON.stringify(tradesData[0]));
    if (portfolioData.length > 0) console.log(`[Portfolio] First equity pt:`,JSON.stringify(portfolioData[0]));

    // ── Positions ────────────────────────────────────────────────────────────────
    // API: symbol, side ("bid"=long/"ask"=short), amount, entry_price,
    //      margin (isolated only), funding (funding paid since open), isolated
    const positions = positionsData
      .filter(p => parseFloat(p.amount || 0) !== 0)
      .map(p => ({
        symbol:       p.symbol,
        side:         p.side === "bid" ? "LONG" : "SHORT",
        size:         Math.abs(parseFloat(p.amount      || 0)),
        entryPrice:   parseFloat(p.entry_price          || 0),
        markPrice:    parseFloat(p.mark_price || p.entry_price || 0),
        unrealisedPnl:parseFloat(p.unrealized_pnl       || 0),
        margin:       parseFloat(p.margin               || 0),
        fundingPaid:  parseFloat(p.funding              || 0),
        isolated:     p.isolated || false,
        createdAt:    p.created_at,
        updatedAt:    p.updated_at,
      }));

    // ── Open Orders ──────────────────────────────────────────────────────────────
    const orders = ordersData.map(o => ({
      symbol:    o.symbol,
      type:      o.type   || "LIMIT",
      side:      o.side === "bid" ? "LONG" : "SHORT",
      size:      Math.abs(parseFloat(o.amount || o.size || 0)),
      price:     parseFloat(o.price  || 0),
      status:    (o.status || "OPEN").toUpperCase(),
      timestamp: o.created_at || o.timestamp,
    }));

    // ── Funding History ──────────────────────────────────────────────────────────
    // API: history_id, symbol, side, amount, payout (NOT "payment"), rate, created_at
    const funding = fundingData.map(f => ({
      symbol:         f.symbol,
      side:           f.side === "bid" ? "LONG" : "SHORT",
      positionAmount: parseFloat(f.amount  || 0),
      payment:        parseFloat(f.payout  || 0), // "payout" is the correct API field name
      rate:           parseFloat(f.rate    || 0),
      timestamp:      f.created_at,
    }));

    // ── Trade History ────────────────────────────────────────────────────────────
    // API: history_id, order_id, symbol, amount, price (market), entry_price (exec),
    //      fee, pnl, event_type ("fulfill_maker"/"fulfill_taker"),
    //      side ("open_long"/"close_short"/etc — NOT bid/ask), created_at, cause
    const history = tradesData.map(t => ({
      symbol:      t.symbol,
      side:        t.side,          // descriptive string, use as-is
      size:        Math.abs(parseFloat(t.amount      || 0)),
      execPrice:   parseFloat(t.entry_price          || 0),
      marketPrice: parseFloat(t.price                || 0),
      fee:         parseFloat(t.fee                  || 0),
      pnl:         parseFloat(t.pnl                  || 0),
      timestamp:   t.created_at,
      orderId:     t.order_id,
      historyId:   t.history_id,
      eventType:   t.event_type,
      cause:       t.cause,
    }));

    // ── Equity / PnL History ─────────────────────────────────────────────────────
    // API: account_equity, pnl, timestamp
    const equityHistory = portfolioData.map(e => ({
      timestamp: e.timestamp,
      equity:    parseFloat(e.account_equity || 0),
      pnl:       parseFloat(e.pnl            || 0),
    }));

    // ── Spot Balances (crypto holdings from account data) ─────────────────────────
    // API: spot_balances[{ symbol, amount, available_to_withdraw }]
    const spotBalances = (accData.spot_balances || []).map(b => ({
      symbol:             b.symbol,
      amount:             parseFloat(b.amount               || 0),
      availableToWithdraw: parseFloat(b.available_to_withdraw || 0),
    }));

    // ── Derived Stats ─────────────────────────────────────────────────────────────
    const totalVolumeUsdc    = history.reduce((sum, h) => sum + h.execPrice * h.size, 0);
    const totalUnrealisedPnl = positions.reduce((sum, p) => sum + p.unrealisedPnl, 0);

    res.json({
      pacificaAddress,

      // Account snapshot — GET /account
      accountEquity:       parseFloat(accData.account_equity        || 0),
      usdcBalance:         parseFloat(accData.balance               || 0),
      spotCollateral:      parseFloat(accData.spot_collateral       || 0),
      availableToSpend:    parseFloat(accData.available_to_spend    || 0),
      availableToWithdraw: parseFloat(accData.available_to_withdraw || 0),
      pendingBalance:      parseFloat(accData.pending_balance       || 0),
      pendingInterest:     parseFloat(accData.pending_interest      || 0),
      usedMargin:          parseFloat(accData.total_margin_used     || 0),
      crossMMR:            parseFloat(accData.cross_mmr             || 0),

      // Fees — API fields are "maker_fee" / "taker_fee" (NOT *_fee_rate)
      takerFeeRate:        parseFloat(accData.taker_fee             || 0.0004),
      makerFeeRate:        parseFloat(accData.maker_fee             || 0.00015),
      feeLevel:            parseInt(accData.fee_level               || 0),

      // Counts
      positionsCount:      parseInt(accData.positions_count         || 0),
      ordersCount:         parseInt(accData.orders_count            || 0),
      stopOrdersCount:     parseInt(accData.stop_orders_count       || 0),

      // Arrays
      positions,
      orders,
      history,
      funding,
      equityHistory,
      spotBalances,

      // Totals
      totalUnrealisedPnl,
      totalVolumeUsdc,
      updatedAt: accData.updated_at || null,

      // Debug block — remove once confirmed working
      _debug: {
        accountOk:       acc.ok,       accountStatus:   acc.status,
        positionsOk:     pos.ok,       positionsStatus: pos.status,
        ordersOk:        ord.ok,       ordersStatus:    ord.status,
        fundingOk:       fund.ok,      fundingStatus:   fund.status,
        tradesOk:        trades.ok,    tradesStatus:    trades.status,
        portfolioOk:     portfolio.ok, portfolioStatus: portfolio.status,
        positionsCount:  positionsData.length,
        fundingCount:    fundingData.length,
        tradesCount:     tradesData.length,
        equityCount:     portfolioData.length,
      },
    });
  } catch (e) {
    console.error("Portfolio API Error:", e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;