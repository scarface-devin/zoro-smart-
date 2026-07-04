# bridge-wrapper

A **lock-and-mint** + **burn-and-release** cross-chain bridge that mints and
burns Soroban-native wrapped tokens so that assets locked on Ethereum, Solana,
Polygon (and other supported L1/L2 networks) can move freely into and out of
the Stellar ecosystem.

## Threat model

The bridge assumes a Byzantine-fault-tolerant validator set per `chain_id`.
Each validator publishes signatures on observed lock transactions on the
source chain. Wrapping requires a quorum (`threshold`) of *distinct* validator
signatures; unwrapping is the inverse flow.

## Roles

| Role       | Powers                                                  |
|------------|---------------------------------------------------------|
| `admin`    | Configure validator sets, thresholds, and token bindings. |
| validator  | Publish signatures on observed lock transactions.       |
| `sender`   | Anyone can submit a verified deposit; recipient is mint target. |
| `holder`   | Calls `unwrap` to burn wrapped tokens for source release. |

## Events

- `WrappedEvent(recipient, chain_id, source_tx_hash, wrapped_token, amount)`
- `UnwrappedEvent(sender, chain_id, amount, nonce)`
- `ValidatorSetChangedEvent(chain_id, new_threshold)`
