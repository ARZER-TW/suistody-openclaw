import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  bigintReplacer,
  serializeVault,
  serializeEvent,
} from "../types.js";
import type { VaultData, VaultEvent } from "suistody-core";

function makeVault(overrides: Partial<VaultData> = {}): VaultData {
  return {
    id: "0xvault",
    owner: "0xowner",
    balance: 5_000_000_000n,
    policy: {
      maxBudget: 10_000_000_000n,
      maxPerTx: 1_000_000_000n,
      allowedActions: [0, 1],
      cooldownMs: 60000,
      expiresAt: 1700000000000,
    },
    authorizedCaps: ["0xcap1"],
    totalSpent: 2_000_000_000n,
    lastTxTime: 1699999000000,
    txCount: 3,
    ...overrides,
  };
}

describe("ok", () => {
  it("wraps data in tool result format", () => {
    const result = ok({ foo: "bar" });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(JSON.parse(result.content[0].text)).toEqual({ foo: "bar" });
    expect(result.details).toEqual({ foo: "bar" });
  });

  it("handles bigint in data", () => {
    const result = ok({ amount: 1_000_000_000n });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.amount).toBe("1000000000");
  });
});

describe("err", () => {
  it("wraps error message in tool result format", () => {
    const result = err("something went wrong");
    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("something went wrong");
  });
});

describe("bigintReplacer", () => {
  it("converts bigint to string", () => {
    expect(bigintReplacer("key", 123n)).toBe("123");
  });

  it("passes non-bigint values through", () => {
    expect(bigintReplacer("key", "hello")).toBe("hello");
    expect(bigintReplacer("key", 42)).toBe(42);
    expect(bigintReplacer("key", null)).toBe(null);
  });
});

describe("serializeVault", () => {
  it("converts MIST to SUI and timestamps to ISO", () => {
    const vault = makeVault();
    const serialized = serializeVault(vault);

    expect(serialized.id).toBe("0xvault");
    expect(serialized.balanceSui).toBe(5);
    expect(serialized.policy.maxBudgetSui).toBe(10);
    expect(serialized.policy.maxPerTxSui).toBe(1);
    expect(serialized.totalSpentSui).toBe(2);
    expect(serialized.remainingBudgetSui).toBe(8);
    expect(serialized.policy.cooldownSeconds).toBe(60);
    expect(serialized.policy.expiresAt).toContain("2023-");
    expect(serialized.txCount).toBe(3);
  });

  it("shows 'never' for zero lastTxTime", () => {
    const vault = makeVault({ lastTxTime: 0 });
    expect(serializeVault(vault).lastTxTime).toBe("never");
  });
});

describe("serializeEvent", () => {
  it("converts event to agent-friendly format", () => {
    const event: VaultEvent = {
      txDigest: "tx_abc",
      amount: 500_000_000n,
      actionType: 0,
      totalSpent: 2_500_000_000n,
      remainingBudget: 7_500_000_000n,
      txCount: 4,
      timestamp: 1700000000000,
    };

    const serialized = serializeEvent(event);
    expect(serialized.amountSui).toBe(0.5);
    expect(serialized.actionLabel).toBe("Swap");
    expect(serialized.totalSpentSui).toBe(2.5);
    expect(serialized.timestamp).toContain("2023-");
  });

  it("handles unknown action type", () => {
    const event: VaultEvent = {
      txDigest: "tx_xyz",
      amount: 100n,
      actionType: 99,
      totalSpent: 0n,
      remainingBudget: 0n,
      txCount: 0,
      timestamp: 0,
    };

    expect(serializeEvent(event).actionLabel).toBe("Unknown(99)");
  });
});
