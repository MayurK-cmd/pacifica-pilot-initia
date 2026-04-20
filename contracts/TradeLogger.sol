// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * TradeLogger — On-chain audit log for PacificaPilot AI trading decisions.
 * Deployed on HashKey Chain (EVM).
 *
 * Every time the agent makes a trading decision (LONG / SHORT / HOLD / EXIT),
 * it calls logDecision() which stores a permanent, tamper-proof record on-chain.
 *
 * This gives traders and judges a verifiable history of every AI decision
 * with timestamp, price, RSI, confidence, and reasoning — all on HashKey Chain.
 */
contract TradeLogger {

    // ── Events ────────────────────────────────────────────────────────────────

    event DecisionLogged(
        uint256 indexed id,
        address indexed agent,
        string  symbol,
        string  action,       // "LONG" | "SHORT" | "HOLD" | "EXIT"
        uint256 price,        // mark price × 1e6 (e.g. $66500.00 → 66500000000)
        int256  pnlUsdc,      // realised PnL × 1e6 (negative = loss), 0 if none
        uint8   confidence,   // 0–100 (e.g. 80 = 80%)
        int16   rsi5m,        // RSI × 100 (e.g. 6107 = 61.07), -1 if unavailable
        int16   rsi1h,        // RSI × 100, -1 if unavailable
        string  reasoning,    // plain-English explanation from Gemini
        bool    dryRun        // true = paper trade, false = live
    );

    // ── Storage ───────────────────────────────────────────────────────────────

    struct Decision {
        uint256 id;
        address agent;
        string  symbol;
        string  action;
        uint256 price;
        int256  pnlUsdc;
        uint8   confidence;
        int16   rsi5m;
        int16   rsi1h;
        string  reasoning;
        bool    dryRun;
        uint256 timestamp;
    }

    address public owner;
    uint256 public totalDecisions;

    // id → Decision
    mapping(uint256 => Decision) public decisions;
    // agent address → list of decision IDs
    mapping(address => uint256[]) public agentDecisions;

    // ── Access control ────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // Authorised agent addresses that can log decisions
    mapping(address => bool) public authorizedAgents;

    modifier onlyAgent() {
        require(
            authorizedAgents[msg.sender] || msg.sender == owner,
            "Not authorised agent"
        );
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        authorizedAgents[msg.sender] = true;
    }

    // ── Agent management ──────────────────────────────────────────────────────

    function addAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
    }

    function removeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
    }

    // ── Core logging function ─────────────────────────────────────────────────

    /**
     * @param symbol      Token symbol e.g. "BTC"
     * @param action      "LONG" | "SHORT" | "HOLD" | "EXIT"
     * @param price       Mark price multiplied by 1e6
     * @param pnlUsdc     Realised PnL × 1e6 (0 if no position closed)
     * @param confidence  0–100 integer
     * @param rsi5m       RSI 5m × 100 (-1 if unavailable)
     * @param rsi1h       RSI 1h × 100 (-1 if unavailable)
     * @param reasoning   Plain-English reasoning string (max ~500 chars)
     * @param dryRun      True if paper trading
     */
    function logDecision(
        string  calldata symbol,
        string  calldata action,
        uint256          price,
        int256           pnlUsdc,
        uint8            confidence,
        int16            rsi5m,
        int16            rsi1h,
        string  calldata reasoning,
        bool             dryRun
    ) external onlyAgent returns (uint256 id) {
        id = ++totalDecisions;

        decisions[id] = Decision({
            id:         id,
            agent:      msg.sender,
            symbol:     symbol,
            action:     action,
            price:      price,
            pnlUsdc:    pnlUsdc,
            confidence: confidence,
            rsi5m:      rsi5m,
            rsi1h:      rsi1h,
            reasoning:  reasoning,
            dryRun:     dryRun,
            timestamp:  block.timestamp
        });

        agentDecisions[msg.sender].push(id);

        emit DecisionLogged(
            id, msg.sender, symbol, action,
            price, pnlUsdc, confidence,
            rsi5m, rsi1h, reasoning, dryRun
        );
    }

    // ── Read functions ────────────────────────────────────────────────────────

    function getDecision(uint256 id) external view returns (Decision memory) {
        require(id > 0 && id <= totalDecisions, "Decision not found");
        return decisions[id];
    }

    function getAgentDecisionCount(address agent) external view returns (uint256) {
        return agentDecisions[agent].length;
    }

    function getAgentDecisionIds(address agent)
        external view returns (uint256[] memory)
    {
        return agentDecisions[agent];
    }

    /**
     * Get the last N decisions across all agents (newest first).
     * Useful for the frontend dashboard.
     */
    function getRecentDecisions(uint256 count)
        external view returns (Decision[] memory)
    {
        uint256 total = totalDecisions;
        if (count > total) count = total;
        Decision[] memory result = new Decision[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = decisions[total - i];
        }
        return result;
    }
}
