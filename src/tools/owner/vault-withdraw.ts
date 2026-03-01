import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultWithdrawTool = {
  name: "sui_vault_withdraw",
  label: "Sui Vault Withdraw All",
  description:
    "Withdraw all funds from a Vault to a recipient address. Requires an OwnerCap. This is an owner-only operation that empties the vault.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID" }),
    owner_cap_id: Type.String({
      description: "The OwnerCap object ID for this vault",
    }),
    recipient_address: Type.String({
      description: "Sui address to receive the withdrawn funds",
    }),
  }),
  async execute(
    _toolCallId: string,
    params: {
      vault_id: string;
      owner_cap_id: string;
      recipient_address: string;
    }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();

      const tx = sdk.buildWithdrawAll({
        vaultId: params.vault_id,
        ownerCapId: params.owner_cap_id,
        recipientAddress: params.recipient_address,
      });

      const digest = await sdk.executeAgentTransaction({
        transaction: tx,
        agentKeypair: config.agentKeypair,
      });

      return ok({
        success: true,
        txDigest: digest,
        vaultId: params.vault_id,
        recipientAddress: params.recipient_address,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to withdraw: ${msg}`);
    }
  },
};
