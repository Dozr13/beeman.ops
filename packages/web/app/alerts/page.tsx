import { apiGet } from "../../components/api";
import { Card, CardContent, CardHeader, CardTitle, Pill } from "../../components/ui";

type AlertRow = {
  id: string;
  siteId: string;
  deviceId: string | null;
  severity: "INFO" | "WARN" | "HIGH" | "CRITICAL";
  code: string;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
};

const tone = (s: AlertRow["severity"]) => {
  if (s === "CRITICAL") return "bad";
  if (s === "HIGH") return "bad";
  if (s === "WARN") return "warn";
  return "neutral";
};

export default async function AlertsPage() {
  const alerts = await apiGet<AlertRow[]>("/v1/alerts/recent");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-zinc-400">Most recent 200 alerts.</p>
      </div>

      <div className="space-y-3">
        {alerts.map((a) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate">{a.code}</CardTitle>
                <div className="text-sm text-zinc-300 truncate">{a.message}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Pill tone={tone(a.severity) as any}>{a.severity}</Pill>
                <Pill tone={a.resolvedAt ? "good" : "warn"}>{a.resolvedAt ? "RESOLVED" : "OPEN"}</Pill>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-zinc-400">
                {new Date(a.createdAt).toLocaleString()} {a.resolvedAt ? `→ resolved ${new Date(a.resolvedAt).toLocaleString()}` : ""}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
