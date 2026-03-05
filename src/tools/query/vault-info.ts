import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { ok, err, serializeVault } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultInfoTool = {
  name: "sui_vault_info",
  label: "Sui Vault Info",
  description:
    "Fetch detailed information about a Sui Vault including balance, policy, authorized agents, spending history, and ownerCapId (if owner_address is provided).",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID on Sui" }),
    owner_address: Type.Optional(
      Type.String({
        description:
          "Owner address to look up OwnerCap ID. If provided, the response includes ownerCapId.",
      })
    ),
  }),
  async execute(
    _toolCallId: string,
    params: { vault_id: string; owner_address?: string }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const vault = await sdk.getVault(params.vault_id);
      const serialized = serializeVault(vault);

      // If owner_address provided, look up the OwnerCap ID
      if (params.owner_address) {
        const ownerCaps = await sdk.getOwnerCaps(params.owner_address);
        const cap = ownerCaps.find((c) => c.vaultId === params.vault_id);
        return ok({ ...serialized, ownerCapId: cap?.id ?? "not found" });
      }

      return ok(serialized);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to fetch vault: ${msg}`);
    }
  },
};
