import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultPauseTool = {
  name: "sui_vault_pause",
  label: "Sui Vault Pause",
  description:
    "Pause a Vault to block all agent withdrawals. Owner can still deposit and withdraw. Requires OwnerCap.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID" }),
    owner_cap_id: Type.String({
      description: "The OwnerCap object ID for this vault",
    }),
  }),
  async execute(
    _toolCallId: string,
    params: { vault_id: string; owner_cap_id: string }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();

      const tx = sdk.buildPause({
        vaultId: params.vault_id,
        ownerCapId: params.owner_cap_id,
      });

      const digest = await sdk.executeAgentTransaction({
        transaction: tx,
        agentKeypair: config.agentKeypair,
      });

      return ok({
        success: true,
        txDigest: digest,
        vaultId: params.vault_id,
        action: "paused",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to pause vault: ${msg}`);
    }
  },
};
