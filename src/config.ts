import { z } from "zod";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const SUI_NETWORKS = ["testnet", "devnet", "mainnet"] as const;

const ConfigSchema = z.object({
  packageId: z.string().min(1, "packageId is required"),
  suiNetwork: z.enum(SUI_NETWORKS).default("testnet"),
  agentPrivateKey: z.string().optional(),
  sponsorPrivateKey: z.string().optional(),
  useSponsoredTx: z.boolean().default(false),
});

export type PluginConfig = z.infer<typeof ConfigSchema>;

export interface ResolvedConfig {
  packageId: string;
  suiNetwork: (typeof SUI_NETWORKS)[number];
  agentKeypair: Ed25519Keypair;
  useSponsoredTx: boolean;
}

let _resolved: ResolvedConfig | null = null;

export function resolveConfig(
  pluginConfig?: Record<string, unknown>
): ResolvedConfig {
  if (_resolved) return _resolved;

  const raw = {
    packageId:
      (pluginConfig?.packageId as string) ?? process.env.PACKAGE_ID ?? "",
    suiNetwork:
      (pluginConfig?.suiNetwork as string) ??
      process.env.SUI_NETWORK ??
      "testnet",
    agentPrivateKey:
      (pluginConfig?.agentPrivateKey as string) ??
      process.env.SUISTODY_AGENT_PRIVATE_KEY ??
      "",
    sponsorPrivateKey:
      (pluginConfig?.sponsorPrivateKey as string) ??
      process.env.SUISTODY_SPONSOR_PRIVATE_KEY ??
      "",
    useSponsoredTx:
      (pluginConfig?.useSponsoredTx as boolean | undefined) ??
      process.env.SUISTODY_USE_SPONSORED_TX === "true",
  };

  const parsed = ConfigSchema.parse(raw);

  if (!parsed.agentPrivateKey) {
    throw new Error(
      "Agent private key is required. Set agentPrivateKey in plugin config or SUISTODY_AGENT_PRIVATE_KEY env var."
    );
  }

  // Set env vars BEFORE any suistody-core import
  process.env.PACKAGE_ID = parsed.packageId;
  process.env.SUI_NETWORK = parsed.suiNetwork;
  if (parsed.sponsorPrivateKey) {
    process.env.SPONSOR_PRIVATE_KEY = parsed.sponsorPrivateKey;
  }

  const agentKeypair = Ed25519Keypair.fromSecretKey(parsed.agentPrivateKey);

  _resolved = {
    packageId: parsed.packageId,
    suiNetwork: parsed.suiNetwork,
    agentKeypair,
    useSponsoredTx: parsed.useSponsoredTx,
  };

  return _resolved;
}

export function getResolvedConfig(): ResolvedConfig {
  if (!_resolved) {
    throw new Error(
      "Plugin not initialized. Call resolveConfig() first."
    );
  }
  return _resolved;
}

/** Reset for testing */
export function _resetConfig(): void {
  _resolved = null;
}
