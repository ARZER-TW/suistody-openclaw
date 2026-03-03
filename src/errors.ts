/**
 * Structured error codes for Suistody plugin.
 * AI can use `retryable` to decide whether to retry.
 */

export type ErrorCategory = "VALIDATION" | "RPC" | "CONTRACT" | "AUTH" | "UNKNOWN";

export interface StructuredError {
  code: string;
  category: ErrorCategory;
  message: string;
  retryable: boolean;
}

const ERROR_MAP: Record<string, StructuredError> = {
  E_NOT_OWNER: {
    code: "E_NOT_OWNER",
    category: "CONTRACT",
    message: "Caller is not the vault owner",
    retryable: false,
  },
  E_BUDGET_EXCEEDED: {
    code: "E_BUDGET_EXCEEDED",
    category: "CONTRACT",
    message: "Total spending exceeds the budget limit",
    retryable: false,
  },
  E_NOT_WHITELISTED: {
    code: "E_NOT_WHITELISTED",
    category: "CONTRACT",
    message: "Action type is not in the whitelist",
    retryable: false,
  },
  E_EXPIRED: {
    code: "E_EXPIRED",
    category: "CONTRACT",
    message: "Policy has expired",
    retryable: false,
  },
  E_COOLDOWN: {
    code: "E_COOLDOWN",
    category: "CONTRACT",
    message: "Transaction cooldown period has not elapsed",
    retryable: true,
  },
  E_INVALID_CAP: {
    code: "E_INVALID_CAP",
    category: "AUTH",
    message: "Invalid or revoked capability token",
    retryable: false,
  },
  E_INSUFFICIENT_BALANCE: {
    code: "E_INSUFFICIENT_BALANCE",
    category: "CONTRACT",
    message: "Vault balance is insufficient",
    retryable: false,
  },
  E_PER_TX_EXCEEDED: {
    code: "E_PER_TX_EXCEEDED",
    category: "CONTRACT",
    message: "Amount exceeds per-transaction limit",
    retryable: false,
  },
  E_ZERO_AMOUNT: {
    code: "E_ZERO_AMOUNT",
    category: "VALIDATION",
    message: "Amount must be greater than zero",
    retryable: false,
  },
  E_VAULT_PAUSED: {
    code: "E_VAULT_PAUSED",
    category: "CONTRACT",
    message: "Vault is paused, agent withdrawals are blocked",
    retryable: true,
  },
  E_INVALID_STATUS: {
    code: "E_INVALID_STATUS",
    category: "CONTRACT",
    message: "Invalid vault status transition",
    retryable: false,
  },
};

const ABORT_CODE_MAP: Record<number, string> = {
  0: "E_NOT_OWNER",
  1: "E_BUDGET_EXCEEDED",
  2: "E_NOT_WHITELISTED",
  3: "E_EXPIRED",
  4: "E_COOLDOWN",
  5: "E_INVALID_CAP",
  6: "E_INSUFFICIENT_BALANCE",
  7: "E_PER_TX_EXCEEDED",
  8: "E_ZERO_AMOUNT",
  9: "E_VAULT_PAUSED",
  10: "E_INVALID_STATUS",
};

export function classifyError(error: unknown): StructuredError {
  const msg = error instanceof Error ? error.message : String(error);

  // Try to match Move abort code
  const abortMatch = msg.match(/MoveAbort.*?(\d+)/);
  if (abortMatch) {
    const code = Number(abortMatch[1]);
    const name = ABORT_CODE_MAP[code];
    if (name && ERROR_MAP[name]) {
      return ERROR_MAP[name];
    }
  }

  // RPC errors
  if (msg.includes("429") || msg.includes("rate limit")) {
    return {
      code: "RPC_RATE_LIMIT",
      category: "RPC",
      message: "RPC rate limit exceeded",
      retryable: true,
    };
  }

  if (msg.includes("timeout") || msg.includes("ECONNRESET")) {
    return {
      code: "RPC_TIMEOUT",
      category: "RPC",
      message: "RPC request timed out",
      retryable: true,
    };
  }

  if (msg.includes("fetch failed") || msg.includes("network")) {
    return {
      code: "RPC_NETWORK",
      category: "RPC",
      message: "Network error connecting to RPC",
      retryable: true,
    };
  }

  // Validation errors
  if (msg.includes("not a valid Sui address") || msg.includes("invalid address")) {
    return {
      code: "INVALID_ADDRESS",
      category: "VALIDATION",
      message: "Invalid Sui address format",
      retryable: false,
    };
  }

  return {
    code: "UNKNOWN",
    category: "UNKNOWN",
    message: msg,
    retryable: false,
  };
}
