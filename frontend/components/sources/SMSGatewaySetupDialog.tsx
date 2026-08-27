"use client";

import { useState } from "react";
import { Smartphone, Copy, Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, DataSource } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (ds: DataSource) => void;
}

type Step = "form" | "config";

export function SMSGatewaySetupDialog({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [deviceId, setDeviceId] = useState("");
  const [configJson, setConfigJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    const id = deviceId.trim();
    if (!id) {
      setError("Device ID is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ds = await api.datasources.create(id);
      const config = await api.datasources.downloadConfig(ds.id);
      setConfigJson(JSON.stringify(config, null, 2));
      onSuccess(ds);
      setStep("config");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(configJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sms-gateway-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep("form");
      setDeviceId("");
      setConfigJson("");
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            Set Up SMS Gateway
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Enter a unique name for your device. This will be embedded in the config file."
              : "Your config is ready. Download it and import into the SMS Forwarder app."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          /* ── Form step ─────────────────────────────────────── */
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <Input
                id="deviceId"
                placeholder="e.g. pixel-8, poco-f3"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                A short, unique identifier for your phone. Used to distinguish
                messages from different devices.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Config
              </Button>
            </div>
          </div>
        ) : (
          /* ── Config step ────────────────────────────────────── */
          <div className="flex flex-col gap-4 pt-2 min-h-0">
            {/* Scrollable code block */}
            <div className="relative flex-1 min-h-0">
              <pre className="bg-muted rounded-lg p-4 pr-10 text-xs overflow-auto h-full max-h-52 font-mono whitespace-pre-wrap break-all">
                {configJson}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded bg-background border hover:bg-muted transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm space-y-2 shrink-0">
              <p className="font-medium text-sm">How to set up:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-xs">
                <li>
                  Install the{" "}
                  <a
                    href="https://github.com/bogkonstantin/android_income_sms_gateway_webhook/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    SMS Forwarder
                  </a>{" "}
                  app on your Android phone
                </li>
                <li>Download the config file below</li>
                <li>Open the app → tap <strong>⋮ → Import</strong> → select the file</li>
                <li>Grant SMS read permission when prompted</li>
              </ol>
            </div>

            {/* Pinned action buttons */}
            <div className="flex justify-end gap-2 shrink-0 pt-1 border-t">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
