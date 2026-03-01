import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const walletBalanceTool = {
  name: "sui_wallet_balance",
  label: "Sui Wallet Balance",
  description:
    "Check the SUI balance of a wallet address. Defaults to the agent's own address if no address is provided.",
  parameters: Type.Object({
    address: Type.Optional(
      Type.String({
        description:
          "Sui address to check. Defaults to agent's address if omitted.",
      })
    ),
  }),
  async execute(
    _toolCallId: string,
    params: { address?: string }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();
      const address =
        params.address ??
        config.agentKeypair.getPublicKey().toSuiAddress();
      const client = sdk.getSuiClient();
      const balance = await client.getBalance({ owner: address });
      return ok({
        address,
        balanceSui: Number(balance.totalBalance) / 1e9,
        balanceMist: balance.totalBalance,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to fetch balance: ${msg}`);
    }
  },
};
