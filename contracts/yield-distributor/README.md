# yield-distributor

**Pull-payment** yield distributor that splits stablecoin revenue from a
physical solar array to holders of the corresponding `rwa-token` contract.

## Why pull-payment?

When an investor buys 1/1000th of an array, **she, not the contract, must
initiate the claim**. This avoids the O(N) gas cost of iterating every holder
on every deposit, and lets users batch their claims when convenient.

## Roles

| Role     | Powers                                                          |
|----------|-----------------------------------------------------------------|
| `admin`  | Update the `funder` key.                                        |
| `funder` | Calls `fund(amount)` with stablecoin payment-token transfers.   |
| `holder` | Calls `claim()` to pull her proportional accrued yield.         |

## Events

- `InitializedEvent(admin, funder, share_token, payment_token)`
- `FundedEvent(from, amount, total_yield_per_share)`
- `ClaimedEvent(holder, amount)`
