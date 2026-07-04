# rwa-token

A **SEP-41** compliant Soroban-native fungible token representing fractional
ownership of a single urban solar array.

A separate instance of this contract is deployed **per solar array**, so that
ownership, yield, and governance rights are scoped to one physical installation.
A central factory (see `tools/scripts/`) handles the one-to-one mapping between
an entry in `solar-registry` and a freshly-initialised `rwa-token` contract.

## Roles

| Role      | Powers                                                |
|-----------|-------------------------------------------------------|
| `admin`   | Set the operator key, transfer admin role.            |
| `operator`| Mint new shares after a successful crowdfunding round.|
| `holder`  | Transfer, approve, burn their own tokens.             |

## Errors

See `TokenError` in `src/lib.rs`. All errors have deterministic numeric codes
that the `@solshare/sdk` translates to typed exceptions.

## Events

| Event         | Topic keys                  | Data                              |
|---------------|-----------------------------|-----------------------------------|
| `MintEvent`   | `(to)`                      | `admin: Address, amount: i128`   |
| `BurnEvent`   | `(from)`                    | `amount: i128`                    |
| `TransferEvent`| `(from, to)`               | `amount: i128`                    |
| `ApproveEvent`| `(from, spender)`           | `amount, expiration_ledger`       |
