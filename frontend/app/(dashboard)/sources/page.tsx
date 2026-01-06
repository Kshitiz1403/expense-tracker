import {
  Database,
  Smartphone,
  Mail,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Settings as SettingsIcon,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function DataSourcesPage() {
  // Mock data for data sources
  const sources = [
    {
      id: "1",
      type: "sms",
      name: "SMS Gateway",
      description: "Android SMS Gateway - Automatic message parsing",
      status: "connected",
      lastSync: "2026-01-06T20:30:00",
      transactionCount: 45,
      config: {
        deviceName: "Samsung Galaxy S21",
        apiEndpoint: "https://sms-gateway.local:8080",
      },
    },
    {
      id: "2",
      type: "email",
      name: "Gmail Integration",
      description: "Email parser for transaction receipts",
      status: "connected",
      lastSync: "2026-01-06T19:15:00",
      transactionCount: 32,
      config: {
        emailAddress: "user@gmail.com",
        folders: ["Inbox", "Receipts"],
      },
    },
    {
      id: "3",
      type: "bank_statement",
      name: "Bank Statements",
      description: "Manual upload of bank statements (PDF/CSV)",
      status: "syncing",
      lastSync: "2026-01-06T21:00:00",
      transactionCount: 128,
      config: {
        lastUpload: "2026-01-05",
        supportedFormats: ["PDF", "CSV", "Excel"],
      },
    },
    {
      id: "4",
      type: "manual",
      name: "Manual Entry",
      description: "Manually added transactions",
      status: "connected",
      lastSync: null,
      transactionCount: 15,
      config: {},
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: any; icon: any }
    > = {
      connected: {
        label: "Connected",
        variant: "success",
        icon: CheckCircle2,
      },
      disconnected: {
        label: "Disconnected",
        variant: "danger",
        icon: XCircle,
      },
      syncing: {
        label: "Syncing",
        variant: "warning",
        icon: Clock,
      },
    };
    const config = statusMap[status] || {
      label: status,
      variant: "outline",
      icon: Clock,
    };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getSourceIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      sms: Smartphone,
      email: Mail,
      bank_statement: FileText,
      manual: Database,
    };
    const Icon = iconMap[type] || Database;
    return Icon;
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const totalTransactions = sources.reduce(
    (sum, source) => sum + source.transactionCount,
    0
  );
  const connectedSources = sources.filter(
    (s) => s.status === "connected"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8" />
            Data Sources
          </h1>
          <p className="text-muted-foreground">
            Manage your transaction data sources and sync settings
          </p>
        </div>
        <Button>
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
            <p className="text-3xl font-bold">{sources.length}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {connectedSources} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalTransactions}</p>
            <p className="text-sm text-muted-foreground mt-1">
              From all sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">2m</p>
            <p className="text-sm text-muted-foreground mt-1">ago</p>
          </CardContent>
        </Card>
      </div>

      {/* Source Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => {
          const Icon = getSourceIcon(source.type);
          return (
            <Card key={source.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{source.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {source.description}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(source.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Transactions
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {source.transactionCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Last Sync
                    </p>
                    <p className="text-sm font-medium mt-1">
                      {formatDateTime(source.lastSync)}
                    </p>
                  </div>
                </div>

                {/* Configuration Details */}
                {Object.keys(source.config).length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Configuration
                    </p>
                    {Object.entries(source.config).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}:
                        </span>
                        <span className="font-medium">
                          {Array.isArray(value) ? value.join(", ") : value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={source.status === "syncing"}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        source.status === "syncing" ? "animate-spin" : ""
                      }`}
                    />
                    {source.status === "syncing" ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
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
    </div>
  );
}
