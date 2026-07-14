#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

#[test]
fn test_initialize_stores_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);
    // Re-init should fail
    let res = client.try_initialize(&admin);
    assert!(res.is_err());
}

#[test]
fn test_set_validators_then_get_round_trip() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let v1 = BytesN::from_array(&env, &[1u8; 32]);
    let v2 = BytesN::from_array(&env, &[2u8; 32]);
    let v3 = BytesN::from_array(&env, &[3u8; 32]);

    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    let validators = soroban_sdk::vec![&env, v1.clone(), v2.clone(), v3.clone()];
    client.set_validators(&1u32, &validators, &2u32);
    assert_eq!(client.get_threshold(&1u32), 2);

    let got = client.get_validators(&1u32);
    assert_eq!(got.len(), 3);
    assert_eq!(got.get(0).unwrap(), v1);
    assert_eq!(got.get(1).unwrap(), v2);
    assert_eq!(got.get(2).unwrap(), v3);
}

#[test]
fn test_set_validators_rejects_bad_threshold() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let v1 = BytesN::from_array(&env, &[1u8; 32]);
    let v2 = BytesN::from_array(&env, &[2u8; 32]);

    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    let validators = soroban_sdk::vec![&env, v1, v2];
    // threshold 0 should fail (QuorumNotMet)
    let res = client.try_set_validators(&1u32, &validators, &0u32);
    assert!(res.is_err());
    // threshold > len should fail
    let res2 = client.try_set_validators(&1u32, &validators, &5u32);
    assert!(res2.is_err());
}

#[test]
fn test_bind_token_then_double_bind_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);

    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    let chain_id: u32 = 1;
    let source_token = BytesN::from_array(&env, &[7u8; 32]);
    let wrapped = Address::generate(&env);
    client.bind_token(&chain_id, &source_token, &wrapped);

    // Re-binding the same (chain, source_token) pair must fail.
    let wrapped2 = Address::generate(&env);
    let res = client.try_bind_token(&chain_id, &source_token, &wrapped2);
    assert!(res.is_err());
}

#[test]
fn test_unknown_chain_wrap_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);

    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    let recipient = Address::generate(&env);
    let sender_bytes = soroban_sdk::Bytes::from_array(&env, &[1u8; 32]);
    let deposit = DepositMessage {
        chain_id: 9999u32,
        source_tx_hash: BytesN::from_array(&env, &[5u8; 32]),
        source_token: BytesN::from_array(&env, &[6u8; 32]),
        sender: sender_bytes,
        recipient,
        amount: 1000i128,
        nonce: 0u64,
    };
    // No validators set on chain 9999 → UnknownChain
    let res = client.try_wrap(&deposit, &soroban_sdk::Vec::new(&env));
    assert!(res.is_err());
}
