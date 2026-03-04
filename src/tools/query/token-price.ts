import { Type } from "@sinclair/typebox";
import { getSdk } from "../../sdk.js";
import { ok, err } from "../../types.js";
import type { ToolResult } from "../../types.js";

export const tokenPriceTool = {
  name: "sui_token_price",
  label: "Sui Token Price",
  description:
    "Query the real-time USD price of SUI or other tokens via Pyth oracle. " +
    "Returns price, confidence interval, and timestamp. " +
    "Defaults to SUI/USD if no feed_id is provided.",
  parameters: Type.Object({
    feed_id: Type.Optional(
      Type.String({
        description:
          "Pyth price feed ID (hex). Defaults to SUI/USD if omitted.",
      })
    ),
  }),
  async execute(
    _toolCallId: string,
    params: { feed_id?: string }
  ): Promise<ToolResult> {
    try {
      const sdk = await getSdk();

      const feedId = params.feed_id;
      const priceData = feedId
        ? await sdk.getTokenPrice(feedId)
        : await sdk.getSuiUsdPrice();

      const pair = feedId ? `feed:${feedId.slice(0, 10)}...` : "SUI/USD";

      return ok({
        pair,
        priceUsd: priceData.price,
        confidence: priceData.confidence,
        timestamp: new Date(priceData.timestamp).toISOString(),
        source: priceData.source,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to fetch token price: ${msg}`);
    }
  },
};
