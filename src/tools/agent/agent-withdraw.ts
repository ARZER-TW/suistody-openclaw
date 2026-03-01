import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err, serializeVault } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const agentWithdrawTool = {
  name: "sui_agent_withdraw",
  label: "Sui Agent Withdraw",
  description:
    "Withdraw SUI from a Vault as an authorized agent. Pre-checks policy off-chain before submitting the transaction. Supports sponsored transactions if configured.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID" }),
    agent_cap_id: Type.String({
      description: "The AgentCap object ID authorizing this withdrawal",
    }),
    amount_sui: Type.Number({
      description: "Amount of SUI to withdraw",
    }),
    action_type: Type.Number({
      description:
        "Action type: 0=Swap, 1=StableMint, 2=StableBurn, 3=StableClaim",
    }),
    recipient_address: Type.Optional(
      Type.String({
        description:
          "Sui address to receive funds. Defaults to agent's address if omitted.",
      })
    ),
  }),
  async execute(
    _toolCallId: string,
    params: {
      vault_id: string;
      agent_cap_id: string;
      amount_sui: number;
      action_type: number;
      recipient_address?: string;
    }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();

      // 1. Fetch latest vault state
      const vault = await sdk.getVault(params.vault_id);

      const amount = sdk.suiToMist(params.amount_sui);

      // 2. Pre-check policy off-chain
      const policyCheck = sdk.checkPolicy({
        vault,
        actionType: params.action_type,
        nowMs: Date.now(),
        amount,
      });

      if (!policyCheck.allowed) {
        return err(
          `Policy check failed: ${policyCheck.reason}. ` +
            `Current vault state: balance=${Number(vault.balance) / 1e9} SUI, ` +
            `totalSpent=${Number(vault.totalSpent) / 1e9} SUI`
        );
      }

      // 3. Build PTB
      const recipientAddress =
        params.recipient_address ??
        config.agentKeypair.getPublicKey().toSuiAddress();

      const tx = sdk.buildAgentWithdraw({
        vaultId: params.vault_id,
        agentCapId: params.agent_cap_id,
        amount,
        actionType: params.action_type,
        recipientAddress,
      });

      // 4. Execute (sponsored or standard)
      let digest: string;
      if (config.useSponsoredTx) {
        digest = await sdk.executeSponsoredAgentTransaction({
          transaction: tx,
          agentKeypair: config.agentKeypair,
        });
      } else {
        digest = await sdk.executeAgentTransaction({
          transaction: tx,
          agentKeypair: config.agentKeypair,
        });
      }

      return ok({
        success: true,
        txDigest: digest,
        vaultId: params.vault_id,
        withdrawnSui: params.amount_sui,
        actionType: params.action_type,
        recipientAddress,
        sponsored: config.useSponsoredTx,
        vaultStateBeforeTx: serializeVault(vault),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Agent withdraw failed: ${msg}`);
    }
  },
};
