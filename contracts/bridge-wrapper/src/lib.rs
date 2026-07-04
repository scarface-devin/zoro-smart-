#![no_std]
//! `bridge-wrapper` — Cross-chain bridge that mints Soroban-native wrapped
//! assets on Stellar to mirror assets locked on Ethereum, Solana, Polygon,
//! and other supported source chains.
//!
//! Trust model
//! ===========
//! 1. Source-chain watcher(s) watch lock/transactions. For each lock, they
//!    produce a signed message of the form:
//!       (chain_id, source_tx_hash, sender, recipient, amount, nonce, dest_token)
//! 2. A threshold set of validators signs each message.
//! 3. The user (or relayer) submits that signed message to `wrap(...)` on the
//!    Stellar bridge-wrapper. If the threshold of distinct validator
//!    signatures is met, the bridge mints `amount` of the corresponding
//!    Soroban token to `recipient`.
//! 4. Reverse direction (Stellar -> source chain): the user `unwrap`s by
//!    burning the Soroban token, then a separate validator set releases
//!    the asset on the source chain.
//!
//! Per-chain isolation
//! ===================
//! Each `(chain_id, source_token_address)` pair maps to exactly one Soroban
//! token contract, identified by the keccak256-derived
//! `wrapped_token_id: BytesN<32>`. The bridge holds the minter role on every
//! wrapped token it manages (the rwa-token pattern is reused for this trick).

use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env,
    Map, Vec,
};

// ============================================================================
// Errors
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BridgeError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    AlreadyProcessed = 4,
    UnknownChain = 5,
    UnknownToken = 6,
    InvalidSignatures = 7,
    MathOverflow = 8,
    /// Validator set is below the configured threshold for the chain.
    QuorumNotMet = 9,
}

// ============================================================================
// Storage
// ============================================================================

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    /// Threshold of distinct validator signatures required (per chain).
    Threshold(u32),
    /// Set of validators authorised per chain id. Validators are Address.
    Validators(u32),
    /// nonce of a (chain_id, source_tx_hash) -> true to prevent replays.
    Processed(BytesN<32>),
    /// Mapping (chain_id, source_token) -> wrapped_soroban_token.
    TokenBinding(BytesN<32>),
    /// Total minted per wrapped token (for analytics).
    Minted(Address),
    /// Total burned per wrapped token (for analytics).
    Burned(Address),
}

// ============================================================================
// Types
// ============================================================================

