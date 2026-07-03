import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  Users,
  Wallet,
  FlaskConical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Power,
  Pencil,
  Timer,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AdminLayout } from "@/components/admin/AdminLayout";
import type { Order, PaymentMethod, DeliveryDriver } from "@shared/schema";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPro, setEditingPro] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editName, setEditName] = useState("");

  const { data: orders = [], isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: drivers = [], isLoading: loadingDrivers } = useQuery<DeliveryDriver[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const { data: adminCheck } = useQuery<{ loggedIn: boolean; isPro: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const { data: proAdmins = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/pro-accounts"],
    enabled: !adminCheck?.isPro,
  });

  const isPro = adminCheck?.isPro;

  const createProMutation = useMutation({
    mutationFn: (data: { username: string; password: string; name: string }) =>
      apiRequest("POST", "/api/admin/pro-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pro-accounts"] });
      toast({ title: "تم إنشاء الحساب بنجاح" });
      setCreateOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message || "فشل في إنشاء الحساب", variant: "destructive" });
    },
  });

  const updateProMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/pro-accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pro-accounts"] });
      toast({ title: "تم تحديث الحساب بنجاح" });
      setEditingPro(null);
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message || "فشل في التحديث", variant: "destructive" });
    },
  });

  const deleteProMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/pro-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pro-accounts"] });
      toast({ title: "تم حذف الحساب" });
    },
  });

  const toggleProMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/pro-accounts/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pro-accounts"] });
      toast({ title: "تم تحديث الحالة" });
    },
  });

  const setTimerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/pro-accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pro-accounts"] });
      toast({ title: "تم تعيين المؤقت بنجاح" });
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message || "فشل في تعيين المؤقت", variant: "destructive" });
    },
  });

  // Helper to show remaining time
  function getRemainingTime(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return "قريباً";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} يوم ${hours} ساعة`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} ساعة ${mins} دقيقة`;
  }

  const activeDrivers = drivers.filter((d) => d.isActive && d.isVerified);
  const pendingDrivers = drivers.filter((d) => !d.isVerified);

  const stats = [
    {
      title: "إجمالي المندوبين",
      value: drivers.length,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/admin/drivers",
    },
    {
      title: "المندوبين النشطين",
      value: activeDrivers.length,
      icon: Truck,
      color: "text-green-500",
      bg: "bg-green-500/10",
      href: "/admin/drivers",
    },
    {
      title: "إجمالي الطلبات",
      value: orders.length,
      icon: ShoppingCart,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/admin/orders",
    },
    {
      title: "وسائل الدفع",
      value: paymentMethods.filter((pm) => pm.isActive).length,
      icon: CreditCard,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      href: "/admin/payment-methods",
    },
  ];

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const processingOrders = orders.filter((o) => o.status === "processing" || o.status === "shipped");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + parseFloat(o.total), 0);

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            قيد الانتظار
          </Badge>
        );
      case "processing":
      case "shipped":
        return (
          <Badge className="gap-1 bg-blue-500">
            <Truck className="h-3 w-3" />
            جاري التوصيل
          </Badge>
        );
      case "delivered":
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle2 className="h-3 w-3" />
            تم التوصيل
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border p-6">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-dashboard-title">
              لوحة التحكم
            </h1>
            <p className="text-muted-foreground mt-1">
              مرحباً بك في لوحة إدارة المندوبين
            </p>
          </div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-[0.07]">
            <TrendingUp className="h-32 w-32" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Link key={index} href={stat.href}>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden cursor-pointer">
                <CardContent className="p-4 md:p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">{stat.title}</p>
                      {loadingOrders || loadingDrivers ? (
                        <Skeleton className="h-8 w-16 mt-1" />
                      ) : (
                        <p className="text-2xl md:text-3xl font-bold mt-1 tabular-nums">{stat.value.toLocaleString("ar-EG")}</p>
                      )}
                    </div>
                    <div className={`p-3 rounded-2xl ${stat.bg} transition-transform group-hover:scale-110`}>
                      <stat.icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.bg}`} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                ملخص الطلبات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/admin/orders">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-500/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-yellow-500/10">
                        <Clock className="h-4 w-4 text-yellow-500" />
                      </div>
                      <span className="text-sm">طلبات قيد الانتظار</span>
                    </div>
                    <span className="font-bold text-lg tabular-nums">{pendingOrders.length}</span>
                  </div>
                </Link>

                <Link href="/admin/orders">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <Truck className="h-4 w-4 text-blue-500" />
                      </div>
                      <span className="text-sm">جاري التوصيل</span>
                    </div>
                    <span className="font-bold text-lg tabular-nums">{processingOrders.length}</span>
                  </div>
                </Link>

                <Link href="/admin/orders">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                      <span className="text-sm">تم التوصيل</span>
                    </div>
                    <span className="font-bold text-lg tabular-nums">{deliveredOrders.length}</span>
                  </div>
                </Link>

                {pendingDrivers.length > 0 && (
                  <Link href="/admin/drivers">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10">
                          <Users className="h-4 w-4 text-orange-500" />
                        </div>
                        <span className="text-sm">مندوبين بانتظار التفعيل</span>
                      </div>
                      <span className="font-bold text-lg tabular-nums">{pendingDrivers.length}</span>
                    </div>
                  </Link>
                )}

                <div className="mt-2 p-4 rounded-xl bg-gradient-to-l from-primary/10 to-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <span className="font-medium">إجمالي الإيرادات</span>
                    </div>
                    <span className="text-xl font-bold text-primary tabular-nums">
                      {formatPrice(totalRevenue, "ج.م")}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  آخر الطلبات
                </span>
                <Link href="/admin/orders">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
                    عرض الكل
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>لا توجد طلبات حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                      data-testid={`order-${order.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                            #{order.orderNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-left flex flex-col items-end gap-1">
                        {getStatusBadge(order.status || "pending")}
                        <p className="text-sm font-bold tabular-nums">
                          {formatPrice(order.total, "ج.م")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pro Accounts Section - Only for main admin */}
        {!isPro && (
          <Card className="border-dashed border-2 border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  Pro - إدارة الحسابات
                </CardTitle>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      حساب جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إنشاء حساب جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>الاسم</Label>
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="اسم الحساب"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>اسم المستخدم</Label>
                        <Input
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="اسم المستخدم للدخول"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>كلمة المرور</Label>
                        <Input
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="6 أحرف على الأقل"
                          dir="ltr"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => createProMutation.mutate({ username: newUsername, password: newPassword, name: newName })}
                        disabled={!newUsername || !newPassword || !newName || createProMutation.isPending}
                      >
                        {createProMutation.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-sm text-muted-foreground">
                أنشئ حسابات للدخول إلى لوحة التحكم. كل حساب يحصل على كل المميزات عدا هذا القسم.
              </p>
            </CardHeader>
            <CardContent>
              {proAdmins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد حسابات</p>
                  <p className="text-xs mt-1">أنشئ حساب جديد من الزر أعلاه</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proAdmins.map((pro: any) => (
                    <div
                      key={pro.id}
                      className={`p-4 rounded-lg border transition-colors ${pro.isActive ? "bg-muted/30" : "bg-destructive/5 border-destructive/20"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${pro.isActive ? "bg-green-500/10" : "bg-red-500/10"}`}>
                            <FlaskConical className={`h-4 w-4 ${pro.isActive ? "text-green-500" : "text-red-500"}`} />
                          </div>
                          <div>
                            <p className="font-medium">{pro.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground font-mono" dir="ltr">{pro.username}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => {
                                  navigator.clipboard.writeText(pro.username);
                                  toast({ title: "تم نسخ اسم المستخدم" });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge variant={pro.isActive ? "default" : "destructive"} className="text-xs">
                            {pro.isActive ? "مفعل" : "معطل"}
                          </Badge>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleProMutation.mutate({ id: pro.id, isActive: !pro.isActive })}
                            title={pro.isActive ? "تعطيل" : "تفعيل"}
                          >
                            <Power className={`h-4 w-4 ${pro.isActive ? "text-green-500" : "text-red-500"}`} />
                          </Button>

                          {/* Timer Popover */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="مؤقت التفعيل/التعطيل">
                                <Timer className={`h-4 w-4 ${(pro.autoDisableAt || pro.autoEnableAt) ? "text-amber-500" : "text-muted-foreground"}`} />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent dir="rtl" className="w-72 space-y-4">
                              <div className="font-medium text-sm flex items-center gap-2">
                                <CalendarClock className="h-4 w-4" />
                                مؤقت التفعيل والتعطيل
                              </div>

                              {/* Auto-disable timer */}
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">تعطيل تلقائي بعد (أيام)</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="عدد الأيام"
                                    id={`disable-days-${pro.id}`}
                                    defaultValue=""
                                    className="h-8 text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs whitespace-nowrap"
                                    onClick={() => {
                                      const val = (document.getElementById(`disable-days-${pro.id}`) as HTMLInputElement)?.value;
                                      const days = parseInt(val);
                                      if (!isNaN(days) && days > 0) {
                                        setTimerMutation.mutate({ id: pro.id, data: { disableAfterDays: days } });
                                      }
                                    }}
                                    disabled={setTimerMutation.isPending}
                                  >
                                    تعيين
                                  </Button>
                                  {pro.autoDisableAt && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-xs text-destructive"
                                      onClick={() => setTimerMutation.mutate({ id: pro.id, data: { disableAfterDays: null } })}
                                    >
                                      إلغاء
                                    </Button>
                                  )}
                                </div>
                                {pro.autoDisableAt && (
                                  <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    سيتم التعطيل خلال: {getRemainingTime(pro.autoDisableAt)}
                                  </p>
                                )}
                              </div>

                              {/* Auto-enable timer */}
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">تفعيل تلقائي بعد (أيام)</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="عدد الأيام"
                                    id={`enable-days-${pro.id}`}
                                    defaultValue=""
                                    className="h-8 text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs whitespace-nowrap"
                                    onClick={() => {
                                      const val = (document.getElementById(`enable-days-${pro.id}`) as HTMLInputElement)?.value;
                                      const days = parseInt(val);
                                      if (!isNaN(days) && days > 0) {
                                        setTimerMutation.mutate({ id: pro.id, data: { enableAfterDays: days } });
                                      }
                                    }}
                                    disabled={setTimerMutation.isPending}
                                  >
                                    تعيين
                                  </Button>
                                  {pro.autoEnableAt && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-xs text-destructive"
                                      onClick={() => setTimerMutation.mutate({ id: pro.id, data: { enableAfterDays: null } })}
                                    >
                                      إلغاء
                                    </Button>
                                  )}
                                </div>
                                {pro.autoEnableAt && (
                                  <p className="text-xs text-green-600 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    سيتم التفعيل خلال: {getRemainingTime(pro.autoEnableAt)}
                                  </p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Dialog open={editingPro?.id === pro.id} onOpenChange={(o) => {
                            if (o) {
                              setEditingPro(pro);
                              setEditUsername(pro.username);
                              setEditName(pro.name);
                              setEditPassword("");
                            } else {
                              setEditingPro(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent dir="rtl">
                              <DialogHeader>
                                <DialogTitle>تعديل الحساب</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label>الاسم</Label>
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>اسم المستخدم</Label>
                                  <Input
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                    dir="ltr"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)</Label>
                                  <Input
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="كلمة مرور جديدة"
                                    dir="ltr"
                                  />
                                </div>
                                <Button
                                  className="w-full"
                                  onClick={() => {
                                    const data: any = { username: editUsername, name: editName };
                                    if (editPassword) data.password = editPassword;
                                    updateProMutation.mutate({ id: pro.id, data });
                                  }}
                                  disabled={updateProMutation.isPending}
                                >
                                  {updateProMutation.isPending ? "جاري التحديث..." : "حفظ التغييرات"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الحساب</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف حساب "{pro.name}"? لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => deleteProMutation.mutate(pro.id)}
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>
                          تاريخ الإنشاء: {new Date(pro.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                        {pro.autoDisableAt && (
                          <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                            <Timer className="h-3 w-3" />
                            تعطيل خلال: {getRemainingTime(pro.autoDisableAt)}
                          </Badge>
                        )}
                        {pro.autoEnableAt && (
                          <Badge variant="outline" className="text-[10px] gap-1 text-green-600 border-green-300">
                            <Timer className="h-3 w-3" />
                            تفعيل خلال: {getRemainingTime(pro.autoEnableAt)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
