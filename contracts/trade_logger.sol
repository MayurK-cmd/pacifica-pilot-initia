// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * TradeLogger - Logs AI trading decisions on Initia MiniEVM
 * Deploy via Remix: https://remix.ethereum.org
 */
contract TradeLogger {
    address public owner;
    uint64 public totalDecisions;

    mapping(address => bool) public authorizedAgents;
    mapping(uint64 => Decision) public decisions;

    struct Decision {
        uint64 id;
        address agent;
        string symbol;
        string action;
        uint64 price;
        uint64 pnlUsdc;
        bool pnlIsNeg;
        uint8 confidence;
        uint64 rsi5m;
        uint64 rsi1h;
        string reasoning;
        bool dryRun;
        uint64 timestamp;
    }

    event DecisionLogged(
        uint64 indexed id,
        address indexed agent,
        string symbol,
        string action,
        uint64 price,
        uint64 pnlUsdc,
        bool pnlIsNeg,
        uint8 confidence,
        uint64 rsi5m,
        uint64 rsi1h,
        string reasoning,
        bool dryRun,
        uint64 timestamp
    );

    error NotOwner();
    error NotAuthorized();
    error DecisionNotFound();

    constructor() {
        owner = msg.sender;
        authorizedAgents[msg.sender] = true;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedAgents[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }

    function addAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
    }

    function removeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
    }

    function logDecision(
        string memory symbol,
        string memory action,
        uint64 price,
        uint64 pnlUsdc,
        bool pnlIsNeg,
        uint8 confidence,
        uint64 rsi5m,
        uint64 rsi1h,
        string memory reasoning,
        bool dryRun,
        uint64 timestamp
    ) external onlyAuthorized {
        totalDecisions++;

        decisions[totalDecisions] = Decision({
            id: totalDecisions,
            agent: msg.sender,
            symbol: symbol,
            action: action,
            price: price,
            pnlUsdc: pnlUsdc,
            pnlIsNeg: pnlIsNeg,
            confidence: confidence,
            rsi5m: rsi5m,
            rsi1h: rsi1h,
            reasoning: reasoning,
            dryRun: dryRun,
            timestamp: timestamp
        });

        emit DecisionLogged(
            totalDecisions,
            msg.sender,
            symbol,
            action,
            price,
            pnlUsdc,
            pnlIsNeg,
            confidence,
            rsi5m,
            rsi1h,
            reasoning,
            dryRun,
            timestamp
        );
    }

    function getDecision(uint64 id) external view returns (Decision memory) {
        if (id == 0 || id > totalDecisions) revert DecisionNotFound();
        return decisions[id];
    }

    function getRecentDecisions(uint64 count) external view returns (Decision[] memory) {
        uint64 start = count > totalDecisions ? 0 : totalDecisions - count + 1;
        Decision[] memory result = new Decision[](totalDecisions - start + 1);

        for (uint64 i = start; i <= totalDecisions; i++) {
            result[i - start] = decisions[i];
        }

        return result;
    }
}
