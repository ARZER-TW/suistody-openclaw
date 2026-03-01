import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { ok, err, serializeVault } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultsListTool = {
  name: "sui_vaults_list",
  label: "Sui Vaults List",
  description:
    "List all Vaults owned by an address (via OwnerCaps). Returns summary info for each vault.",
  parameters: Type.Object({
    owner_address: Type.String({
      description: "The Sui address of the vault owner",
    }),
  }),
  async execute(
    _toolCallId: string,
    params: { owner_address: string }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const vaults = await sdk.getOwnedVaults(params.owner_address);
      return ok(vaults.map(serializeVault));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to list vaults: ${msg}`);
    }
  },
};
