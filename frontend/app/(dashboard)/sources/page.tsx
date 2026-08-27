"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Smartphone,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Settings as SettingsIcon,
  Plus,
  WifiOff,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api, DataSource } from "@/lib/api";
import { SMSGatewaySetupDialog } from "@/components/sources/SMSGatewaySetupDialog";

// Static catalogue of source types we support / plan to support
const SOURCE_CATALOGUE = [
  {
    type: "sms",
    name: "SMS Gateway",
    description: "Android SMS Forwarder — automatic message parsing",
    icon: Smartphone,
  },
  {
    type: "email",
    name: "Gmail Integration",
    description: "Email parser for transaction receipts",
    icon: Mail,
    comingSoon: true,
  },
  {
    type: "bank_statement",
    name: "Bank Statements",
    description: "Manual upload of bank statements (PDF / CSV)",
    icon: FileText,
    comingSoon: true,
  },
  {
    type: "manual",
    name: "Manual Entry",
    description: "Manually added transactions",
    icon: Database,
    comingSoon: true,
  },
];

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: any; icon: any }> = {
    connected: { label: "Connected", variant: "success", icon: CheckCircle2 },
    disconnected: { label: "Disconnected", variant: "danger", icon: XCircle },
    error: { label: "Error", variant: "danger", icon: XCircle },
    syncing: { label: "Syncing", variant: "warning", icon: Clock },
  };
  const cfg = map[status] ?? { label: status, variant: "outline", icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function parseConfig(raw?: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSources = async () => {
    try {
      const data = await api.datasources.list();
      setSources(data);
    } catch (e) {
      console.error("Failed to fetch data sources", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSetupSuccess = (ds: DataSource) => {
    setSources((prev) => {
      const exists = prev.find((s) => s.id === ds.id);
      return exists ? prev.map((s) => (s.id === ds.id ? ds : s)) : [ds, ...prev];
    });
  };

  const downloadConfig = async (id: string) => {
    try {
      const config = await api.datasources.downloadConfig(id);
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sms-gateway-config.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download config", e);
    }
  };

  const smsSource = sources.find((s) => s.type === "sms");
  const connectedCount = sources.filter((s) => s.status === "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-7 w-7 md:h-8 md:w-8" />
            Data Sources
          </h1>
          <p className="text-muted-foreground">
            Manage your transaction data sources and sync settings
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loading ? "—" : sources.length}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "" : `${connectedCount} active`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SMS Gateway
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-3xl font-bold">—</p>
            ) : smsSource ? (
              <>
                <p className="text-lg font-bold">{smsSource.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Last seen {formatDateTime(smsSource.lastSync)}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-muted-foreground">Not configured</p>
                <p className="text-sm text-muted-foreground mt-1">Click &quot;Add Source&quot; to set up</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-3xl font-bold">—</p>
            ) : smsSource ? (
              getStatusBadge(smsSource.status)
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                <WifiOff className="h-3 w-3" />
                Not set up
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source Catalogue Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {SOURCE_CATALOGUE.map((cat) => {
          const Icon = cat.icon;
          const liveSource = sources.find((s) => s.type === cat.type);
          const cfg = parseConfig(liveSource?.config);
          const isSMS = cat.type === "sms";

          return (
            <Card key={cat.type} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg">{cat.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  {liveSource ? (
                    getStatusBadge(liveSource.status)
                  ) : (
                    <Badge variant="outline">
                      {cat.comingSoon ? "Coming Soon" : "Not configured"}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Separator />

                {/* Config details (if connected) */}
                {liveSource && Object.keys(cfg).length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Configuration
                    </p>
                    {Object.entries(cfg).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-3 text-sm min-w-0">
                        <span className="text-muted-foreground capitalize shrink-0">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <div className="overflow-x-auto flex-1 min-w-0">
                          <span className="font-medium font-mono text-xs whitespace-nowrap">
                            {String(value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Last sync */}
                {liveSource && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Configured
                    </p>
                    <p className="text-sm font-medium mt-1">
                      {formatDateTime(liveSource.createdAt)}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {isSMS ? (
                    <>
                      {liveSource && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => downloadConfig(liveSource.id)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Config
                        </Button>
                      )}
                      <Button
                        variant={liveSource ? "outline" : "default"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setDialogOpen(true)}
                      >
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        {liveSource ? "Reconfigure" : "Set Up"}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1" disabled>
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      {cat.comingSoon ? "Coming Soon" : "Configure"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Adding New Data Sources</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Connect additional sources to automatically import transactions. Supported
                sources include SMS gateways, email integrations, bank APIs, and manual
                uploads. Each source can be configured with custom filters and rules.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SMSGatewaySetupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSetupSuccess}
      />
    </div>
  );
}
