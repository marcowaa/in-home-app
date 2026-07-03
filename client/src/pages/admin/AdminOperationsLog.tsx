import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Search, Filter, Calendar, RefreshCw, ChevronRight, ChevronLeft,
  Package, Wallet, ArrowDownCircle, ArrowUpCircle, Gift, Truck,
  FileText, BarChart3, TrendingUp, Clock, Eye, Download, X,
} from "lucide-react";

function formatPrice(value: string | number | null | undefined, currency: string) {
  if (!value) return `0 ${currency}`;
  return `${parseFloat(String(value)).toLocaleString("ar-EG")} ${currency}`;
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const OPERATION_TYPES = [
  { value: "all", label: "الكل" },
  { value: "delivery", label: "توصيل" },
  { value: "commission", label: "عمولة" },
  { value: "deposit", label: "إيداع" },
  { value: "withdrawal", label: "سحب" },
  { value: "referral_bonus", label: "مكافأة إحالة" },
  { value: "driver_assigned", label: "تعيين مندوب" },
  { value: "order_created", label: "إنشاء طلب" },
  { value: "order_cancelled", label: "إلغاء طلب" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "completed", label: "مكتمل" },
  { value: "pending", label: "معلق" },
  { value: "cancelled", label: "ملغي" },
];

function getTypeBadge(type: string) {
  const map: Record<string, { label: string; className: string; icon: any }> = {
    delivery: { label: "توصيل", className: "bg-green-500", icon: Package },
    commission: { label: "عمولة", className: "bg-blue-500", icon: TrendingUp },
    deposit: { label: "إيداع", className: "bg-emerald-500", icon: ArrowDownCircle },
    withdrawal: { label: "سحب", className: "bg-orange-500", icon: ArrowUpCircle },
    referral_bonus: { label: "مكافأة إحالة", className: "bg-purple-500", icon: Gift },
    driver_assigned: { label: "تعيين مندوب", className: "bg-cyan-500", icon: Truck },
    order_created: { label: "إنشاء طلب", className: "bg-indigo-500", icon: FileText },
    order_cancelled: { label: "إلغاء طلب", className: "bg-red-500", icon: X },
  };
  const config = map[type] || { label: type, className: "bg-gray-500", icon: FileText };
  const Icon = config.icon;
  return (
    <Badge className={`${config.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed": return <Badge className="bg-green-500">مكتمل</Badge>;
    case "pending": return <Badge className="bg-yellow-500">معلق</Badge>;
    case "cancelled": return <Badge className="bg-red-500">ملغي</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminOperationsLog() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 30;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter, statusFilter, driverFilter, dateFrom, dateTo]);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (driverFilter !== "all") params.set("driverId", driverFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<{ logs: any[]; total: number }>({
    queryKey: ["/api/admin/operation-logs", debouncedSearch, typeFilter, statusFilter, driverFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/operation-logs?${buildQuery()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: stats } = useQuery<{ totalOperations: number; todayOperations: number; totalAmount: string; todayAmount: string }>({
    queryKey: ["/api/admin/operation-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/operation-stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: drivers } = useQuery<any[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || driverFilter !== "all" || dateFrom || dateTo || debouncedSearch;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDriverFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = ["التاريخ", "النوع", "الوصف", "المندوب", "رقم الطلب", "العميل", "المبلغ", "الحالة"];
    const typeLabels: Record<string, string> = {
      delivery: "توصيل", commission: "عمولة", deposit: "إيداع", withdrawal: "سحب",
      referral_bonus: "مكافأة إحالة", driver_assigned: "تعيين مندوب", order_created: "إنشاء طلب", order_cancelled: "إلغاء طلب",
    };
    const rows = logs.map(l => [
      new Date(l.createdAt).toLocaleString("ar-EG"),
      typeLabels[l.type] || l.type,
      l.description,
      l.driverName || "-",
      l.orderNumber || "-",
      l.customerName || "-",
      l.amount || "0",
      l.status === "completed" ? "مكتمل" : l.status === "pending" ? "معلق" : "ملغي",
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `operations-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              سجل العمليات
            </h1>
            <p className="text-muted-foreground text-sm">جميع العمليات المكتملة في النظام مع بحث احترافي</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" /> تحديث
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV} disabled={logs.length === 0}>
              <Download className="h-4 w-4" /> تصدير CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي العمليات</p>
                  <p className="text-2xl font-bold">{stats?.totalOperations?.toLocaleString("ar-EG") || 0}</p>
                </div>
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">عمليات اليوم</p>
                  <p className="text-2xl font-bold">{stats?.todayOperations?.toLocaleString("ar-EG") || 0}</p>
                </div>
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المبالغ</p>
                  <p className="text-2xl font-bold text-primary">{formatPrice(stats?.totalAmount, "ج.م")}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">مبالغ اليوم</p>
                  <p className="text-2xl font-bold text-green-600">{formatPrice(stats?.todayAmount, "ج.م")}</p>
                </div>
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-4">
            {/* Main search bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الطلب، اسم العميل، رقم الهاتف، اسم المندوب، أو الوصف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 gap-1">
                  <X className="h-4 w-4" /> مسح الفلاتر
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <label className="text-xs font-medium">نوع العملية</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPERATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">الحالة</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">المندوب</label>
                  <Select value={driverFilter} onValueChange={setDriverFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {(drivers || []).map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> من تاريخ</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> إلى تاريخ</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            )}

            {/* Results info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {total > 0 ? (
                  <>عرض {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} من {total.toLocaleString("ar-EG")} عملية</>
                ) : (
                  "لا توجد نتائج"
                )}
              </span>
              {hasActiveFilters && (
                <Badge variant="outline" className="gap-1">
                  <Filter className="h-3 w-3" /> فلاتر نشطة
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operations Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">لا توجد عمليات</p>
                <p className="text-sm text-muted-foreground">لم يتم العثور على أي عمليات مطابقة لمعايير البحث</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>المندوب</TableHead>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-left">تفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                        <TableCell>{getTypeBadge(log.type)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{log.description}</TableCell>
                        <TableCell className="text-sm font-medium">{log.driverName || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{log.orderNumber || "-"}</TableCell>
                        <TableCell className="text-sm">{log.customerName || "-"}</TableCell>
                        <TableCell className={`font-bold text-sm ${parseFloat(log.amount || "0") < 0 ? "text-red-500" : "text-green-600"}`}>
                          {log.amount ? formatPrice(log.amount, "ج.م") : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status || "completed")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronRight className="h-4 w-4" /> السابق
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              التالي <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  تفاصيل العملية
                  {getTypeBadge(selectedLog.type)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">التاريخ</p>
                    <p className="font-medium text-sm">{formatDate(selectedLog.createdAt)}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">الحالة</p>
                    <div className="mt-1">{getStatusBadge(selectedLog.status || "completed")}</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الوصف</p>
                    <p className="text-sm font-medium">{selectedLog.description}</p>
                  </div>

                  {selectedLog.amount && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">المبلغ</p>
                      <p className={`text-lg font-bold ${parseFloat(selectedLog.amount) < 0 ? "text-red-500" : "text-green-600"}`}>
                        {formatPrice(selectedLog.amount, "ج.م")}
                      </p>
                    </div>
                  )}

                  {selectedLog.driverName && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">المندوب</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Truck className="h-3 w-3" />{selectedLog.driverName}
                      </p>
                    </div>
                  )}

                  {selectedLog.orderNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">رقم الطلب</p>
                      <p className="font-mono text-sm">#{selectedLog.orderNumber}</p>
                    </div>
                  )}

                  {selectedLog.customerName && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">العميل</p>
                        <p className="text-sm">{selectedLog.customerName}</p>
                      </div>
                      {selectedLog.customerPhone && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">هاتف العميل</p>
                          <p className="text-sm" dir="ltr">{selectedLog.customerPhone}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">بيانات إضافية</p>
                      <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                        {Object.entries(selectedLog.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
