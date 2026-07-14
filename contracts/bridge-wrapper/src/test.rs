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
    let res = client.try_set_validators(&1u32, &validators, &0u32);
    assert!(res.is_err());
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
    let res = client.try_wrap(&deposit, &soroban_sdk::Vec::new(&env));
    assert!(res.is_err());
}

// ---------------------------------------------------------------------------
// New tests: admin, pause, chain_active, remove_validator, analytics
// ---------------------------------------------------------------------------

#[test]
fn test_pause_and_unpause() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    assert!(!client.paused());
    client.pause();
    assert!(client.paused());

    client.unpause();
    assert!(!client.paused());
}

#[test]
fn test_set_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    client.set_admin(&new_admin);
    // verify old admin can't admin
}

#[test]
fn test_set_and_check_chain_active() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    // Set up a chain with validators so it exists.
    let v = Address::generate(&env);
    let validators = soroban_sdk::vec![&env, v];
    client.set_validators(&3u32, &validators, &1u32);

    client.set_chain_active(&3u32, &true);
    let (_vals, _threshold, active) = client.chain_info(&3u32);
    assert!(active);
}

#[test]
fn test_remove_validator() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let v1 = Address::generate(&env);
    let v2 = Address::generate(&env);

    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    let validators = soroban_sdk::vec![&env, v1.clone(), v2.clone()];
    client.set_validators(&4u32, &validators, &1u32);

    client.remove_validator(&4u32, &v2);
    let remaining = client.get_validators(&4u32);
    assert_eq!(remaining.len(), 1);
}

#[test]
fn test_unbind_token() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    let chain_id: u32 = 5;
    let source_token = BytesN::from_array(&env, &[8u8; 32]);
    let wrapped = Address::generate(&env);
    client.bind_token(&chain_id, &source_token, &wrapped);

    let got = client.get_wrapped_token(&chain_id, &source_token);
    assert_eq!(got, wrapped);

    client.unbind_token(&chain_id, &source_token);
    let res = client.try_get_wrapped_token(&chain_id, &source_token);
    assert!(res.is_err());
}

#[test]
fn test_total_minted_and_burned() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    let chain_id: u32 = 6;
    let source_token = BytesN::from_array(&env, &[9u8; 32]);
    let wrapped = Address::generate(&env);
    client.bind_token(&chain_id, &source_token, &wrapped);

    assert_eq!(client.total_minted(&wrapped), 0i128);
    assert_eq!(client.total_burned(&wrapped), 0i128);
}

#[test]
fn test_update_threshold() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(BridgeWrapper, ());
    let admin = Address::generate(&env);
    let v1 = Address::generate(&env);
    let v2 = Address::generate(&env);
    let v3 = Address::generate(&env);

    let client = BridgeWrapperClient::new(&env, &contract_id);
    client.initialize(&admin);

    let validators = soroban_sdk::vec![&env, v1, v2, v3];
    client.set_validators(&7u32, &validators, &1u32);
    client.update_threshold(&7u32, &2u32);
    assert_eq!(client.get_threshold(&7u32), 2);
}
