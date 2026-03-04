import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @suistody/core
vi.mock("@suistody/core", () => ({
  buildCreateVault: vi.fn().mockReturnValue({ serialize: vi.fn() }),
  buildDepositFromGas: vi.fn().mockReturnValue({ serialize: vi.fn() }),
  buildWithdrawAll: vi.fn().mockReturnValue({ serialize: vi.fn() }),
  buildCreateAgentCap: vi.fn().mockReturnValue({ serialize: vi.fn() }),
  buildRevokeAgentCap: vi.fn().mockReturnValue({ serialize: vi.fn() }),
  executeAgentTransaction: vi.fn(),
  suiToMist: vi.fn((sui: number) => BigInt(Math.round(sui * 1e9))),
}));

// Mock config
vi.mock("../config.js", () => ({
  getResolvedConfig: vi.fn().mockReturnValue({
    agentKeypair: {
      getPublicKey: () => ({
        toSuiAddress: () => "0xagent",
      }),
    },
    useSponsoredTx: false,
  }),
}));

import { vaultCreateTool } from "../tools/owner/vault-create.js";
import { vaultDepositTool } from "../tools/owner/vault-deposit.js";
import { vaultWithdrawTool } from "../tools/owner/vault-withdraw.js";
import { agentAuthorizeTool } from "../tools/owner/agent-authorize.js";
import { agentRevokeTool } from "../tools/owner/agent-revoke.js";

const mockSdk = await import("@suistody/core");

describe("sui_vault_create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates vault and returns digest", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockResolvedValue(
      "create_digest_1"
    );

    const result = await vaultCreateTool.execute("call1", {
      deposit_sui: 1,
      max_budget_sui: 5,
      max_per_tx_sui: 1,
      allowed_actions: [0],
      cooldown_seconds: 60,
      expires_in_hours: 1,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.txDigest).toBe("create_digest_1");
    expect(data.depositSui).toBe(1);
  });

  it("passes correct params to buildCreateVault", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockResolvedValue("digest");

    await vaultCreateTool.execute("call2", {
      deposit_sui: 2,
      max_budget_sui: 10,
      max_per_tx_sui: 1,
      allowed_actions: [0, 1, 2],
      cooldown_seconds: 30,
      expires_in_hours: 24,
    });

    expect(mockSdk.buildCreateVault).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedActions: [0, 1, 2],
        useGasCoin: true,
      })
    );
  });

  it("returns error on tx failure", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockRejectedValue(
      new Error("InsufficientGas")
    );

    const result = await vaultCreateTool.execute("call3", {
      deposit_sui: 100,
      max_budget_sui: 50,
      max_per_tx_sui: 10,
      allowed_actions: [0],
      cooldown_seconds: 0,
      expires_in_hours: 1,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("InsufficientGas");
  });
});

describe("sui_vault_deposit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deposits and returns digest", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockResolvedValue(
      "deposit_digest"
    );

    const result = await vaultDepositTool.execute("call1", {
      vault_id: "0xvault",
      owner_cap_id: "0xcap",
      amount_sui: 1.5,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.txDigest).toBe("deposit_digest");
    expect(data.depositedSui).toBe(1.5);
  });

  it("calls buildDepositFromGas with correct params", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockResolvedValue("d");

    await vaultDepositTool.execute("call2", {
      vault_id: "0xv",
      owner_cap_id: "0xc",
      amount_sui: 2,
    });

    expect(mockSdk.buildDepositFromGas).toHaveBeenCalledWith({
      vaultId: "0xv",
      ownerCapId: "0xc",
      amount: expect.any(BigInt),
    });
  });

  it("returns error on failure", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockRejectedValue(
      new Error("Auth fail")
    );

    const result = await vaultDepositTool.execute("call3", {
      vault_id: "0xv",
      owner_cap_id: "0xc",
      amount_sui: 1,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Auth fail");
  });
});

describe("sui_vault_withdraw", () => {
  beforeEach(() => vi.clearAllMocks());

  it("withdraws all and returns digest", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockResolvedValue(
      "withdraw_digest"
    );

    const result = await vaultWithdrawTool.execute("call1", {
      vault_id: "0xv",
      owner_cap_id: "0xc",
      recipient_address: "0xrecipient",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.recipientAddress).toBe("0xrecipient");
  });

  it("returns error on failure", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockRejectedValue(
      new Error("Not owner")
    );

    const result = await vaultWithdrawTool.execute("call2", {
      vault_id: "0xv",
      owner_cap_id: "0xc",
      recipient_address: "0x",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Not owner");
  });
});

describe("sui_agent_authorize", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes agent and returns digest", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockResolvedValue(
      "auth_digest"
    );

    const result = await agentAuthorizeTool.execute("call1", {
      vault_id: "0xv",
      owner_cap_id: "0xc",
      agent_address: "0xnew_agent",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.agentAddress).toBe("0xnew_agent");
  });

  it("returns error on failure", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockRejectedValue(
      new Error("Unauthorized")
    );

    const result = await agentAuthorizeTool.execute("call2", {
      vault_id: "0xv",
      owner_cap_id: "0xc",
      agent_address: "0x",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Unauthorized");
  });
});

describe("sui_agent_revoke", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revokes agent cap and returns digest", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockResolvedValue(
      "revoke_digest"
    );

    const result = await agentRevokeTool.execute("call1", {
      vault_id: "0xv",
      owner_cap_id: "0xc",
      agent_cap_id: "0xagent_cap",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.revokedCapId).toBe("0xagent_cap");
  });

  it("returns error on failure", async () => {
    vi.mocked(mockSdk.executeAgentTransaction).mockRejectedValue(
      new Error("Cap not found")
    );

    const result = await agentRevokeTool.execute("call2", {
      vault_id: "0xv",
      owner_cap_id: "0xc",
      agent_cap_id: "0x",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Cap not found");
  });
});
