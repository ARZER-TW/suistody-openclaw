import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const policyUpdateTool = {
  name: "sui_policy_update",
  label: "Sui Policy Update",
  description:
    "Update the spending policy for a Vault. Allows changing budget, per-transaction limit, allowed actions, cooldown, and expiry. Requires OwnerCap.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID" }),
    owner_cap_id: Type.String({
      description: "The OwnerCap object ID for this vault",
    }),
    max_budget_sui: Type.Number({
      description: "Maximum total budget in SUI that agents can spend",
    }),
    max_per_tx_sui: Type.Number({
      description: "Maximum amount per transaction in SUI",
    }),
    allowed_actions: Type.Array(Type.Number(), {
      description:
        "Allowed action types: 0=Swap, 1=StableMint, 2=StableBurn, 3=StableClaim",
    }),
    cooldown_seconds: Type.Number({
      description: "Minimum seconds between agent transactions",
    }),
    expires_in_hours: Type.Number({
      description: "Hours from now until the policy expires",
    }),
  }),
  async execute(
    _toolCallId: string,
    params: {
      vault_id: string;
      owner_cap_id: string;
      max_budget_sui: number;
      max_per_tx_sui: number;
      allowed_actions: number[];
      cooldown_seconds: number;
      expires_in_hours: number;
    }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();

      const maxBudget = sdk.suiToMist(params.max_budget_sui);
      const maxPerTx = sdk.suiToMist(params.max_per_tx_sui);
      const cooldownMs = BigInt(params.cooldown_seconds * 1000);
      const expiresAt = BigInt(Date.now() + params.expires_in_hours * 3600_000);

      const tx = sdk.buildUpdatePolicy({
        vaultId: params.vault_id,
        ownerCapId: params.owner_cap_id,
        maxBudget,
        maxPerTx,
        allowedActions: params.allowed_actions,
        cooldownMs,
        expiresAt,
      });

      const digest = await sdk.executeAgentTransaction({
        transaction: tx,
        agentKeypair: config.agentKeypair,
      });

      return ok({
        success: true,
        txDigest: digest,
        vaultId: params.vault_id,
        newPolicy: {
          maxBudgetSui: params.max_budget_sui,
          maxPerTxSui: params.max_per_tx_sui,
          allowedActions: params.allowed_actions,
          cooldownSeconds: params.cooldown_seconds,
          expiresInHours: params.expires_in_hours,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to update policy: ${msg}`);
    }
  },
};
