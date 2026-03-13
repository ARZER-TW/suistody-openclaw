# Suistody OpenClaw Plugin - CLAUDE.md

## Repository

https://github.com/ARZER-TW/suistody-openclaw

## Project Overview

OpenClaw plugin (v0.2.0) wrapping @suistody/core SDK into 17 AI agent tools for Sui vault operations. Provides structured tool interfaces for query, owner, and agent operations with input validation (zod) and error classification.

- Plugin: v0.2.0, ~1643 lines across 20 source files
- Package: @suistody/openclaw
- Tools: 17 (7 query + 8 owner + 2 agent)
- Tests: 61 tests across 5 test files
- Peer: openclaw@>=2026.0.0 (optional)

## Project Structure

```
src/
  index.ts              # Plugin registration -- registers all 17 tools, re-exports
  config.ts             # resolveConfig: plugin config -> env vars fallback
  sdk.ts                # getSdk() -- lazy @suistody/core initialization
  types.ts              # ToolResult (ok/err), serialize helpers, bigintReplacer
  errors.ts             # classifyError, StructuredError, ErrorCategory
  validation.ts         # isValidSuiAddress, validateAmount, etc.

  tools/
    query/              # 7 read-only tools
      vault-info.ts     # sui_vault_info
      vaults-list.ts    # sui_vaults_list
      vault-history.ts  # sui_vault_history
      wallet-balance.ts # sui_wallet_balance
      agent-caps.ts     # sui_agent_caps
      token-price.ts    # sui_token_price (Pyth oracle)
      swap-quote.ts     # sui_swap_quote (Cetus CLMM)

    owner/              # 8 write tools (require OwnerCap)
      vault-create.ts   # sui_vault_create
      vault-deposit.ts  # sui_vault_deposit
      vault-withdraw.ts # sui_vault_withdraw
      vault-pause.ts    # sui_vault_pause
      vault-unpause.ts  # sui_vault_unpause
      policy-update.ts  # sui_policy_update
      agent-authorize.ts # sui_agent_authorize
      agent-revoke.ts   # sui_agent_revoke

    agent/              # 2 write tools (require AgentCap)
      agent-withdraw.ts # sui_agent_withdraw
      swap-execute.ts   # sui_swap_execute (PTB: withdraw + Cetus swap + transfer)

  __tests__/
    config.test.ts      # 7 tests
    tools-agent.test.ts # 13 tests
    tools-owner.test.ts # 12 tests
    tools-query.test.ts # 20 tests
    types.test.ts       # 9 tests
```

## Development Commands

```bash
npm test              # Run all vitest tests (61 tests)
npm run typecheck     # TypeScript type checking
npm run build         # Build to dist/
npm run test:coverage # Coverage report
```

## Tool Categories

### Query Tools (7)
Read-only operations. No private keys required. Safe to call anytime.
- `sui_vault_info`, `sui_vaults_list`, `sui_vault_history`, `sui_wallet_balance`, `sui_agent_caps`
- `sui_token_price` -- Pyth Hermes HTTP (no SDK dependency)
- `sui_swap_quote` -- Cetus CLMM quote (no SDK dependency)

### Owner Tools (8)
Write operations requiring OwnerCap. Used by vault owners to manage vaults and agents.
- CRUD: `sui_vault_create`, `sui_vault_deposit`, `sui_vault_withdraw`
- Status: `sui_vault_pause`, `sui_vault_unpause`
- Policy: `sui_policy_update`
- Agent management: `sui_agent_authorize`, `sui_agent_revoke`

### Agent Tools (2)
Write operations requiring AgentCap. Used by AI agents to execute transactions within policy.
- `sui_agent_withdraw` -- Direct SUI withdrawal
- `sui_swap_execute` -- Compound PTB: agent_withdraw + Cetus CLMM swap + transfer

## Config Resolution

Priority order:
1. Plugin config (from `openclaw.plugin.json` configSchema)
2. Environment variables (`PACKAGE_ID`, `SUI_NETWORK`, etc.)

### Config Schema (`openclaw.plugin.json`)

```json
{
  "packageId": "string (required) -- deployed contract address",
  "suiNetwork": "testnet | devnet | mainnet (default: testnet)",
  "agentPrivateKey": "string -- Ed25519 private key",
  "sponsorPrivateKey": "string -- sponsor Ed25519 private key",
  "useSponsoredTx": "boolean (default: false)"
}
```

## Error Handling

All tools return `ToolResult`:
- Success: `{ ok: true, data: ... }`
- Failure: `{ ok: false, error: { category, message, details } }`

`classifyError` maps SDK/RPC errors to `ErrorCategory`:
- `VALIDATION` -- Invalid input (bad address, amount)
- `POLICY` -- Policy violation (budget, cooldown, whitelist)
- `NETWORK` -- RPC/connectivity issues
- `CONTRACT` -- On-chain error (Move abort codes)
- `UNKNOWN` -- Unclassified errors

## Key Dependencies

| Package | Version | Role |
|---------|---------|------|
| `@suistody/core` | `^0.4.0` | Core SDK (published to npm as @suistody/core) |
| `@mysten/sui` | `^1.44.0` | Sui blockchain SDK (v1) |
| `zod` | `^3.23.0` | Runtime input validation |

## Restrictions

- Never expose private keys in tool responses
- All SUI amounts in tool parameters use SUI units (not MIST) -- tools convert internally
- Policy enforcement is on-chain; off-chain checks are advisory
- bigint values are serialized via bigintReplacer for JSON compatibility
