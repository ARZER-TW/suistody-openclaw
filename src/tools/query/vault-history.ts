import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { ok, err, serializeEvent } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultHistoryTool = {
  name: "sui_vault_history",
  label: "Sui Vault History",
  description:
    "Fetch on-chain AgentWithdrawal events for a Vault. Shows transaction history with amounts, action types, and timestamps.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID on Sui" }),
  }),
  async execute(
    _toolCallId: string,
    params: { vault_id: string }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const events = await sdk.getVaultEvents(params.vault_id);
      return ok(events.map(serializeEvent));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to fetch vault history: ${msg}`);
    }
  },
};
