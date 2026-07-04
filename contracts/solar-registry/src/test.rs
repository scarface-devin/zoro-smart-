#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, BytesN, Env, String, Vec};

fn make_array(env: &Env, id: BytesN<32>, operator: Address) -> SolarArray {
    SolarArray {
        id: id.clone(),
        name: String::from_str(env, "Brooklyn Rooftop 01"),
        operator,
        location: GeoLocation {
            latitude: 40_678_000,
            longitude: -73_944_000,
            altitude_m: 18,
        },
        panel_count: 240,
        panel_tech: PanelTechnology::Monocrystalline,
        rated_capacity_w: 96_000,
        installed_at: 1_700_000_000,
        status: ArrayStatus::Pending,
        impact: EnvironmentalImpact {
            co2_offset_kg_per_year: 38_400_000,
            expected_yield_kwh_per_year: 152_000_000,
        },
        token_contract: None,
        metadata_uri: String::from_str(env, "ipfs://bafy.bk01"),
        last_updated: 0,
    }
}

#[test]
fn test_initialize_stores_admin_and_verifier() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, SolarRegistry);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let client = SolarRegistryContractClient::new(&env, &contract_id);
    client.initialize(&admin, &verifier);
    assert_eq!(client.admin(), admin);
    assert_eq!(client.verifier(), verifier);
}

#[test]
fn test_register_then_get_round_trip() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, SolarRegistry);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let operator = Address::generate(&env);
    let client = SolarRegistryContractClient::new(&env, &contract_id);
    client.initialize(&admin, &verifier);

    let id = BytesN::from_array(&env, &[1u8; 32]);
    let array = make_array(&env, id.clone(), operator.clone());
    client.register_array(&array);

    let read = client.get_array(&id);
    assert_eq!(read.id, id);
    assert_eq!(read.operator, operator);
    assert_eq!(read.rated_capacity_w, 96_000);
    assert_eq!(client.count_arrays(), 1);
}

#[test]
fn test_register_duplicate_id_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, SolarRegistry);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let operator = Address::generate(&env);
    let client = SolarRegistryContractClient::new(&env, &contract_id);
    client.initialize(&admin, &verifier);

    let id = BytesN::from_array(&env, &[2u8; 32]);
    let array = make_array(&env, id.clone(), operator.clone());
    client.register_array(&array);
    let res = client.try_register_array(&array);
    assert!(res.is_err());
}

#[test]
fn test_status_lifecycle_transitions() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, SolarRegistry);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let operator = Address::generate(&env);
    let client = SolarRegistryContractClient::new(&env, &contract_id);
    client.initialize(&admin, &verifier);

    let id = BytesN::from_array(&env, &[3u8; 32]);
    let array = make_array(&env, id.clone(), operator);
    client.register_array(&array);

    // Pending -> Active is allowed
    client.set_status(&id, &ArrayStatus::Active);
    let read = client.get_array(&id);
    assert_eq!(read.status, ArrayStatus::Active);

    // Active -> Maintenance is allowed
    client.set_status(&id, &ArrayStatus::Maintenance);
    let read = client.get_array(&id);
    assert_eq!(read.status, ArrayStatus::Maintenance);

    // Maintenance -> Active
    client.set_status(&id, &ArrayStatus::Active);

    // Active -> Decommissioned (admin-only)
    client.set_status(&id, &ArrayStatus::Decommissioned);
    let read = client.get_array(&id);
    assert_eq!(read.status, ArrayStatus::Decommissioned);
}

#[test]
fn test_unknown_array_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, SolarRegistry);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let client = SolarRegistryContractClient::new(&env, &contract_id);
    client.initialize(&admin, &verifier);

    let id = BytesN::from_array(&env, &[9u8; 32]);
    let res = client.try_get_array(&id);
    assert!(res.is_err());
}

#[test]
fn test_bind_token_updates_array() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, SolarRegistry);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let operator = Address::generate(&env);
    let client = SolarRegistryContractClient::new(&env, &contract_id);
    client.initialize(&admin, &verifier);

    let id = BytesN::from_array(&env, &[4u8; 32]);
    let array = make_array(&env, id.clone(), operator);
    client.register_array(&array);

    let token_contract = Address::generate(&env);
    client.bind_token(&id, &token_contract);

    let read = client.get_array(&id);
    assert_eq!(read.token_contract, Some(token_contract));
}
