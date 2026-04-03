"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConvertSMSDialog } from "@/components/sms/convert-sms-dialog";
import { api, SMSMessage, Transaction } from "@/lib/api";

type Classification = "non-transaction" | "all" | "transaction";

const CLASSIFICATION_TABS: { label: string; value: Classification }[] = [
  { label: "All", value: "all" },
  { label: "Transaction", value: "transaction" },
  { label: "Non-Transaction", value: "non-transaction" },
];

function SMSPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const initialDateFrom = searchParams.get("dateFrom") ?? "";
  const initialDateTo = searchParams.get("dateTo") ?? "";
  const initialCls = (searchParams.get("cls") as Classification) || "all";

  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [classification, setClassification] = useState<Classification>(initialCls);
  const [page, setPage] = useState(initialPage);
  const [selectedSMS, setSelectedSMS] = useState<SMSMessage | null>(null);
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.sms.list({
          page,
          limit,
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          classification,
        });
        setMessages(response.messages);
        setTotal(response.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch SMS messages");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, search, dateFrom, dateTo, classification]);

  // Sync state ↔ URL
  const isInternalNav = useRef(false);

  const syncURL = useCallback(
    (
      s: string,
      from: string,
      to: string,
      cls: Classification,
      p: number,
      method: "push" | "replace"
    ) => {
      const params = new URLSearchParams();
      if (s) params.set("search", s);
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      if (cls !== "all") params.set("cls", cls);
      if (p > 1) params.set("page", String(p));
      const qs = params.toString();
      const url = qs ? `/sms?${qs}` : "/sms";
      isInternalNav.current = true;
      if (method === "push") router.push(url);
      else router.replace(url);
    },
    [router]
  );

  useEffect(() => {
    if (isInternalNav.current) {
      isInternalNav.current = false;
      return;
    }
    setSearch(searchParams.get("search") ?? "");
    setDateFrom(searchParams.get("dateFrom") ?? "");
    setDateTo(searchParams.get("dateTo") ?? "");
    setClassification((searchParams.get("cls") as Classification) || "all");
    setPage(Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1));
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    syncURL(value, dateFrom, dateTo, classification, 1, "replace");
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPage(1);
    syncURL(search, value, dateTo, classification, 1, "push");
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPage(1);
    syncURL(search, dateFrom, value, classification, 1, "push");
  };

  const handleClassificationChange = (cls: Classification) => {
    setClassification(cls);
    setPage(1);
    syncURL(search, dateFrom, dateTo, cls, 1, "push");
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    syncURL(search, dateFrom, dateTo, classification, p, "replace");
  };

  const handleConvertSuccess = (_: Transaction) => {
    if (selectedSMS) {
      setMessages((prev) => prev.filter((m) => m.id !== selectedSMS.id));
      setTotal((t) => t - 1);
    }
    setSelectedSMS(null);
  };

  const formatDate = (ds: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ds));

  const truncate = (text: string, max = 100) =>
    text.length > max ? text.slice(0, max) + "…" : text;

  const emptyMessage = {
    "non-transaction": "No non-transaction SMS messages found.",
    all: "No SMS messages found.",
    transaction: "No transaction SMS messages found.",
  }[classification];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          SMS Messages
        </h1>
        <p className="text-gray-600 mt-1">Browse all received SMS messages.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Classification tabs */}
          <div className="flex gap-2">
            {CLASSIFICATION_TABS.map((tab) => (
              <Button
                key={tab.value}
                variant={classification === tab.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleClassificationChange(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Search + Date */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by message or phone number..."
                className="pl-10"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="w-[160px]"
              title="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="w-[160px]"
              title="To date"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading messages...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{emptyMessage}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    {classification !== "transaction" && (
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {messages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono whitespace-nowrap">
                        {msg.phoneNumber}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 max-w-sm">
                        {truncate(msg.message)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(msg.receivedAt)}
                      </td>
                      <td className="py-3 px-4">
                        {msg.processingError && (
                          <Badge
                            variant="outline"
                            className="text-xs text-gray-500 max-w-[200px] truncate block"
                            title={msg.processingError}
                          >
                            {msg.processingError}
                          </Badge>
                        )}
                      </td>
                      {classification !== "transaction" && (
                        <td className="py-3 px-4">
                          <Button size="sm" onClick={() => setSelectedSMS(msg)}>
                            Convert
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSMS && (
        <ConvertSMSDialog
          sms={selectedSMS}
          open={!!selectedSMS}
          onOpenChange={(open) => {
            if (!open) setSelectedSMS(null);
          }}
          onSuccess={handleConvertSuccess}
        />
      )}
    </div>
  );
}

export default function SMSPage() {
  return (
    <Suspense>
      <SMSPageContent />
    </Suspense>
  );
}
