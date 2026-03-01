import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const agentRevokeTool = {
  name: "sui_agent_revoke",
  label: "Sui Agent Revoke",
  description:
    "Revoke an AgentCap, removing an agent's authorization to withdraw from a Vault. Requires an OwnerCap. This is an owner-only operation.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID" }),
    owner_cap_id: Type.String({
      description: "The OwnerCap object ID for this vault",
    }),
    agent_cap_id: Type.String({
      description: "The AgentCap object ID to revoke",
    }),
  }),
  async execute(
    _toolCallId: string,
    params: {
      vault_id: string;
      owner_cap_id: string;
      agent_cap_id: string;
    }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();

      const tx = sdk.buildRevokeAgentCap({
        vaultId: params.vault_id,
        ownerCapId: params.owner_cap_id,
        capId: params.agent_cap_id,
      });

      const digest = await sdk.executeAgentTransaction({
        transaction: tx,
        agentKeypair: config.agentKeypair,
      });

      return ok({
        success: true,
        txDigest: digest,
        vaultId: params.vault_id,
        revokedCapId: params.agent_cap_id,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to revoke agent: ${msg}`);
    }
  },
};
