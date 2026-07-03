import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bell, BellRing, Trash2, Send, Users, User, Search,
  ShoppingCart, UserPlus, ArrowDownCircle, ArrowUpCircle,
  CheckCircle2, MessageSquare, Filter, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
};

type Driver = {
  id: string;
  name: string;
  username: string;
  phone?: string;
  isActive: boolean;
};

const NOTIFICATION_TYPES = [
  { value: "all", label: "الكل" },
  { value: "new_order", label: "طلبات جديدة" },
  { value: "driver_registration", label: "تسجيل مندوبين" },
  { value: "deposit_request", label: "طلبات إيداع" },
  { value: "withdrawal_request", label: "طلبات سحب" },
  { value: "referral", label: "إحالات" },
];

function getNotifIcon(type: string) {
  switch (type) {
    case "new_order": return <ShoppingCart className="h-5 w-5 text-green-500" />;
    case "driver_registration": return <UserPlus className="h-5 w-5 text-blue-500" />;
    case "deposit_request": return <ArrowDownCircle className="h-5 w-5 text-purple-500" />;
    case "withdrawal_request": return <ArrowUpCircle className="h-5 w-5 text-orange-500" />;
    case "referral": return <Users className="h-5 w-5 text-indigo-500" />;
    default: return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

function getNotifTypeLabel(type: string) {
  switch (type) {
    case "new_order": return "طلب جديد";
    case "driver_registration": return "تسجيل مندوب";
    case "deposit_request": return "طلب إيداع";
    case "withdrawal_request": return "طلب سحب";
    case "referral": return "إحالة";
    default: return "عام";
  }
}

function getNotifBadgeColor(type: string) {
  switch (type) {
    case "new_order": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "driver_registration": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "deposit_request": return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
    case "withdrawal_request": return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    case "referral": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-EG");
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendDialog, setSendDialog] = useState(false);
  const [sendTitle, setSendTitle] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [driverSearch, setDriverSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: notifData, isLoading } = useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ["/api/admin/notifications"],
    refetchInterval: 10000,
  });

  const { data: driversData = [] } = useQuery<Driver[]>({
    queryKey: ["/api/admin/drivers"],
    enabled: sendDialog,
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/notifications/read"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] }),
  });

  const deleteNotifMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "تم حذف الإشعار" });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/admin/notifications"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "تم حذف جميع الإشعارات" });
      setConfirmClear(false);
    },
  });

  const sendNotifMutation = useMutation({
    mutationFn: (data: { title: string; message: string; driverIds?: string[]; sendToAll?: boolean }) =>
      apiRequest("POST", "/api/admin/notifications/send", data),
    onSuccess: () => {
      toast({ title: "تم إرسال الإشعار بنجاح" });
      setSendDialog(false);
      setSendTitle("");
      setSendMessage("");
      setSendToAll(true);
      setSelectedDrivers([]);
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  function getNotifRoute(type: string): string {
    switch (type) {
      case "new_order": return "/admin/orders";
      case "driver_registration":
      case "driver_login_verification":
      case "referral": return "/admin/drivers";
      case "deposit_request":
      case "withdrawal_request": return "/admin/drivers";
      default: return "";
    }
  }

  function handleNotifClick(n: Notification) {
    const route = getNotifRoute(n.type);
    if (route) navigate(route);
  }

  // Filter notifications
  const filtered = notifications.filter(n => {
    if (filterType !== "all" && n.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredDrivers = driversData.filter(d => {
    if (!driverSearch) return true;
    const q = driverSearch.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.username.toLowerCase().includes(q) || (d.phone || "").includes(q);
  });

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-7 w-7 text-primary" />
              مركز الإشعارات
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              إدارة جميع الإشعارات وإرسال رسائل للمندوبين
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markReadMutation.mutate()}
                disabled={markReadMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4 ml-1" />
                تحديد الكل كمقروء ({unreadCount})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmClear(true)}
              disabled={notifications.length === 0}
            >
              <Trash2 className="h-4 w-4 ml-1" />
              حذف الكل
            </Button>
            <Button size="sm" onClick={() => setSendDialog(true)}>
              <Send className="h-4 w-4 ml-1" />
              إرسال إشعار
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <BellRing className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{notifications.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي الإشعارات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Bell className="h-6 w-6 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-red-500">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">غير مقروءة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <ShoppingCart className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{notifications.filter(n => n.type === "new_order").length}</p>
              <p className="text-xs text-muted-foreground">طلبات جديدة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <UserPlus className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{notifications.filter(n => n.type === "driver_registration").length}</p>
              <p className="text-xs text-muted-foreground">تسجيل مندوبين</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في الإشعارات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 ml-1" />
              <SelectValue placeholder="فلتر حسب النوع" />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-lg">لا توجد إشعارات</p>
                <p className="text-muted-foreground text-sm mt-1">ستظهر الإشعارات هنا عند وصولها</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors group cursor-pointer ${!n.isRead ? "bg-primary/5 border-r-4 border-r-primary" : ""}`}
                    onClick={() => handleNotifClick(n)}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {getNotifIcon(n.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm">{n.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getNotifBadgeColor(n.type)}`}>
                          {getNotifTypeLabel(n.type)}
                        </span>
                        {!n.isRead && (
                          <span className="h-2 w-2 bg-primary rounded-full shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteNotifMutation.mutate(n.id); }}
                      disabled={deleteNotifMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Notification Dialog */}
        <Dialog open={sendDialog} onOpenChange={setSendDialog}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                إرسال إشعار للمندوبين
              </DialogTitle>
              <DialogDescription>
                أرسل إشعار مخصص لمندوب واحد أو لجميع المندوبين
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label>عنوان الإشعار</Label>
                <Input
                  value={sendTitle}
                  onChange={e => setSendTitle(e.target.value)}
                  placeholder="مثال: تحديث مهم..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label>نص الرسالة</Label>
                <Textarea
                  value={sendMessage}
                  onChange={e => setSendMessage(e.target.value)}
                  placeholder="اكتب رسالة الإشعار هنا..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendToAll"
                  checked={sendToAll}
                  onCheckedChange={(v) => {
                    setSendToAll(!!v);
                    if (v) setSelectedDrivers([]);
                  }}
                />
                <Label htmlFor="sendToAll" className="cursor-pointer flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  إرسال لجميع المندوبين
                </Label>
              </div>

              {!sendToAll && (
                <div className="space-y-2">
                  <Label>اختر المندوبين</Label>
                  <Input
                    placeholder="بحث عن مندوب..."
                    value={driverSearch}
                    onChange={e => setDriverSearch(e.target.value)}
                    className="mb-2"
                  />
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    {filteredDrivers.map(d => (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setSelectedDrivers(prev =>
                            prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]
                          );
                        }}
                      >
                        <Checkbox checked={selectedDrivers.includes(d.id)} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.username} {d.phone ? `• ${d.phone}` : ""}</p>
                        </div>
                      </div>
                    ))}
                    {filteredDrivers.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-4">لا يوجد مندوبين</p>
                    )}
                  </ScrollArea>
                  {selectedDrivers.length > 0 && (
                    <p className="text-xs text-muted-foreground">تم تحديد {selectedDrivers.length} مندوب</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setSendDialog(false)}>إلغاء</Button>
              <Button
                onClick={() => sendNotifMutation.mutate({
                  title: sendTitle,
                  message: sendMessage,
                  sendToAll,
                  driverIds: sendToAll ? undefined : selectedDrivers,
                })}
                disabled={!sendTitle.trim() || !sendMessage.trim() || (!sendToAll && selectedDrivers.length === 0) || sendNotifMutation.isPending}
              >
                {sendNotifMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Send className="h-4 w-4 ml-1" />}
                إرسال
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Clear Dialog */}
        <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>حذف جميع الإشعارات</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف جميع الإشعارات؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmClear(false)}>إلغاء</Button>
              <Button
                variant="destructive"
                onClick={() => clearAllMutation.mutate()}
                disabled={clearAllMutation.isPending}
              >
                {clearAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Trash2 className="h-4 w-4 ml-1" />}
                حذف الكل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
