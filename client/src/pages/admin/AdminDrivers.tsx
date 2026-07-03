import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Truck, Phone, User, Eye, EyeOff,
  Wallet, Copy, Check, Loader2, Shield, ArrowDownCircle,
  UserCheck, UserX, Clock, CheckCircle2, XCircle, Camera, ImageOff,
  IdCard, FileCheck, Weight, MapPin, ShieldCheck, Star, Link, Share2,
  BadgeCheck, Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import type { DeliveryDriver } from "@shared/schema";

/**
 * Compress image client-side using Canvas API.
 */
function compressImage(file: File, maxDimension: number = 1200, quality: number = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else resolve(file); },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

interface DriverForm {
  name: string;
  username: string;
  password: string;
  phone: string;
  whatsappPhone: string;
  governorate: string;
  city: string;
  village: string;
  vehicleType: string;
  maxWeight: string;
  isActive: boolean;
}

const emptyForm: DriverForm = {
  name: "",
  username: "",
  password: "",
  phone: "",
  whatsappPhone: "",
  governorate: "",
  city: "",
  village: "",
  vehicleType: "",
  maxWeight: "",
  isActive: true,
};

export default function AdminDrivers() {
  const { toast } = useToast();
  const [formDialog, setFormDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [codeDialog, setCodeDialog] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [depositDialog, setDepositDialog] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [activeTab, setActiveTab] = useState("drivers");
  const [withdrawalNote, setWithdrawalNote] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const profileUploadRef = useRef<HTMLInputElement>(null);
  const [profileUploadDriverId, setProfileUploadDriverId] = useState<string | null>(null);
  const [detailDriver, setDetailDriver] = useState<any>(null);
  const [ratingDialog, setRatingDialog] = useState<any>(null);
  const [ratingForm, setRatingForm] = useState({ rating: "5", comment: "", customerName: "" });

  const { data: drivers = [], isLoading } = useQuery<DeliveryDriver[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const { data: pendingDrivers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/drivers/pending"],
  });

  const { data: withdrawals = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals"],
  });

  const { data: allRatings = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/ratings"],
  });

  const { data: allReferrals = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/referrals"],
  });

  const { data: depositRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/deposit-requests"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: DriverForm) => {
      return apiRequest("POST", "/api/admin/drivers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم إضافة المندوب بنجاح" });
      closeForm();
    },
    onError: () => {
      toast({ title: "فشل في إضافة المندوب", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DriverForm> }) => {
      return apiRequest("PATCH", `/api/admin/drivers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم تحديث بيانات المندوب" });
      closeForm();
    },
    onError: () => {
      toast({ title: "فشل في تحديث بيانات المندوب", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/drivers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم حذف المندوب" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "فشل في حذف المندوب", variant: "destructive" });
    },
  });

  const depositMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: string }) => {
      return apiRequest("POST", `/api/admin/drivers/${id}/deposit`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم إيداع المبلغ بنجاح" });
      setDepositDialog(null);
      setDepositAmount("");
    },
    onError: () => {
      toast({ title: "فشل في الإيداع", variant: "destructive" });
    },
  });

  const adminProfileImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const compressed = await compressImage(file, 1200, 0.85);
      const formData = new FormData();
      formData.append("image", compressed, file.name.replace(/\.[^.]+$/, '.jpg'));
      const res = await fetch(`/api/admin/drivers/${id}/profile-image`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم تحديث صورة المندوب" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const verifyIdMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      return apiRequest("POST", `/api/admin/drivers/${id}/verify-id`, { verified });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم تحديث توثيق الهوية" });
    },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const verifyCriminalMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      return apiRequest("POST", `/api/admin/drivers/${id}/verify-criminal`, { verified });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم تحديث توثيق الفيش الجنائي" });
    },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const removeProfileImageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/drivers/${id}/profile-image`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم حذف صورة المندوب" });
    },
    onError: () => toast({ title: "فشل في حذف الصورة", variant: "destructive" }),
  });

  const withdrawalMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) => {
      return apiRequest("PATCH", `/api/admin/withdrawals/${id}`, { status, adminNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم تحديث طلب السحب" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث طلب السحب", variant: "destructive" });
    },
  });

  const depositRequestMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) => {
      return apiRequest("PATCH", `/api/admin/deposit-requests/${id}`, { status, adminNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم تحديث طلب الإيداع" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث طلب الإيداع", variant: "destructive" });
    },
  });

  const fullVerifyMutation = useMutation({
    mutationFn: async ({ id, fullyVerified }: { id: string; fullyVerified: boolean }) => {
      return apiRequest("POST", `/api/admin/drivers/${id}/full-verify`, { fullyVerified });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم تحديث شارة التوثيق الكامل" });
    },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const addRatingMutation = useMutation({
    mutationFn: async ({ driverId, data }: { driverId: string; data: any }) => {
      return apiRequest("POST", `/api/admin/drivers/${driverId}/ratings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ratings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم إضافة التقييم" });
      setRatingDialog(null);
      setRatingForm({ rating: "5", comment: "", customerName: "" });
    },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const deleteRatingMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/ratings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ratings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم حذف التقييم" });
    },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const referralMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/referrals/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "تم تحديث حالة الإحالة" });
    },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const showVerificationCode = async (driver: any) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}/code`, { credentials: "include" });
      const data = await res.json();
      setCodeDialog({ driver, code: data.code });
    } catch {
      toast({ title: "فشل في جلب كود التحقق", variant: "destructive" });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowPassword(false);
    setFormDialog(true);
  };

  const openEdit = (driver: DeliveryDriver) => {
    setForm({
      name: driver.name,
      username: driver.username,
      password: "",
      phone: driver.phone || "",
      whatsappPhone: (driver as any).whatsappPhone || "",
      governorate: (driver as any).governorate || "",
      city: (driver as any).city || "",
      village: (driver as any).village || "",
      vehicleType: (driver as any).vehicleType || "",
      maxWeight: (driver as any).maxWeight || "",
      isActive: driver.isActive ?? true,
    });
    setEditingId(driver.id);
    setShowPassword(false);
    setFormDialog(true);
  };

  const closeForm = () => {
    setFormDialog(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.username.trim()) {
      toast({ title: "يجب إدخال الاسم واسم المستخدم", variant: "destructive" });
      return;
    }
    if (!editingId && !form.password.trim()) {
      toast({ title: "يجب إدخال كلمة المرور", variant: "destructive" });
      return;
    }

    if (editingId) {
      const data: any = {
        name: form.name,
        username: form.username,
        phone: form.phone,
        whatsappPhone: form.whatsappPhone,
        governorate: form.governorate || null,
        city: form.city || null,
        village: form.village || null,
        vehicleType: form.vehicleType || null,
        maxWeight: form.maxWeight || null,
        isActive: form.isActive,
      };
      if (form.password.trim()) data.password = form.password;
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(form);
    }
  };

  const activeCount = drivers.filter(d => d.isActive).length;
  const pendingWithdrawals = withdrawals.filter((w: any) => w.status === "pending").length;
  const pendingDeposits = depositRequests.filter((d: any) => d.status === "pending").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">مندوبي الشحن</h1>
            <p className="text-muted-foreground">إدارة حسابات مندوبي التوصيل والمحافظ</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة مندوب
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{drivers.length}</p>
            <p className="text-xs text-muted-foreground">إجمالي المندوبين</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-500">{activeCount}</p>
            <p className="text-xs text-muted-foreground">نشط</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{pendingDrivers.length}</p>
            <p className="text-xs text-muted-foreground">بانتظار التحقق</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{pendingWithdrawals}</p>
            <p className="text-xs text-muted-foreground">طلبات سحب</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{pendingDeposits}</p>
            <p className="text-xs text-muted-foreground">طلبات إيداع</p>
          </CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="drivers">المندوبين</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              بانتظار التحقق
              {pendingDrivers.length > 0 && <span className="mr-1 bg-yellow-500 text-white text-[10px] rounded-full px-1.5">{pendingDrivers.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="ratings" className="relative">
              التقييمات
            </TabsTrigger>
            <TabsTrigger value="referrals" className="relative">
              الإحالات
              {allReferrals.filter((r: any) => r.status === "pending").length > 0 && <span className="mr-1 bg-green-500 text-white text-[10px] rounded-full px-1.5">{allReferrals.filter((r: any) => r.status === "pending").length}</span>}
            </TabsTrigger>
            <TabsTrigger value="deposits" className="relative">
              إيداع
              {pendingDeposits > 0 && <span className="mr-1 bg-blue-500 text-white text-[10px] rounded-full px-1.5">{pendingDeposits}</span>}
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="relative">
              سحب
              {pendingWithdrawals > 0 && <span className="mr-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{pendingWithdrawals}</span>}
            </TabsTrigger>
          </TabsList>

          {/* Drivers Tab */}
          <TabsContent value="drivers">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : drivers.length === 0 ? (
                  <div className="p-12 text-center">
                    <Truck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">لا يوجد مندوبي شحن</p>
                    <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />إضافة أول مندوب</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الاسم</TableHead>
                          <TableHead>اسم المستخدم</TableHead>
                          <TableHead>الهاتف / واتساب</TableHead>
                          <TableHead>الرصيد</TableHead>
                          <TableHead>الأرباح</TableHead>
                          <TableHead>التوصيلات</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="text-left">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.map((driver: any) => (
                          <TableRow key={driver.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {driver.profileImage ? (
                                  <img src={driver.profileImage} alt="" className="w-8 h-8 rounded-full object-cover border" />
                                ) : (
                                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium">{driver.name}</span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {(driver as any).fullyVerified && <span title="موثق بالكامل"><BadgeCheck className="h-3 w-3 text-emerald-500" /></span>}
                                    {driver.isVerified && <Shield className="h-3 w-3 text-blue-500" />}
                                    {driver.idVerified && <IdCard className="h-3 w-3 text-green-500" />}
                                    {driver.criminalRecordVerified && <FileCheck className="h-3 w-3 text-purple-500" />}
                                    {(driver as any).vehicleType && <span title={(driver as any).vehicleType}><Car className="h-3 w-3 text-orange-500" /></span>}
                                    {driver.maxWeight && <span className="text-[10px] text-muted-foreground">{driver.maxWeight} كجم</span>}
                                    {parseFloat((driver as any).averageRating || "0") > 0 && (
                                      <span className="text-[10px] text-yellow-600 flex items-center gap-0.5"><Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />{parseFloat((driver as any).averageRating).toFixed(1)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{driver.username}</TableCell>
                            <TableCell dir="ltr" className="text-sm">
                              {driver.phone || "-"}
                              {driver.whatsappPhone && <div className="text-xs text-muted-foreground">WA: {driver.whatsappPhone}</div>}
                            </TableCell>
                            <TableCell className="font-bold">{formatPrice(driver.walletBalance || "0", "ج.م")}</TableCell>
                            <TableCell className="text-green-600">{formatPrice(driver.totalEarnings || "0", "ج.م")}</TableCell>
                            <TableCell>{driver.completedOrders || 0}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Badge className={driver.isActive ? "bg-green-500" : "bg-red-500"}>
                                  {driver.isActive ? "نشط" : "غير نشط"}
                                </Badge>
                                {driver.isAvailable && <Badge className="bg-blue-500">متاح</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setDetailDriver(driver)} title="تفاصيل وتوثيق">
                                  <ShieldCheck className="h-4 w-4 text-purple-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setProfileUploadDriverId(driver.id);
                                  setTimeout(() => profileUploadRef.current?.click(), 100);
                                }} title="تغيير الصورة">
                                  <Camera className="h-4 w-4 text-blue-500" />
                                </Button>
                                {driver.profileImage && (
                                  <Button variant="ghost" size="icon" onClick={() => removeProfileImageMutation.mutate(driver.id)} title="حذف الصورة">
                                    <ImageOff className="h-4 w-4 text-orange-500" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => { setDepositDialog(driver); setDepositAmount(""); }} title="إيداع">
                                  <ArrowDownCircle className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(driver)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(driver.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
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
          </TabsContent>

          {/* Pending Registrations Tab */}
          <TabsContent value="pending" className="space-y-3">
            {pendingDrivers.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <UserCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد تسجيلات بانتظار التحقق</p>
              </CardContent></Card>
            ) : pendingDrivers.map((driver: any) => (
              <Card key={driver.id} className="border-yellow-300">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-bold text-lg">{driver.name}</p>
                      <p className="text-sm"><Phone className="h-3 w-3 inline ml-1" /> واتساب: <span dir="ltr">{driver.whatsappPhone}</span></p>
                      <p className="text-sm font-mono">المستخدم: {driver.username}</p>
                      <p className="text-xs text-muted-foreground">تسجيل: {driver.createdAt ? new Date(driver.createdAt).toLocaleString("ar-EG") : ""}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button className="gap-1" onClick={() => showVerificationCode(driver)}>
                        <Shield className="h-4 w-4" /> عرض كود التحقق
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings" className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">تقييمات المندوبين</h3>
              <Button size="sm" className="gap-1" onClick={() => setRatingDialog({})}>
                <Plus className="h-3 w-3" /> إضافة تقييم
              </Button>
            </div>
            {allRatings.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Star className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد تقييمات بعد</p>
              </CardContent></Card>
            ) : allRatings.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{r.driverName}</p>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i <= parseFloat(r.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                      <p className="text-xs text-muted-foreground">
                        {r.customerName && `من: ${r.customerName} • `}
                        {r.createdAt ? new Date(r.createdAt).toLocaleString("ar-EG") : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteRatingMutation.mutate(r.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-3">
            <h3 className="font-bold">نظام الإحالات</h3>
            {allReferrals.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Link className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد إحالات بعد</p>
              </CardContent></Card>
            ) : allReferrals.map((r: any) => (
              <Card key={r.id} className={r.status === "pending" ? "border-green-300" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-bold">المُحيل: {r.referrerName}</p>
                      <p className="text-sm">المُحال: {r.referredName}</p>
                      <p className="text-sm font-bold text-primary">المكافأة: {formatPrice(r.bonus || "0", "ج.م")}</p>
                      <p className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString("ar-EG") : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === "pending" ? (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1"
                            onClick={() => referralMutation.mutate({ id: r.id, status: "approved" })}
                            disabled={referralMutation.isPending}>
                            <CheckCircle2 className="h-3 w-3" /> صرف المكافأة
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1"
                            onClick={() => referralMutation.mutate({ id: r.id, status: "rejected" })}
                            disabled={referralMutation.isPending}>
                            <XCircle className="h-3 w-3" /> رفض
                          </Button>
                        </>
                      ) : (
                        <Badge className={r.status === "approved" ? "bg-green-500" : "bg-red-500"}>
                          {r.status === "approved" ? "تم الصرف" : "مرفوض"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Deposit Requests Tab */}
          <TabsContent value="deposits" className="space-y-3">
            {depositRequests.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <ArrowDownCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد طلبات إيداع</p>
              </CardContent></Card>
            ) : depositRequests.map((d: any) => (
              <Card key={d.id} className={d.status === "pending" ? "border-blue-300" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-bold">{d.driverName || "مندوب"}</p>
                      {d.driverPhone && <p className="text-xs text-muted-foreground" dir="ltr">{d.driverPhone}</p>}
                      <p className="text-lg font-bold text-primary">{formatPrice(d.amount, "ج.م")}</p>
                      <p className="text-sm text-muted-foreground">وسيلة الدفع: {d.paymentMethodName}</p>
                      <p className="text-xs text-muted-foreground">{d.createdAt ? new Date(d.createdAt).toLocaleString("ar-EG") : ""}</p>
                      {d.adminNote && <p className="text-sm text-muted-foreground">ملاحظة: {d.adminNote}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {d.status === "pending" ? (
                        <>
                          <Input
                            placeholder="ملاحظة (اختياري)"
                            value={depositNote}
                            onChange={(e) => setDepositNote(e.target.value)}
                            className="w-32 text-sm"
                          />
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1"
                            onClick={() => { depositRequestMutation.mutate({ id: d.id, status: "approved", adminNote: depositNote }); setDepositNote(""); }}>
                            <CheckCircle2 className="h-3 w-3" /> قبول
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1"
                            onClick={() => { depositRequestMutation.mutate({ id: d.id, status: "rejected", adminNote: depositNote }); setDepositNote(""); }}>
                            <XCircle className="h-3 w-3" /> رفض
                          </Button>
                        </>
                      ) : (
                        <Badge className={d.status === "approved" ? "bg-green-500" : "bg-red-500"}>
                          {d.status === "approved" ? "تمت الموافقة" : "مرفوض"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-3">
            {withdrawals.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد طلبات سحب</p>
              </CardContent></Card>
            ) : withdrawals.map((w: any) => (
              <Card key={w.id} className={w.status === "pending" ? "border-yellow-300" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-bold">{w.driver?.name || "مندوب غير معروف"}</p>
                      <p className="text-lg font-bold text-primary">{formatPrice(w.amount, "ج.م")}</p>
                      <p className="text-xs text-muted-foreground">{w.createdAt ? new Date(w.createdAt).toLocaleString("ar-EG") : ""}</p>
                      {w.adminNote && <p className="text-sm text-muted-foreground">ملاحظة: {w.adminNote}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {w.status === "pending" ? (
                        <>
                          <Input
                            placeholder="ملاحظة (اختياري)"
                            value={withdrawalNote}
                            onChange={(e) => setWithdrawalNote(e.target.value)}
                            className="w-32 text-sm"
                          />
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1"
                            onClick={() => { withdrawalMutation.mutate({ id: w.id, status: "approved", adminNote: withdrawalNote }); setWithdrawalNote(""); }}>
                            <CheckCircle2 className="h-3 w-3" /> قبول
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1"
                            onClick={() => { withdrawalMutation.mutate({ id: w.id, status: "rejected", adminNote: withdrawalNote }); setWithdrawalNote(""); }}>
                            <XCircle className="h-3 w-3" /> رفض
                          </Button>
                        </>
                      ) : (
                        <Badge className={w.status === "approved" ? "bg-green-500" : "bg-red-500"}>
                          {w.status === "approved" ? "تمت الموافقة" : "مرفوض"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formDialog} onOpenChange={() => closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل بيانات المندوب" : "إضافة مندوب جديد"}</DialogTitle>
            <DialogDescription>
              {editingId ? "قم بتعديل بيانات المندوب" : "أدخل بيانات مندوب الشحن الجديد"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>الاسم الكامل *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="أحمد محمد"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم المستخدم *</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="ahmed"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{editingId ? "كلمة المرور (اتركها فارغة للإبقاء)" : "كلمة المرور *"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  dir="ltr"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>واتساب</Label>
                <Input
                  value={form.whatsappPhone}
                  onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>المحافظة</Label>
                <Input
                  value={form.governorate}
                  onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                  placeholder="القاهرة"
                />
              </div>
              <div className="space-y-2">
                <Label>المدينة</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="مدينة نصر"
                />
              </div>
              <div className="space-y-2">
                <Label>القرية / الحي</Label>
                <Input
                  value={form.village}
                  onChange={(e) => setForm({ ...form, village: e.target.value })}
                  placeholder="حي أول"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نوع المركبة</Label>
                <Select value={form.vehicleType} onValueChange={(val) => setForm({ ...form, vehicleType: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع المركبة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="دراجة نارية">دراجة نارية</SelectItem>
                    <SelectItem value="سيارة">سيارة</SelectItem>
                    <SelectItem value="توك توك">توك توك</SelectItem>
                    <SelectItem value="ميكروباص">ميكروباص</SelectItem>
                    <SelectItem value="نقل">نقل</SelectItem>
                    <SelectItem value="دراجة هوائية">دراجة هوائية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>أقصى وزن (كجم)</Label>
                <Input
                  value={form.maxWeight}
                  onChange={(e) => setForm({ ...form, maxWeight: e.target.value })}
                  placeholder="25"
                  type="number"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>الحساب نشط</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>إلغاء</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "حفظ التعديلات" : "إضافة المندوب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا المندوب؟</AlertDialogTitle>
            <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verification Code Dialog */}
      <Dialog open={!!codeDialog} onOpenChange={() => setCodeDialog(null)}>
        <DialogContent>
          {codeDialog && (
            <>
              <DialogHeader>
                <DialogTitle>كود التحقق - {codeDialog.driver.name}</DialogTitle>
                <DialogDescription>أرسل هذا الكود للمندوب عبر واتساب على الرقم {codeDialog.driver.whatsappPhone}</DialogDescription>
              </DialogHeader>
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">كود التحقق:</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-4xl font-mono font-bold tracking-[0.5em] text-primary">{codeDialog.code}</p>
                  <Button variant="ghost" size="icon" onClick={() => handleCopyCode(codeDialog.code)}>
                    {copiedCode ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setCodeDialog(null)}>إغلاق</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={!!depositDialog} onOpenChange={() => setDepositDialog(null)}>
        <DialogContent>
          {depositDialog && (
            <>
              <DialogHeader>
                <DialogTitle>إيداع في محفظة {depositDialog.name}</DialogTitle>
                <DialogDescription>الرصيد الحالي: {formatPrice(depositDialog.walletBalance || "0", "ج.م")}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="المبلغ بالجنيه"
                  type="number"
                  dir="ltr"
                  className="text-center text-xl"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDepositDialog(null)}>إلغاء</Button>
                <Button
                  onClick={() => depositMutation.mutate({ id: depositDialog.id, amount: depositAmount })}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0 || depositMutation.isPending}
                  className="gap-2"
                >
                  {depositMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
                  إيداع المبلغ
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input for admin profile image upload */}
      <input type="file" ref={profileUploadRef} accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && profileUploadDriverId) adminProfileImageMutation.mutate({ id: profileUploadDriverId, file: f });
          e.target.value = "";
        }}
      />

      {/* Driver Detail & Verification Dialog */}
      <Dialog open={!!detailDriver} onOpenChange={() => setDetailDriver(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailDriver && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  تفاصيل وتوثيق المندوب
                </DialogTitle>
                <DialogDescription>{detailDriver.name} - {detailDriver.username}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">الهاتف:</span> <span dir="ltr">{detailDriver.phone || detailDriver.whatsappPhone || "-"}</span></div>
                  <div><span className="text-muted-foreground">الرصيد:</span> {formatPrice(detailDriver.walletBalance || "0", "ج.م")}</div>
                  {detailDriver.governorate && (
                    <div className="col-span-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{detailDriver.governorate}{detailDriver.city ? ` - ${detailDriver.city}` : ""}{detailDriver.village ? ` - ${detailDriver.village}` : ""}</span>
                    </div>
                  )}
                  {detailDriver.maxWeight && (
                    <div className="flex items-center gap-1">
                      <Weight className="h-3 w-3 text-muted-foreground" />
                      <span>أقصى وزن: {detailDriver.maxWeight} كجم</span>
                    </div>
                  )}
                  {detailDriver.vehicleType && (
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3 text-muted-foreground" />
                      <span>المركبة: {detailDriver.vehicleType}</span>
                    </div>
                  )}
                  {parseFloat(detailDriver.averageRating || "0") > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span>التقييم: {parseFloat(detailDriver.averageRating).toFixed(1)} ({detailDriver.totalRatings} تقييم)</span>
                    </div>
                  )}
                  {detailDriver.referralCode && (
                    <div className="col-span-2 flex items-center gap-1">
                      <Link className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-mono">كود الإحالة: {detailDriver.referralCode}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Full Verification Badge */}
                <div className="border rounded-lg p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-bold text-sm">شارة التوثيق الكامل</p>
                        <p className="text-xs text-muted-foreground">يحصل عليها المندوب بعد مراجعة وتعبئة كافة بياناته</p>
                      </div>
                    </div>
                    <Switch
                      checked={detailDriver.fullyVerified || false}
                      onCheckedChange={(checked) => {
                        fullVerifyMutation.mutate({ id: detailDriver.id, fullyVerified: checked });
                        setDetailDriver({ ...detailDriver, fullyVerified: checked });
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Verification Status */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">حالة التوثيق</h4>
                  
                  {/* ID Verification */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IdCard className="h-4 w-4" />
                        <span className="font-medium text-sm">الهوية الوطنية المصرية</span>
                      </div>
                      <Badge className={detailDriver.idVerified ? "bg-green-500" : "bg-gray-400"}>
                        {detailDriver.idVerified ? "موثق ✓" : "غير موثق"}
                      </Badge>
                    </div>
                    {detailDriver.nationalIdImage && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">الوجه الأمامي</p>
                        <div className="rounded-md overflow-hidden border">
                          <img src={detailDriver.nationalIdImage} alt="الوجه الأمامي للهوية" className="w-full h-40 object-contain bg-gray-50" />
                        </div>
                      </div>
                    )}
                    {detailDriver.nationalIdImageBack && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">الوجه الخلفي</p>
                        <div className="rounded-md overflow-hidden border">
                          <img src={detailDriver.nationalIdImageBack} alt="الوجه الخلفي للهوية" className="w-full h-40 object-contain bg-gray-50" />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {!detailDriver.idVerified ? (
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" 
                          onClick={() => { verifyIdMutation.mutate({ id: detailDriver.id, verified: true }); setDetailDriver({ ...detailDriver, idVerified: true }); }}
                          disabled={verifyIdMutation.isPending}>
                          <CheckCircle2 className="h-3 w-3" /> توثيق الهوية
                        </Button>
                      ) : (
                        <Button size="sm" variant="destructive" className="gap-1"
                          onClick={() => { verifyIdMutation.mutate({ id: detailDriver.id, verified: false }); setDetailDriver({ ...detailDriver, idVerified: false }); }}
                          disabled={verifyIdMutation.isPending}>
                          <XCircle className="h-3 w-3" /> إلغاء توثيق الهوية
                        </Button>
                      )}
                    </div>
                    {!detailDriver.nationalIdImage && !detailDriver.nationalIdImageBack && (
                      <p className="text-xs text-muted-foreground">لم يرفع المندوب صور الهوية بعد</p>
                    )}
                  </div>

                  {/* Criminal Record Verification */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        <span className="font-medium text-sm">الفيش الجنائي</span>
                      </div>
                      <Badge className={detailDriver.criminalRecordVerified ? "bg-purple-500" : "bg-gray-400"}>
                        {detailDriver.criminalRecordVerified ? "موثق ✓" : "غير موثق"}
                      </Badge>
                    </div>
                    {detailDriver.criminalRecordImage && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">الوجه الأمامي</p>
                        <div className="rounded-md overflow-hidden border">
                          <img src={detailDriver.criminalRecordImage} alt="الوجه الأمامي للفيش الجنائي" className="w-full h-40 object-contain bg-gray-50" />
                        </div>
                      </div>
                    )}
                    {detailDriver.criminalRecordImageBack && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">الوجه الخلفي</p>
                        <div className="rounded-md overflow-hidden border">
                          <img src={detailDriver.criminalRecordImageBack} alt="الوجه الخلفي للفيش الجنائي" className="w-full h-40 object-contain bg-gray-50" />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {!detailDriver.criminalRecordVerified ? (
                        <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700"
                          onClick={() => { verifyCriminalMutation.mutate({ id: detailDriver.id, verified: true }); setDetailDriver({ ...detailDriver, criminalRecordVerified: true }); }}
                          disabled={verifyCriminalMutation.isPending}>
                          <CheckCircle2 className="h-3 w-3" /> توثيق الفيش الجنائي
                        </Button>
                      ) : (
                        <Button size="sm" variant="destructive" className="gap-1"
                          onClick={() => { verifyCriminalMutation.mutate({ id: detailDriver.id, verified: false }); setDetailDriver({ ...detailDriver, criminalRecordVerified: false }); }}
                          disabled={verifyCriminalMutation.isPending}>
                          <XCircle className="h-3 w-3" /> إلغاء توثيق الفيش
                        </Button>
                      )}
                    </div>
                    {!detailDriver.criminalRecordImage && !detailDriver.criminalRecordImageBack && (
                      <p className="text-xs text-muted-foreground">لم يرفع المندوب صور الفيش الجنائي بعد</p>
                    )}
                  </div>
                </div>

                {/* Commission Info */}
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">نسبة العمولة الحالية:</p>
                  <p className="text-primary font-bold">
                    {detailDriver.criminalRecordVerified ? "عمولة أعلى (فيش جنائي نظيف)" :
                     detailDriver.idVerified ? "عمولة متوسطة (هوية وطنية)" : "عمولة أساسية (غير موثق)"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="gap-1" onClick={() => { setRatingDialog({ driverId: detailDriver.id }); }}>
                  <Star className="h-4 w-4" /> إضافة تقييم
                </Button>
                <Button onClick={() => setDetailDriver(null)}>إغلاق</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Rating Dialog */}
      <Dialog open={!!ratingDialog} onOpenChange={() => setRatingDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة تقييم</DialogTitle>
            <DialogDescription>أضف تقييم لمندوب الشحن</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!ratingDialog?.driverId && (
              <div className="space-y-2">
                <Label>اختر المندوب</Label>
                <Select value={ratingDialog?.selectedDriverId || ""} onValueChange={(val) => setRatingDialog({ ...ratingDialog, selectedDriverId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مندوب" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>التقييم (1-5)</Label>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setRatingForm({ ...ratingForm, rating: i.toString() })}
                    className="p-1 transition-colors">
                    <Star className={`h-8 w-8 ${i <= parseInt(ratingForm.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>اسم العميل (اختياري)</Label>
              <Input
                value={ratingForm.customerName}
                onChange={(e) => setRatingForm({ ...ratingForm, customerName: e.target.value })}
                placeholder="اسم العميل"
              />
            </div>
            <div className="space-y-2">
              <Label>تعليق (اختياري)</Label>
              <Textarea
                value={ratingForm.comment}
                onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })}
                placeholder="تعليق على أداء المندوب..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialog(null)}>إلغاء</Button>
            <Button
              onClick={() => {
                const driverId = ratingDialog?.driverId || ratingDialog?.selectedDriverId;
                if (!driverId) {
                  toast({ title: "اختر مندوب أولاً", variant: "destructive" });
                  return;
                }
                addRatingMutation.mutate({ driverId, data: ratingForm });
              }}
              disabled={addRatingMutation.isPending}
              className="gap-1"
            >
              {addRatingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              إضافة التقييم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
