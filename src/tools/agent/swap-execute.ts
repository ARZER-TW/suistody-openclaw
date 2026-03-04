import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { getResolvedConfig } from "../../config.js";
import { ok, err, serializeVault } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const swapExecuteTool = {
  name: "sui_swap_execute",
  label: "Sui Swap Execute",
  description:
    "Execute a token swap from a Vault as an authorized agent. " +
    "Withdraws SUI from the Vault and swaps it to USDC (or reverse) via Cetus DEX " +
    "in a single atomic transaction. Pre-checks vault policy before execution.",
  parameters: Type.Object({
    vault_id: Type.String({ description: "The Vault object ID" }),
    agent_cap_id: Type.String({
      description: "The AgentCap object ID authorizing this swap",
    }),
    amount_in: Type.Number({
      description:
        "Amount of input token to swap (in human units, e.g. 0.5 for 0.5 SUI)",
    }),
    token_in: Type.Optional(
      Type.String({
        description:
          'Input token type. Defaults to "0x2::sui::SUI" if omitted.',
      })
    ),
    token_out: Type.Optional(
      Type.String({
        description: "Output token type. Defaults to testnet USDC if omitted.",
      })
    ),
    slippage_bps: Type.Optional(
      Type.Number({
        description:
          "Slippage tolerance in basis points. Default 50 (0.5%). Max 1000 (10%).",
      })
    ),
    recipient_address: Type.Optional(
      Type.String({
        description:
          "Address to receive swapped tokens. Defaults to agent's address.",
      })
    ),
  }),
  async execute(
    _toolCallId: string,
    params: {
      vault_id: string;
      agent_cap_id: string;
      amount_in: number;
      token_in?: string;
      token_out?: string;
      slippage_bps?: number;
      recipient_address?: string;
    }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();
      const config = getResolvedConfig();

      const tokenIn = params.token_in ?? "0x2::sui::SUI";
      const tokenOut =
        params.token_out ??
        "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

      // Convert to smallest unit
      const isSuiInput = tokenIn === "0x2::sui::SUI";
      const inDecimals = isSuiInput ? 9 : 6;
      const amountIn = BigInt(
        Math.floor(params.amount_in * 10 ** inDecimals)
      );

      // 1. Fetch vault and check policy
      const vault = await sdk.getVault(params.vault_id);

      const policyCheck = sdk.checkPolicy({
        vault,
        actionType: 0, // ACTION_SWAP
        nowMs: Date.now(),
        amount: amountIn,
      });

      if (!policyCheck.allowed) {
        return err(
          `Policy check failed: ${policyCheck.reason}. ` +
            `Vault balance: ${Number(vault.balance) / 1e9} SUI`
        );
      }

      // 2. Get swap quote
      const quote = await sdk.getSwapQuote({
        tokenIn,
        tokenOut,
        amountIn,
        slippageBps: params.slippage_bps,
      });

      // 3. Discover pool
      const pool = await sdk.findPool(tokenIn, tokenOut);

      // 4. Build composite PTB
      const recipientAddress =
        params.recipient_address ??
        config.agentKeypair.getPublicKey().toSuiAddress();

      const tx = sdk.buildAgentSwap({
        vaultId: params.vault_id,
        agentCapId: params.agent_cap_id,
        amountIn,
        minAmountOut: quote.minAmountOut,
        recipientAddress,
        pool,
      });

      // 5. Execute
      let digest: string;
      if (config.useSponsoredTx) {
        digest = await sdk.executeSponsoredAgentTransaction({
          transaction: tx,
          agentKeypair: config.agentKeypair,
        });
      } else {
        digest = await sdk.executeAgentTransaction({
          transaction: tx,
          agentKeypair: config.agentKeypair,
        });
      }

      const outDecimals = isSuiInput ? 6 : 9;
      return ok({
        success: true,
        txDigest: digest,
        vaultId: params.vault_id,
        swapped: {
          tokenIn,
          tokenOut,
          amountIn: params.amount_in,
          estimatedOut:
            Number(quote.estimatedAmountOut) / 10 ** outDecimals,
          minOut: Number(quote.minAmountOut) / 10 ** outDecimals,
          route: quote.route,
        },
        recipientAddress,
        sponsored: config.useSponsoredTx,
        vaultStateBeforeTx: serializeVault(vault),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Swap execution failed: ${msg}`);
    }
  },
};
