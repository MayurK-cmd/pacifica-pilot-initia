"""
strategy.py — Gemini 2.5 Flash trading decisions with improved fallback.

Fixes:
  - Fallback uses confidence calibration + size adjustment
  - Funding rate threshold calibrated (1e-4 not 0.001)
  - Multi-timeframe context (1h RSI passed alongside 5m)
  - Clearer prompt with calibrated thresholds
"""

import os, json
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SYSTEM_PROMPT = """
You are PacificaPilot — an autonomous trading agent for Pacifica perpetual futures markets.
You receive market data and social sentiment. Decide: LONG, SHORT, or HOLD.

Key calibration notes:
- RSI below 35 = oversold (lean long). RSI above 65 = overbought (lean short). RSI 40-60 = neutral (lean hold).
- Funding rate: values below 1e-4 are essentially neutral. Only treat as significant if |rate| > 1e-4.
  Positive funding (longs pay) = crowded longs = slightly bearish signal.
  Negative funding (shorts pay) = crowded shorts = slightly bullish signal.
- Sentiment: engagement-based score, not polarity. Treat as confirming signal, not primary.
  High engagement can be FUD or hype — weight it 20% max.
- Multi-timeframe: if 1h RSI contradicts 5m RSI, prefer 1h direction for trend, 5m for timing.
- Default to HOLD when conflicting signals or low confidence. Being flat is a valid position.
- size_pct: use 0.25 for weak signals, 0.5 for moderate, 0.75-1.0 for strong confluence.

Respond ONLY with valid JSON, no markdown:
{
  "action": "LONG" | "SHORT" | "HOLD",
  "confidence": 0.0 to 1.0,
  "reasoning": "2-3 plain English sentences a non-expert can understand",
  "size_pct": 0.25 | 0.5 | 0.75 | 1.0
}
"""


def _response_text(response) -> str:
    t = getattr(response, "text", None)
    if t:
        return t.strip()
    cands = getattr(response, "candidates", None) or []
    if cands:
        parts = getattr(cands[0].content, "parts", None) or []
        if parts:
            return getattr(parts[0], "text", "").strip()
    return ""


def _normalize(raw: dict, market: dict) -> dict:
    action = str(raw.get("action", "HOLD")).upper()
    if action not in ("LONG", "SHORT", "HOLD"):
        action = "HOLD"
    try:
        conf = float(raw.get("confidence", 0.5))
    except (TypeError, ValueError):
        conf = 0.5
    conf = max(0.0, min(1.0, conf))
    try:
        size = float(raw.get("size_pct", 0.5))
    except (TypeError, ValueError):
        size = 0.5
    size = min((0.25, 0.5, 0.75, 1.0), key=lambda x: abs(x - size))
    return {
        "action":     action,
        "confidence": conf,
        "reasoning":  str(raw.get("reasoning", "No reasoning provided.")),
        "size_pct":   size,
        "symbol":     market["symbol"],
        "mark_price": market["mark_price"],
    }


