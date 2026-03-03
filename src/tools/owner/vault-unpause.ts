import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultUnpauseTool = {
  name: "sui_vault_unpause",
  label: "Sui Vault Unpause",
  description:
    "Unpause a paused Vault to re-enable agent withdrawals. Requires OwnerCap.",
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

      const tx = sdk.buildUnpause({
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
        action: "unpaused",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to unpause vault: ${msg}`);
    }
  },
};
