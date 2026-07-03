import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Eye, Clock, Truck, CheckCircle2, Package, Copy, Check,
  AlertCircle, UserCheck, Users, Wallet, Loader2, Plus, MapPin, Weight, Calendar, Share2, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import type { Order, DeliveryDriver } from "@shared/schema";

const statusOptions = [
  { value: "pending", label: "قيد الانتظار", icon: Clock, color: "bg-yellow-500" },
  { value: "processing", label: "جاري التجهيز", icon: Package, color: "bg-blue-500" },
  { value: "shipped", label: "جاري الشحن", icon: Truck, color: "bg-purple-500" },
  { value: "delivered", label: "تم التسليم", icon: CheckCircle2, color: "bg-green-500" },
];

export default function AdminOrders() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shipDialog, setShipDialog] = useState<Order | null>(null);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [copiedField, setCopiedField] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [commissionOrder, setCommissionOrder] = useState<Order | null>(null);
  const [commissionAmount, setCommissionAmount] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [createForm, setCreateForm] = useState({
    customerName: "", customerPhone: "", customerAddress: "", customerCity: "",
    customerNotes: "", driverId: "", total: "", pickupAddress: "",
    shipmentType: "", weight: "", deliveryDeadline: "", commissionPrepaid: false,
  });

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Auto-open create dialog with pre-filled data when reassign param exists (driver rejection)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reassignId = params.get("reassign");
    if (reassignId && orders.length > 0) {
      const order = orders.find((o: any) => o.id === reassignId);
      if (order) {
        setCreateForm({
          customerName: order.customerName || "",
          customerPhone: order.customerPhone || "",
          customerAddress: order.customerAddress || "",
          customerCity: (order as any).customerCity || "",
          customerNotes: (order as any).customerNotes || "",
          driverId: "",
          total: order.total || "",
          pickupAddress: (order as any).pickupAddress || "",
          shipmentType: (order as any).shipmentType || "",
          weight: (order as any).weight || "",
          deliveryDeadline: "",
          commissionPrepaid: (order as any).commissionPrepaid || false,
        });
        setCreateOpen(true);
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [orders]);

  const { data: drivers = [] } = useQuery<DeliveryDriver[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const { data: eligibleDrivers = [], isLoading: eligibleLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/orders", shipDialog?.id, "eligible-drivers"],
    queryFn: () => shipDialog ? fetch(`/api/admin/orders/${shipDialog.id}/eligible-drivers`, { credentials: "include" }).then(r => r.json()) : [],
    enabled: !!shipDialog,
  });

  const { data: orderAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/orders", shipDialog?.id, "assignments"],
    queryFn: () => shipDialog ? fetch(`/api/admin/orders/${shipDialog.id}/assignments`, { credentials: "include" }).then(r => r.json()) : [],
    enabled: !!shipDialog,
  });

  const activeDrivers = drivers.filter((d: any) => d.isActive);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/admin/orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "تم تحديث حالة الطلب" });
      setShipDialog(null);
      setSelectedDriverIds([]);
    },
    onError: () => {
      toast({ title: "فشل في تحديث حالة الطلب", variant: "destructive" });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      return apiRequest("POST", "/api/admin/orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم إنشاء الطلب بنجاح" });
      setCreateOpen(false);
      setCreateForm({
        customerName: "", customerPhone: "", customerAddress: "", customerCity: "",
        customerNotes: "", driverId: "", total: "", pickupAddress: "",
        shipmentType: "", weight: "", deliveryDeadline: "", commissionPrepaid: false,
      });
    },
    onError: (error: any) => {
      toast({ title: "فشل في إنشاء الطلب", description: error.message, variant: "destructive" });
    },
  });

  const commissionMutation = useMutation({
    mutationFn: async ({ id, commission }: { id: string; commission: string }) => {
      const res = await apiRequest("POST", `/api/admin/orders/${id}/set-commission`, { commission });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShareMessage(data.message);
      toast({ title: "تم تحديد العمولة" });
    },
    onError: () => {
      toast({ title: "فشل في تحديد العمولة", variant: "destructive" });
    },
  });

  const handleStatusChange = (orderId: string, status: string, order: Order) => {
    if (status === "shipped" && order.status !== "shipped") {
      setShipDialog(order);
      setSelectedDriverIds([]);
      return;
    }
    updateStatusMutation.mutate({ id: orderId, data: { status } });
  };

  const handleShipOrder = () => {
    if (!shipDialog || selectedDriverIds.length === 0) return;
    updateStatusMutation.mutate({
      id: shipDialog.id,
      data: { status: "shipped", assignDriverIds: selectedDriverIds },
    });
  };

  const toggleDriver = (driverId: string) => {
    setSelectedDriverIds(prev =>
      prev.includes(driverId) ? prev.filter(id => id !== driverId) : [...prev, driverId]
    );
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find((s) => s.value === status);
    if (!statusOption) return <Badge variant="outline">{status}</Badge>;
    const Icon = statusOption.icon;
    return (
      <Badge className={`gap-1 ${statusOption.color}`}>
        <Icon className="h-3 w-3" />
        {statusOption.label}
      </Badge>
    );
  };

  const filteredOrders = orders
    .filter((order) => statusFilter === "all" || order.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const shippedCount = orders.filter(o => o.status === "shipped").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">إدارة الطلبات</h1>
            <p className="text-muted-foreground">متابعة وإدارة طلبات العملاء والشحن</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء طلب
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات ({orders.length})</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label} ({orders.filter(o => o.status === status.value).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">قيد الانتظار</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-purple-500">{shippedCount}</p>
              <p className="text-xs text-muted-foreground">جاري الشحن</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-green-500">{deliveredCount}</p>
              <p className="text-xs text-muted-foreground">تم التسليم</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات حالياً</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الطلب</TableHead>
                        <TableHead>العميلة</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>الإجمالي</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الشحن</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead className="text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                          <TableCell className="font-medium">{order.customerName}</TableCell>
                          <TableCell dir="ltr">{order.customerPhone}</TableCell>
                          <TableCell className="font-bold text-primary">{formatPrice(order.total, "ج.م")}</TableCell>
                          <TableCell>{getStatusBadge(order.status || "pending")}</TableCell>
                          <TableCell>
                            {order.trackingCode ? (
                              <div className="text-xs">
                                <span className="text-muted-foreground">كود: </span>
                                <span className="font-mono">{order.trackingCode}</span>
                                {order.driverName && (
                                  <div className="text-muted-foreground mt-1">
                                    <UserCheck className="h-3 w-3 inline ml-1" />
                                    {order.driverName}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={order.status || "pending"}
                                onValueChange={(value) => handleStatusChange(order.id, value, order)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                                <Eye className="h-4 w-4" />
                              </Button>
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

        {/* Ship Order Dialog - Multi-Driver Assignment */}
        <Dialog open={!!shipDialog} onOpenChange={() => setShipDialog(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            {shipDialog && (
              <>
                <DialogHeader>
                  <DialogTitle>إرسال للمندوبين - {shipDialog.orderNumber}</DialogTitle>
                  <DialogDescription>اختر المندوبين المؤهلين (أول من يقبل يحصل على الطلب)</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                    <p><strong>العميل:</strong> {shipDialog.customerName}</p>
                    <p><strong>العنوان:</strong> {shipDialog.customerCity} - {shipDialog.customerAddress}</p>
                    <p><strong>الإجمالي:</strong> {formatPrice(shipDialog.total, "ج.م")}</p>
                    {!shipDialog.isPaid && <Badge variant="outline" className="text-red-500 border-red-300">غير مدفوع - تحصيل نقدي</Badge>}
                  </div>

                  {/* Existing Assignments */}
                  {orderAssignments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">التعيينات الحالية:</h4>
                      {orderAssignments.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                          <span>{a.driver?.name}</span>
                          <Badge className={
                            a.status === "accepted" ? "bg-green-500" :
                              a.status === "rejected" ? "bg-red-500" :
                                a.status === "cancelled" ? "bg-gray-500" : "bg-yellow-500"
                          }>
                            {a.status === "accepted" ? "قبل" : a.status === "rejected" ? "رفض" : a.status === "cancelled" ? "ملغي" : "بانتظار الرد"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Eligible Drivers */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-1"><Users className="h-4 w-4" /> المندوبين المؤهلين</h4>
                      {eligibleLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    {!eligibleLoading && eligibleDrivers.length === 0 ? (
                      <div className="text-center py-4">
                        <AlertCircle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                        <p className="text-sm text-muted-foreground">لا يوجد مندوبين مؤهلين (الرصيد يجب أن يكون ≥ {formatPrice(shipDialog.total, "ج.م")})</p>
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {eligibleDrivers.map((d: any) => (
                          <div key={d.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDriverIds.includes(d.id) ? "border-primary bg-primary/5" : "hover:bg-muted"
                              }`}
                            onClick={() => toggleDriver(d.id)}
                          >
                            <Checkbox checked={selectedDriverIds.includes(d.id)} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{d.name}</p>
                              <p className="text-xs text-muted-foreground">{d.phone || d.whatsappPhone}</p>
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1 text-xs">
                                <Wallet className="h-3 w-3" />
                                <span className="font-mono">{formatPrice(d.walletBalance || "0", "ج.م")}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">{d.completedOrders || 0} توصيلة</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                    <p className="font-medium mb-1">كيف يعمل نظام التعيين:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                      <li>يتم إرسال إشعار لكل مندوب تم اختياره</li>
                      <li>أول مندوب يقبل الطلب يحصل عليه</li>
                      <li>يتم إلغاء الإشعارات تلقائياً للباقين</li>
                      <li>يجب أن يكون رصيد المندوب ≥ قيمة الطلب</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShipDialog(null)}>إلغاء</Button>
                  <Button
                    onClick={handleShipOrder}
                    disabled={selectedDriverIds.length === 0 || updateStatusMutation.isPending}
                    className="gap-2"
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                    إرسال لـ {selectedDriverIds.length} مندوب
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Order Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء طلب جديد</DialogTitle>
              <DialogDescription>أدخل بيانات الطلب وسيتم تجميد المبلغ من رصيد المندوب</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>المندوب *</Label>
                <Select value={createForm.driverId} onValueChange={v => setCreateForm(f => ({ ...f, driverId: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر مندوب" /></SelectTrigger>
                  <SelectContent>
                    {activeDrivers.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name} — رصيد: {formatPrice(d.walletBalance || "0", "ج.م")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>اسم العميل *</Label>
                  <Input value={createForm.customerName} onChange={e => setCreateForm(f => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>هاتف العميل *</Label>
                  <Input dir="ltr" value={createForm.customerPhone} onChange={e => setCreateForm(f => ({ ...f, customerPhone: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>المبلغ (سيتم تجميده من رصيد المندوب) *</Label>
                <Input type="number" min="0" step="0.01" value={createForm.total} onChange={e => setCreateForm(f => ({ ...f, total: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <Label className="font-medium">العمولة مدفوعة مسبقاً</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">تضاف العمولة لرصيد المندوب بعد التسليم بدلاً من الدفع النقدي</p>
                </div>
                <Switch checked={createForm.commissionPrepaid} onCheckedChange={v => setCreateForm(f => ({ ...f, commissionPrepaid: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>مكان التسلّم (الاستلام)</Label>
                  <Input value={createForm.pickupAddress} onChange={e => setCreateForm(f => ({ ...f, pickupAddress: e.target.value }))} placeholder="عنوان استلام الشحنة" />
                </div>
                <div className="space-y-2">
                  <Label>مكان التسليم *</Label>
                  <Input value={createForm.customerAddress} onChange={e => setCreateForm(f => ({ ...f, customerAddress: e.target.value }))} placeholder="عنوان تسليم الشحنة" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>المدينة</Label>
                <Input value={createForm.customerCity} onChange={e => setCreateForm(f => ({ ...f, customerCity: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>نوع الشحنة</Label>
                  <Select value={createForm.shipmentType} onValueChange={v => setCreateForm(f => ({ ...f, shipmentType: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مستندات">مستندات</SelectItem>
                      <SelectItem value="طرد صغير">طرد صغير</SelectItem>
                      <SelectItem value="طرد متوسط">طرد متوسط</SelectItem>
                      <SelectItem value="طرد كبير">طرد كبير</SelectItem>
                      <SelectItem value="أثاث">أثاث</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الوزن (كجم)</Label>
                  <Input type="number" min="0" step="0.1" value={createForm.weight} onChange={e => setCreateForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الوقت المطلوب للتوصيل</Label>
                <Input type="datetime-local" value={createForm.deliveryDeadline} onChange={e => setCreateForm(f => ({ ...f, deliveryDeadline: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea value={createForm.customerNotes} onChange={e => setCreateForm(f => ({ ...f, customerNotes: e.target.value }))} placeholder="ملاحظات إضافية..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
              <Button
                onClick={() => createOrderMutation.mutate(createForm)}
                disabled={!createForm.driverId || !createForm.customerName || !createForm.customerPhone || !createForm.customerAddress || !createForm.total || createOrderMutation.isPending}
                className="gap-2"
              >
                {createOrderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                إنشاء الطلب
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Commission & Share Dialog */}
        <Dialog open={!!commissionOrder} onOpenChange={() => setCommissionOrder(null)}>
          <DialogContent className="max-w-md">
            {commissionOrder && (
              <>
                <DialogHeader>
                  <DialogTitle>تحديد العمولة وإرسال الكود - #{commissionOrder.orderNumber}</DialogTitle>
                  <DialogDescription>حدد عمولة المندوب ثم شارك الرسالة مع العميل</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                    <p><strong>العميل:</strong> {commissionOrder.customerName}</p>
                    <p><strong>المندوب:</strong> {commissionOrder.driverName}</p>
                    <p><strong>الإجمالي:</strong> {formatPrice(commissionOrder.total, "ج.م")}</p>
                    <p><strong>كود التأكيد:</strong> <span className="font-mono font-bold text-green-600">{(commissionOrder as any).confirmationCode}</span></p>
                  </div>
                  <div className="space-y-2">
                    <Label>عمولة المندوب (ج.م) *</Label>
                    <Input
                      type="number" min="0" step="0.01"
                      value={commissionAmount}
                      onChange={e => { setCommissionAmount(e.target.value); setShareMessage(""); }}
                      placeholder="مبلغ العمولة النقدية"
                    />
                  </div>
                  {!shareMessage && (
                    <Button
                      className="w-full gap-2"
                      onClick={() => commissionMutation.mutate({ id: commissionOrder.id, commission: commissionAmount })}
                      disabled={!commissionAmount || parseFloat(commissionAmount) < 0 || commissionMutation.isPending}
                    >
                      {commissionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      تأكيد العمولة وتجهيز الرسالة
                    </Button>
                  )}
                  {shareMessage && (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm font-medium mb-1">الرسالة التي سيتم إرسالها للعميل:</p>
                        <p className="text-sm whitespace-pre-line">{shareMessage}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => {
                            navigator.clipboard.writeText(shareMessage);
                            setCopiedField("shareMsg");
                            setTimeout(() => setCopiedField(""), 2000);
                            if (navigator.share) {
                              navigator.share({ text: shareMessage }).catch(() => { });
                            }
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                          {copiedField === "shareMsg" ? "تم النسخ! اختر تطبيق" : "مشاركة الرسالة"}
                        </Button>
                        <Button
                          variant="outline" className="gap-2"
                          onClick={() => {
                            navigator.clipboard.writeText(shareMessage);
                            setCopiedField("shareMsg");
                            setTimeout(() => setCopiedField(""), 2000);
                            toast({ title: "تم نسخ الرسالة" });
                          }}
                        >
                          {copiedField === "shareMsg" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          نسخ
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>تفاصيل الطلب</span>
                    {getStatusBadge(selectedOrder.status || "pending")}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">معلومات الطلب</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رقم الطلب:</span>
                          <span className="font-mono">{selectedOrder.orderNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">التاريخ:</span>
                          <span>{formatDate(selectedOrder.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">وسيلة الدفع:</span>
                          <span>{selectedOrder.paymentMethodName || "-"}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">بيانات العميلة</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الاسم:</span>
                          <span>{selectedOrder.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الهاتف:</span>
                          <span dir="ltr">{selectedOrder.customerPhone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المدينة:</span>
                          <span>{selectedOrder.customerCity || "-"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Shipping Info */}
                  {selectedOrder.trackingCode && (
                    <Card className="border-primary/50">
                      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> معلومات الشحن</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">كود الشحن:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-medium">{selectedOrder.trackingCode}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(selectedOrder.trackingCode!, "track")}>
                              {copiedField === "track" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">كود التسليم:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-primary">{selectedOrder.deliveryCode}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(selectedOrder.deliveryCode!, "delivery")}>
                              {copiedField === "delivery" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المندوب:</span>
                          <span>{selectedOrder.driverName || "-"}</span>
                        </div>
                        {selectedOrder.shippedAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">تاريخ الشحن:</span>
                            <span>{formatDate(selectedOrder.shippedAt)}</span>
                          </div>
                        )}
                        {selectedOrder.deliveredAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">تاريخ التسليم:</span>
                            <span>{formatDate(selectedOrder.deliveredAt)}</span>
                          </div>
                        )}
                        {(selectedOrder as any).confirmationCode && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">كود التأكيد (للعميل):</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-green-600">{(selectedOrder as any).confirmationCode}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy((selectedOrder as any).confirmationCode, "confirm")}>
                                {copiedField === "confirm" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                        )}
                        {(selectedOrder as any).driverCommission && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">عمولة المندوب:</span>
                            <span className="font-bold text-orange-600">{formatPrice((selectedOrder as any).driverCommission, "ج.م")}</span>
                          </div>
                        )}
                        {selectedOrder.status === "shipped" && (selectedOrder as any).confirmationCode && (
                          <Button
                            className="w-full mt-2 gap-2"
                            onClick={() => {
                              setCommissionOrder(selectedOrder);
                              setCommissionAmount((selectedOrder as any).driverCommission || "");
                              setShareMessage("");
                              setSelectedOrder(null);
                            }}
                          >
                            <Send className="h-4 w-4" />
                            تحديد العمولة وإرسال الكود للعميل
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">العنوان</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedOrder.customerAddress}</p>
                      {selectedOrder.customerNotes && (
                        <p className="text-sm text-muted-foreground mt-2">ملاحظات: {selectedOrder.customerNotes}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">المنتجات</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(selectedOrder.items as any[]).map((item, index) => (
                          <div key={index} className="flex gap-4">
                            {item.productImage && <img src={item.productImage} alt={item.productName} className="w-16 h-16 rounded-lg object-cover" />}
                            <div className="flex-1">
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">{item.quantity} × {formatPrice(item.price, "ج.م")}</p>
                            </div>
                            <p className="font-bold">{formatPrice(item.total, "ج.م")}</p>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-4" />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>المجموع الفرعي:</span>
                          <span>{formatPrice(selectedOrder.subtotal, "ج.م")}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                          <span>الإجمالي:</span>
                          <span className="text-primary">{formatPrice(selectedOrder.total, "ج.م")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
