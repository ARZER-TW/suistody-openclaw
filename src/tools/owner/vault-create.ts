import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultCreateTool = {
  name: "sui_vault_create",
  label: "Sui Vault Create",
  description:
    "Create a new Sui Vault with initial deposit and policy. This is an owner-only operation. The vault will be created with the agent as the transaction sender. Returns the Vault ID and OwnerCap ID needed for subsequent operations.",
  parameters: Type.Object({
    deposit_sui: Type.Number({
      description: "Initial deposit amount in SUI",
    }),
    max_budget_sui: Type.Number({
      description: "Maximum total budget agents can spend (in SUI)",
    }),
    max_per_tx_sui: Type.Number({
      description: "Maximum amount per transaction (in SUI)",
    }),
    allowed_actions: Type.Array(Type.Number(), {
      description:
        "Allowed action types: 0=Swap, 1=StableMint, 2=StableBurn, 3=StableClaim",
    }),
    cooldown_seconds: Type.Number({
      description: "Cooldown period between transactions (in seconds)",
    }),
    expires_in_hours: Type.Number({
      description: "Policy expiration time from now (in hours)",
    }),
  }),
  async execute(
    _toolCallId: string,
    params: {
      deposit_sui: number;
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

      const depositAmount = sdk.suiToMist(params.deposit_sui);
      const maxBudget = sdk.suiToMist(params.max_budget_sui);
      const maxPerTx = sdk.suiToMist(params.max_per_tx_sui);
      const cooldownMs = BigInt(params.cooldown_seconds * 1000);
      const expiresAt = BigInt(
        Date.now() + params.expires_in_hours * 3600 * 1000
      );

      const tx = sdk.buildCreateVault({
        depositAmount,
        maxBudget,
        maxPerTx,
        allowedActions: params.allowed_actions,
        cooldownMs,
        expiresAt,
        useGasCoin: true,
      });

      const digest = await sdk.executeAgentTransaction({
        transaction: tx,
        agentKeypair: config.agentKeypair,
      });

      // Parse transaction to extract created Vault ID and OwnerCap ID
      const client = sdk.getSuiClient();
      const txDetails = await client.waitForTransaction({
        digest,
        options: { showObjectChanges: true },
      });

      const packageId = sdk.getPackageId();
      let vaultId: string | undefined;
      let ownerCapId: string | undefined;

      for (const change of txDetails.objectChanges ?? []) {
        if (change.type !== "created") continue;
        if (change.objectType.includes(`${packageId}::agent_vault::Vault`)) {
          vaultId = change.objectId;
        }
        if (change.objectType.includes(`${packageId}::agent_vault::OwnerCap`)) {
          ownerCapId = change.objectId;
        }
      }

      return ok({
        success: true,
        txDigest: digest,
        vaultId: vaultId ?? "unknown",
        ownerCapId: ownerCapId ?? "unknown",
        depositSui: params.deposit_sui,
        policy: {
          maxBudgetSui: params.max_budget_sui,
          maxPerTxSui: params.max_per_tx_sui,
          allowedActions: params.allowed_actions,
          cooldownSeconds: params.cooldown_seconds,
          expiresInHours: params.expires_in_hours,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to create vault: ${msg}`);
    }
  },
};
