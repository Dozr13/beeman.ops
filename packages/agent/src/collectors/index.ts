import type { CollectorContext, CollectorResult } from "../types.js";
import { collectHut } from "./hut/index.js";
import { collectWell } from "./well/index.js";

export const runCollectors = async (ctx: CollectorContext): Promise<CollectorResult> => {
  const devices: CollectorResult["devices"] = [];
  const metrics: CollectorResult["metrics"] = [];

  const hutEnabled = Boolean(ctx.config?.collectors?.hut?.enabled);
  const wellEnabled = Boolean(ctx.config?.collectors?.well?.enabled);

  if (hutEnabled) {
    const r = await collectHut(ctx);
    devices.push(...r.devices);
    metrics.push(...r.metrics);
  }

  if (wellEnabled) {
    const r = await collectWell(ctx);
    devices.push(...r.devices);
    metrics.push(...r.metrics);
  }

  return { devices, metrics };
};
