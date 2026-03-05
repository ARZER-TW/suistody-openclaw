import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { ok, err, serializeVault } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const vaultsListTool = {
  name: "sui_vaults_list",
  label: "Sui Vaults List",
  description:
    "List all Vaults owned by an address (via OwnerCaps). Returns summary info for each vault including ownerCapId needed for owner operations.",
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
      const ownerCaps = await sdk.getOwnerCaps(params.owner_address);

      if (ownerCaps.length === 0) {
        return ok([]);
      }

      // Build vaultId -> ownerCapId map
      const capMap = new Map<string, string>();
      for (const cap of ownerCaps) {
        capMap.set(cap.vaultId, cap.id);
      }

      const vaults = await sdk.getOwnedVaults(params.owner_address);
      return ok(
        vaults.map((v) => ({
          ...serializeVault(v),
          ownerCapId: capMap.get(v.id) ?? "unknown",
        }))
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to list vaults: ${msg}`);
    }
  },
};
