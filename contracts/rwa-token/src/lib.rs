#![no_std]
//! `rwa-token` — A SEP-41 compliant Soroban-native fungible token that
//! represents fractional ownership of a single urban solar array.
//!
//! Each physical array deployed to the registry gets its own instance of
//! this contract. A central factory (see `tools/scripts/deploy-testnet.ts`)
//! initialises it with `decimals`, `name`, `symbol` and a privileged
//! `admin` address. Once deployed, the array's operator (`operator`)
//! can mint shares sold in a crowdfunding round.

use soroban_sdk::{
    contract, contractimpl, contracterror, contracttype, symbol_short, Address, Env, String, Symbol,
};

// ============================================================================
// Errors
// ============================================================================

#[contracterror]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TokenError {
    /// Contract has not yet been initialised.
    NotInitialized = 1,
    /// Contract has already been initialised — `initialize` cannot be called twice.
    AlreadyInitialized = 2,
    /// Caller is not the admin / operator / minter expected for the operation.
    Unauthorized = 3,
    /// Arithmetic overflow or underflow.
    MathOverflow = 4,
    /// Insufficient allowance for a transfer.
    InsufficientAllowance = 5,
    /// Insufficient balance for a transfer / burn.
    InsufficientBalance = 6,
    /// Requested amount was zero.
    ZeroAmount = 7,
    /// Account is frozen and cannot transfer.
    AccountFrozen = 8,
    /// Global transfers are paused.
    TransfersPaused = 9,
    /// Supply cap exceeded.
    SupplyCapExceeded = 10,
}

// ============================================================================
// Storage keys
// ============================================================================

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Metadata
    Admin,
    Operator,
    Decimals,
    Name,
    Symbol,
    /// Per-account state
    Balance(Address),
    Allowance(Address, Address),
    /// Total supply tracker (required because SEP-41 has no `totalSupply()`,
    /// but RWA dashboards need to know it).
    TotalSupply,
    /// Per-account freeze status.
    Frozen(Address),
    /// Global transfer pause flag.
    Paused,
    /// Maximum token supply (0 = unlimited).
    SupplyCap,
}

// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct RwaToken;

#[contractimpl]
impl RwaToken {
    // --------------------------------------------------------------------
    // Initialisation
    // --------------------------------------------------------------------

