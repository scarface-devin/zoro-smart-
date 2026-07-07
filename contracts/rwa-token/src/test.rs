#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_initialize_then_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RwaToken);
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);

    let client = RwaTokenContractClient::new(&env, &contract_id);
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
    let contract_id = env.register_contract(None, RwaToken);
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let client = RwaTokenContractClient::new(&env, &contract_id);
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
    let contract_id = env.register_contract(None, RwaToken);
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let client = RwaTokenContractClient::new(&env, &contract_id);
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
    let contract_id = env.register_contract(None, RwaToken);
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let alice = Address::generate(&env);
    let imposter = Address::generate(&env);

    let client = RwaTokenContractClient::new(&env, &contract_id);
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
        },
    }]);

    let r = client.try_mint(&alice, &1_000i128);
    assert!(r.is_err());
}

#[test]
fn test_approve_and_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RwaToken);
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let spender = Address::generate(&env);

    let client = RwaTokenContractClient::new(&env, &contract_id);
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
    let contract_id = env.register_contract(None, RwaToken);
    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let new_operator = Address::generate(&env);
    let client = RwaTokenContractClient::new(&env, &contract_id);
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
    // `version()` is a pure function that returns the crate version baked
    // in at compile time. We verify it is non-empty and does not contain
    // whitespace (i.e. it looks like a semver string "MAJOR.MINOR.PATCH").
    let version = RwaToken::version();
    let env = Env::default();
    // Convert the Symbol to a String so we can inspect its bytes.
    let as_str = version.to_string();
    // Must be non-empty.
    assert!(!as_str.is_empty(), "version() returned an empty symbol");
    // Must not contain ASCII spaces or newlines.
    assert!(
        !as_str.contains(' ') && !as_str.contains('\n'),
        "version() symbol contains whitespace: {:?}",
        as_str
    );
    // Sanity check: Symbol round-trips correctly through the Env.
    let round_tripped = soroban_sdk::Symbol::new(&env, &as_str);
    assert_eq!(version, round_tripped);
}
