module trade_logger_addr::trade_logger {

    use std::event;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    // Errors
    const E_NOT_OWNER: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_DECISION_NOT_FOUND: u64 = 3;

    // Events
    #[event]
    struct DecisionLogged has drop, store {
        id:         u64,
        agent:      address,
        symbol:     String,
        action:     String,
        price:      u64,
        pnl_usdc:   u64,
        pnl_is_neg: bool,
        confidence: u8,
        rsi_5m:     u64,
        rsi_1h:     u64,
        reasoning:  String,
        dry_run:    bool,
        timestamp:  u64,
    }

    // Storage
    struct Decision has store, copy, drop {
        id:         u64,
        agent:      address,
        symbol:     String,
        action:     String,
        price:      u64,
        pnl_usdc:   u64,
        pnl_is_neg: bool,
        confidence: u8,
        rsi_5m:     u64,
        rsi_1h:     u64,
        reasoning:  String,
        dry_run:    bool,
        timestamp:  u64,
    }

    struct TradeLoggerStore has key {
        owner:             address,
        total_decisions:   u64,
        decisions:         vector<Decision>,
        authorized_agents: vector<address>,
    }

    // Init
    fun init_module(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        let agents = vector::empty<address>();
        vector::push_back(&mut agents, deployer_addr);

        move_to(deployer, TradeLoggerStore {
            owner:             deployer_addr,
            total_decisions:   0,
            decisions:         vector::empty<Decision>(),
            authorized_agents: agents,
        });
    }

    // Access helpers
    fun is_authorized(store: &TradeLoggerStore, addr: address): bool {
        if (addr == store.owner) { return true };
        let agents = &store.authorized_agents;
        let len = vector::length(agents);
        let i = 0;
        while (i < len) {
            if (*vector::borrow(agents, i) == addr) { return true };
            i = i + 1;
        };
        false
    }

    // Owner functions
    public entry fun add_agent(
        caller: &signer,
        agent:  address,
    ) acquires TradeLoggerStore {
        let store = borrow_global_mut<TradeLoggerStore>(@trade_logger_addr);
        assert!(signer::address_of(caller) == store.owner, E_NOT_OWNER);
        vector::push_back(&mut store.authorized_agents, agent);
    }

    public entry fun remove_agent(
        caller: &signer,
        agent:  address,
    ) acquires TradeLoggerStore {
        let store = borrow_global_mut<TradeLoggerStore>(@trade_logger_addr);
        assert!(signer::address_of(caller) == store.owner, E_NOT_OWNER);
        let agents = &mut store.authorized_agents;
        let len = vector::length(agents);
        let i = 0;
        while (i < len) {
            if (*vector::borrow(agents, i) == agent) {
                vector::remove(agents, i);
                return
            };
            i = i + 1;
        };
    }

    // Core: log a decision
    public entry fun log_decision(
        caller:     &signer,
        symbol:     String,
        action:     String,
        price:      u64,
        pnl_usdc:   u64,
        pnl_is_neg: bool,
        confidence: u8,
        rsi_5m:     u64,
        rsi_1h:     u64,
        reasoning:  String,
        dry_run:    bool,
        timestamp:  u64,
    ) acquires TradeLoggerStore {
        let caller_addr = signer::address_of(caller);
        let store = borrow_global_mut<TradeLoggerStore>(@trade_logger_addr);
        assert!(is_authorized(store, caller_addr), E_NOT_AUTHORIZED);

        store.total_decisions = store.total_decisions + 1;
        let id = store.total_decisions;

        let decision = Decision {
            id, agent: caller_addr,
            symbol, action, price,
            pnl_usdc, pnl_is_neg, confidence,
            rsi_5m, rsi_1h, reasoning,
            dry_run, timestamp,
        };

        vector::push_back(&mut store.decisions, decision);

        event::emit(DecisionLogged {
            id, agent: caller_addr,
            symbol, action, price,
            pnl_usdc, pnl_is_neg, confidence,
            rsi_5m, rsi_1h, reasoning,
            dry_run, timestamp,
        });
    }

    // Read functions
    #[view]
    public fun get_total_decisions(): u64 acquires TradeLoggerStore {
        borrow_global<TradeLoggerStore>(@trade_logger_addr).total_decisions
    }

    #[view]
    public fun get_decision(id: u64): Decision acquires TradeLoggerStore {
        let store = borrow_global<TradeLoggerStore>(@trade_logger_addr);
        assert!(id > 0 && id <= store.total_decisions, E_DECISION_NOT_FOUND);
        *vector::borrow(&store.decisions, id - 1)
    }

    #[view]
    public fun get_recent_decisions(count: u64): vector<Decision> acquires TradeLoggerStore {
        let store = borrow_global<TradeLoggerStore>(@trade_logger_addr);
        let total = store.total_decisions;
        if (count > total) { count = total };
        let result = vector::empty<Decision>();
        let i = 0;
        while (i < count) {
            let idx = total - 1 - i;
            vector::push_back(&mut result, *vector::borrow(&store.decisions, idx));
            i = i + 1;
        };
        result
    }

    // Tests
    #[test_only]
    use std::account;

    #[test(deployer = @trade_logger_addr)]
    fun test_log_decision(deployer: &signer) acquires TradeLoggerStore {
        account::create_account_for_test(signer::address_of(deployer));
        init_module(deployer);

        assert!(get_total_decisions() == 0, 0);

        log_decision(
            deployer,
            string::utf8(b"BTC"),
            string::utf8(b"LONG"),
            66500000000u64,
            0u64,
            false,
            80u8,
            4500u64,
            3800u64,
            string::utf8(b"RSI oversold on 1h, funding negative, sentiment bullish."),
            true,
            1712345678u64,
        );

        assert!(get_total_decisions() == 1, 1);
        let d = get_decision(1);
        assert!(d.confidence == 80u8, 2);
    }
}
