import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const agentAuthorizeTool = {
  name: "sui_agent_authorize",
  label: "Sui Agent Authorize",
  description:
    "Create an AgentCap for an agent address, authorizing it to withdraw from a Vault. Requires an OwnerCap. This is an owner-only operation.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID" }),
    owner_cap_id: Type.String({
      description: "The OwnerCap object ID for this vault",
    }),
    agent_address: Type.String({
      description: "Sui address of the agent to authorize",
    }),
  }),
  async execute(
    _toolCallId: string,
    params: {
      vault_id: string;
      owner_cap_id: string;
      agent_address: string;
    }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();

      const tx = sdk.buildCreateAgentCap({
        vaultId: params.vault_id,
        ownerCapId: params.owner_cap_id,
        agentAddress: params.agent_address,
      });

      const digest = await sdk.executeAgentTransaction({
        transaction: tx,
        agentKeypair: config.agentKeypair,
      });

      return ok({
        success: true,
        txDigest: digest,
        vaultId: params.vault_id,
        agentAddress: params.agent_address,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to authorize agent: ${msg}`);
    }
  },
};
