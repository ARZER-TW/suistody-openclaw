/**
 * Lazy proxy for @suistody/core.
 *
 * @suistody/core reads process.env.PACKAGE_ID at top-level import time.
 * We must set env vars BEFORE the first import. This module uses
 * dynamic import + singleton cache to ensure correct ordering.
 */

let _sdk: typeof import("@suistody/core") | null = null;

export async function getSdk(): Promise<typeof import("@suistody/core")> {
  if (!_sdk) {
    _sdk = await import("@suistody/core");
  }
  return _sdk;
}
