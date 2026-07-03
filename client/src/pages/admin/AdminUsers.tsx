import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users, Eye, Loader2, ShieldCheck, ShieldX, Ban, CheckCircle2, XCircle,
  Search, Wallet, UserPlus, AlertCircle, Phone, UserX, UserCheck,
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

const kycStatuses: Record<string, { label: string; color: string }> = {
  none: { label: "غير موثق", color: "bg-gray-400" },
  basic: { label: "قيد المراجعة", color: "bg-yellow-500" },
  verified: { label: "موثق", color: "bg-green-500" },
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [banDialog, setBanDialog] = useState<any>(null);
  const [rejectKycDialog, setRejectKycDialog] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [adjustBalanceDialog, setAdjustBalanceDialog] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const banMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/users/${id}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "تم حظر المستخدم" });
      setBanDialog(null);
    },
    onError: () => toast({ title: "فشل في حظر المستخدم", variant: "destructive" }),
  });

  const unbanMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/users/${id}/unban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "تم إلغاء حظر المستخدم" });
    },
    onError: () => toast({ title: "فشل في إلغاء الحظر", variant: "destructive" }),
  });

  const approveKycMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/users/${id}/kyc/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "تم توثيق المستخدم" });
    },
    onError: () => toast({ title: "فشل في التوثيق", variant: "destructive" }),
  });

  const rejectKycMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/users/${id}/kyc/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "تم رفض التوثيق" });
      setRejectKycDialog(null);
      setRejectReason("");
    },
    onError: () => toast({ title: "فشل في رفض التوثيق", variant: "destructive" }),
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ id, amount, note }: { id: string; amount: string; note?: string }) => {
      return apiRequest("POST", `/api/admin/users/${id}/adjust-balance`, { amount, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "تم تعديل الرصيد بنجاح" });
      setAdjustBalanceDialog(null);
      setAdjustAmount("");
      setAdjustNote("");
    },
    onError: () => toast({ title: "فشل في تعديل الرصيد", variant: "destructive" }),
  });

  const getKycBadge = (status: string) => {
    const s = kycStatuses[status] || kycStatuses.none;
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const filteredUsers = users
    .filter((u) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive !== false).length,
    verified: users.filter((u) => u.kycStatus === "verified").length,
    pendingKyc: users.filter((u) => u.kycStatus === "basic").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إدارة المستخدمين</h1>
          <p className="text-muted-foreground">إدارة حسابات المستخدمين والتوثيق</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
            <p className="text-xs text-muted-foreground">نشط</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.verified}</p>
            <p className="text-xs text-muted-foreground">موثقون</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.pendingKyc}</p>
            <p className="text-xs text-muted-foreground">قيد المراجعة</p>
          </CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="بحث بالاسم أو الهاتف أو اسم المستخدم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا يوجد مستخدمين</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>التوثيق</TableHead>
                      <TableHead>الرصيد</TableHead>
                      <TableHead>المجمّد</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التسجيل</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{user.name || user.username || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell dir="ltr" className="text-sm">{user.phone || "-"}</TableCell>
                        <TableCell>{getKycBadge(user.kycStatus || "none")}</TableCell>
                        <TableCell className="font-bold">{formatPrice(user.walletBalance || "0", "ج.م")}</TableCell>
                        <TableCell className="text-orange-600">{formatPrice(user.frozenBalance || "0", "ج.م")}</TableCell>
                        <TableCell>
                          <Badge className={user.isActive !== false ? "bg-green-500" : "bg-red-500"}>
                            {user.isActive !== false ? "نشط" : "محظور"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedUser(user)} title="تفاصيل">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {user.kycStatus === "basic" && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => approveKycMutation.mutate(user.id)} title="توثيق" disabled={approveKycMutation.isPending}>
                                  <ShieldCheck className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => { setRejectKycDialog(user); setRejectReason(""); }} title="رفض التوثيق">
                                  <ShieldX className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => { setAdjustBalanceDialog(user); setAdjustAmount(""); setAdjustNote(""); }} title="تعديل الرصيد">
                              <Wallet className="h-4 w-4 text-blue-500" />
                            </Button>
                            {user.isActive !== false ? (
                              <Button variant="ghost" size="icon" onClick={() => setBanDialog(user)} title="حظر" className="text-destructive">
                                <Ban className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" onClick={() => unbanMutation.mutate(user.id)} title="إلغاء الحظر" disabled={unbanMutation.isPending}>
                                <UserCheck className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ban Confirmation Dialog */}
      <AlertDialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حظر المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حظر المستخدم "{banDialog?.name || banDialog?.username}"؟ سيتم منعه من الدخول للنظام.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => banDialog && banMutation.mutate(banDialog.id)}
            >
              حظر
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject KYC Dialog */}
      <Dialog open={!!rejectKycDialog} onOpenChange={() => setRejectKycDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-red-500" />
              رفض التوثيق
            </DialogTitle>
            <DialogDescription>أدخل سبب رفض التوثيق للمستخدم "{rejectKycDialog?.name}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>سبب الرفض *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: صورة الهوية غير واضحة..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectKycDialog(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => rejectKycDialog && rejectKycMutation.mutate({ id: rejectKycDialog.id, reason: rejectReason })}
              disabled={!rejectReason.trim() || rejectKycMutation.isPending}
            >
              {rejectKycMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              رفض التوثيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Balance Dialog */}
      <Dialog open={!!adjustBalanceDialog} onOpenChange={() => setAdjustBalanceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-500" />
              تعديل رصيد المستخدم
            </DialogTitle>
            <DialogDescription>
              {adjustBalanceDialog?.name} - الرصيد الحالي: {formatPrice(adjustBalanceDialog?.walletBalance || "0", "ج.م")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p><strong>الرصيد المتاح:</strong> {formatPrice(adjustBalanceDialog?.walletBalance || "0", "ج.م")}</p>
              <p><strong>الرصيد المجمّد:</strong> {formatPrice(adjustBalanceDialog?.frozenBalance || "0", "ج.م")}</p>
            </div>
            <div className="space-y-2">
              <Label>المبلغ *</Label>
              <Input
                type="number"
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="موجب للإضافة، سالب للخصم"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">أدخل قيمة موجبة للإضافة أو سالبة للخصم</p>
            </div>
            <div className="space-y-2">
              <Label>ملاحظة</Label>
              <Textarea
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="سبب تعديل الرصيد..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustBalanceDialog(null)}>إلغاء</Button>
            <Button
              className="gap-2"
              onClick={() => adjustBalanceDialog && adjustBalanceMutation.mutate({ id: adjustBalanceDialog.id, amount: adjustAmount, note: adjustNote })}
              disabled={!adjustAmount || parseFloat(adjustAmount) === 0 || adjustBalanceMutation.isPending}
            >
              {adjustBalanceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              تأكيد التعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  تفاصيل المستخدم
                </DialogTitle>
                <DialogDescription>{selectedUser.name || selectedUser.username}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">الاسم</p>
                    <p className="font-medium">{selectedUser.name || selectedUser.username || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الهاتف</p>
                    <p className="font-medium" dir="ltr">{selectedUser.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">التوثيق</p>
                    <div className="mt-1">{getKycBadge(selectedUser.kycStatus || "none")}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الحالة</p>
                    <div className="mt-1">
                      <Badge className={selectedUser.isActive !== false ? "bg-green-500" : "bg-red-500"}>
                        {selectedUser.isActive !== false ? "نشط" : "محظور"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الرصيد المتاح</p>
                    <p className="font-bold">{formatPrice(selectedUser.walletBalance || "0", "ج.م")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الرصيد المجمّد</p>
                    <p className="font-bold text-orange-600">{formatPrice(selectedUser.frozenBalance || "0", "ج.م")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">تاريخ التسجيل</p>
                    <p className="font-medium text-sm">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  {selectedUser.email && (
                    <div>
                      <p className="text-xs text-muted-foreground">البريد</p>
                      <p className="font-medium text-sm" dir="ltr">{selectedUser.email}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {selectedUser.kycStatus === "basic" && (
                    <>
                      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => approveKycMutation.mutate(selectedUser.id)} disabled={approveKycMutation.isPending}>
                        <ShieldCheck className="h-3.5 w-3.5" /> توثيق
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => { setRejectKycDialog(selectedUser); setRejectReason(""); setSelectedUser(null); }}>
                        <ShieldX className="h-3.5 w-3.5" /> رفض التوثيق
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => { setAdjustBalanceDialog(selectedUser); setAdjustAmount(""); setAdjustNote(""); setSelectedUser(null); }}>
                    <Wallet className="h-3.5 w-3.5" /> تعديل الرصيد
                  </Button>
                  {selectedUser.isActive !== false ? (
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => { setBanDialog(selectedUser); setSelectedUser(null); }}>
                      <Ban className="h-3.5 w-3.5" /> حظر
                    </Button>
                  ) : (
                    <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => unbanMutation.mutate(selectedUser.id)} disabled={unbanMutation.isPending}>
                      <UserCheck className="h-3.5 w-3.5" /> إلغاء الحظر
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>إغلاق</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
