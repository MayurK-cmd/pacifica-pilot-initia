"""
sentiment.py — Pulls social sentiment signals from Elfa AI API (v2).
Docs: https://docs.elfa.ai/api/rest/elfa-api

Elfa AI v2 endpoints used:
  GET /v2/data/top-mentions?ticker=<symbol>&timeWindow=24h
      → returns {"success": bool, "data": [...mentions...]}
        each mention has: like_count, repost_count, view_count, etc.

  GET /v2/aggregations/trending-tokens?timeWindow=24h
      → returns {"success": bool, "data": [...tokens...]}
        each token item shape (experimental — may vary):
          { "token": {"symbol": "BTC", ...}, "count": 123, ... }
        OR a plain list of such items at the top level.

BUG FIXED: 'str' object has no attribute 'get' — the trending-tokens response
was being iterated as a string. Root cause: the response body is a dict with
"data" key, but iteration was falling through to a raw list path.
Now we defensively unwrap {"success", "data": [...]} OR a bare list.
"""

import os
import requests

ELFA_API_KEY  = os.getenv("ELFA_API_KEY", "")
ELFA_BASE_URL = "https://api.elfa.ai"


def _elfa_get(path: str, params: dict = None) -> dict:
    headers = {"x-elfa-api-key": ELFA_API_KEY}
    url = f"{ELFA_BASE_URL}{path}"
    resp = requests.get(url, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _unwrap(response) -> list:
    """
    Safely extract the list payload from an Elfa response.
    Handles:  {"success": true, "data": [...]}   → returns data list
              [...]                               → returns as-is
              anything else                       → returns []
    """
    if isinstance(response, dict):
        data = response.get("data", [])
        return data if isinstance(data, list) else []
    if isinstance(response, list):
        return response
    return []


def get_token_sentiment(symbol: str) -> dict:
    """
    Fetches sentiment + mention data for a token symbol (e.g. "BTC", "ETH").

    Returns:
        {
          "symbol": str,
          "sentiment_score": float,   # 0.0–1.0 (engagement-based; 0 = no data)
          "mention_count": int,       # top-mention count in 24h
          "trending_score": float,    # 0–100 rank-based
          "summary": str
        }
    """
    if not ELFA_API_KEY:
        return _mock_sentiment(symbol)

    mention_count  = 0
    sentiment_score = 0.0
    trending_score  = 0.0

    # ── 1. Top mentions → mention count + sentiment proxy ────────────────────
    try:
        raw      = _elfa_get("/v2/data/top-mentions", params={
            "ticker":     symbol,
            "timeWindow": "24h",
            "limit":      20,
        })
        mentions = _unwrap(raw)
        mention_count = len(mentions)

        if mentions:
            scores = []
            for m in mentions:
                likes    = float(m.get("like_count",    0) or 0)
                reposts  = float(m.get("repost_count",  0) or 0)
                replies  = float(m.get("reply_count",   0) or 0)
                views    = float(m.get("view_count",    1) or 1)
                
                # Raw engagement score
                raw_engagement = likes + reposts * 2 + replies
                
                # Use log scale to avoid crushing by huge view counts
                # A post with 100 likes / 10k views = good engagement
                import math
                if raw_engagement > 0:
                    log_eng  = math.log1p(raw_engagement)          # log(1+x)
                    log_view = math.log1p(max(views, 1))
                    ratio    = log_eng / max(log_view, 1)
                    # Normalize: ratio ~0.3-0.7 is typical for quality posts
                    normalised = min(ratio / 0.5, 1.0)
                else:
                    normalised = 0.0
                scores.append(normalised)

            raw_sent = sum(scores) / len(scores)
            # Scale to -1..+1 range: 0 = no engagement, 1 = very high
            # We treat high engagement as bullish signal
            sentiment_score = round(min(raw_sent * 2 - 0.5, 1.0), 4)
            sentiment_score = max(-1.0, min(1.0, sentiment_score))
    except Exception as e:
        print(f"[Elfa] Warning: could not fetch top-mentions for {symbol}: {e}")

    # ── 2. Trending tokens → trending score ──────────────────────────────────
    try:
        raw    = _elfa_get("/v2/aggregations/trending-tokens", params={
            "timeWindow": "24h",
            "pageSize":   100,  # expanded from 50 — BTC/ETH may be lower ranked
        })
        tokens = _unwrap(raw)

        found = False
        for rank_0, token_item in enumerate(tokens):
            if not isinstance(token_item, dict):
                continue

            token_obj = token_item.get("token", token_item)
            token_sym = str(token_obj.get("symbol", "")).upper()

            # Also check ticker field some API versions use
            if not token_sym:
                token_sym = str(token_item.get("ticker", "")).upper().lstrip("$")

            if token_sym == symbol.upper():
                rank           = rank_0 + 1
                trending_score = round(max(0.0, 100 - (rank - 1) * 1.0), 1)  # 1pt per rank
                if mention_count == 0:
                    mention_count = int(
                        token_item.get("count", 0) or
                        token_item.get("mentionCount", 0) or
                        token_item.get("mention_count", 0) or 0
                    )
                found = True
                break

        if not found:
            # BTC/ETH are always highly traded — if not in trending list,
            # assign a baseline score based on mention_count
            if mention_count >= 15:
                trending_score = 40.0
            elif mention_count >= 5:
                trending_score = 20.0
            else:
                trending_score = 5.0
            print(f"[Elfa] {symbol} not in top-100 trending — using mention-based score: {trending_score}")

    except Exception as e:
        print(f"[Elfa] Warning: could not fetch trending-tokens for {symbol}: {e}")

    return {
        "symbol":          symbol,
        "sentiment_score": sentiment_score,
        "mention_count":   mention_count,
        "trending_score":  trending_score,
        "summary":         _build_summary(symbol, sentiment_score, mention_count, trending_score),
    }


def _build_summary(symbol: str, sentiment: float, mentions: int, trending: float) -> str:
    mood  = "bullish" if sentiment > 0.2 else "bearish" if sentiment < -0.2 else "neutral"
    trend = "spiking" if trending > 60 else "elevated" if trending > 30 else "normal"
    return (
        f"{symbol} social mood is {mood} (score {sentiment:+.2f}), "
        f"with {mentions} quality mentions in 24h — trending activity is {trend}."
    )


def _mock_sentiment(symbol: str) -> dict:
    """Fallback mock if Elfa key not set."""
    return {
        "symbol":          symbol,
        "sentiment_score": 0.0,
        "mention_count":   0,
        "trending_score":  0.0,
        "summary":         f"[Mock] No Elfa API key — sentiment unavailable for {symbol}.",
    }