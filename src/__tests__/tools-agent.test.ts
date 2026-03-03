import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock suistody-core
vi.mock("suistody-core", () => ({
  getVault: vi.fn(),
  checkPolicy: vi.fn(),
  buildAgentWithdraw: vi.fn().mockReturnValue({ serialize: vi.fn() }),
  executeAgentTransaction: vi.fn(),
  executeSponsoredAgentTransaction: vi.fn(),
  suiToMist: vi.fn((sui: number) => BigInt(Math.round(sui * 1e9))),
}));

// Mock config (default: non-sponsored)
const mockConfig = {
  agentKeypair: {
    getPublicKey: () => ({
      toSuiAddress: () => "0xagent_addr",
    }),
  },
  useSponsoredTx: false,
};

vi.mock("../config.js", () => ({
  getResolvedConfig: vi.fn(() => mockConfig),
}));

import { agentWithdrawTool } from "../tools/agent/agent-withdraw.js";

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
    expiresAt: Date.now() + 3_600_000,
  },
  authorizedCaps: ["0xcap1"],
  totalSpent: 0n,
  lastTxTime: 0,
  txCount: 0,
  status: 0,
};

describe("sui_agent_withdraw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.useSponsoredTx = false;
  });

  it("withdraws successfully with standard tx", async () => {
    vi.mocked(mockSdk.getVault).mockResolvedValue(MOCK_VAULT);
    vi.mocked(mockSdk.checkPolicy).mockReturnValue({
      allowed: true,
      reason: "Policy check passed",
    });
    vi.mocked(mockSdk.executeAgentTransaction).mockResolvedValue(
      "agent_digest_1"
    );

    const result = await agentWithdrawTool.execute("call1", {
      vault_id: "0xvault1",
      agent_cap_id: "0xcap1",
      amount_sui: 0.5,
      action_type: 0,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.txDigest).toBe("agent_digest_1");
    expect(data.withdrawnSui).toBe(0.5);
    expect(data.sponsored).toBe(false);
    expect(data.recipientAddress).toBe("0xagent_addr");
  });

  it("uses sponsored tx when configured", async () => {
    mockConfig.useSponsoredTx = true;
    vi.mocked(mockSdk.getVault).mockResolvedValue(MOCK_VAULT);
    vi.mocked(mockSdk.checkPolicy).mockReturnValue({
      allowed: true,
      reason: "Policy check passed",
    });
    vi.mocked(mockSdk.executeSponsoredAgentTransaction).mockResolvedValue(
      "sponsored_digest"
    );

    const result = await agentWithdrawTool.execute("call2", {
      vault_id: "0xvault1",
      agent_cap_id: "0xcap1",
      amount_sui: 0.5,
      action_type: 0,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.sponsored).toBe(true);
    expect(data.txDigest).toBe("sponsored_digest");
    expect(mockSdk.executeSponsoredAgentTransaction).toHaveBeenCalled();
    expect(mockSdk.executeAgentTransaction).not.toHaveBeenCalled();
  });

  it("returns error when policy check fails", async () => {
    vi.mocked(mockSdk.getVault).mockResolvedValue(MOCK_VAULT);
    vi.mocked(mockSdk.checkPolicy).mockReturnValue({
      allowed: false,
      reason: "Amount exceeds per-tx limit",
    });

    const result = await agentWithdrawTool.execute("call3", {
      vault_id: "0xvault1",
      agent_cap_id: "0xcap1",
      amount_sui: 5,
      action_type: 0,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("per-tx limit");
    expect(mockSdk.buildAgentWithdraw).not.toHaveBeenCalled();
  });

  it("uses custom recipient when provided", async () => {
    vi.mocked(mockSdk.getVault).mockResolvedValue(MOCK_VAULT);
    vi.mocked(mockSdk.checkPolicy).mockReturnValue({
      allowed: true,
      reason: "OK",
    });
    vi.mocked(mockSdk.executeAgentTransaction).mockResolvedValue("d");

    const result = await agentWithdrawTool.execute("call4", {
      vault_id: "0xvault1",
      agent_cap_id: "0xcap1",
      amount_sui: 0.1,
      action_type: 0,
      recipient_address: "0xcustom_recipient",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.recipientAddress).toBe("0xcustom_recipient");
    expect(mockSdk.buildAgentWithdraw).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientAddress: "0xcustom_recipient",
      })
    );
  });

  it("returns error when vault fetch fails", async () => {
    vi.mocked(mockSdk.getVault).mockRejectedValue(
      new Error("Vault not found")
    );

    const result = await agentWithdrawTool.execute("call5", {
      vault_id: "0xbad",
      agent_cap_id: "0xcap",
      amount_sui: 1,
      action_type: 0,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Vault not found");
  });

  it("returns error when tx execution fails", async () => {
    vi.mocked(mockSdk.getVault).mockResolvedValue(MOCK_VAULT);
    vi.mocked(mockSdk.checkPolicy).mockReturnValue({
      allowed: true,
      reason: "OK",
    });
    vi.mocked(mockSdk.executeAgentTransaction).mockRejectedValue(
      new Error("Agent TX failed: PolicyViolation")
    );

    const result = await agentWithdrawTool.execute("call6", {
      vault_id: "0xvault1",
      agent_cap_id: "0xcap1",
      amount_sui: 0.5,
      action_type: 0,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("PolicyViolation");
  });

  it("includes vault state in policy failure response", async () => {
    vi.mocked(mockSdk.getVault).mockResolvedValue({
      ...MOCK_VAULT,
      balance: 100_000_000n,
      totalSpent: 9_000_000_000n,
    });
    vi.mocked(mockSdk.checkPolicy).mockReturnValue({
      allowed: false,
      reason: "Insufficient vault balance",
    });

    const result = await agentWithdrawTool.execute("call7", {
      vault_id: "0xvault1",
      agent_cap_id: "0xcap1",
      amount_sui: 1,
      action_type: 0,
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("balance=0.1 SUI");
    expect(data.error).toContain("totalSpent=9 SUI");
  });

  it("has correct tool metadata", () => {
    expect(agentWithdrawTool.name).toBe("sui_agent_withdraw");
    expect(agentWithdrawTool.label).toBe("Sui Agent Withdraw");
    expect(agentWithdrawTool.description).toContain("policy");
  });
});
