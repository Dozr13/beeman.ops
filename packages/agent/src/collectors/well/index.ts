import type { CollectorContext, CollectorResult } from "../../types.js";

/**
 * Wellsite collectors live here.
 * Enable and configure them once you identify the separator screen / RTU/PLC protocol.
 *
 * Typical options:
 * - Modbus TCP (Ethernet)
 * - Modbus RTU (RS-485)
 * - Vendor HTTP API
 * - Direct IO modules (4–20mA) via a gateway
 */
export const collectWell = async (ctx: CollectorContext): Promise<CollectorResult> => {
  const out: CollectorResult = { devices: [], metrics: [] };

  // Placeholder: we only emit a marker metric so the UI wiring is proven.
  const enabled = Boolean(ctx.config?.collectors?.well?.enabled);
  if (!enabled) return out;

  const ts = ctx.nowIso();
  const externalId = `well:${ctx.siteCode}:placeholder`;

  out.devices.push({ externalId, kind: "HMI", name: "Well HMI (placeholder)" });
  out.metrics.push({
    deviceExternalId: externalId,
    ts,
    payload: { note: "Well collectors not configured yet." }
  });

  return out;
};