    /// Initialise the token with metadata. May only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        operator: Address,
        decimals: u32,
        name: String,
        symbol: String,
    ) -> Result<(), TokenError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(TokenError::AlreadyInitialized);
        }
        admin.require_auth();
        if decimals > 18 {
            return Err(TokenError::MathOverflow);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Operator, &operator);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
        env.events().publish(
            (symbol_short!("init"),),
            (admin.clone(), operator, decimals, name, symbol),
        );
        Ok(())
    }

    // --------------------------------------------------------------------
    // Token metadata
    // --------------------------------------------------------------------

    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Decimals)
            .unwrap_or(0)
    }

    pub fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .unwrap_or(String::from_str(&env, ""))
    }

    pub fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .unwrap_or(String::from_str(&env, ""))
    }

    pub fn admin(env: Env) -> Result<Address, TokenError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)
    }

    pub fn operator(env: Env) -> Result<Address, TokenError> {
        env.storage()
            .instance()
            .get(&DataKey::Operator)
            .ok_or(TokenError::NotInitialized)
    }

    // --------------------------------------------------------------------
    // Supply
    // --------------------------------------------------------------------

    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    // --------------------------------------------------------------------
    // SEP-41 standard surface
    // --------------------------------------------------------------------

    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(account))
            .unwrap_or(0)
    }

    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(owner, spender))
            .unwrap_or(0)
    }

    /// SEP-41 `transfer` — moves tokens between two accounts directly.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), TokenError> {
        if amount <= 0 {
            return Err(TokenError::ZeroAmount);
        }
        from.require_auth();
        Self::move_balance(&env, &from, &to, amount)?;
        env.events().publish(
            (symbol_short!("transfer"), from.clone(), to.clone()),
            amount,
        );
        Ok(())
    }

    /// SEP-41 `approve` — grants a delegate the right to spend `amount`.
    /// Lifetime is bounded by `expiration_ledger`.
    pub fn approve(
        env: Env,
        owner: Address,
        spender: Address,
        amount: i128,
        expiration_ledger: u32,
    ) -> Result<(), TokenError> {
        owner.require_auth();
        if amount < 0 {
            return Err(TokenError::MathOverflow);
        }
        let key = DataKey::Allowance(owner.clone(), spender.clone());
        env.storage().persistent().set(&key, &amount);
        // Keep the allowance entry alive at least until `expiration_ledger`.
        // The minimum TTL is 17_280 ledgers (~1 day); the target is derived
        // from `expiration_ledger` relative to the current ledger so the
        // entry is evicted naturally once the approval expires.
        let current = env.ledger().sequence();
        let target: u32 = if expiration_ledger > current {
            (expiration_ledger - current).max(17_280)
        } else {
            17_280u32
        };
        env.storage()
            .persistent()
            .extend_ttl(&key, 17_280u32, target);
        env.events().publish(
            (symbol_short!("approve"), owner.clone(), spender.clone()),
            (amount, expiration_ledger),
        );
        Ok(())
    }

    /// SEP-41 `transfer_from` — caller is a delegate authorised by `owner`.
    pub fn transfer_from(
        env: Env,
        spender: Address,
        owner: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), TokenError> {
        if amount <= 0 {
            return Err(TokenError::ZeroAmount);
        }
        spender.require_auth();
        let key = DataKey::Allowance(owner.clone(), spender.clone());
        let allowance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if allowance < amount {
            return Err(TokenError::InsufficientAllowance);
        }
        env.storage().persistent().set(&key, &(allowance - amount));
        Self::move_balance(&env, &owner, &to, amount)?;
        env.events().publish(
            (symbol_short!("transfer"), owner.clone(), to.clone()),
            amount,
        );
        Ok(())
    }

    // --------------------------------------------------------------------
    // Admin / operator surface
    // --------------------------------------------------------------------

    /// Mint new shares. Only the operator may call this (e.g. once a
    /// crowdfunding round settles). Respects the supply cap if set.
    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), TokenError> {
        if amount <= 0 {
            return Err(TokenError::ZeroAmount);
        }
        let operator: Address = env
            .storage()
            .instance()
            .get(&DataKey::Operator)
            .ok_or(TokenError::NotInitialized)?;
        operator.require_auth();
        let total = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0i128);
        let new_total = total.checked_add(amount).ok_or(TokenError::MathOverflow)?;
        // Enforce supply cap if set (non-zero).
        let cap: i128 = env
            .storage()
            .instance()
            .get(&DataKey::SupplyCap)
            .unwrap_or(0i128);
        if cap > 0 && new_total > cap {
            return Err(TokenError::SupplyCapExceeded);
        }
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        let new_balance = balance
            .checked_add(amount)
            .ok_or(TokenError::MathOverflow)?;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &new_balance);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &new_total);
        env.events()
            .publish((symbol_short!("mint"), to.clone()), (operator, amount));
        Ok(())
    }

    /// Burn shares (e.g. when redeeming energy-revenue back into the protocol).
    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), TokenError> {
        if amount <= 0 {
            return Err(TokenError::ZeroAmount);
        }
        from.require_auth();
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        if balance < amount {
            return Err(TokenError::InsufficientBalance);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(balance - amount));
        let total = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0i128);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(total - amount));
        env.events()
            .publish((symbol_short!("burn"), from.clone()), amount);
        Ok(())
    }

    /// Update the operator key. Admin only.
    pub fn set_operator(env: Env, new_operator: Address) -> Result<(), TokenError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Operator, &new_operator);
        env.events()
            .publish((symbol_short!("set_operator"),), new_operator);
        Ok(())
    }

    /// Transfer admin role to a new address. Current admin only.
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), TokenError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Admin, &new_admin);
        env.events()
            .publish((symbol_short!("set_admin"),), new_admin);
        Ok(())
    }

    // --------------------------------------------------------------------
    // Freeze / unfreeze (admin)
    // --------------------------------------------------------------------

    /// Freeze an account, preventing it from sending or receiving tokens.
    pub fn freeze_account(env: Env, account: Address) -> Result<(), TokenError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Frozen(account.clone()), &true);
        env.events()
            .publish((symbol_short!("freeze"),), account);
        Ok(())
    }

    /// Unfreeze a previously frozen account.
    pub fn unfreeze_account(env: Env, account: Address) -> Result<(), TokenError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();
        env.storage()
            .persistent()
            .remove(&DataKey::Frozen(account.clone()));
        env.events()
            .publish((symbol_short!("unfreeze"),), account);
        Ok(())
    }

    /// Check whether an account is currently frozen.
    pub fn is_frozen(env: Env, account: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Frozen(account))
            .unwrap_or(false)
    }

    // --------------------------------------------------------------------
    // Clawback (admin)
    // --------------------------------------------------------------------

    /// Admin-forced token recovery from any account for regulatory compliance.
    pub fn clawback(
        env: Env,
        from: Address,
        amount: i128,
    ) -> Result<(), TokenError> {
        if amount <= 0 {
            return Err(TokenError::ZeroAmount);
        }
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        if balance < amount {
            return Err(TokenError::InsufficientBalance);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(balance - amount));
        let total = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0i128);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(total - amount));
        env.events()
            .publish((symbol_short!("clawback"), from, admin), amount);
        Ok(())
    }

    // --------------------------------------------------------------------
    // Global pause (admin)
    // --------------------------------------------------------------------

    /// Pause all token transfers globally. Admin only.
    pub fn pause(env: Env) -> Result<(), TokenError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        env.events().publish((symbol_short!("pause"),), ());
        Ok(())
    }

    /// Resume token transfers. Admin only.
    pub fn unpause(env: Env) -> Result<(), TokenError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        env.events().publish((symbol_short!("unpause"),), ());
        Ok(())
    }

    /// Query whether transfers are currently paused.
    pub fn paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    // --------------------------------------------------------------------
    // Supply cap (admin)
    // --------------------------------------------------------------------

    /// Set a maximum token supply. 0 = unlimited. Admin only.
    pub fn set_supply_cap(env: Env, cap: i128) -> Result<(), TokenError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();
        if cap < 0 {
            return Err(TokenError::MathOverflow);
        }
        env.storage().instance().set(&DataKey::SupplyCap, &cap);
        env.events()
            .publish((symbol_short!("supply_cap"),), cap);
        Ok(())
    }

    /// Return the current supply cap (0 = unlimited).
    pub fn supply_cap(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::SupplyCap)
            .unwrap_or(0i128)
    }

    // --------------------------------------------------------------------
    // Internal helpers
    // --------------------------------------------------------------------

    fn move_balance(
        env: &Env,
        from: &Address,
        to: &Address,
        amount: i128,
    ) -> Result<(), TokenError> {
        // Check global pause.
        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(TokenError::TransfersPaused);
        }
        // Check if either account is frozen.
        if env
            .storage()
            .persistent()
            .get(&DataKey::Frozen(from.clone()))
            .unwrap_or(false)
        {
            return Err(TokenError::AccountFrozen);
        }
        if env
            .storage()
            .persistent()
            .get(&DataKey::Frozen(to.clone()))
            .unwrap_or(false)
        {
            return Err(TokenError::AccountFrozen);
        }
        let from_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        if from_balance < amount {
            return Err(TokenError::InsufficientBalance);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        let to_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        let new_to = to_balance
            .checked_add(amount)
            .ok_or(TokenError::MathOverflow)?;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &new_to);
        // Touch a TTL key so balances persist.
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Balance(from.clone()), 172_800u32, 7_776_000u32);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Balance(to.clone()), 172_800u32, 7_776_000u32);
        Ok(())
    }

    // --------------------------------------------------------------------
    // Version
    // --------------------------------------------------------------------

    pub fn version() -> Symbol {
        Symbol::new(&Env::default(), env!("CARGO_PKG_VERSION"))
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod test;
