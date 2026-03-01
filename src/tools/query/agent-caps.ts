import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const agentCapsTool = {
  name: "sui_agent_caps",
  label: "Sui Agent Caps",
  description:
    "List all AgentCap objects owned by an address. Each AgentCap authorizes the holder to withdraw from a specific Vault. Defaults to agent's own address.",
  parameters: Type.Object({
    agent_address: Type.Optional(
      Type.String({
        description:
          "Sui address of the agent. Defaults to this agent's address if omitted.",
      })
    ),
  }),
  async execute(
    _toolCallId: string,
    params: { agent_address?: string }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();
      const address =
        params.agent_address ??
        config.agentKeypair.getPublicKey().toSuiAddress();
      const caps = await sdk.getAgentCaps(address);
      return ok({
        agentAddress: address,
        caps: caps.map((cap) => ({
          capId: cap.id,
          vaultId: cap.vaultId,
        })),
        total: caps.length,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to fetch agent caps: ${msg}`);
    }
  },
};
