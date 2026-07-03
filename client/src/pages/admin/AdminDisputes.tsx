import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertTriangle, Eye, Loader2, UserCheck, ShieldCheck,
  CheckCircle2, XCircle, Clock, Package, ArrowRightCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

const disputeReasons: Record<string, string> = {
  non_delivery: "عدم تسليم",
  wrong_item: "عنصر خاطئ",
  quality_issue: "مشكلة جودة",
  service_incomplete: "خدمة غير مكتملة",
  payment_dispute: "نزاع دفع",
  other: "أخرى",
};

const disputeStatuses: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوح", color: "bg-red-500" },
  under_review: { label: "قيد المراجعة", color: "bg-yellow-500" },
  assigned: { label: "مُسند", color: "bg-blue-500" },
  resolved: { label: "تم الحل", color: "bg-green-500" },
  closed: { label: "مغلق", color: "bg-gray-500" },
};

export default function AdminDisputes() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolveForm, setResolveForm] = useState({
    resolution: "release",
    resolutionText: "",
  });

  const { data: disputesData, isLoading } = useQuery<{ disputes: any[] }>({
    queryKey: ["/api/admin/disputes"],
  });

  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/contracts"],
  });

  const disputes = disputesData?.disputes || [];

  // Build a map of contracts for cross-referencing
  const contractMap = new Map<string, any>();
  contracts.forEach((c) => contractMap.set(c.id, c));

  const assignMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/disputes/${id}/assign`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
      toast({ title: "تم إسناد النزاع إليك" });
    },
    onError: () => {
      toast({ title: "فشل في إسناد النزاع", variant: "destructive" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ contractId, data }: { contractId: string; data: typeof resolveForm }) => {
      return apiRequest("POST", `/api/admin/contracts/${contractId}/resolve`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts"] });
      toast({ title: "تم حل النزاع بنجاح" });
      setResolveDialog(null);
      setResolveForm({ resolution: "release", resolutionText: "" });
    },
    onError: () => {
      toast({ title: "فشل في حل النزاع", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const s = disputeStatuses[status];
    if (!s) return <Badge variant="outline">{status}</Badge>;
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const getReasonLabel = (reason: string) => {
    return disputeReasons[reason] || reason;
  };

  const getContractInfo = (contractId: string) => {
    return contractMap.get(contractId);
  };

  const filteredDisputes = disputes
    .filter((d) => statusFilter === "all" || d.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const stats = {
    total: disputes.length,
    open: disputes.filter((d) => d.status === "open").length,
    underReview: disputes.filter((d) => d.status === "under_review" || d.status === "assigned").length,
    resolved: disputes.filter((d) => d.status === "resolved").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إدارة النزاعات</h1>
          <p className="text-muted-foreground">متابعة وحل نزاعات العقود</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي النزاعات</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.open}</p>
            <p className="text-xs text-muted-foreground">نزاعات مفتوحة</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.underReview}</p>
            <p className="text-xs text-muted-foreground">قيد المراجعة</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground">تم حلها</p>
          </CardContent></Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات ({disputes.length})</SelectItem>
              {Object.entries(disputeStatuses).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label} ({disputes.filter((d) => d.status === value).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Disputes Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredDisputes.length === 0 ? (
              <div className="p-12 text-center">
                <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد نزاعات</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>السبب</TableHead>
                      <TableHead>رقم العقد</TableHead>
                      <TableHead>رفع بواسطة</TableHead>
                      <TableHead>ضد</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDisputes.map((dispute) => {
                      const contract = getContractInfo(dispute.contractId);
                      return (
                        <TableRow key={dispute.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                              <span className="font-medium">{getReasonLabel(dispute.reason)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {contract?.contractNumber || dispute.contractId}
                          </TableCell>
                          <TableCell className="font-medium">{dispute.raisedByName || dispute.raisedBy || "-"}</TableCell>
                          <TableCell>{dispute.raisedAgainstName || dispute.raisedAgainst || "-"}</TableCell>
                          <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(dispute.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setSelectedDispute(dispute)} title="تفاصيل">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(dispute.status === "open" || dispute.status === "under_review") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => assignMutation.mutate(dispute.id)}
                                  disabled={assignMutation.isPending}
                                  title="إسناد إلي"
                                >
                                  <UserCheck className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              {(dispute.status === "open" || dispute.status === "under_review" || dispute.status === "assigned") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setResolveDialog(dispute);
                                    setResolveForm({ resolution: "release", resolutionText: "" });
                                  }}
                                  title="حل النزاع"
                                >
                                  <ShieldCheck className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                            </div>
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

      {/* Dispute Details Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDispute && (() => {
            const contract = getContractInfo(selectedDispute.contractId);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      تفاصيل النزاع
                    </span>
                    {getStatusBadge(selectedDispute.status)}
                  </DialogTitle>
                  <DialogDescription>رقم النزاع: {selectedDispute.id}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">معلومات النزاع</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">السبب:</span>
                          <span className="font-medium">{getReasonLabel(selectedDispute.reason)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رفع بواسطة:</span>
                          <span className="font-medium">{selectedDispute.raisedByName || selectedDispute.raisedBy || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ضد:</span>
                          <span className="font-medium">{selectedDispute.raisedAgainstName || selectedDispute.raisedAgainst || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">التاريخ:</span>
                          <span>{formatDate(selectedDispute.createdAt)}</span>
                        </div>
                        {selectedDispute.assignedToName && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">المُسند إلى:</span>
                            <span className="font-medium">{selectedDispute.assignedToName}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {contract && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">معلومات العقد</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">رقم العقد:</span>
                            <span className="font-mono">{contract.contractNumber || contract.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">النوع:</span>
                            <span className="font-medium">{contract.type || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">المبلغ:</span>
                            <span className="font-bold text-primary">{formatPrice(contract.amount || "0", "ج.م")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">المنشئ:</span>
                            <span>{contract.creatorName || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الطرف الآخر:</span>
                            <span>{contract.counterpartyName || "-"}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {selectedDispute.description && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">وصف النزاع</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-line">{selectedDispute.description}</p>
                      </CardContent>
                    </Card>
                  )}

                  {selectedDispute.evidence && Array.isArray(selectedDispute.evidence) && selectedDispute.evidence.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">الأدلة</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedDispute.evidence.map((ev: string, i: number) => (
                            <img key={i} src={ev} alt={`دليل ${i + 1}`} className="rounded-lg border w-full h-32 object-cover" />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedDispute.resolution && (
                    <Card className="border-green-300">
                      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> قرار الحل</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">القرار:</span>
                          <span className="font-medium">
                            {selectedDispute.resolution === "release" ? "تحرير المبلغ" : selectedDispute.resolution === "refund" ? "استرجاع المبلغ" : selectedDispute.resolution}
                          </span>
                        </div>
                        {selectedDispute.resolutionText && (
                          <p className="text-muted-foreground">{selectedDispute.resolutionText}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {(selectedDispute.status === "open" || selectedDispute.status === "under_review" || selectedDispute.status === "assigned") && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-2"
                        variant="outline"
                        onClick={() => assignMutation.mutate(selectedDispute.id)}
                        disabled={assignMutation.isPending}
                      >
                        {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                        إسناد إلي
                      </Button>
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => {
                          setResolveDialog(selectedDispute);
                          setResolveForm({ resolution: "release", resolutionText: "" });
                          setSelectedDispute(null);
                        }}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        حل النزاع
                      </Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Resolve Dispute Dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              حل النزاع
            </DialogTitle>
            <DialogDescription>اختر قرار الحل وأدخل تفاصيل القرار</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>القرار *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${resolveForm.resolution === "release" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  onClick={() => setResolveForm({ ...resolveForm, resolution: "release" })}
                >
                  <ArrowRightCircle className="h-6 w-6 text-green-500" />
                  <span className="text-sm font-medium">تحرير المبلغ</span>
                  <span className="text-xs text-muted-foreground">صرف المبلغ للطرف المستحق</span>
                </button>
                <button
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${resolveForm.resolution === "refund" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  onClick={() => setResolveForm({ ...resolveForm, resolution: "refund" })}
                >
                  <ArrowRightCircle className="h-6 w-6 text-blue-500 rotate-180" />
                  <span className="text-sm font-medium">استرجاع المبلغ</span>
                  <span className="text-xs text-muted-foreground">إرجاع المبلغ للطرف الآخر</span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>تفاصيل القرار *</Label>
              <Textarea
                value={resolveForm.resolutionText}
                onChange={(e) => setResolveForm({ ...resolveForm, resolutionText: e.target.value })}
                placeholder="اشرح قرار الحل والتفاصيل..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>إلغاء</Button>
            <Button
              className="gap-2"
              onClick={() => resolveMutation.mutate({ contractId: resolveDialog.contractId, data: resolveForm })}
              disabled={!resolveForm.resolutionText.trim() || resolveMutation.isPending}
            >
              {resolveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              تأكيد الحل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
