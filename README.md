# Suistody OpenClaw Plugin

OpenClaw plugin for policy-based AI Agent custody operations on Sui blockchain.

This plugin provides 17 tools for managing Sui Vaults through OpenClaw-compatible AI agents (Snap, Gemini, etc.). Built on top of `@suistody/core` SDK.

- **Version**: 0.2.0
- **Package**: @suistody/openclaw
- **Tools**: 17 (7 query + 8 owner + 2 agent)
- **Tests**: 61 tests across 5 test files

## Install

```bash
npm install @suistody/openclaw
```

**Peer dependency**: `openclaw@>=2026.0.0` (optional)

## Plugin Configuration

### Via `openclaw.plugin.json`

```json
{
  "id": "suistody",
  "config": {
    "packageId": "0x...",
    "suiNetwork": "testnet",
    "agentPrivateKey": "suiprivkey1...",
    "sponsorPrivateKey": "suiprivkey1...",
    "useSponsoredTx": false
  }
}
```

### Via Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PACKAGE_ID` | Yes | Deployed Move contract address |
| `SUI_NETWORK` | No | `testnet` (default), `devnet`, `mainnet` |
| `AGENT_PRIVATE_KEY` | No | Agent Ed25519 private key |
| `SPONSOR_PRIVATE_KEY` | No | Sponsor Ed25519 private key (gas) |
| `USE_SPONSORED_TX` | No | `true` to enable sponsored transactions |

Plugin config takes precedence over environment variables.

## Tools

### Query Tools (Read-only, 7 tools)

| Tool | Description |
|------|-------------|
| `sui_vault_info` | Get vault details (balance, policy, status, caps) |
| `sui_vaults_list` | List all vaults owned by an address |
| `sui_vault_history` | Fetch withdrawal event history (paginated) |
| `sui_wallet_balance` | Check SUI balance of any address |
| `sui_agent_caps` | List AgentCaps owned by an agent |
| `sui_token_price` | Get token price from Pyth oracle |
| `sui_swap_quote` | Get swap quote from Cetus CLMM |

### Owner Tools (Require OwnerCap, 8 tools)

| Tool | Description |
|------|-------------|
| `sui_vault_create` | Create a new vault with policy |
| `sui_vault_deposit` | Deposit SUI into a vault |
| `sui_vault_withdraw` | Withdraw all funds from a vault |
| `sui_vault_pause` | Pause vault (blocks agent withdrawals) |
| `sui_vault_unpause` | Unpause a paused vault |
| `sui_policy_update` | Update vault policy |
| `sui_agent_authorize` | Grant agent access to a vault |
| `sui_agent_revoke` | Revoke agent access |

### Agent Tools (Require AgentCap, 2 tools)

| Tool | Description |
|------|-------------|
| `sui_agent_withdraw` | Withdraw SUI within policy limits |
| `sui_swap_execute` | Execute swap (withdraw + Cetus CLMM swap) |

## Development

```bash
npm test              # Run tests (vitest)
npm run typecheck     # TypeScript type checking
npm run build         # Build to dist/
npm run test:coverage # Run tests with coverage
```

## Architecture

```
src/
  index.ts          # Plugin registration (17 tools)
  config.ts         # resolveConfig (plugin config or env vars)
  sdk.ts            # getSdk() -- lazy SDK initialization
  types.ts          # ToolResult (ok/err), serialize helpers
  errors.ts         # classifyError, StructuredError, ErrorCategory
  validation.ts     # isValidSuiAddress, validateAmount

  tools/
    query/          # 7 read-only tools
    owner/          # 8 write tools (OwnerCap required)
    agent/          # 2 write tools (AgentCap required)
```

## Dependencies

| Package | Version | Role |
|---------|---------|------|
| `@suistody/core` | `file:../suistody-core` | Core SDK (local) |
| `@mysten/sui` | `^1.44.0` | Sui blockchain SDK |
| `zod` | `^3.23.0` | Input validation |

## License

MIT
