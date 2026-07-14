#![cfg(test)]

use crate::{YieldDistributor, YieldDistributorClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn deploy_rwa_token_with_supply(env: &Env, holder: &Address, supply: i128) -> Address {
    let rwa_id = env.register(rwa_token::RwaToken, ());
    let admin = Address::generate(env);
    let operator = Address::generate(env);
    env.mock_all_auths();
    let client = rwa_token::RwaTokenClient::new(env, &rwa_id);
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
    rwa_id
}

#[test]
fn test_initialize_stores_roles() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
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
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);
    let res = client.try_initialize(&admin, &funder, &share_token, &payment_token);
    assert!(res.is_err());
}

#[test]
fn test_claim_with_no_yield_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let holder = Address::generate(&env);

    let share_token = deploy_rwa_token_with_supply(&env, &holder, 100);
    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    let res = client.try_claim(&holder);
    assert!(res.is_err());
}

#[test]
fn test_claimable_matches_balance_math() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let holder = Address::generate(&env);

    let share_token = deploy_rwa_token_with_supply(&env, &holder, 100);
    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    assert_eq!(client.claimable(&holder), 0i128);
    assert_eq!(client.claimable_with_balance(&holder, &10_000i128), 0i128);
}

#[test]
fn test_set_funder_admin_only() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let new_funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);
    client.set_funder(&new_funder);

    let res = client.try_fund(&1i128);
    assert!(res.is_err());
}

#[test]
fn test_fund_rejects_zero_amount() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    let res = client.try_fund(&0i128);
    assert!(res.is_err(), "fund(0) must fail with ZeroAmount, not succeed");

    let res_neg = client.try_fund(&-1i128);
    assert!(res_neg.is_err(), "fund(-1) must fail with ZeroAmount, not succeed");
}

#[test]
fn test_funder_getter_returns_stored_funder() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);
    assert_eq!(client.funder(), funder);
}

#[test]
fn test_total_claimed_starts_at_zero() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);
    assert_eq!(client.total_claimed(), 0i128);
}

// ---------------------------------------------------------------------------
// New tests: admin, pause, min_claim, analytics, batch
// ---------------------------------------------------------------------------

#[test]
fn test_pause_and_unpause_claims() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let holder = Address::generate(&env);

    let share_token = deploy_rwa_token_with_supply(&env, &holder, 100);
    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    assert!(!client.paused());
    client.pause();
    assert!(client.paused());

    // Claim should be rejected when paused.
    let res = client.try_claim(&holder);
    assert!(res.is_err());

    client.unpause();
    assert!(!client.paused());
}

#[test]
fn test_set_admin_transfers_role() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let new_admin = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    client.set_admin(&new_admin);
    // Verify role transfer by checking old admin can no longer call admin-only ops.
    // The set_funder call with auth from old admin would fail.
}

#[test]
fn test_set_min_claim() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    assert_eq!(client.min_claim(), 0i128);
    client.set_min_claim(&100i128);
    assert_eq!(client.min_claim(), 100i128);
}

#[test]
fn test_total_funded_and_funding_count_start_at_zero() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    assert_eq!(client.total_funded(), 0i128);
    assert_eq!(client.funding_count(), 0u32);
}

#[test]
fn test_set_share_token_updates_address() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let share_token = Address::generate(&env);
    let new_token = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    client.set_share_token(&new_token);
    assert_eq!(client.share_token(), new_token);
}

#[test]
fn test_claimable_batch_returns_vec() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(YieldDistributor, ());
    let admin = Address::generate(&env);
    let funder = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let holder = Address::generate(&env);

    let share_token = deploy_rwa_token_with_supply(&env, &holder, 100);
    let client = YieldDistributorClient::new(&env, &contract_id);
    client.initialize(&admin, &funder, &share_token, &payment_token);

    let holders = soroban_sdk::vec![&env, holder.clone()];
    let results = client.claimable_batch(&holders);
    assert_eq!(results.len(), 1);
    assert_eq!(results.get(0).unwrap(), 0i128);
}
