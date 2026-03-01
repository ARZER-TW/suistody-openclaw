import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveConfig, getResolvedConfig, _resetConfig } from "../config.js";

// Mock Ed25519Keypair
vi.mock("@mysten/sui/keypairs/ed25519", () => ({
  Ed25519Keypair: {
    fromSecretKey: vi.fn().mockReturnValue({
      getPublicKey: () => ({
        toSuiAddress: () => "0xagent_address",
      }),
    }),
  },
}));

describe("resolveConfig", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    _resetConfig();
    // Clean up env
    delete process.env.PACKAGE_ID;
    delete process.env.SUI_NETWORK;
    delete process.env.SPONSOR_PRIVATE_KEY;
    delete process.env.SUISTODY_AGENT_PRIVATE_KEY;
    delete process.env.SUISTODY_SPONSOR_PRIVATE_KEY;
    delete process.env.SUISTODY_USE_SPONSORED_TX;
  });

  afterEach(() => {
    _resetConfig();
    // Restore env
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  });

  it("resolves config from plugin config", () => {
    const config = resolveConfig({
      packageId: "0xpkg123",
      suiNetwork: "testnet",
      agentPrivateKey: "suiprivkey1test",
    });

    expect(config.packageId).toBe("0xpkg123");
    expect(config.suiNetwork).toBe("testnet");
    expect(config.useSponsoredTx).toBe(false);
    expect(process.env.PACKAGE_ID).toBe("0xpkg123");
  });

  it("falls back to env vars when plugin config is missing", () => {
    process.env.PACKAGE_ID = "0xenv_pkg";
    process.env.SUI_NETWORK = "devnet";
    process.env.SUISTODY_AGENT_PRIVATE_KEY = "suiprivkey1env";

    const config = resolveConfig({});

    expect(config.packageId).toBe("0xenv_pkg");
    expect(config.suiNetwork).toBe("devnet");
  });

  it("throws when agent private key is missing", () => {
    expect(() =>
      resolveConfig({
        packageId: "0xpkg",
      })
    ).toThrow("Agent private key is required");
  });

  it("throws when packageId is missing", () => {
    expect(() =>
      resolveConfig({
        agentPrivateKey: "suiprivkey1test",
      })
    ).toThrow();
  });

  it("returns cached config on subsequent calls", () => {
    const first = resolveConfig({
      packageId: "0xpkg",
      agentPrivateKey: "suiprivkey1test",
    });
    const second = resolveConfig({
      packageId: "0xdifferent",
      agentPrivateKey: "suiprivkey1other",
    });

    expect(first).toBe(second);
    expect(second.packageId).toBe("0xpkg");
  });

  it("sets SPONSOR_PRIVATE_KEY env var when provided", () => {
    resolveConfig({
      packageId: "0xpkg",
      agentPrivateKey: "suiprivkey1test",
      sponsorPrivateKey: "suiprivkey1sponsor",
    });

    expect(process.env.SPONSOR_PRIVATE_KEY).toBe("suiprivkey1sponsor");
  });
});

describe("getResolvedConfig", () => {
  beforeEach(() => {
    _resetConfig();
  });

  it("throws when config is not initialized", () => {
    expect(() => getResolvedConfig()).toThrow("Plugin not initialized");
  });
});
