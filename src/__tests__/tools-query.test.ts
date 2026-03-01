import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock suistody-core
vi.mock("suistody-core", () => ({
  getVault: vi.fn(),
  getOwnedVaults: vi.fn(),
  getVaultEvents: vi.fn(),
  getAgentCaps: vi.fn(),
  getSuiClient: vi.fn(),
}));

// Mock config
vi.mock("../config.js", () => ({
  getResolvedConfig: vi.fn().mockReturnValue({
    agentKeypair: {
      getPublicKey: () => ({
        toSuiAddress: () => "0xagent_default",
      }),
    },
  }),
}));

import { vaultInfoTool } from "../tools/query/vault-info.js";
import { vaultsListTool } from "../tools/query/vaults-list.js";
import { vaultHistoryTool } from "../tools/query/vault-history.js";
import { walletBalanceTool } from "../tools/query/wallet-balance.js";
import { agentCapsTool } from "../tools/query/agent-caps.js";

const mockSdk = await import("suistody-core");

const MOCK_VAULT = {
  id: "0xvault1",
  owner: "0xowner1",
  balance: 5_000_000_000n,
  policy: {
    maxBudget: 10_000_000_000n,
    maxPerTx: 1_000_000_000n,
    allowedActions: [0],
    cooldownMs: 60000,
    expiresAt: 1700000000000,
  },
  authorizedCaps: ["0xcap1"],
  totalSpent: 0n,
  lastTxTime: 0,
  txCount: 0,
};

describe("sui_vault_info", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns serialized vault data", async () => {
    vi.mocked(mockSdk.getVault).mockResolvedValue(MOCK_VAULT);

    const result = await vaultInfoTool.execute("call1", {
      vault_id: "0xvault1",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe("0xvault1");
    expect(data.balanceSui).toBe(5);
    expect(data.policy.maxBudgetSui).toBe(10);
  });

  it("returns error when vault not found", async () => {
    vi.mocked(mockSdk.getVault).mockRejectedValue(
      new Error("Vault not found: 0xbad")
    );

    const result = await vaultInfoTool.execute("call2", {
      vault_id: "0xbad",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Vault not found");
  });

  it("has correct tool name and description", () => {
    expect(vaultInfoTool.name).toBe("sui_vault_info");
    expect(vaultInfoTool.description).toContain("Vault");
  });

  it("handles non-Error exceptions", async () => {
    vi.mocked(mockSdk.getVault).mockRejectedValue("string error");

    const result = await vaultInfoTool.execute("call3", {
      vault_id: "0x",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("string error");
  });
});

describe("sui_vaults_list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of serialized vaults", async () => {
    vi.mocked(mockSdk.getOwnedVaults).mockResolvedValue([MOCK_VAULT]);

    const result = await vaultsListTool.execute("call1", {
      owner_address: "0xowner1",
    });

    const data = JSON.parse(result.content[0].text);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("0xvault1");
  });

  it("returns empty array when no vaults", async () => {
    vi.mocked(mockSdk.getOwnedVaults).mockResolvedValue([]);

    const result = await vaultsListTool.execute("call2", {
      owner_address: "0xnobody",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data).toEqual([]);
  });

  it("returns error on failure", async () => {
    vi.mocked(mockSdk.getOwnedVaults).mockRejectedValue(
      new Error("Network error")
    );

    const result = await vaultsListTool.execute("call3", {
      owner_address: "0x",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Network error");
  });
});

describe("sui_vault_history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns serialized events", async () => {
    vi.mocked(mockSdk.getVaultEvents).mockResolvedValue([
      {
        txDigest: "tx1",
        amount: 500_000_000n,
        actionType: 0,
        totalSpent: 500_000_000n,
        remainingBudget: 9_500_000_000n,
        txCount: 1,
        timestamp: 1700000000000,
      },
    ]);

    const result = await vaultHistoryTool.execute("call1", {
      vault_id: "0xvault1",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0].amountSui).toBe(0.5);
    expect(data[0].actionLabel).toBe("Swap");
  });

  it("returns empty array when no events", async () => {
    vi.mocked(mockSdk.getVaultEvents).mockResolvedValue([]);

    const result = await vaultHistoryTool.execute("call2", {
      vault_id: "0x",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data).toEqual([]);
  });

  it("returns error on failure", async () => {
    vi.mocked(mockSdk.getVaultEvents).mockRejectedValue(
      new Error("Query failed")
    );

    const result = await vaultHistoryTool.execute("call3", {
      vault_id: "0x",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Query failed");
  });
});

describe("sui_wallet_balance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns balance for specified address", async () => {
    const mockClient = {
      getBalance: vi.fn().mockResolvedValue({
        totalBalance: "5000000000",
      }),
    };
    vi.mocked(mockSdk.getSuiClient).mockReturnValue(mockClient as never);

    const result = await walletBalanceTool.execute("call1", {
      address: "0xcustom",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.address).toBe("0xcustom");
    expect(data.balanceSui).toBe(5);
  });

  it("defaults to agent address when none provided", async () => {
    const mockClient = {
      getBalance: vi.fn().mockResolvedValue({
        totalBalance: "1000000000",
      }),
    };
    vi.mocked(mockSdk.getSuiClient).mockReturnValue(mockClient as never);

    const result = await walletBalanceTool.execute("call2", {});

    const data = JSON.parse(result.content[0].text);
    expect(data.address).toBe("0xagent_default");
  });

  it("returns error on failure", async () => {
    const mockClient = {
      getBalance: vi.fn().mockRejectedValue(new Error("RPC down")),
    };
    vi.mocked(mockSdk.getSuiClient).mockReturnValue(mockClient as never);

    const result = await walletBalanceTool.execute("call3", {
      address: "0x",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("RPC down");
  });
});

describe("sui_agent_caps", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns agent caps for specified address", async () => {
    vi.mocked(mockSdk.getAgentCaps).mockResolvedValue([
      { id: "0xcap1", vaultId: "0xvault1" },
      { id: "0xcap2", vaultId: "0xvault2" },
    ]);

    const result = await agentCapsTool.execute("call1", {
      agent_address: "0xagent",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.total).toBe(2);
    expect(data.caps).toHaveLength(2);
    expect(data.caps[0].capId).toBe("0xcap1");
  });

  it("defaults to agent address when none provided", async () => {
    vi.mocked(mockSdk.getAgentCaps).mockResolvedValue([]);

    const result = await agentCapsTool.execute("call2", {});

    const data = JSON.parse(result.content[0].text);
    expect(data.agentAddress).toBe("0xagent_default");
    expect(data.total).toBe(0);
  });

  it("returns error on failure", async () => {
    vi.mocked(mockSdk.getAgentCaps).mockRejectedValue(
      new Error("Fetch error")
    );

    const result = await agentCapsTool.execute("call3", {
      agent_address: "0x",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Fetch error");
  });
});
