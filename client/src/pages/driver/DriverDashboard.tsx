import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Truck, LogOut, Package, CheckCircle2, Clock, Eye, MapPin,
  Phone, User, Loader2, KeyRound, Bell, BellRing, Check, X,
  Wallet, Timer, DollarSign, ToggleLeft, ToggleRight, PackageCheck,
  Plus, ArrowUpCircle, ArrowRight, Camera, Weight, IdCard, FileCheck,
  Shield, Upload, BadgeCheck, Car, Star, Link, Share2, Copy,
  FileText, Search, Calendar, RefreshCw, TrendingUp, ArrowDownCircle, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import { GlobalSearch } from "@/components/GlobalSearch";
import type { Order, DriverNotification } from "@shared/schema";

function CountdownTimer({ deadline }: { deadline: string | Date }) {
  const [remaining, setRemaining] = useState("");
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setRemaining("انتهى الوقت"); setExpired(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);
  return <span className={`font-mono text-lg font-bold ${expired ? "text-red-500" : "text-green-600"}`}>{remaining}</span>;
}

/**
 * Compress image client-side using Canvas API.
 * Resizes to maxDimension maintaining aspect ratio, outputs JPEG at given quality.
 * Accepts any image format the browser can render.
 */
function compressImage(file: File, maxDimension: number = 1200, quality: number = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      // Scale down if larger than maxDimension
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
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file); // fallback to original
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original on error
    };
    img.src = url;
  });
}

