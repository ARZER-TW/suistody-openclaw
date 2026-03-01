# Suistody - Sui Vault Operations Guide

## Key Concepts

- **Vault**: On-chain custody container holding SUI with policy-controlled access.
- **OwnerCap**: Capability token proving vault ownership. Required for: create vault, deposit, withdraw all, authorize/revoke agents.
- **AgentCap**: Capability token authorizing an agent to withdraw from a specific vault, subject to policy limits.
- **Policy**: On-chain rules governing agent withdrawals:
  - `maxBudget`: Total SUI an agent can ever spend
  - `maxPerTx`: Maximum SUI per single transaction
  - `allowedActions`: Whitelisted action types
  - `cooldownMs`: Minimum time between transactions
  - `expiresAt`: Policy expiration timestamp
- **MIST**: Smallest unit of SUI (1 SUI = 1,000,000,000 MIST). Tools accept SUI amounts and convert internally.

## Action Types

| Value | Name | Description |
|-------|------|-------------|
| 0 | Swap | Token swap operations |
| 1 | StableMint | Mint stablecoin |
| 2 | StableBurn | Burn stablecoin |
| 3 | StableClaim | Claim stablecoin yield |

## Available Tools

### Query Tools (Read-only)
- `sui_vault_info` - Get vault details (balance, policy, caps)
- `sui_vaults_list` - List all vaults owned by an address
- `sui_vault_history` - Fetch withdrawal event history
- `sui_wallet_balance` - Check SUI balance of any address
- `sui_agent_caps` - List AgentCaps owned by an agent

### Owner Tools (Requires OwnerCap)
- `sui_vault_create` - Create a new vault with policy
- `sui_vault_deposit` - Deposit SUI into a vault
- `sui_vault_withdraw` - Withdraw all funds from a vault
- `sui_agent_authorize` - Grant an agent access to a vault
- `sui_agent_revoke` - Revoke an agent's access

### Agent Tools (Requires AgentCap)
- `sui_agent_withdraw` - Withdraw SUI subject to policy limits

## Recommended Workflows

### Before withdrawing as an agent:
1. Call `sui_vault_info` to check current vault state
2. Verify: sufficient balance, budget remaining, action allowed, not in cooldown
3. Call `sui_agent_withdraw` with appropriate parameters
4. If policy check fails, the tool returns the specific reason

### Creating a vault:
1. Decide on policy parameters (budget, per-tx limit, actions, cooldown, expiry)
2. Call `sui_vault_create` with initial deposit and policy
3. Call `sui_agent_authorize` to grant agent access
4. Share the vault_id and agent_cap_id with the authorized agent

### Checking agent permissions:
1. Call `sui_agent_caps` to list all caps owned by the agent
2. For each cap, call `sui_vault_info` to see the vault's policy

## Error Handling

| Error | Cause | Action |
|-------|-------|--------|
| Policy has expired | expiresAt timestamp passed | Owner must create new vault |
| Cooldown active: Xs remaining | Too soon after last tx | Wait for cooldown period |
| Action type N is not whitelisted | Action not in allowedActions | Use a different action type |
| Amount exceeds per-tx limit | amount > maxPerTx | Reduce withdrawal amount |
| Amount exceeds remaining budget | totalSpent + amount > maxBudget | Reduce amount or contact owner |
| Insufficient vault balance | vault balance < amount | Deposit more or reduce amount |

## Security

- Never display, log, or discuss private keys
- All amounts are in SUI (not MIST) in tool parameters
- Policy enforcement is on-chain; off-chain checks are advisory only
- Transaction digests are returned for independent verification
