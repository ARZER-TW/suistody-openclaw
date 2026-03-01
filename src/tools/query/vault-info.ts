import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { ok, err, serializeVault } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultInfoTool = {
  name: "sui_vault_info",
  label: "Sui Vault Info",
  description:
    "Fetch detailed information about a Sui Vault including balance, policy, authorized agents, and spending history.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID on Sui" }),
  }),
  async execute(
    _toolCallId: string,
    params: { vault_id: string }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const vault = await sdk.getVault(params.vault_id);
      return ok(serializeVault(vault));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to fetch vault: ${msg}`);
    }
  },
};