def decide(market: dict, sentiment: dict) -> dict:
    rsi_5m = market.get("rsi_14")
    rsi_1h = market.get("rsi_1h")
    rsi_5m_str = f"{rsi_5m:.2f}" if rsi_5m is not None else "N/A (insufficient candles)"
    rsi_1h_str = f"{rsi_1h:.2f}" if rsi_1h is not None else "N/A"
    funding = market.get("funding_rate", 0) or 0

    user_msg = f"""
Market: {market['symbol']}
- Mark price:     ${market['mark_price']:,.2f}
- 24h change:     {market['change_24h']:.2f}%
- RSI-14 (5m):    {rsi_5m_str}
- RSI-14 (1h):    {rsi_1h_str}
- Funding rate:   {funding:.6f}  (neutral if |rate| < 0.0001)
- Volume 24h:     ${market.get('volume_24h', 0):,.0f}

Social sentiment (Elfa AI — engagement-based, not polarity):
- Score:          {sentiment['sentiment_score']:+.3f}  (-1=low engagement, +1=high engagement)
- Mentions (24h): {sentiment['mention_count']}
- Trending rank:  {sentiment['trending_score']:.0f}/100
- Summary:        {sentiment['summary']}

Open position:    {market.get('open_position', 'None')}
Unrealised PnL:   {market.get('unrealized_pnl', 'N/A')}

What is your trading decision?
"""

    if not GEMINI_API_KEY:
        return _fallback(market, sentiment)

    try:
        client   = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_msg,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT, temperature=0.25),
        )
        text = _response_text(response)
        if not text:
            raise ValueError("Empty response")
        # Strip markdown fences if present
        if "```" in text:
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]
        return _normalize(json.loads(text.strip()), market)
    except Exception as e:
        print(f"[Strategy] Gemini failed for {market['symbol']}: {e} — using fallback")
        return _fallback(market, sentiment)


def _fallback(market: dict, sentiment: dict) -> dict:
    """
    Improved rule-based fallback with calibrated thresholds and confidence scaling.
    Uses 1h RSI as primary trend, 5m RSI for timing confirmation.
    """
    rsi_5m   = market.get("rsi_14") or 50.0
    rsi_1h   = market.get("rsi_1h") or rsi_5m   # fallback to 5m if 1h unavailable
    sent     = sentiment.get("sentiment_score", 0.0) or 0.0
    funding  = market.get("funding_rate", 0.0) or 0.0

    # Calibrated funding threshold
    FUNDING_THRESHOLD = 1e-4

    action     = "HOLD"
    confidence = 0.45
    size_pct   = 0.25
    signals    = []

    # Long signals
    long_score = 0
    if rsi_1h < 35:
        long_score += 3; signals.append(f"1h RSI oversold ({rsi_1h:.1f})")
    elif rsi_1h < 45:
        long_score += 1; signals.append(f"1h RSI low ({rsi_1h:.1f})")
    if rsi_5m < 35:
        long_score += 2; signals.append(f"5m RSI oversold ({rsi_5m:.1f})")
    if funding < -FUNDING_THRESHOLD:
        long_score += 1; signals.append("crowded shorts (neg funding)")
    if sent > 0.3:
        long_score += 1; signals.append(f"high engagement ({sent:.2f})")

    # Short signals
    short_score = 0
    if rsi_1h > 65:
        short_score += 3; signals.append(f"1h RSI overbought ({rsi_1h:.1f})")
    elif rsi_1h > 55:
        short_score += 1; signals.append(f"1h RSI elevated ({rsi_1h:.1f})")
    if rsi_5m > 65:
        short_score += 2; signals.append(f"5m RSI overbought ({rsi_5m:.1f})")
    if funding > FUNDING_THRESHOLD:
        short_score += 1; signals.append("crowded longs (pos funding)")

    threshold = 4   # need score >= 4 to act
    if long_score >= threshold and long_score > short_score:
        action     = "LONG"
        confidence = min(0.5 + (long_score - threshold) * 0.08, 0.82)
        size_pct   = 0.25 if long_score < 5 else (0.5 if long_score < 7 else 0.75)
    elif short_score >= threshold and short_score > long_score:
        action     = "SHORT"
        confidence = min(0.5 + (short_score - threshold) * 0.08, 0.82)
        size_pct   = 0.25 if short_score < 5 else (0.5 if short_score < 7 else 0.75)

    reasoning = f"[Fallback] {action}: " + (", ".join(signals) if signals else f"No clear signal — RSI 5m={rsi_5m:.1f} 1h={rsi_1h:.1f}, funding={funding:.6f}")

    return {
        "action":     action,
        "confidence": round(confidence, 3),
        "reasoning":  reasoning,
        "size_pct":   size_pct,
        "symbol":     market["symbol"],
        "mark_price": market["mark_price"],
    }