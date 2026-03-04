import type { VaultData, VaultEvent } from "@suistody/core";

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  details: unknown;
}

export function ok(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, bigintReplacer) }],
    details: data,
  };
}

export function err(message: string): ToolResult {
  const payload = { error: message };
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    details: payload,
  };
}

export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export interface SerializedVault {
  id: string;
  owner: string;
  balanceSui: number;
  status: number;
  statusLabel: string;
  policy: {
    maxBudgetSui: number;
    maxPerTxSui: number;
    allowedActions: number[];
    cooldownSeconds: number;
    expiresAt: string;
  };
  authorizedCaps: string[];
  totalSpentSui: number;
  remainingBudgetSui: number;
  lastTxTime: string;
  txCount: number;
}

const STATUS_LABELS_MAP: Record<number, string> = {
  0: "Active",
  1: "Paused",
  2: "Locked",
};

export function serializeVault(vault: VaultData): SerializedVault {
  const remainingBudget = vault.policy.maxBudget - vault.totalSpent;
  return {
    id: vault.id,
    owner: vault.owner,
    balanceSui: Number(vault.balance) / 1e9,
    status: vault.status,
    statusLabel: STATUS_LABELS_MAP[vault.status] ?? `Unknown(${vault.status})`,
    policy: {
      maxBudgetSui: Number(vault.policy.maxBudget) / 1e9,
      maxPerTxSui: Number(vault.policy.maxPerTx) / 1e9,
      allowedActions: vault.policy.allowedActions,
      cooldownSeconds: vault.policy.cooldownMs / 1000,
      expiresAt: new Date(vault.policy.expiresAt).toISOString(),
    },
    authorizedCaps: vault.authorizedCaps,
    totalSpentSui: Number(vault.totalSpent) / 1e9,
    remainingBudgetSui: Number(remainingBudget) / 1e9,
    lastTxTime:
      vault.lastTxTime > 0
        ? new Date(vault.lastTxTime).toISOString()
        : "never",
    txCount: vault.txCount,
  };
}

export interface SerializedEvent {
  txDigest: string;
  amountSui: number;
  actionType: number;
  actionLabel: string;
  totalSpentSui: number;
  remainingBudgetSui: number;
  txCount: number;
  timestamp: string;
}

const ACTION_LABELS: Record<number, string> = {
  0: "Swap",
  1: "Stable Mint",
  2: "Stable Burn",
  3: "Stable Claim",
};

export function serializeEvent(event: VaultEvent): SerializedEvent {
  return {
    txDigest: event.txDigest,
    amountSui: Number(event.amount) / 1e9,
    actionType: event.actionType,
    actionLabel: ACTION_LABELS[event.actionType] ?? `Unknown(${event.actionType})`,
    totalSpentSui: Number(event.totalSpent) / 1e9,
    remainingBudgetSui: Number(event.remainingBudget) / 1e9,
    txCount: event.txCount,
    timestamp: new Date(event.timestamp).toISOString(),
  };
}
