#![no_std]
//! `solar-registry` — on-chain canonical record of every urban solar array
//! accepted into the SolShare Network.
//!
//! An array passes through four lifecycle states:
//!   `Pending`  — off-chain verification in progress.
//!   `Active`   — operational, minting rwa-token shares against it.
//!   `Maintenance` — temporarily offline, yields paused.
//!   `Decommissioned` — physical removal; admin-signed only.

use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
    String, Vec,
};

// ============================================================================
// Errors
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RegistryError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    ArrayNotFound = 4,
    ArrayAlreadyExists = 5,
    InvalidStateTransition = 6,
    EmptyArrayId = 7,
}

// ============================================================================
// Enums
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ArrayStatus {
    Pending = 1,
    Active = 2,
    Maintenance = 3,
    Decommissioned = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PanelTechnology {
    Monocrystalline = 1,
    Polycrystalline = 2,
    ThinFilm = 3,
    Bifacial = 4,
}

// ============================================================================
// Data types
// ============================================================================

#[contracttype]
#[derive(Clone, Debug)]
pub struct GeoLocation {
    pub latitude: i64, // microdegrees (×10⁶) for precision
    pub longitude: i64,
    pub altitude_m: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct EnvironmentalImpact {
    /// Tonnes of CO₂ avoided per year (scaled by 1e3 to keep precision).
    pub co2_offset_kg_per_year: i64,
    /// Annual expected energy yield (kWh, scaled by 1e3).
    pub expected_yield_kwh_per_year: i64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct SolarArray {
    pub id: BytesN<32>,
    pub name: String,
    pub operator: Address,
    pub location: GeoLocation,
    pub panel_count: u32,
    pub panel_tech: PanelTechnology,
    pub rated_capacity_w: u64,
    pub installed_at: u64,
    pub status: ArrayStatus,
    pub impact: EnvironmentalImpact,
    pub token_contract: Option<Address>,
    pub metadata_uri: String,
    pub last_updated: u64,
}

// ============================================================================
// Storage keys
// ============================================================================

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Registry admin (protocol governance).
    Admin,
    /// Address authorised to register new arrays (off-chain verifier).
    Verifier,
    /// Map of array id -> SolarArray.
    Array(BytesN<32>),
    /// Index of all array ids for enumeration.
    Index,
}

// ============================================================================
// Events
// ============================================================================

#[contractevent]
pub struct ArrayRegisteredEvent {
    #[topic]
    pub id: BytesN<32>,
    pub operator: Address,
    pub rated_capacity_w: u64,
}

#[contractevent]
pub struct ArrayUpdatedEvent {
    #[topic]
    pub id: BytesN<32>,
    pub new_status: ArrayStatus,
}

#[contractevent]
pub struct ArrayDecommissionedEvent {
    #[topic]
    pub id: BytesN<32>,
    pub reason: String,
}

// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct SolarRegistry;

#[contractimpl]
impl SolarRegistry {
    // --------------------------------------------------------------------
    // Setup
    // --------------------------------------------------------------------

    pub fn initialize(env: Env, admin: Address, verifier: Address) -> Result<(), RegistryError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(RegistryError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Verifier, &verifier);
        let index: Vec<BytesN<32>> = Vec::new(&env);
        env.storage().instance().set(&DataKey::Index, &index);
        env.events()
            .publish((symbol_short!("init"),), (admin, verifier));
        Ok(())
    }

    // --------------------------------------------------------------------
    // Reads
    // --------------------------------------------------------------------

    pub fn admin(env: Env) -> Result<Address, RegistryError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(RegistryError::NotInitialized)
    }

    pub fn verifier(env: Env) -> Result<Address, RegistryError> {
        env.storage()
            .instance()
            .get(&DataKey::Verifier)
            .ok_or(RegistryError::NotInitialized)
    }

    pub fn get_array(env: Env, id: BytesN<32>) -> Result<SolarArray, RegistryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Array(id))
            .ok_or(RegistryError::ArrayNotFound)
    }

    pub fn list_arrays(env: Env) -> Vec<BytesN<32>> {
        env.storage()
            .instance()
            .get(&DataKey::Index)
            .unwrap_or(Vec::new(&env))
    }

    pub fn count_arrays(env: Env) -> u32 {
        Self::list_arrays(env).len()
    }

    // --------------------------------------------------------------------
    // Writes
    // --------------------------------------------------------------------

    /// Register a brand-new array. The verifier (off-chain KYC + IoT auditor)
    /// must authorise this call.
    pub fn register_array(env: Env, array: SolarArray) -> Result<(), RegistryError> {
        let verifier: Address = env
            .storage()
            .instance()
            .get(&DataKey::Verifier)
            .ok_or(RegistryError::NotInitialized)?;
        verifier.require_auth();
        if env
            .storage()
            .persistent()
            .has(&DataKey::Array(array.id.clone()))
        {
            return Err(RegistryError::ArrayAlreadyExists);
        }
        if array.id == BytesN::from_array(&env, &[0u8; 32]) {
            return Err(RegistryError::EmptyArrayId);
        }

        let mut stamped = array.clone();
        stamped.last_updated = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::Array(array.id.clone()), &stamped);

        let mut index: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::Index)
            .unwrap_or(Vec::new(&env));
        index.push_back(array.id.clone());
        env.storage().instance().set(&DataKey::Index, &index);

        ArrayRegisteredEvent {
            id: array.id,
            operator: array.operator,
            rated_capacity_w: array.rated_capacity_w,
        }
        .publish(&env);
        Ok(())
    }

    /// Move an array between lifecycle states.
    pub fn set_status(
        env: Env,
        id: BytesN<32>,
        new_status: ArrayStatus,
    ) -> Result<(), RegistryError> {
        let mut array: SolarArray = env
            .storage()
            .persistent()
            .get(&DataKey::Array(id.clone()))
            .ok_or(RegistryError::ArrayNotFound)?;

        // Permissioning rule:
        //   - Decommissioning requires the admin.
        //   - All other transitions require the verifier OR the admin.
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(RegistryError::NotInitialized)?;
        match new_status {
            ArrayStatus::Decommissioned => admin.require_auth(),
            _ => {
                let verifier: Address = env
                    .storage()
                    .instance()
                    .get(&DataKey::Verifier)
                    .ok_or(RegistryError::NotInitialized)?;
                if !Self::is_authorised(&env, &verifier) && !Self::is_authorised(&env, &admin) {
                    return Err(RegistryError::Unauthorized);
                }
                verifier.require_auth();
            }
        }

        if !Self::valid_transition(&array.status, &new_status) {
            return Err(RegistryError::InvalidStateTransition);
        }

        array.status = new_status.clone();
        array.last_updated = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::Array(id.clone()), &array);
        ArrayUpdatedEvent { id, new_status }.publish(&env);
        Ok(())
    }

    /// After the factory has spun up an `rwa-token` contract for an array,
    /// bind the two contracts together so callers can resolve `token` from a
    /// given `array_id` (and vice-versa).
    pub fn bind_token(
        env: Env,
        array_id: BytesN<32>,
        token_contract: Address,
    ) -> Result<(), RegistryError> {
        let verifier: Address = env
            .storage()
            .instance()
            .get(&DataKey::Verifier)
            .ok_or(RegistryError::NotInitialized)?;
        verifier.require_auth();
        let mut array: SolarArray = env
            .storage()
            .persistent()
            .get(&DataKey::Array(array_id.clone()))
            .ok_or(RegistryError::ArrayNotFound)?;
        array.token_contract = Some(token_contract);
        array.last_updated = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::Array(array_id), &array);
        Ok(())
    }

    // --------------------------------------------------------------------
    // Internal helpers
    // --------------------------------------------------------------------

    fn is_authorised(env: &Env, addr: &Address) -> bool {
        // `require_auth` will be called by caller; helper used only as a
        // soft-check before delegating to the deeper `require_auth`.
        env.storage().instance().has(&DataKey::Admin) && addr != &env.current_contract_address()
    }

    fn valid_transition(from: &ArrayStatus, to: &ArrayStatus) -> bool {
        use ArrayStatus::*;
        matches!(
            (from, to),
            (Pending, Active)
                | (Active, Maintenance)
                | (Maintenance, Active)
                | (Active, Decommissioned)
                | (Maintenance, Decommissioned)
        )
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod test;
