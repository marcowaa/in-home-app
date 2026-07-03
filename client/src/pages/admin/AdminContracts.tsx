import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Eye, Loader2, Filter, Package, Wrench, Home, Settings2, Split,
  Clock, CheckCircle2, XCircle, AlertCircle, PauseCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatPrice } from "@/lib/utils";

const contractTypes: Record<string, { label: string; icon: typeof Package }> = {
  purchase: { label: "شراء", icon: Package },
  service: { label: "خدمة", icon: Wrench },
  rental: { label: "إيجار", icon: Home },
  custom: { label: "مخصص", icon: Settings2 },
  split_cost: { label: "تقاسم", icon: Split },
};

const contractStatuses: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-500", icon: Clock },
  active: { label: "نشط", color: "bg-green-500", icon: CheckCircle2 },
  completed: { label: "مكتمل", color: "bg-blue-500", icon: CheckCircle2 },
  cancelled: { label: "ملغي", color: "bg-gray-500", icon: XCircle },
  disputed: { label: "نزاع", color: "bg-red-500", icon: AlertCircle },
  on_hold: { label: "معلّق", color: "bg-purple-500", icon: PauseCircle },
};

export default function AdminContracts() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const { data: contracts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/contracts"],
  });

  const getStatusBadge = (status: string) => {
    const s = contractStatuses[status];
    if (!s) return <Badge variant="outline">{status}</Badge>;
    const Icon = s.icon;
    return (
      <Badge className={`gap-1 ${s.color}`}>
        <Icon className="h-3 w-3" />
        {s.label}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const t = contractTypes[type];
    return t ? t.label : type;
  };

  const filteredContracts = contracts
    .filter((c) => typeFilter === "all" || c.type === typeFilter)
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.contractNumber || "").toLowerCase().includes(q) ||
        (c.creatorName || "").toLowerCase().includes(q) ||
        (c.counterpartyName || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === "active").length,
    completed: contracts.filter((c) => c.status === "completed").length,
    disputed: contracts.filter((c) => c.status === "disputed").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إدارة العقود</h1>
          <p className="text-muted-foreground">متابعة وإدارة عقود العملاء</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي العقود</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
            <p className="text-xs text-muted-foreground">عقود نشطة</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">عقود مكتملة</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.disputed}</p>
            <p className="text-xs text-muted-foreground">عقود بنزاع</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              placeholder="بحث برقم العقد أو الاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="جميع الأنواع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {Object.entries(contractTypes).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              {Object.entries(contractStatuses).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contracts Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد عقود</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم العقد</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>المنشئ</TableHead>
                      <TableHead>الطرف الآخر</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => {
                      const TypeIcon = contractTypes[contract.type]?.icon || FileText;
                      return (
                        <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedContract(contract)}>
                          <TableCell className="font-mono text-sm">{contract.contractNumber || contract.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{getTypeLabel(contract.type)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(contract.status)}</TableCell>
                          <TableCell className="font-medium">{contract.creatorName || "-"}</TableCell>
                          <TableCell>{contract.counterpartyName || "-"}</TableCell>
                          <TableCell className="font-bold text-primary">
                            {formatPrice(contract.amount || "0", "ج.م")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(contract.createdAt)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedContract(contract); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contract Details Dialog */}
      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedContract && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    تفاصيل العقد
                  </span>
                  {getStatusBadge(selectedContract.status)}
                </DialogTitle>
                <DialogDescription>رقم العقد: {selectedContract.contractNumber || selectedContract.id}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">معلومات العقد</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">النوع:</span>
                        <span className="font-medium">{getTypeLabel(selectedContract.type)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ:</span>
                        <span className="font-bold text-primary">{formatPrice(selectedContract.amount || "0", "ج.م")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                        <span>{formatDate(selectedContract.createdAt)}</span>
                      </div>
                      {selectedContract.updatedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">آخر تحديث:</span>
                          <span>{formatDate(selectedContract.updatedAt)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">الأطراف</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المنشئ:</span>
                        <span className="font-medium">{selectedContract.creatorName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الطرف الآخر:</span>
                        <span className="font-medium">{selectedContract.counterpartyName || "-"}</span>
                      </div>
                      {selectedContract.creatorPhone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">هاتف المنشئ:</span>
                          <span dir="ltr">{selectedContract.creatorPhone}</span>
                        </div>
                      )}
                      {selectedContract.counterpartyPhone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">هاتف الطرف الآخر:</span>
                          <span dir="ltr">{selectedContract.counterpartyPhone}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {selectedContract.description && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">الوصف</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{selectedContract.description}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedContract.terms && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">الشروط والأحكام</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{selectedContract.terms}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedContract.items && Array.isArray(selectedContract.items) && selectedContract.items.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">العناصر</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedContract.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center pb-2 border-b last:border-0">
                            <div>
                              <p className="font-medium text-sm">{item.name || item.title || `عنصر ${index + 1}`}</p>
                              {item.quantity && <p className="text-xs text-muted-foreground">الكمية: {item.quantity}</p>}
                            </div>
                            {item.price && (
                              <p className="font-bold text-sm">{formatPrice(item.price, "ج.م")}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
