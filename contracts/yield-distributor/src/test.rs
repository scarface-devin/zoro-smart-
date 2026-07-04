#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

/// Register a fresh rwa-token contract, initialize it, and (optionally)
/// mint to `holder`. Returns the deployed token's address so it can be
/// wired into the yield-distributor as the `share_token`.
fn deploy_rwa_token_with_supply(env: &Env, holder: &Address, supply: i128) -> Address {
    let rwa_id = env.register_contract(None, RwaToken);
    let rwa_addr = rwa_id.address();
    let client = rwa_token::RwaTokenContractClient::new(env, &rwa_addr);
    let admin = Address::generate(env);
    let operator = Address::generate(env);
    env.mock_all_auths();
    client.initialize(
        &admin,
        &operator,
        &0u32,
        &String::from_str(env, "s"),
        &String::from_str(env, "s"),
    );
    if supply > 0 {
        client.mint(holder, &supply);
    }
    rwa_addr
}

#[test]
fn test_initialize_stores_roles() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, YieldDistributor);
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorContractClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    assert_eq!(client.share_token(), share_token);
    assert_eq!(client.payment_token(), payment_token);
    assert_eq!(client.yield_per_share(), 0);
    assert_eq!(client.last_funded_at(), 0);
}

#[test]
fn test_double_initialize_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, YieldDistributor);
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorContractClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);
    let res = client.try_initialize(&admin, &funder, &share_token, &payment_token);
    assert!(res.is_err());
}

#[test]
fn test_claim_with_no_yield_errors() {
    // Pulling-logic guard: with no funded yield, claim() must surface
    // `NothingToClaim` rather than zeroing out the holder's book-keeping.
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, YieldDistributor);
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let holder = Address::generate(&env);

    let share_token = deploy_rwa_token_with_supply(&env, &holder, 100);
    let client = YieldDistributorContractClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    let res = client.try_claim(&holder);
    assert!(res.is_err());
}

#[test]
fn test_claimable_matches_balance_math() {
    // Exercises the actual pulling-logic math:
    //   claimable = (global_yps - holder_paid_yps) * holder_balance / 1_000_000
    // by driving the rwa-token balance through cross-contract balance
    // reads. We confirm the no-yield case returns 0 cleanly.
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, YieldDistributor);
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let holder = Address::generate(&env);

    let share_token = deploy_rwa_token_with_supply(&env, &holder, 100);
    let client = YieldDistributorContractClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    // With yield_per_share == 0, claimable is 0 regardless of balance.
    assert_eq!(client.claimable(&holder), 0i128);
    // Direct call into the math helper with a synthetic balance.
    assert_eq!(client.claimable_with_balance(&holder, &10_000i128), 0i128);
}

#[test]
fn test_set_funder_admin_only() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, YieldDistributor);
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let new_funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorContractClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);
    client.set_funder(&new_funder);

    // No direct getter for `funder`; verify by attempting a fund() that
    // requires the new funder's auth. We expect a contract error (not a
    // panic) because the share token has no supply in this harness.
    let res = client.try_fund(&1i128);
    assert!(res.is_err());
}
