import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const swapQuoteTool = {
  name: "sui_swap_quote",
  label: "Sui Swap Quote",
  description:
    "Get a swap price quote for exchanging tokens (e.g., SUI to USDC). " +
    "Returns estimated output amount, minimum output with slippage, and route info. " +
    "This is read-only and does not execute the swap.",
  parameters: Type.Object({
    token_in: Type.Optional(
      Type.String({
        description:
          'Input token type. Defaults to "0x2::sui::SUI" if omitted.',
      })
    ),
    token_out: Type.Optional(
      Type.String({
        description:
          "Output token type. Defaults to testnet USDC if omitted.",
      })
    ),
    amount_in: Type.Number({
      description:
        "Amount of input token to swap (in human units, e.g. 0.5 for 0.5 SUI).",
    }),
    slippage_bps: Type.Optional(
      Type.Number({
        description:
          "Slippage tolerance in basis points. Default 50 (0.5%). Max 1000 (10%).",
      })
    ),
  }),
  async execute(
    _toolCallId: string,
    params: {
      token_in?: string;
      token_out?: string;
      amount_in: number;
      slippage_bps?: number;
    }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();

      const tokenIn = params.token_in ?? "0x2::sui::SUI";
      const tokenOut =
        params.token_out ??
        "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

      // Convert human amount to smallest unit
      const isSuiInput = tokenIn === "0x2::sui::SUI";
      const decimals = isSuiInput ? 9 : 6;
      const amountIn = BigInt(
        Math.floor(params.amount_in * 10 ** decimals)
      );

      const quote = await sdk.getSwapQuote({
        tokenIn,
        tokenOut,
        amountIn,
        slippageBps: params.slippage_bps,
      });

      const outDecimals = isSuiInput ? 6 : 9;
      return ok({
        tokenIn,
        tokenOut,
        amountIn: params.amount_in,
        estimatedOut: Number(quote.estimatedAmountOut) / 10 ** outDecimals,
        minOut: Number(quote.minAmountOut) / 10 ** outDecimals,
        priceImpact: quote.priceImpact,
        route: quote.route,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to get swap quote: ${msg}`);
    }
  },
};
