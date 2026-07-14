#![cfg(test)]
extern crate std;

use crate::{RwaToken, RwaTokenClient};
use soroban_sdk::{testutils::Address as _, Address, Env, IntoVal, String};

#[test]
fn test_initialize_then_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(RwaToken, ());
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);

    let client = RwaTokenClient::new(&env, &contract_id);
    client.initialize(
        &admin,
        &operator,
        &7u32,
        &String::from_str(&env, "SolShare Brooklyn Array 01"),
        &String::from_str(&env, "sSHR-BK01"),
    );

    assert_eq!(client.decimals(), 7);
    assert_eq!(
        client.name(),
        String::from_str(&env, "SolShare Brooklyn Array 01")
    );
    assert_eq!(client.symbol(), String::from_str(&env, "sSHR-BK01"));
    assert_eq!(client.admin(), admin);
    assert_eq!(client.operator(), operator);
    assert_eq!(client.total_supply(), 0);
}

#[test]
fn test_double_initialize_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(RwaToken, ());
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let client = RwaTokenClient::new(&env, &contract_id);
    client.initialize(
        &admin,
        &operator,
        &7u32,
        &String::from_str(&env, "x"),
        &String::from_str(&env, "x"),
    );
    let res = client.try_initialize(
        &admin,
        &operator,
        &7u32,
        &String::from_str(&env, "y"),
        &String::from_str(&env, "y"),
    );
    assert!(res.is_err());
}

#[test]
fn test_mint_transfer_burn_flow() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(RwaToken, ());
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let client = RwaTokenClient::new(&env, &contract_id);
    client.initialize(
        &admin,
        &operator,
        &0u32,
        &String::from_str(&env, "s"),
        &String::from_str(&env, "s"),
    );

    client.mint(&alice, &1_000i128);
    assert_eq!(client.balance(&alice), 1_000);
    assert_eq!(client.total_supply(), 1_000);

    client.transfer(&alice, &bob, &400i128);
    assert_eq!(client.balance(&alice), 600);
    assert_eq!(client.balance(&bob), 400);

    client.burn(&alice, &100i128);
    assert_eq!(client.balance(&alice), 500);
    assert_eq!(client.total_supply(), 900);
}

#[test]
fn test_unauthorized_mint_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(RwaToken, ());
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let alice = Address::generate(&env);
    let imposter = Address::generate(&env);

    let client = RwaTokenClient::new(&env, &contract_id);
    client.initialize(
        &admin,
        &operator,
        &0u32,
        &String::from_str(&env, "x"),
        &String::from_str(&env, "x"),
    );

    // Try to mint as non-operator
    env.mock_auths(&[soroban_sdk::testutils::MockAuth {
        address: &imposter,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &contract_id,
            fn_name: "mint",
            args: soroban_sdk::vec![&env, alice.into_val(&env), 1_000i128.into_val(&env)],
            sub_invokes: &[],
        },
    }]);

    let r = client.try_mint(&alice, &1_000i128);
    assert!(r.is_err());
}

#[test]
fn test_approve_and_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(RwaToken, ());
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let spender = Address::generate(&env);

    let client = RwaTokenClient::new(&env, &contract_id);
    client.initialize(
        &admin,
        &operator,
        &0u32,
        &String::from_str(&env, "x"),
        &String::from_str(&env, "x"),
    );
    client.mint(&alice, &500i128);

    client.approve(&alice, &spender, &200i128, &10_000u32);
    assert_eq!(client.allowance(&alice, &spender), 200);

    client.transfer_from(&spender, &alice, &bob, &150i128);
    assert_eq!(client.balance(&alice), 350);
    assert_eq!(client.balance(&bob), 150);
    assert_eq!(client.allowance(&alice, &spender), 50);

    let r = client.try_transfer_from(&spender, &alice, &bob, &100i128);
    assert!(r.is_err());
}

#[test]
fn test_set_operator_admin_only() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(RwaToken, ());
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let new_operator = Address::generate(&env);
    let client = RwaTokenClient::new(&env, &contract_id);
    client.initialize(
        &admin,
        &operator,
        &0u32,
        &String::from_str(&env, "x"),
        &String::from_str(&env, "x"),
    );
    client.set_operator(&new_operator);
    assert_eq!(client.operator(), new_operator);
}

#[test]
fn test_version_returns_cargo_pkg_version() {
    // `version()` returns the crate semver as a Symbol with dots replaced by
    // underscores (Soroban Symbols only allow `[a-zA-Z0-9_]`).
    let env = Env::default();
    let version = RwaToken::version();
    // "0.1.0" → "0_1_0"
    let expected = soroban_sdk::Symbol::new(&env, "0_1_0");
    assert_eq!(version, expected);
}