export default function DriverDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("orders");
  const [confirmDialog, setConfirmDialog] = useState<Order | null>(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const nationalIdInputRef = useRef<HTMLInputElement>(null);
  const nationalIdBackInputRef = useRef<HTMLInputElement>(null);
  const criminalRecordInputRef = useRef<HTMLInputElement>(null);
  const criminalRecordBackInputRef = useRef<HTMLInputElement>(null);
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [maxWeightDialog, setMaxWeightDialog] = useState(false);
  const [maxWeightInput, setMaxWeightInput] = useState("");
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmClearNotifs, setConfirmClearNotifs] = useState(false);

  // Operations log state
  const [opsSearch, setOpsSearch] = useState("");
  const [opsDebouncedSearch, setOpsDebouncedSearch] = useState("");
  const [opsType, setOpsType] = useState("all");
  const [opsDateFrom, setOpsDateFrom] = useState("");
  const [opsDateTo, setOpsDateTo] = useState("");
  const [opsPage, setOpsPage] = useState(1);
  const opsLimit = 20;

  // Debounce operations search
  useEffect(() => {
    const timer = setTimeout(() => setOpsDebouncedSearch(opsSearch), 400);
    return () => clearTimeout(timer);
  }, [opsSearch]);

  // Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { setOpsPage(1); }, [opsDebouncedSearch, opsType, opsDateFrom, opsDateTo]);

  // Auth check
  const { data: authData, isLoading: authLoading } = useQuery<any>({
    queryKey: ["/api/driver/check"],
    retry: false,
  });

  useEffect(() => {
    if (!authLoading && !authData?.loggedIn) navigate("/driver");
  }, [authData, authLoading, navigate]);

  // Data queries
  const { data: ordersData = [] } = useQuery<Order[]>({
    queryKey: ["/api/driver/orders"],
    enabled: !!authData?.loggedIn,
    refetchInterval: 10000,
  });

  const { data: notifData } = useQuery<{ notifications: DriverNotification[]; unreadCount: number }>({
    queryKey: ["/api/driver/notifications"],
    enabled: !!authData?.loggedIn,
    refetchInterval: 5000,
  });

  const { data: assignmentsData = [] } = useQuery<any[]>({
    queryKey: ["/api/driver/assignments"],
    enabled: !!authData?.loggedIn,
    refetchInterval: 5000,
  });

  const { data: walletData } = useQuery<any>({
    queryKey: ["/api/driver/wallet"],
    enabled: !!authData?.loggedIn,
  });

  const { data: referralData } = useQuery<any>({
    queryKey: ["/api/driver/referral"],
    enabled: !!authData?.loggedIn,
  });

  const { data: ratingsData = [] } = useQuery<any[]>({
    queryKey: ["/api/driver/ratings"],
    enabled: !!authData?.loggedIn,
  });

  const { data: opsData, isLoading: opsLoading } = useQuery<{ logs: any[]; total: number }>({
    queryKey: ["/api/driver/operation-logs", opsDebouncedSearch, opsType, opsDateFrom, opsDateTo, opsPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opsDebouncedSearch) params.set("search", opsDebouncedSearch);
      if (opsType !== "all") params.set("type", opsType);
      if (opsDateFrom) params.set("dateFrom", opsDateFrom);
      if (opsDateTo) params.set("dateTo", opsDateTo);
      params.set("page", String(opsPage));
      params.set("limit", String(opsLimit));
      const res = await fetch(`/api/driver/operation-logs?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!authData?.loggedIn,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;
  const driver = authData?.driver;

  // Mutations
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/driver/logout"),
    onSuccess: () => navigate("/driver"),
  });

  const acceptMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest("POST", `/api/driver/orders/${orderId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/notifications"] });
      toast({ title: "تم قبول الطلب بنجاح!" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      apiRequest("POST", `/api/driver/orders/${orderId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/notifications"] });
      toast({ title: "تم رفض الطلب" });
      setRejectDialog(null);
      setRejectReason("");
    },
  });

  const pickupMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest("POST", `/api/driver/orders/${orderId}/pickup`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/orders"] });
      toast({ title: "تم تأكيد الاستلام" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ id, deliveryCode, amountCollected }: { id: string; deliveryCode: string; amountCollected?: string }) => {
      return apiRequest("POST", `/api/driver/orders/${id}/confirm`, { deliveryCode, amountCollected });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم تأكيد التسليم بنجاح!" });
      setConfirmDialog(null);
      setDeliveryCodeInput("");
      setAmountInput("");
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const confirmCommissionMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest("POST", `/api/driver/orders/${orderId}/confirm-commission`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/orders"] });
      toast({ title: "تم تأكيد استلام العمولة" });
    },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const toggleAvailability = useMutation({
    mutationFn: (isAvailable: boolean) => apiRequest("POST", "/api/driver/availability", { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم تحديث الحالة" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/driver/notifications/read"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/driver/notifications"] }),
  });

  const deleteNotifMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/driver/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/notifications"] });
    },
  });

  const clearNotifsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/driver/notifications"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/notifications"] });
      toast({ title: "تم حذف جميع الإشعارات" });
      setConfirmClearNotifs(false);
    },
  });

  const uploadProfileImage = useMutation({
    mutationFn: async (file: File) => {
      // Compress image client-side before upload (like Facebook)
      const compressed = await compressImage(file, 1200, 0.85);
      const formData = new FormData();
      formData.append("image", compressed, file.name.replace(/\.[^.]+$/, '.jpg'));
      const res = await fetch("/api/driver/profile-image", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم رفع الصورة الشخصية بنجاح" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const updateMaxWeightMutation = useMutation({
    mutationFn: (maxWeight: string) => apiRequest("POST", "/api/driver/max-weight", { maxWeight }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم تحديث أقصى وزن للشحن" });
      setMaxWeightDialog(false);
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const updateVehicleTypeMutation = useMutation({
    mutationFn: (vehicleType: string) => apiRequest("POST", "/api/driver/vehicle-type", { vehicleType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم تحديث نوع المركبة" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const uploadNationalIdMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/driver/national-id", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم رفع الوجه الأمامي للهوية" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const uploadNationalIdBackMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/driver/national-id-back", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم رفع الوجه الخلفي للهوية. سيتم مراجعتها من الإدارة" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const uploadCriminalRecordMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/driver/criminal-record", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم رفع الوجه الأمامي للفيش الجنائي" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const uploadCriminalRecordBackMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/driver/criminal-record-back", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم رفع الوجه الخلفي للفيش الجنائي. سيتم مراجعتها من الإدارة" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  if (authLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <Loader2 className="h-10 w-10 animate-spin text-primary relative" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground animate-pulse">جاري التحميل...</p>
    </div>
  );
  if (!authData?.loggedIn) return null;

  const shippedOrders = ordersData.filter(o => o.status === "shipped" && !o.pickedUpAt);
  const inDelivery = ordersData.filter(o => o.status === "shipped" && o.pickedUpAt);
  const deliveredOrders = ordersData.filter(o => o.status === "delivered");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="file" ref={profileInputRef} accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProfileImage.mutate(f); e.target.value = ""; }} />
            {driver?.profileImage ? (
              <button
                onClick={() => profileInputRef.current?.click()}
                className="relative h-11 w-11 rounded-full overflow-hidden ring-2 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer group shadow-md hover:shadow-lg"
                title="تغيير الصورة الشخصية"
                disabled={uploadProfileImage.isPending}
              >
                <img src={driver.profileImage} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadProfileImage.isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Camera className="h-4 w-4 text-white" />}
                </div>
              </button>
            ) : (
              <button
                onClick={() => profileInputRef.current?.click()}
                className="h-11 w-11 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center hover:from-primary/20 hover:to-primary/30 transition-all relative shadow-md"
                title="رفع صورة شخصية"
                disabled={uploadProfileImage.isPending}
              >
                {uploadProfileImage.isPending ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Camera className="h-5 w-5 text-primary" />}
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm">{driver?.name}</p>
                {driver?.fullyVerified && <span title="موثق بالكامل"><BadgeCheck className="h-4 w-4 text-emerald-500" /></span>}
                {driver?.idVerified && !driver?.fullyVerified && <IdCard className="h-3.5 w-3.5 text-green-500" />}
                {driver?.criminalRecordVerified && !driver?.fullyVerified && <FileCheck className="h-3.5 w-3.5 text-purple-500" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">
                  <Wallet className="h-3 w-3" />{formatPrice(driver?.walletBalance || "0", "ج.م")}
                </span>
                {driver?.maxWeight && (
                  <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                    <Weight className="h-3 w-3" />{driver.maxWeight} كجم
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="rounded-full h-9 w-9"
              onClick={() => setSearchOpen(true)}
              title="بحث (Ctrl+K)"
            >
              <Search className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="relative rounded-full h-9 w-9"
              onClick={() => { setActiveTab("notifications"); markReadMutation.mutate(); }}
            >
              {unreadCount > 0 ? <BellRing className="h-4.5 w-4.5 text-primary animate-pulse" /> : <Bell className="h-4.5 w-4.5" />}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full h-4.5 min-w-[18px] px-1 flex items-center justify-center font-bold shadow-sm">{unreadCount}</span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"
              onClick={() => toggleAvailability.mutate(!driver?.isAvailable)}
              title={driver?.isAvailable ? "أنت متاح الآن" : "أنت غير متاح"}
            >
              {driver?.isAvailable ? (
                <div className="relative">
                  <ToggleRight className="h-5 w-5 text-green-500" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                </div>
              ) : <ToggleLeft className="h-5 w-5 text-gray-400" />}
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: assignmentsData.length, label: "طلبات جديدة", color: "from-yellow-400 to-orange-500", bg: "bg-yellow-50 dark:bg-yellow-950/50", text: "text-yellow-600 dark:text-yellow-400", icon: BellRing },
            { value: shippedOrders.length + inDelivery.length, label: "جاري التوصيل", color: "from-blue-400 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-600 dark:text-blue-400", icon: Truck },
            { value: deliveredOrders.length, label: "تم التسليم", color: "from-green-400 to-emerald-600", bg: "bg-green-50 dark:bg-green-950/50", text: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
            { value: driver?.completedOrders || 0, label: "إجمالي", color: "from-purple-400 to-purple-600", bg: "bg-purple-50 dark:bg-purple-950/50", text: "text-purple-600 dark:text-purple-400", icon: TrendingUp },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className={`${stat.bg} border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative`}>
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-l ${stat.color}`} />
                <CardContent className="pt-3 pb-3 text-center">
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${stat.text} opacity-60`} />
                  <p className={`text-xl font-bold ${stat.text} tabular-nums`}>{Number(stat.value).toLocaleString("ar-EG")}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pending Assignments (New orders to accept/reject) */}
        {assignmentsData.length > 0 && (
          <Card className="border-yellow-400/60 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/50 dark:via-amber-950/30 dark:to-orange-950/20 shadow-lg shadow-yellow-100/50 dark:shadow-yellow-900/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-yellow-400 to-orange-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <div className="relative">
                  <BellRing className="h-5 w-5 animate-pulse" />
                </div>
                طلبات توصيل جديدة
                <Badge className="bg-yellow-500/90 text-white text-xs font-bold">{assignmentsData.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignmentsData.map((a: any) => (
                <Card key={a.id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur border-yellow-200/50 dark:border-yellow-800/30 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold font-mono text-base">#{a.order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />{a.order.customerCity} - {a.order.customerAddress}
                        </p>
                      </div>
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold px-3 shadow-sm">{formatPrice(a.order.total, "ج.م")}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3 space-y-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2.5">
                      <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-primary/60" />{a.order.customerName}</p>
                      <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-primary/60" /> <span dir="ltr">{a.order.customerPhone}</span></p>
                      {!a.order.isPaid && <Badge variant="outline" className="text-red-500 border-red-300 bg-red-50 dark:bg-red-950/30">غير مدفوع - تحصيل نقدي</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 gap-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm" size="sm"
                        onClick={() => acceptMutation.mutate(a.orderId)}
                        disabled={acceptMutation.isPending}
                      >
                        {acceptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} قبول
                      </Button>
                      <Button variant="destructive" className="flex-1 gap-1.5 shadow-sm" size="sm"
                        onClick={() => { setRejectDialog(a.orderId); setRejectReason(""); }}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-4 w-4" /> رفض
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 h-11 bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-sm border">
            <TabsTrigger value="orders" className="gap-1 text-xs data-[state=active]:shadow-md"><Package className="h-3.5 w-3.5" /> الطلبات</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 text-xs relative data-[state=active]:shadow-md">
              <Bell className="h-3.5 w-3.5" /> الإشعارات
              {unreadCount > 0 && <span className="absolute -top-1 right-1 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center font-bold">{unreadCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1 text-xs data-[state=active]:shadow-md"><FileText className="h-3.5 w-3.5" /> السجلات</TabsTrigger>
            <TabsTrigger value="wallet" className="gap-1 text-xs data-[state=active]:shadow-md"><Wallet className="h-3.5 w-3.5" /> المحفظة</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1 text-xs data-[state=active]:shadow-md"><Shield className="h-3.5 w-3.5" /> حسابي</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-3">
            {/* In-progress orders (need pickup) */}
            {shippedOrders.map(order => (
              <Card key={order.id} className="border-blue-300/60 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-blue-400 to-cyan-500" />
                <CardContent className="pt-4 pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold font-mono text-base">#{order.orderNumber}</p>
                      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-sm mt-1">في انتظار الاستلام</Badge>
                    </div>
                    <div className="text-left">
                      {order.pickupDeadline && (
                        <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg px-2.5 py-1.5 border border-blue-200/50">
                          <p className="text-[10px] text-muted-foreground text-center">وقت الاستلام</p>
                          <CountdownTimer deadline={order.pickupDeadline} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1.5 mb-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2.5">
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />{order.customerCity} - {order.customerAddress}</p>
                    <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-blue-500 shrink-0" />{order.customerName} <Phone className="h-3.5 w-3.5 text-blue-500 mx-1 shrink-0" /><span dir="ltr">{order.customerPhone}</span></p>
                    <p className="font-bold text-base">{formatPrice(order.total, "ج.م")} {!order.isPaid && <Badge variant="outline" className="text-red-500 border-red-300 bg-red-50/50 mr-1 text-[10px]">غير مدفوع</Badge>}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm" size="sm" onClick={() => pickupMutation.mutate(order.id)} disabled={pickupMutation.isPending}>
                      {pickupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} تأكيد الاستلام
                    </Button>
                    <Button variant="outline" size="sm" className="shadow-sm" onClick={() => setOrderDetail(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* In delivery orders (picked up, need to deliver) */}
            {inDelivery.map(order => (
              <Card key={order.id} className="border-purple-300/60 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-purple-400 to-pink-500" />
                <CardContent className="pt-4 pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold font-mono text-base">#{order.orderNumber}</p>
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-sm mt-1">بانتظار كود التأكيد</Badge>
                    </div>
                    <div className="text-left">
                      {order.deliveryDeadline && (
                        <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg px-2.5 py-1.5 border border-purple-200/50">
                          <p className="text-[10px] text-muted-foreground text-center">وقت التوصيل</p>
                          <CountdownTimer deadline={order.deliveryDeadline} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1.5 mb-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2.5">
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-purple-500 shrink-0" />{order.customerCity} - {order.customerAddress}</p>
                    <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-purple-500 shrink-0" />{order.customerName} <Phone className="h-3.5 w-3.5 text-purple-500 mx-1 shrink-0" /><span dir="ltr">{order.customerPhone}</span></p>
                    <p className="font-bold text-base">{formatPrice(order.total, "ج.م")} {!order.isPaid && <Badge variant="outline" className="text-red-500 border-red-300 bg-red-50/50 mr-1 text-[10px]">تحصيل نقدي</Badge>}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm" size="sm"
                      onClick={() => { setConfirmDialog(order); setDeliveryCodeInput(""); setAmountInput(order.total); }}
                    >
                      <CheckCircle2 className="h-4 w-4" /> إدخال كود التأكيد
                    </Button>
                    <Button variant="outline" size="sm" className="shadow-sm" onClick={() => setOrderDetail(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Delivered orders */}
            {deliveredOrders.length > 0 && (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <Separator className="flex-1" />
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> الطلبات المسلمة ({deliveredOrders.length})
                  </span>
                  <Separator className="flex-1" />
                </div>
              </>
            )}
            {deliveredOrders.slice(0, 10).map(order => (
              <Card key={order.id} className="bg-white/60 dark:bg-gray-800/40 border-green-200/30 hover:bg-white dark:hover:bg-gray-800/60 transition-all duration-200">
                <CardContent className="pt-3 pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium">#{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.customerName}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-green-600">{formatPrice(order.total, "ج.م")}</p>
                      <p className="text-[10px] text-green-500">تم التسليم</p>
                    </div>
                  </div>
                  {(order as any).driverCommission && !(order as any).commissionConfirmed && !(order as any).commissionPrepaid && (
                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200/50 flex items-center justify-between">
                      <p className="text-xs">عمولتك النقدية: <span className="font-bold text-orange-600">{formatPrice((order as any).driverCommission, "ج.م")}</span></p>
                      <Button
                        size="sm" variant="outline"
                        className="text-xs h-7 border-orange-300 text-orange-600 hover:bg-orange-100"
                        onClick={() => confirmCommissionMutation.mutate(order.id)}
                        disabled={confirmCommissionMutation.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 ml-1" /> تأكيد الاستلام
                      </Button>
                    </div>
                  )}
                  {(order as any).driverCommission && (order as any).commissionPrepaid && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200/50">
                      <p className="text-xs">عمولة مدفوعة: <span className="font-bold text-green-600">{formatPrice((order as any).driverCommission, "ج.م")}</span> — تمت إضافتها لرصيدك</p>
                    </div>
                  )}
                  {(order as any).driverCommission && (order as any).commissionConfirmed && !(order as any).commissionPrepaid && (
                    <div className="mt-2 text-center">
                      <Badge className="bg-green-100 text-green-700 text-[10px]">✓ تم تأكيد استلام العمولة</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {ordersData.length === 0 && assignmentsData.length === 0 && (
              <div className="text-center py-16">
                <div className="h-20 w-20 rounded-full bg-muted/30 mx-auto flex items-center justify-center mb-4">
                  <Package className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground text-lg font-medium">لا توجد طلبات حالياً</p>
                <p className="text-xs text-muted-foreground mt-1">ستظهر الطلبات الجديدة هنا تلقائياً</p>
              </div>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-2">
            {/* Notification Actions */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : "لا توجد إشعارات جديدة"}
                </p>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost" size="sm" className="text-xs h-7"
                      onClick={() => markReadMutation.mutate()}
                      disabled={markReadMutation.isPending}
                    >
                      <Check className="h-3 w-3 ml-1" />
                      تحديد الكل كمقروء
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive"
                    onClick={() => setConfirmClearNotifs(true)}
                  >
                    <X className="h-3 w-3 ml-1" />
                    حذف الكل
                  </Button>
                </div>
              </div>
            )}

            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-20 w-20 rounded-full bg-muted/20 mx-auto flex items-center justify-center mb-4">
                  <Bell className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground text-lg font-medium">لا توجد إشعارات</p>
                <p className="text-xs text-muted-foreground mt-1">ستظهر إشعاراتك هنا</p>
              </div>
            ) : notifications.map((n: DriverNotification) => (
              <Card key={n.id} className={`group transition-colors ${!n.isRead ? "border-primary/50 bg-primary/5" : "hover:bg-muted/30"}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${n.type === "order_request" ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300" :
                      n.type === "order_accepted" ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300" :
                        n.type === "order_cancelled" ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300" :
                          n.type === "admin_message" ? "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300" :
                            "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                      }`}>
                      {n.type === "order_request" ? <BellRing className="h-4 w-4" /> :
                        n.type === "order_accepted" ? <Check className="h-4 w-4" /> :
                          n.type === "order_cancelled" ? <X className="h-4 w-4" /> :
                            n.type === "admin_message" ? <Bell className="h-4 w-4" /> :
                              <Bell className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{n.title}</p>
                        {!n.isRead && <span className="h-2 w-2 bg-primary rounded-full shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString("ar-EG") : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                      onClick={() => deleteNotifMutation.mutate(n.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Confirm Clear All Notifications Dialog */}
            {confirmClearNotifs && (
              <Dialog open={confirmClearNotifs} onOpenChange={setConfirmClearNotifs}>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>حذف جميع الإشعارات</DialogTitle>
                    <DialogDescription>هل أنت متأكد من حذف جميع الإشعارات؟</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmClearNotifs(false)}>إلغاء</Button>
                    <Button variant="destructive" onClick={() => clearNotifsMutation.mutate()} disabled={clearNotifsMutation.isPending}>
                      {clearNotifsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
                      حذف الكل
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/50 dark:via-emerald-950/30 dark:to-teal-950/20 border-green-200/50 dark:border-green-800/30 shadow-md overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-green-400 to-emerald-500" />
                <CardContent className="pt-5 pb-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 mx-auto mb-2 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600 tabular-nums">{formatPrice(walletData?.balance || "0", "ج.م")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">الرصيد الحالي</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-purple-950/20 border-blue-200/50 dark:border-blue-800/30 shadow-md overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-blue-400 to-indigo-500" />
                <CardContent className="pt-5 pb-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 mx-auto mb-2 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600 tabular-nums">{formatPrice(walletData?.totalEarnings || "0", "ج.م")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">إجمالي الأرباح</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-12 gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-md hover:shadow-lg transition-all" onClick={() => navigate("/driver/wallet")}>
                <Plus className="h-5 w-5" /> إيداع مبلغ
              </Button>
              <Button variant="outline" className="h-12 gap-2 shadow-sm hover:shadow-md transition-all" onClick={() => navigate("/driver/wallet")}>
                <ArrowUpCircle className="h-5 w-5" /> طلب سحب
              </Button>
            </div>

            <Card className="border-blue-200/50 dark:border-blue-800/30 bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-950/30 dark:to-purple-950/30 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="font-medium mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> كيف تزيد أرباحك؟</p>
                <ul className="list-none text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">●</span> قم بإيداع مبلغ مالي في محفظتك</li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">●</span> يجب أن يكون رصيدك أعلى من قيمة الشحنة ليتم ترشيحك</li>
                  <li className="flex items-start gap-1.5"><span className="text-green-500 mt-0.5">●</span> وثّق حسابك بالهوية الوطنية لزيادة نسبة عمولتك</li>
                  <li className="flex items-start gap-1.5"><span className="text-purple-500 mt-0.5">●</span> وثّق حسابك بفيش جنائي نظيف للحصول على أعلى عمولة</li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs font-bold text-muted-foreground shrink-0">آخر المعاملات</span>
              <Separator className="flex-1" />
            </div>
            {(walletData?.transactions || []).length === 0 ? (
              <div className="text-center py-8">
                <div className="h-14 w-14 rounded-full bg-muted/30 mx-auto flex items-center justify-center mb-3">
                  <Wallet className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground text-sm">لا توجد معاملات</p>
              </div>
            ) : (walletData?.transactions || []).slice(0, 20).map((t: any) => (
              <Card key={t.id} className="hover:shadow-sm transition-all duration-200">
                <CardContent className="pt-3 pb-3 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${parseFloat(t.amount) >= 0
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                      {parseFloat(t.amount) >= 0
                        ? <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        : <ArrowUpCircle className="h-4 w-4 text-red-500" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.description}</p>
                      <p className="text-[10px] text-muted-foreground">{t.createdAt ? new Date(t.createdAt).toLocaleString("ar-EG") : ""}</p>
                    </div>
                  </div>
                  <p className={`font-bold tabular-nums ${parseFloat(t.amount) >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {parseFloat(t.amount) >= 0 ? "+" : ""}{formatPrice(t.amount, "ج.م")}
                  </p>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="w-full gap-2 h-11 shadow-sm hover:shadow-md transition-all" onClick={() => navigate("/driver/wallet")}>
              <Wallet className="h-4 w-4" /> فتح المحفظة الكاملة <ArrowRight className="h-4 w-4 mr-auto" />
            </Button>
          </TabsContent>

          {/* Operations Log Tab */}
          <TabsContent value="logs" className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الطلب، اسم العميل، أو الوصف..."
                value={opsSearch}
                onChange={(e) => setOpsSearch(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-2">
              <Select value={opsType} onValueChange={setOpsType}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  <SelectItem value="delivery">توصيل</SelectItem>
                  <SelectItem value="commission">عمولة</SelectItem>
                  <SelectItem value="deposit">إيداع</SelectItem>
                  <SelectItem value="withdrawal">سحب</SelectItem>
                  <SelectItem value="referral_bonus">مكافأة إحالة</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={opsDateFrom}
                onChange={(e) => setOpsDateFrom(e.target.value)}
                className="text-xs"
                placeholder="من"
              />
              <Input
                type="date"
                value={opsDateTo}
                onChange={(e) => setOpsDateTo(e.target.value)}
                className="text-xs"
                placeholder="إلى"
              />
            </div>

            {(opsSearch || opsType !== "all" || opsDateFrom || opsDateTo) && (
              <Button variant="ghost" size="sm" className="text-xs text-red-500 gap-1" onClick={() => {
                setOpsSearch(""); setOpsType("all"); setOpsDateFrom(""); setOpsDateTo(""); setOpsPage(1);
              }}>
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}

            {/* Results count */}
            <p className="text-xs text-muted-foreground">
              {(opsData?.total || 0) > 0
                ? `عرض ${((opsPage - 1) * opsLimit) + 1} - ${Math.min(opsPage * opsLimit, opsData?.total || 0)} من ${opsData?.total} عملية`
                : "لا توجد عمليات"}
            </p>

            {/* Operations List */}
            {opsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (opsData?.logs || []).length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد عمليات مسجلة</p>
                <p className="text-xs text-muted-foreground">ستظهر هنا جميع عملياتك المكتملة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(opsData?.logs || []).map((log: any) => {
                  const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
                    delivery: { label: "توصيل", color: "bg-green-500", icon: Package },
                    commission: { label: "عمولة", color: "bg-blue-500", icon: TrendingUp },
                    deposit: { label: "إيداع", color: "bg-emerald-500", icon: ArrowDownCircle },
                    withdrawal: { label: "سحب", color: "bg-orange-500", icon: ArrowUpCircle },
                    referral_bonus: { label: "مكافأة", color: "bg-purple-500", icon: Gift },
                    driver_assigned: { label: "تعيين", color: "bg-cyan-500", icon: Truck },
                  };
                  const config = typeConfig[log.type] || { label: log.type, color: "bg-gray-500", icon: FileText };
                  const Icon = config.icon;
                  return (
                    <Card key={log.id}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-start gap-3">
                          <div className={`${config.color} text-white rounded-full p-2 mt-0.5`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge className={`${config.color} text-[10px] px-1.5 py-0`}>{config.label}</Badge>
                              {log.orderNumber && <span className="font-mono text-[10px] text-muted-foreground">#{log.orderNumber}</span>}
                            </div>
                            <p className="text-sm truncate">{log.description}</p>
                            {log.customerName && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                <User className="h-2.5 w-2.5 inline ml-0.5" />{log.customerName}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              <Clock className="h-2.5 w-2.5 inline ml-0.5" />
                              {new Date(log.createdAt).toLocaleString("ar-EG", {
                                year: "numeric", month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="text-left shrink-0">
                            {log.amount && (
                              <p className={`font-bold text-sm ${parseFloat(log.amount) < 0 ? "text-red-500" : "text-green-600"}`}>
                                {parseFloat(log.amount) > 0 ? "+" : ""}{formatPrice(log.amount, "ج.م")}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {(opsData?.total || 0) > opsLimit && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={opsPage <= 1} onClick={() => setOpsPage(opsPage - 1)} className="text-xs">
                  السابق
                </Button>
                <span className="text-xs text-muted-foreground">
                  {opsPage} / {Math.ceil((opsData?.total || 0) / opsLimit)}
                </span>
                <Button variant="outline" size="sm" disabled={opsPage >= Math.ceil((opsData?.total || 0) / opsLimit)} onClick={() => setOpsPage(opsPage + 1)} className="text-xs">
                  التالي
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            {/* Full Verification Badge */}
            {driver?.fullyVerified && (
              <Card className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/30 dark:to-teal-950/20 border-emerald-300/50 shadow-lg shadow-emerald-100/50 dark:shadow-emerald-900/20 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-emerald-400 to-green-500" />
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
                      <BadgeCheck className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-emerald-700 dark:text-emerald-300">حساب موثق بالكامل</p>
                      <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">تم التحقق من جميع بياناتك بنجاح ✓</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rating Display */}
            {parseFloat(driver?.averageRating || "0") > 0 && (
              <Card className="shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-yellow-400 to-amber-500" />
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/50 dark:to-amber-900/50 flex items-center justify-center">
                        <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">تقييمك</p>
                        <p className="text-xs text-muted-foreground">{driver?.totalRatings} تقييم من العملاء</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-3xl font-bold text-yellow-600 tabular-nums">{parseFloat(driver?.averageRating).toFixed(1)}</span>
                      <div className="flex items-center gap-0.5 justify-center mt-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`h-3 w-3 ${i <= Math.round(parseFloat(driver?.averageRating || "0")) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {ratingsData.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-36 overflow-y-auto">
                      {ratingsData.slice(0, 5).map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900/30 rounded-lg p-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium">{r.customerName || "عميل"}</span>
                              {r.comment && <p className="text-muted-foreground text-[10px] mt-0.5">{r.comment}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} className={`h-2.5 w-2.5 ${i <= parseFloat(r.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Vehicle Type */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">نوع المركبة</p>
                      <p className="text-xs text-muted-foreground">حدد نوع المركبة التي تستخدمها</p>
                    </div>
                  </div>
                </div>
                <Select value={driver?.vehicleType || ""} onValueChange={(val) => updateVehicleTypeMutation.mutate(val)}>
                  <SelectTrigger className="shadow-sm">
                    <SelectValue placeholder="اختر نوع المركبة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="دراجة نارية">🏍️ دراجة نارية</SelectItem>
                    <SelectItem value="سيارة">🚗 سيارة</SelectItem>
                    <SelectItem value="توك توك">🛺 توك توك</SelectItem>
                    <SelectItem value="ميكروباص">🚐 ميكروباص</SelectItem>
                    <SelectItem value="نقل">🚛 نقل</SelectItem>
                    <SelectItem value="دراجة هوائية">🚲 دراجة هوائية</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Max Weight */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
                      <Weight className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">أقصى وزن للشحن</p>
                      <p className="text-xs text-muted-foreground">حدد أقصى وزن يمكنك نقله</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg tabular-nums">{driver?.maxWeight ? `${driver.maxWeight} كجم` : "غير محدد"}</span>
                    <Button size="sm" variant="outline" className="shadow-sm" onClick={() => { setMaxWeightInput(driver?.maxWeight || ""); setMaxWeightDialog(true); }}>
                      تعديل
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Section */}
            <Card className="shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-indigo-400 to-purple-500" />
              <CardContent className="pt-5 pb-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold">توثيق الحساب</h3>
                    <p className="text-xs text-muted-foreground">وثّق حسابك لزيادة نسبة عمولتك على كل شحنة</p>
                  </div>
                </div>

                {/* National ID */}
                <div className="border rounded-xl p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <IdCard className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-medium text-sm">الهوية الوطنية المصرية</span>
                    </div>
                    {driver?.idVerified ? (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm">موثق ✓</Badge>
                    ) : (driver?.nationalIdImage && driver?.nationalIdImageBack) ? (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-sm animate-pulse">قيد المراجعة</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">غير مرفق</Badge>
                    )}
                  </div>
                  {/* Front */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">الوجه الأمامي</p>
                    {driver?.nationalIdImage && (
                      <div className="rounded-md overflow-hidden border">
                        <img src={driver.nationalIdImage} alt="" className="w-full h-32 object-contain bg-gray-50" />
                      </div>
                    )}
                    {!driver?.idVerified && (
                      <Button size="sm" variant="outline" className="gap-1 w-full"
                        onClick={() => nationalIdInputRef.current?.click()}
                        disabled={uploadNationalIdMutation.isPending}>
                        {uploadNationalIdMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        {driver?.nationalIdImage ? "إعادة رفع الوجه الأمامي" : "رفع الوجه الأمامي"}
                      </Button>
                    )}
                  </div>
                  {/* Back */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">الوجه الخلفي</p>
                    {driver?.nationalIdImageBack && (
                      <div className="rounded-md overflow-hidden border">
                        <img src={driver.nationalIdImageBack} alt="" className="w-full h-32 object-contain bg-gray-50" />
                      </div>
                    )}
                    {!driver?.idVerified && (
                      <Button size="sm" variant="outline" className="gap-1 w-full"
                        onClick={() => nationalIdBackInputRef.current?.click()}
                        disabled={uploadNationalIdBackMutation.isPending}>
                        {uploadNationalIdBackMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        {driver?.nationalIdImageBack ? "إعادة رفع الوجه الخلفي" : "رفع الوجه الخلفي"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Criminal Record */}
                <div className="border rounded-xl p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <FileCheck className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="font-medium text-sm">الفيش الجنائي النظيف</span>
                    </div>
                    {driver?.criminalRecordVerified ? (
                      <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm">موثق ✓</Badge>
                    ) : (driver?.criminalRecordImage && driver?.criminalRecordImageBack) ? (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-sm animate-pulse">قيد المراجعة</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">غير مرفق</Badge>
                    )}
                  </div>
                  {/* Front */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">الوجه الأمامي</p>
                    {driver?.criminalRecordImage && (
                      <div className="rounded-md overflow-hidden border">
                        <img src={driver.criminalRecordImage} alt="" className="w-full h-32 object-contain bg-gray-50" />
                      </div>
                    )}
                    {!driver?.criminalRecordVerified && (
                      <Button size="sm" variant="outline" className="gap-1 w-full"
                        onClick={() => criminalRecordInputRef.current?.click()}
                        disabled={uploadCriminalRecordMutation.isPending}>
                        {uploadCriminalRecordMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        {driver?.criminalRecordImage ? "إعادة رفع الوجه الأمامي" : "رفع الوجه الأمامي"}
                      </Button>
                    )}
                  </div>
                  {/* Back */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">الوجه الخلفي</p>
                    {driver?.criminalRecordImageBack && (
                      <div className="rounded-md overflow-hidden border">
                        <img src={driver.criminalRecordImageBack} alt="" className="w-full h-32 object-contain bg-gray-50" />
                      </div>
                    )}
                    {!driver?.criminalRecordVerified && (
                      <Button size="sm" variant="outline" className="gap-1 w-full"
                        onClick={() => criminalRecordBackInputRef.current?.click()}
                        disabled={uploadCriminalRecordBackMutation.isPending}>
                        {uploadCriminalRecordBackMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        {driver?.criminalRecordImageBack ? "إعادة رفع الوجه الخلفي" : "رفع الوجه الخلفي"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Info box */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-xl p-4 text-xs space-y-2 border border-blue-200/30">
                  <p className="font-bold text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-500" /> مستويات العمولة:</p>
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-gray-400 shrink-0" /> عمولة أساسية: بدون توثيق</p>
                    <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500 shrink-0" /> عمولة أعلى: بعد توثيق الهوية الوطنية</p>
                    <p className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium"><span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" /> أعلى عمولة: بعد توثيق الفيش الجنائي النظيف</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Info */}
            {driver?.governorate && (
              <Card className="shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الموقع</p>
                      <p className="font-medium">{driver.governorate}{driver.city ? ` - ${driver.city}` : ""}{driver.village ? ` - ${driver.village}` : ""}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Referral Section */}
            {referralData?.referralCode && (
              <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-purple-950/20 border-blue-300/50 shadow-lg shadow-blue-100/50 dark:shadow-blue-900/20 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-blue-400 to-indigo-500" />
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <Share2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">رابط الإحالة</p>
                      <p className="text-xs text-muted-foreground">شارك الرابط لدعوة مندوبين جدد واحصل على مكافآت</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl p-2.5 border shadow-sm">
                    <Input
                      value={`${window.location.origin}/driver/register?ref=${referralData.referralCode}`}
                      readOnly
                      dir="ltr"
                      className="text-xs border-0 bg-transparent shadow-none"
                    />
                    <Button size="sm" variant={copiedReferral ? "default" : "outline"} className={`shrink-0 gap-1.5 shadow-sm ${copiedReferral ? "bg-green-500 hover:bg-green-600" : ""}`}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/driver/register?ref=${referralData.referralCode}`);
                        setCopiedReferral(true);
                        setTimeout(() => setCopiedReferral(false), 2000);
                      }}>
                      {copiedReferral ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedReferral ? "تم النسخ!" : "نسخ"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 bg-white/50 dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-all"
                      onClick={() => {
                        const url = `${window.location.origin}/driver/register?ref=${referralData.referralCode}`;
                        const text = `انضم كمندوب شحن واكسب من توصيل الطلبات! سجل الآن:`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, '_blank');
                      }}>
                      <Share2 className="h-3 w-3 text-green-600" /> واتساب
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 bg-white/50 dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-all"
                      onClick={() => {
                        const url = `${window.location.origin}/driver/register?ref=${referralData.referralCode}`;
                        const text = `انضم كمندوب شحن واكسب من توصيل الطلبات!`;
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
                      }}>
                      <Share2 className="h-3 w-3 text-blue-600" /> فيسبوك
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur rounded-xl p-3 shadow-sm">
                      <p className="text-xl font-bold text-blue-600 tabular-nums">{referralData.totalReferrals}</p>
                      <p className="text-[10px] text-muted-foreground">إجمالي الإحالات</p>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur rounded-xl p-3 shadow-sm">
                      <p className="text-xl font-bold text-green-600 tabular-nums">{referralData.approvedReferrals}</p>
                      <p className="text-[10px] text-muted-foreground">إحالات معتمدة</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden file inputs */}
      <input type="file" ref={nationalIdInputRef} accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadNationalIdMutation.mutate(f); e.target.value = ""; }} />
      <input type="file" ref={nationalIdBackInputRef} accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadNationalIdBackMutation.mutate(f); e.target.value = ""; }} />
      <input type="file" ref={criminalRecordInputRef} accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCriminalRecordMutation.mutate(f); e.target.value = ""; }} />
      <input type="file" ref={criminalRecordBackInputRef} accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCriminalRecordBackMutation.mutate(f); e.target.value = ""; }} />

      {/* Reject Order Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب التوصيل</DialogTitle>
            <DialogDescription>يرجى كتابة سبب رفض الشحنة</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label>سبب الرفض</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: المسافة بعيدة جداً، الوزن أكبر من المسموح، لا أستطيع التوصيل في هذا الوقت..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialog && rejectMutation.mutate({ orderId: rejectDialog, reason: rejectReason })}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="gap-1"
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Max Weight Dialog */}
      <Dialog open={maxWeightDialog} onOpenChange={setMaxWeightDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديد أقصى وزن للشحن</DialogTitle>
            <DialogDescription>حدد أقصى وزن بالكيلوجرام يمكنك نقله</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>الوزن بالكيلوجرام</Label>
              <Input
                value={maxWeightInput}
                onChange={(e) => setMaxWeightInput(e.target.value)}
                placeholder="مثال: 25"
                type="number"
                min="1"
                dir="ltr"
                className="text-center text-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaxWeightDialog(false)}>إلغاء</Button>
            <Button
              onClick={() => updateMaxWeightMutation.mutate(maxWeightInput)}
              disabled={!maxWeightInput || parseFloat(maxWeightInput) <= 0 || updateMaxWeightMutation.isPending}
              className="gap-1"
            >
              {updateMaxWeightMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Weight className="h-4 w-4" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delivery Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          {confirmDialog && (
            <>
              <DialogHeader>
                <DialogTitle>تأكيد التسليم - #{confirmDialog.orderNumber}</DialogTitle>
                <DialogDescription>أدخل كود التأكيد الذي حصلت عليه من العميل</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">كود التأكيد (6 أرقام)</label>
                  <Input
                    value={deliveryCodeInput}
                    onChange={(e) => setDeliveryCodeInput(e.target.value)}
                    placeholder="أدخل كود التأكيد من العميل"
                    dir="ltr"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                {(confirmDialog as any).driverCommission && (
                  <div className={`p-3 ${(confirmDialog as any).commissionPrepaid ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'} border rounded-lg`}>
                    <p className="text-sm font-medium">
                      {(confirmDialog as any).commissionPrepaid ? 'عمولة مدفوعة: ' : 'عمولتك النقدية: '}
                      <span className={`font-bold ${(confirmDialog as any).commissionPrepaid ? 'text-green-600' : 'text-orange-600'}`}>{formatPrice((confirmDialog as any).driverCommission, "ج.م")}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(confirmDialog as any).commissionPrepaid ? 'ستضاف لرصيدك تلقائياً بعد التسليم' : 'تحصل عليها نقداً من العميل عند التسليم'}
                    </p>
                  </div>
                )}
                {!confirmDialog.isPaid && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-red-600">المبلغ المحصل نقداً</label>
                    <Input
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="المبلغ"
                      dir="ltr"
                      type="number"
                    />
                    <p className="text-xs text-muted-foreground">إجمالي الطلب: {formatPrice(confirmDialog.total, "ج.م")}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDialog(null)}>إلغاء</Button>
                <Button
                  onClick={() => confirmMutation.mutate({
                    id: confirmDialog.id,
                    deliveryCode: deliveryCodeInput,
                    amountCollected: !confirmDialog.isPaid ? amountInput : undefined,
                  })}
                  disabled={deliveryCodeInput.length !== 6 || confirmMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" /> تأكيد التسليم
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!orderDetail} onOpenChange={() => setOrderDetail(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {orderDetail && (
            <>
              <DialogHeader><DialogTitle>تفاصيل الطلب #{orderDetail.orderNumber}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p><strong>العميل:</strong> {orderDetail.customerName}</p>
                  <p><strong>الهاتف:</strong> {orderDetail.customerPhone}</p>
                  <p><strong>المدينة:</strong> {orderDetail.customerCity}</p>
                  <p><strong>العنوان:</strong> {orderDetail.customerAddress}</p>
                  {orderDetail.customerNotes && <p><strong>ملاحظات:</strong> {orderDetail.customerNotes}</p>}
                </div>
                <Separator />
                <div className="space-y-2">
                  {(orderDetail.items as any[]).map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.productName} × {item.quantity}</span>
                      <span className="font-bold">{formatPrice(item.total, "ج.م")}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>الإجمالي:</span>
                  <span className="text-primary">{formatPrice(orderDetail.total, "ج.م")}</span>
                </div>
                {!orderDetail.isPaid && <Badge variant="outline" className="text-red-500 border-red-300">الطلب غير مدفوع - تحصيل نقدي عند التسليم</Badge>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Global Search */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} mode="driver" />
    </div>
  );
}
