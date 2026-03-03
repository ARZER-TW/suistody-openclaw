/**
 * Input validation utilities for plugin tools.
 * Validates before hitting the chain to save gas and provide clear errors.
 */

const SUI_ADDRESS_REGEX = /^0x[a-fA-F0-9]{64}$/;

export function isValidSuiAddress(address: string): boolean {
  return SUI_ADDRESS_REGEX.test(address);
}

export function isValidSuiObjectId(id: string): boolean {
  return SUI_ADDRESS_REGEX.test(id);
}

export function validateSuiAddress(address: string, fieldName: string): string | null {
  if (!address || typeof address !== "string") {
    return `${fieldName} is required`;
  }
  if (!isValidSuiAddress(address)) {
    return `${fieldName} must be a valid Sui address (0x + 64 hex chars), got: ${address}`;
  }
  return null;
}

export function validateObjectId(id: string, fieldName: string): string | null {
  if (!id || typeof id !== "string") {
    return `${fieldName} is required`;
  }
  if (!isValidSuiObjectId(id)) {
    return `${fieldName} must be a valid Sui object ID (0x + 64 hex chars), got: ${id}`;
  }
  return null;
}

export function validateAmount(amount: number, fieldName: string): string | null {
  if (typeof amount !== "number" || isNaN(amount)) {
    return `${fieldName} must be a number`;
  }
  if (amount <= 0) {
    return `${fieldName} must be greater than 0`;
  }
  if (amount > 1_000_000) {
    return `${fieldName} exceeds maximum allowed (1,000,000 SUI)`;
  }
  return null;
}

export function validateActionType(actionType: number): string | null {
  if (!Number.isInteger(actionType) || actionType < 0 || actionType > 255) {
    return `action_type must be an integer between 0 and 255, got: ${actionType}`;
  }
  return null;
}
