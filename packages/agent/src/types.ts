import { z } from "zod";
import { DeviceKind } from "@ops/shared";

export type CollectorResult = {
  devices: Array<{
    externalId: string;
    kind: z.infer<typeof DeviceKind>;
    name?: string;
    meta?: Record<string, any>;
  }>;
  metrics: Array<{
    deviceExternalId: string;
    ts: string;
    payload: Record<string, any>;
  }>;
};

export type CollectorContext = {
  siteCode: string;
  agentId: string;
  nowIso: () => string;
  log: (msg: string, extra?: any) => void;
  config: any;
};
