import { resolveConfig } from "./config.js";

// Query tools
import { vaultInfoTool } from "./tools/query/vault-info.js";
import { vaultsListTool } from "./tools/query/vaults-list.js";
import { vaultHistoryTool } from "./tools/query/vault-history.js";
import { walletBalanceTool } from "./tools/query/wallet-balance.js";
import { agentCapsTool } from "./tools/query/agent-caps.js";
import { tokenPriceTool } from "./tools/query/token-price.js";
import { swapQuoteTool } from "./tools/query/swap-quote.js";

// Owner tools
import { vaultCreateTool } from "./tools/owner/vault-create.js";
import { vaultDepositTool } from "./tools/owner/vault-deposit.js";
import { vaultWithdrawTool } from "./tools/owner/vault-withdraw.js";
import { agentAuthorizeTool } from "./tools/owner/agent-authorize.js";
import { agentRevokeTool } from "./tools/owner/agent-revoke.js";
import { vaultPauseTool } from "./tools/owner/vault-pause.js";
import { vaultUnpauseTool } from "./tools/owner/vault-unpause.js";
import { policyUpdateTool } from "./tools/owner/policy-update.js";

// Agent tools
import { agentWithdrawTool } from "./tools/agent/agent-withdraw.js";
import { swapExecuteTool } from "./tools/agent/swap-execute.js";

const ALL_TOOLS = [
  // Query (read-only)
  vaultInfoTool,
  vaultsListTool,
  vaultHistoryTool,
  walletBalanceTool,
  agentCapsTool,
  tokenPriceTool,
  swapQuoteTool,
  // Owner (write)
  vaultCreateTool,
  vaultDepositTool,
  vaultWithdrawTool,
  vaultPauseTool,
  vaultUnpauseTool,
  policyUpdateTool,
  agentAuthorizeTool,
  agentRevokeTool,
  // Agent (write)
  agentWithdrawTool,
  swapExecuteTool,
];

export interface OpenClawPluginApi {
  pluginConfig?: Record<string, unknown>;
  registerTool: (tool: unknown) => void;
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

const plugin = {
  id: "suistody",
  name: "Suistody Vault Plugin",
  description:
    "AI Agent custody operations on Sui blockchain. Create, manage, and withdraw from policy-controlled Vaults.",
  version: "0.2.0",

  register(api: OpenClawPluginApi): void {
    try {
      resolveConfig(api.pluginConfig);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      api.logger.error(`[suistody] Config error: ${msg}`);
      return;
    }

    for (const tool of ALL_TOOLS) {
      api.registerTool(tool);
    }

    api.logger.info(
      `[suistody] Registered ${ALL_TOOLS.length} tools for Sui Vault operations`
    );
  },
};

export default plugin;

// Re-export for direct usage
export { resolveConfig, getResolvedConfig, _resetConfig } from "./config.js";
export { getSdk } from "./sdk.js";
export { ok, err, serializeVault, serializeEvent, bigintReplacer } from "./types.js";
export type { ToolResult, SerializedVault, SerializedEvent } from "./types.js";
export { classifyError } from "./errors.js";
export type { StructuredError, ErrorCategory } from "./errors.js";
export { isValidSuiAddress, isValidSuiObjectId, validateSuiAddress, validateObjectId, validateAmount, validateActionType } from "./validation.js";
