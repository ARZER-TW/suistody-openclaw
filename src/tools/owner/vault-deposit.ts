import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultDepositTool = {
  name: "sui_vault_deposit",
  label: "Sui Vault Deposit",
  description:
    "Deposit SUI into an existing Vault. Requires an OwnerCap for the target vault. This is an owner-only operation.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID" }),
    owner_cap_id: Type.String({
      description: "The OwnerCap object ID for this vault",
    }),
    amount_sui: Type.Number({
      description: "Amount of SUI to deposit",
    }),
  }),
  async execute(
    _toolCallId: string,
    params: { vault_id: string; owner_cap_id: string; amount_sui: number }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();

      const amount = sdk.suiToMist(params.amount_sui);
      const tx = sdk.buildDepositFromGas({
        vaultId: params.vault_id,
        ownerCapId: params.owner_cap_id,
        amount,
      });

      const digest = await sdk.executeAgentTransaction({
        transaction: tx,
        agentKeypair: config.agentKeypair,
      });

      return ok({
        success: true,
        txDigest: digest,
        vaultId: params.vault_id,
        depositedSui: params.amount_sui,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to deposit: ${msg}`);
    }
  },
};