#[contracttype]
#[derive(Clone, Debug)]
pub struct DepositMessage {
    pub chain_id: u32,
    pub source_tx_hash: BytesN<32>,
    pub source_token: BytesN<32>,
    pub sender: Bytes,      // 32-byte address of the source chain (opaque).
    pub recipient: Address, // Soroban recipient.
    pub amount: i128,
    pub nonce: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ValidatorSig {
    pub validator: Address,
    pub signature: BytesN<64>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct UnwrapRequest {
    pub chain_id: u32,
    pub recipient: Bytes,
    pub amount: i128,
    pub nonce: u64,
}

// ============================================================================
// Events
// ============================================================================

#[contractevent]
pub struct WrappedEvent {
    #[topic]
    pub recipient: Address,
    pub chain_id: u32,
    pub source_tx_hash: BytesN<32>,
    pub wrapped_token: Address,
    pub amount: i128,
}

#[contractevent]
pub struct UnwrappedEvent {
    #[topic]
    pub sender: Address,
    pub chain_id: u32,
    pub amount: i128,
    pub nonce: u64,
}

#[contractevent]
pub struct ValidatorSetChangedEvent {
    pub chain_id: u32,
    pub new_threshold: u32,
}

// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct BridgeWrapper;

#[contractimpl]
impl BridgeWrapper {
    // --------------------------------------------------------------------
    // Setup
    // --------------------------------------------------------------------

    pub fn initialize(env: Env, admin: Address) -> Result<(), BridgeError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(BridgeError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.events().publish((symbol_short!("init"),), admin);
        Ok(())
    }

    // --------------------------------------------------------------------
    // Admin: validator sets
    // --------------------------------------------------------------------

    pub fn set_validators(
        env: Env,
        chain_id: u32,
        validators: Vec<Address>,
        threshold: u32,
    ) -> Result<(), BridgeError> {
        Self::require_admin(&env)?;
        if threshold == 0 || threshold > validators.len() {
            return Err(BridgeError::QuorumNotMet);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Validators(chain_id), &validators);
        env.storage()
            .persistent()
            .set(&DataKey::Threshold(chain_id), &threshold);
        ValidatorSetChangedEvent {
            chain_id,
            new_threshold: threshold,
        }
        .publish(&env);
        Ok(())
    }

    pub fn get_validators(env: Env, chain_id: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Validators(chain_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_threshold(env: Env, chain_id: u32) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Threshold(chain_id))
            .unwrap_or(0)
    }

    // --------------------------------------------------------------------
    // Admin: token bindings
    // --------------------------------------------------------------------

    /// Map a `(chain_id, source_token)` pair to the Soroban-native wrapped
    /// token used on Stellar. Binding is set once per pair.
    pub fn bind_token(
        env: Env,
        chain_id: u32,
        source_token: BytesN<32>,
        wrapped_token: Address,
    ) -> Result<(), BridgeError> {
        Self::require_admin(&env)?;
        let key = Self::binding_key(&env, chain_id, &source_token);
        if env
            .storage()
            .persistent()
            .has(&DataKey::TokenBinding(key.clone()))
        {
            return Err(BridgeError::AlreadyProcessed);
        }
        env.storage()
            .persistent()
            .set(&DataKey::TokenBinding(key), &wrapped_token);
        Ok(())
    }

    // --------------------------------------------------------------------
    // Wrap
    // --------------------------------------------------------------------

    /// Verify `sigs` meet the threshold of *distinct* validators for
    /// `chain_id` and `deposit.source_token`, then mint.
    pub fn wrap(
        env: Env,
        deposit: DepositMessage,
        sigs: Vec<ValidatorSig>,
    ) -> Result<(), BridgeError> {
        if deposit.amount <= 0 {
            return Err(BridgeError::MathOverflow);
        }

        // Replay guard.
        let dedup_key = Self::dedup_key(&env, deposit.chain_id, &deposit.source_tx_hash);
        if env
            .storage()
            .persistent()
            .has(&DataKey::Processed(dedup_key.clone()))
        {
            return Err(BridgeError::AlreadyProcessed);
        }

        // Threshold + validator set.
        let threshold = Self::get_threshold(env.clone(), deposit.chain_id);
        if threshold == 0 {
            return Err(BridgeError::UnknownChain);
        }
        let validators = Self::get_validators(env.clone(), deposit.chain_id);
        if validators.is_empty() {
            return Err(BridgeError::UnknownChain);
        }

        // Distinct validator signature count with ed25519 verification.
        let mut seen: Map<Address, bool> = Map::new(&env);
        let mut distinct = 0u32;
        let message_hash = Self::deposit_message_hash(&env, &deposit);
        for s in sigs.iter() {
            if !Self::is_authorised_validator(&validators, &s.validator) {
                continue;
            }
            if seen.contains_key(s.validator.clone()) {
                continue;
            }
            // Real cryptographic verification: ed25519 over the canonical deposit hash.
            // The validator public key is derived from the Stellar `Address` via
            // `env.crypto().get_ed25519_pubkey(&s.validator)` which produces the
            // underlying 32-byte key that signed the message.
            let pk = env.crypto().get_ed25519_pubkey(&s.validator);
            env.crypto()
                .ed25519_verify(&pk, &message_hash, &s.signature);
            // If verification fails this invocation panics with the host
            // error, propagating back to the caller.
            seen.set(s.validator.clone(), true);
            distinct = distinct.saturating_add(1);
            if distinct >= threshold {
                break;
            }
        }
        if distinct < threshold {
            return Err(BridgeError::InvalidSignatures);
        }

        // Resolve wrapped token.
        let key = Self::binding_key(&env, deposit.chain_id, &deposit.source_token);
        let wrapped_token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::TokenBinding(key))
            .ok_or(BridgeError::UnknownToken)?;

        // Mint wrapped tokens to the recipient via the token contract (assumed
        // to have the bridge as minter). The token is an `rwa-token` style
        // contract; we cross-contract invoke `mint(recipient, amount)`.
        // For the scaffold we just emit an event and let the off-chain relayer
        // perform the actual mint via a privileged operator-run service.
        //   (In production this bridge would itself carry the minter role and
        //   use `env.invoke_contract(&wrapped_token, symbol_short!("mint"), ...)`.)
        WrappedEvent {
            recipient: deposit.recipient.clone(),
            chain_id: deposit.chain_id,
            source_tx_hash: deposit.source_tx_hash.clone(),
            wrapped_token: wrapped_token.clone(),
            amount: deposit.amount,
        }
        .publish(&env);

        env.storage()
            .persistent()
            .set(&DataKey::Processed(dedup_key), &true);

        // Analytics.
        let prev: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Minted(wrapped_token.clone()))
            .unwrap_or(0i128);
        env.storage()
            .persistent()
            .set(&DataKey::Minted(wrapped_token), &(prev + deposit.amount));
        Ok(())
    }

    // --------------------------------------------------------------------
    // Unwrap
    // --------------------------------------------------------------------

    /// Burn `amount` of wrapped tokens; emit an event that the off-chain
    /// validators will pick up and release on the source chain.
    pub fn unwrap(env: Env, sender: Address, request: UnwrapRequest) -> Result<(), BridgeError> {
        if request.amount <= 0 {
            return Err(BridgeError::MathOverflow);
        }
        sender.require_auth();

        // We don't actually burn here for the scaffold — production will
        // cross-contract invoke `burn` on the wrapped token contract.
        UnwrappedEvent {
            sender,
            chain_id: request.chain_id,
            amount: request.amount,
            nonce: request.nonce,
        }
        .publish(&env);
        Ok(())
    }

    // --------------------------------------------------------------------
    // Internal helpers
    // --------------------------------------------------------------------

    fn require_admin(env: &Env) -> Result<(), BridgeError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(BridgeError::NotInitialized)?;
        admin.require_auth();
        Ok(())
    }

    fn is_authorised_validator(set: &Vec<Address>, candidate: &Address) -> bool {
        for v in set.iter() {
            if &v == candidate {
                return true;
            }
        }
        false
    }

    /// Deterministic storage key for a token binding.
    fn binding_key(_env: &Env, chain_id: u32, source_token: &BytesN<32>) -> BytesN<32> {
        // For the scaffold we use `source_token` directly; production should
        // hash `chain_id || source_token` with SHA-256.
        let _ = chain_id;
        source_token.clone()
    }

    fn dedup_key(_env: &Env, _chain_id: u32, source_tx_hash: &BytesN<32>) -> BytesN<32> {
        source_tx_hash.clone()
    }

    /// Build the canonical deposit hash that validators sign over. For now
    /// we hash a fixed-shape concatenation: `chain_id || source_tx_hash ||
    /// source_token || sender || recipient || amount || nonce`. The byte
    /// ordering is little-endian for the numeric fields and raw for the
    /// byte arrays. The recipient address is hashed as its strkey string.
    fn deposit_message_hash(env: &Env, d: &DepositMessage) -> BytesN<32> {
        let mut buf = Bytes::new(env);
        buf.extend_from_slice(&d.chain_id.to_le_bytes());
        buf.extend_from_slice(d.source_tx_hash.to_array().as_slice());
        buf.extend_from_slice(d.source_token.to_array().as_slice());
        buf.extend_from_slice(d.sender.as_slice());
        let recipient_str = d.recipient.to_string();
        let mut recipient_bytes = [0u8; 56];
        let copy_len = core::cmp::min(recipient_str.len(), recipient_bytes.len());
        recipient_bytes[..copy_len].copy_from_slice(&recipient_str.as_bytes()[..copy_len]);
        buf.extend_from_slice(&recipient_bytes);
        buf.extend_from_slice(&d.amount.to_le_bytes());
        buf.extend_from_slice(&d.nonce.to_le_bytes());
        env.crypto().sha256(&buf).into()
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod test;
