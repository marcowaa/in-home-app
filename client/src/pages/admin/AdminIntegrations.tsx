import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Key,
  Webhook,
  FileText,
  Settings2,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Send,
  Shield,
  Globe,
  Zap,
  Code2,
  BookOpen,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";

export default function AdminIntegrations() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("api-keys");
  
  // Dialogs
  const [keyDialog, setKeyDialog] = useState(false);
  const [webhookDialog, setWebhookDialog] = useState(false);
  const [logDetailDialog, setLogDetailDialog] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<any>(null);
  const [editingWebhook, setEditingWebhook] = useState<any>(null);
  const [showSecretFor, setShowSecretFor] = useState<string | null>(null);
  const [webhookLogsDialog, setWebhookLogsDialog] = useState<string | null>(null);

  // Forms
  const [keyForm, setKeyForm] = useState({
    name: "",
    permissions: [] as string[],
    rateLimit: "100",
    ipWhitelist: "",
    expiresAt: "",
  });

  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
    secret: "",
    maxRetries: "3",
  });

  // Queries
  const { data: apiKeysData = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/api-keys"],
  });

  const { data: webhooksData = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/webhooks"],
  });

  const { data: apiLogsData = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/api-logs"],
  });

  const { data: logStats } = useQuery<any>({
    queryKey: ["/api/admin/api-logs/stats"],
  });

  const { data: meta } = useQuery<any>({
    queryKey: ["/api/admin/integration-meta"],
  });

  const { data: webhookLogsData = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/webhook-logs", webhookLogsDialog],
    enabled: !!webhookLogsDialog,
    queryFn: () => fetch(`/api/admin/webhook-logs?webhookId=${webhookLogsDialog}`, { credentials: "include" }).then(r => r.json()),
  });

  const permissions = meta?.permissions || [];
  const permissionLabels = meta?.permissionLabels || {};
  const webhookEvents = meta?.webhookEvents || [];
  const webhookEventLabels = meta?.webhookEventLabels || {};

  // Mutations
  const createKeyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/api-keys", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      setKeyDialog(false);
      toast({ title: "تم إنشاء مفتاح API بنجاح" });
    },
  });

  const updateKeyMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/api-keys/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      setKeyDialog(false);
      toast({ title: "تم تحديث المفتاح" });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({ title: "تم حذف المفتاح" });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/api-keys/${id}/regenerate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({ title: "تم إعادة إنشاء المفتاح" });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/webhooks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webhooks"] });
      setWebhookDialog(false);
      toast({ title: "تم إنشاء Webhook بنجاح" });
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/webhooks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webhooks"] });
      setWebhookDialog(false);
      toast({ title: "تم تحديث Webhook" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webhooks"] });
      toast({ title: "تم حذف Webhook" });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/webhooks/${id}/test`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webhooks"] });
      if (data.success) {
        toast({ title: "نجح الاختبار", description: `الحالة: ${data.status} - ${data.duration}ms` });
      } else {
        toast({ title: "فشل الاختبار", description: data.error || `HTTP ${data.status}`, variant: "destructive" });
      }
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/admin/api-logs"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-logs/stats"] });
      toast({ title: "تم مسح السجلات" });
    },
  });

  // Helpers
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  const openNewKey = () => {
    setEditingKey(null);
    setKeyForm({ name: "", permissions: [], rateLimit: "100", ipWhitelist: "", expiresAt: "" });
    setKeyDialog(true);
  };

  const openEditKey = (key: any) => {
    setEditingKey(key);
    setKeyForm({
      name: key.name,
      permissions: key.permissions || [],
      rateLimit: String(key.rateLimit || 100),
      ipWhitelist: key.ipWhitelist || "",
      expiresAt: key.expiresAt ? new Date(key.expiresAt).toISOString().slice(0, 10) : "",
    });
    setKeyDialog(true);
  };

  const openNewWebhook = () => {
    setEditingWebhook(null);
    setWebhookForm({ name: "", url: "", events: [], secret: "", maxRetries: "3" });
    setWebhookDialog(true);
  };

  const openEditWebhook = (wh: any) => {
    setEditingWebhook(wh);
    setWebhookForm({
      name: wh.name,
      url: wh.url,
      events: wh.events || [],
      secret: wh.secret || "",
      maxRetries: String(wh.maxRetries || 3),
    });
    setWebhookDialog(true);
  };

  const handleSaveKey = () => {
    const data = {
      name: keyForm.name,
      permissions: keyForm.permissions,
      rateLimit: parseInt(keyForm.rateLimit) || 100,
      ipWhitelist: keyForm.ipWhitelist,
      expiresAt: keyForm.expiresAt || null,
    };
    if (editingKey) {
      updateKeyMutation.mutate({ id: editingKey.id, data });
    } else {
      createKeyMutation.mutate(data);
    }
  };

  const handleSaveWebhook = () => {
    const data = {
      name: webhookForm.name,
      url: webhookForm.url,
      events: webhookForm.events,
      secret: webhookForm.secret,
      maxRetries: parseInt(webhookForm.maxRetries) || 3,
    };
    if (editingWebhook) {
      updateWebhookMutation.mutate({ id: editingWebhook.id, data });
    } else {
      createWebhookMutation.mutate(data);
    }
  };

  const togglePermission = (perm: string) => {
    setKeyForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const toggleEvent = (evt: string) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(evt)
        ? prev.events.filter(e => e !== evt)
        : [...prev.events, evt],
    }));
  };

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) return <Badge className="bg-green-100 text-green-700">{code}</Badge>;
    if (code >= 400 && code < 500) return <Badge className="bg-yellow-100 text-yellow-700">{code}</Badge>;
    if (code >= 500) return <Badge className="bg-red-100 text-red-700">{code}</Badge>;
    return <Badge variant="secondary">{code || "N/A"}</Badge>;
  };

  const baseUrl = window.location.origin;

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-7 w-7 text-primary" />
              التكاملات و API
            </h1>
            <p className="text-muted-foreground mt-1">إدارة مفاتيح API والـ Webhooks لدمج النظام مع التطبيقات والمتاجر</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Key className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{apiKeysData.length}</p>
                <p className="text-xs text-muted-foreground">مفاتيح API</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><Webhook className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{webhooksData.length}</p>
                <p className="text-xs text-muted-foreground">Webhooks</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><Activity className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{logStats?.today || 0}</p>
                <p className="text-xs text-muted-foreground">طلبات اليوم</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold">{logStats?.errors || 0}</p>
                <p className="text-xs text-muted-foreground">أخطاء</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="api-keys" className="text-xs sm:text-sm">
              <Key className="h-4 w-4 ml-1 hidden sm:inline" />
              مفاتيح API
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs sm:text-sm">
              <Webhook className="h-4 w-4 ml-1 hidden sm:inline" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 ml-1 hidden sm:inline" />
              السجلات
            </TabsTrigger>
            <TabsTrigger value="docs" className="text-xs sm:text-sm">
              <BookOpen className="h-4 w-4 ml-1 hidden sm:inline" />
              التوثيق
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">
              <Settings2 className="h-4 w-4 ml-1 hidden sm:inline" />
              إعدادات
            </TabsTrigger>
          </TabsList>

          {/* ==================== API Keys Tab ==================== */}
          <TabsContent value="api-keys" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">مفاتيح API</h2>
              <Button onClick={openNewKey} size="sm">
                <Plus className="h-4 w-4 ml-1" />
                مفتاح جديد
              </Button>
            </div>

            {apiKeysData.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">لا توجد مفاتيح API</h3>
                  <p className="text-sm text-muted-foreground mb-4">أنشئ مفتاح API لربط النظام مع تطبيقك أو متجرك</p>
                  <Button onClick={openNewKey}>
                    <Plus className="h-4 w-4 ml-1" />
                    إنشاء مفتاح
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {apiKeysData.map((key: any) => (
                  <Card key={key.id} className={!key.isActive ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{key.name}</h3>
                            {key.isActive ? (
                              <Badge className="bg-green-100 text-green-700">نشط</Badge>
                            ) : (
                              <Badge variant="secondary">معطل</Badge>
                            )}
                          </div>
                          
                          {/* API Key display */}
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono" dir="ltr">
                              {showSecretFor === key.id ? key.apiKey : key.apiKey.substring(0, 12) + "••••••••"}
                            </code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSecretFor(showSecretFor === key.id ? null : key.id)}>
                              {showSecretFor === key.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(key.apiKey)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Meta info */}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {(key.permissions || []).length} صلاحية
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {key.totalRequests || 0} طلب
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              {key.rateLimit || 100}/دقيقة
                            </span>
                            {key.lastUsedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                آخر استخدام: {new Date(key.lastUsedAt).toLocaleDateString("ar-EG")}
                              </span>
                            )}
                            {key.expiresAt && (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                ينتهي: {new Date(key.expiresAt).toLocaleDateString("ar-EG")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditKey(key)} title="تعديل">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" 
                            onClick={() => { if (confirm("إعادة إنشاء المفتاح ستبطل المفتاح القديم. متأكد؟")) regenerateKeyMutation.mutate(key.id); }}
                            title="إعادة إنشاء"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={key.isActive}
                            onCheckedChange={(active) => updateKeyMutation.mutate({ id: key.id, data: { isActive: active } })}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => { if (confirm("حذف المفتاح نهائياً؟")) deleteKeyMutation.mutate(key.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== Webhooks Tab ==================== */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Webhooks</h2>
              <Button onClick={openNewWebhook} size="sm">
                <Plus className="h-4 w-4 ml-1" />
                Webhook جديد
              </Button>
            </div>

            {webhooksData.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">لا توجد Webhooks</h3>
                  <p className="text-sm text-muted-foreground mb-4">أضف Webhook لإرسال إشعارات تلقائية لنظامك عند حدوث أحداث</p>
                  <Button onClick={openNewWebhook}>
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة Webhook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {webhooksData.map((wh: any) => (
                  <Card key={wh.id} className={!wh.isActive ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{wh.name}</h3>
                            {wh.isActive ? (
                              <Badge className="bg-green-100 text-green-700">نشط</Badge>
                            ) : (
                              <Badge variant="secondary">معطل</Badge>
                            )}
                            {(wh.failCount || 0) > 0 && (
                              <Badge className="bg-red-100 text-red-700">{wh.failCount} فشل</Badge>
                            )}
                          </div>

                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono block mb-2 truncate" dir="ltr">{wh.url}</code>

                          <div className="flex flex-wrap gap-1 mb-2">
                            {(wh.events || []).map((evt: string) => (
                              <Badge key={evt} variant="outline" className="text-[10px]">{webhookEventLabels[evt] || evt}</Badge>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {wh.lastTriggeredAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                آخر تشغيل: {new Date(wh.lastTriggeredAt).toLocaleDateString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                            {wh.lastStatus && (
                              <span className="flex items-center gap-1">
                                {wh.lastStatus >= 200 && wh.lastStatus < 300 
                                  ? <CheckCircle2 className="h-3 w-3 text-green-500" /> 
                                  : <XCircle className="h-3 w-3 text-red-500" />
                                }
                                HTTP {wh.lastStatus}
                              </span>
                            )}
                            {wh.lastError && (
                              <span className="text-red-500 truncate max-w-xs">{wh.lastError}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-8 text-xs"
                            onClick={() => testWebhookMutation.mutate(wh.id)}
                            disabled={testWebhookMutation.isPending}
                          >
                            <Send className="h-3 w-3 ml-1" />
                            اختبار
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setWebhookLogsDialog(wh.id)}
                            title="السجلات"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditWebhook(wh)} title="تعديل">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={wh.isActive}
                            onCheckedChange={(active) => updateWebhookMutation.mutate({ id: wh.id, data: { isActive: active } })}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => { if (confirm("حذف Webhook نهائياً؟")) deleteWebhookMutation.mutate(wh.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== Logs Tab ==================== */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">سجل طلبات API</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{logStats?.total || 0} إجمالي</Badge>
                <Button variant="outline" size="sm" onClick={() => { if (confirm("مسح جميع السجلات؟")) clearLogsMutation.mutate(); }}>
                  <Trash2 className="h-4 w-4 ml-1" />
                  مسح
                </Button>
              </div>
            </div>

            {apiLogsData.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">لا توجد سجلات</h3>
                  <p className="text-sm text-muted-foreground">ستظهر هنا جميع طلبات API الواردة</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[600px]">
                    <div className="divide-y">
                      {apiLogsData.map((log: any) => (
                        <div key={log.id} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setLogDetailDialog(log)}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant={log.method === "GET" ? "secondary" : log.method === "POST" ? "default" : "outline"} className="text-[10px] shrink-0">
                                {log.method}
                              </Badge>
                              <code className="text-xs font-mono truncate" dir="ltr">{log.endpoint}</code>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusBadge(log.statusCode)}
                              <span className="text-xs text-muted-foreground">{log.responseTime}ms</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            {log.apiKeyName && <span>🔑 {log.apiKeyName}</span>}
                            <span>{log.ipAddress}</span>
                            <span>{new Date(log.createdAt).toLocaleString("ar-EG")}</span>
                            {log.errorMessage && <span className="text-red-500">{log.errorMessage}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ==================== Docs Tab ==================== */}
          <TabsContent value="docs" className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              توثيق API
            </h2>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">المصادقة</CardTitle>
                <CardDescription>أضف مفتاح API في هيدر كل طلب</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm" dir="ltr">
                  <p className="text-muted-foreground"># Header</p>
                  <p>X-API-Key: dk_live_your_api_key_here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Base URL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded font-mono text-sm flex-1" dir="ltr">{baseUrl}/api/v1</code>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${baseUrl}/api/v1`)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Endpoints */}
            <div className="space-y-3">
              {[
                {
                  method: "POST",
                  path: "/orders",
                  desc: "إنشاء طلب جديد",
                  perm: "orders.create",
                  body: `{
  "customerName": "أحمد محمد",
  "customerPhone": "01012345678",
  "customerAddress": "القاهرة - المعادي",
  "customerCity": "القاهرة",
  "items": [
    {
      "productId": "p1",
      "productName": "منتج 1",
      "productImage": "",
      "quantity": 2,
      "price": "100",
      "total": "200"
    }
  ],
  "subtotal": "200",
  "total": "250"
}`,
                  response: `{
  "success": true,
  "order": {
    "id": "uuid",
    "orderNumber": "API-XXX",
    "trackingCode": "SHP-XXX",
    "deliveryCode": "123456",
    "status": "pending",
    "total": "250",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}`,
                },
                {
                  method: "GET",
                  path: "/orders",
                  desc: "قائمة الطلبات",
                  perm: "orders.read",
                  params: "?status=pending&limit=50&offset=0",
                  response: `{
  "orders": [...],
  "total": 100,
  "hasMore": true
}`,
                },
                {
                  method: "GET",
                  path: "/orders/:id",
                  desc: "تفاصيل طلب",
                  perm: "orders.read",
                },
                {
                  method: "PATCH",
                  path: "/orders/:id",
                  desc: "تحديث طلب",
                  perm: "orders.update",
                  body: `{ "customerNotes": "ملاحظة جديدة" }`,
                },
                {
                  method: "POST",
                  path: "/orders/:id/cancel",
                  desc: "إلغاء طلب",
                  perm: "orders.cancel",
                },
                {
                  method: "GET",
                  path: "/tracking/:code",
                  desc: "تتبع شحنة (عام - بدون مفتاح)",
                  perm: null,
                },
                {
                  method: "GET",
                  path: "/drivers",
                  desc: "قائمة المندوبين المتاحين",
                  perm: "drivers.read",
                },
                {
                  method: "GET",
                  path: "/drivers/:id",
                  desc: "تفاصيل مندوب",
                  perm: "drivers.read",
                },
                {
                  method: "GET",
                  path: "/drivers/:id/location",
                  desc: "موقع المندوب",
                  perm: "drivers.location",
                },
                {
                  method: "GET",
                  path: "/drivers/:id/ratings",
                  desc: "تقييمات مندوب محدد",
                  perm: "ratings.read",
                  params: "?limit=50&offset=0",
                  response: `{
  "driverId": "uuid",
  "driverName": "أحمد",
  "averageRating": "4.5",
  "totalRatings": 10,
  "ratings": [
    {
      "id": "uuid",
      "rating": "5.0",
      "comment": "ممتاز",
      "customerName": "محمد",
      "orderId": "uuid",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 10,
  "hasMore": false
}`,
                },
                {
                  method: "POST",
                  path: "/drivers/:id/ratings",
                  desc: "إضافة تقييم لمندوب",
                  perm: "ratings.create",
                  body: `{
  "rating": 5,
  "comment": "خدمة ممتازة",
  "customerName": "محمد أحمد",
  "orderId": "uuid (اختياري)"
}`,
                  response: `{
  "success": true,
  "rating": {
    "id": "uuid",
    "driverId": "uuid",
    "rating": "5.0",
    "comment": "خدمة ممتازة",
    "customerName": "محمد أحمد",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "driverStats": {
    "averageRating": "4.8",
    "totalRatings": 11
  }
}`,
                },
                {
                  method: "GET",
                  path: "/ratings",
                  desc: "جميع التقييمات",
                  perm: "ratings.read",
                  params: "?limit=50&offset=0&driverId=uuid&minRating=1&maxRating=5",
                },
              ].map((endpoint, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={endpoint.method === "GET" ? "secondary" : endpoint.method === "POST" ? "default" : "outline"}>
                        {endpoint.method}
                      </Badge>
                      <code className="font-mono text-sm" dir="ltr">/api/v1{endpoint.path}</code>
                      {endpoint.perm ? (
                        <Badge variant="outline" className="text-[10px]">{endpoint.perm}</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">عام</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{endpoint.desc}</p>
                    {endpoint.params && (
                      <div className="mb-2">
                        <p className="text-xs font-medium mb-1">Parameters:</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded" dir="ltr">{endpoint.params}</code>
                      </div>
                    )}
                    {endpoint.body && (
                      <div className="mb-2">
                        <p className="text-xs font-medium mb-1">Request Body:</p>
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre" dir="ltr">{endpoint.body}</pre>
                      </div>
                    )}
                    {endpoint.response && (
                      <div>
                        <p className="text-xs font-medium mb-1">Response:</p>
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre" dir="ltr">{endpoint.response}</pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Webhook Docs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Webhook Payload</CardTitle>
                <CardDescription>البيانات المرسلة مع كل حدث</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto whitespace-pre" dir="ltr">{`{
  "event": "order.created",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "data": {
    "orderId": "uuid",
    "orderNumber": "API-XXX",
    "trackingCode": "SHP-XXX",
    "total": "250",
    "customerName": "أحمد"
  }
}

# Headers:
Content-Type: application/json
X-Webhook-Event: order.created
X-Webhook-Signature: sha256=hmac_signature (if secret is set)`}</pre>
              </CardContent>
            </Card>

            {/* Error codes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">أكواد الخطأ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {[
                    { code: 401, msg: "unauthorized", desc: "مفتاح API مفقود أو غير صالح" },
                    { code: 403, msg: "forbidden", desc: "صلاحية غير كافية أو المفتاح معطل أو منتهي" },
                    { code: 404, msg: "not_found", desc: "المورد غير موجود" },
                    { code: 429, msg: "rate_limit_exceeded", desc: "تجاوز حد الطلبات المسموح" },
                    { code: 400, msg: "validation_error", desc: "بيانات غير صالحة" },
                    { code: 500, msg: "server_error", desc: "خطأ داخلي في الخادم" },
                  ].map((err) => (
                    <div key={err.code} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      {getStatusBadge(err.code)}
                      <code className="text-xs font-mono" dir="ltr">{err.msg}</code>
                      <span className="text-muted-foreground">{err.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Code samples */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  أمثلة الكود
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">JavaScript / Node.js</p>
                  <pre className="text-xs bg-muted p-4 rounded overflow-x-auto whitespace-pre" dir="ltr">{`const response = await fetch("${baseUrl}/api/v1/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "dk_live_your_key_here"
  },
  body: JSON.stringify({
    customerName: "أحمد محمد",
    customerPhone: "01012345678",
    customerAddress: "القاهرة",
    items: [{ productId: "1", productName: "منتج", productImage: "", quantity: 1, price: "100", total: "100" }],
    total: "100"
  })
});
const data = await response.json();
console.log(data.order.trackingCode);`}</pre>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Python</p>
                  <pre className="text-xs bg-muted p-4 rounded overflow-x-auto whitespace-pre" dir="ltr">{`import requests

response = requests.post(
    "${baseUrl}/api/v1/orders",
    headers={"X-API-Key": "dk_live_your_key_here"},
    json={
        "customerName": "أحمد محمد",
        "customerPhone": "01012345678",
        "customerAddress": "القاهرة",
        "items": [{"productId": "1", "productName": "منتج", "productImage": "", "quantity": 1, "price": "100", "total": "100"}],
        "total": "100"
    }
)
print(response.json()["order"]["trackingCode"])`}</pre>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">PHP</p>
                  <pre className="text-xs bg-muted p-4 rounded overflow-x-auto whitespace-pre" dir="ltr">{`$ch = curl_init("${baseUrl}/api/v1/orders");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "X-API-Key: dk_live_your_key_here"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "customerName" => "أحمد محمد",
    "customerPhone" => "01012345678",
    "customerAddress" => "القاهرة",
    "items" => [["productId" => "1", "productName" => "منتج", "productImage" => "", "quantity" => 1, "price" => "100", "total" => "100"]],
    "total" => "100"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = json_decode(curl_exec($ch));
echo $response->order->trackingCode;`}</pre>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">cURL</p>
                  <pre className="text-xs bg-muted p-4 rounded overflow-x-auto whitespace-pre" dir="ltr">{`curl -X POST ${baseUrl}/api/v1/orders \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: dk_live_your_key_here" \\
  -d '{"customerName":"أحمد","customerPhone":"01012345678","customerAddress":"القاهرة","items":[{"productId":"1","productName":"منتج","productImage":"","quantity":1,"price":"100","total":"100"}],"total":"100"}'`}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Settings Tab ==================== */}
          <TabsContent value="settings" className="space-y-4">
            <h2 className="text-lg font-semibold">إعدادات التكامل</h2>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">معلومات عامة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>عنوان API الأساسي</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={`${baseUrl}/api/v1`} readOnly dir="ltr" />
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${baseUrl}/api/v1`)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>عنوان تتبع الشحنات (عام)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={`${baseUrl}/api/v1/tracking/{trackingCode}`} readOnly dir="ltr" />
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${baseUrl}/api/v1/tracking/`)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الأحداث المتاحة للـ Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {webhookEvents.map((evt: string) => (
                    <div key={evt} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <Zap className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{webhookEventLabels[evt] || evt}</p>
                        <code className="text-[10px] text-muted-foreground" dir="ltr">{evt}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الصلاحيات المتاحة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permissions.map((perm: string) => (
                    <div key={perm} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <Shield className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{permissionLabels[perm] || perm}</p>
                        <code className="text-[10px] text-muted-foreground" dir="ltr">{perm}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">نصائح الأمان</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />لا تشارك مفتاح API في الكود المصدري العام (Front-end)</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />استخدم IP Whitelist لتقييد الوصول لعناوين IP محددة</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />حدد الحد الأقصى للطلبات (Rate Limit) لحماية النظام</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />أضف Secret للـ Webhooks وتحقق من التوقيع (X-Webhook-Signature)</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />حدد تاريخ انتهاء للمفاتيح المؤقتة</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />أعط كل مفتاح الصلاحيات التي يحتاجها فقط (Least Privilege)</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ==================== API Key Dialog ==================== */}
        <Dialog open={keyDialog} onOpenChange={setKeyDialog}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingKey ? "تعديل مفتاح API" : "إنشاء مفتاح API جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label>اسم المفتاح *</Label>
                <Input
                  placeholder="مثال: متجر شوبيفاي، تطبيق الموبايل..."
                  value={keyForm.name}
                  onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>الصلاحيات</Label>
                <div className="grid grid-cols-1 gap-2 border rounded-lg p-3">
                  {permissions.map((perm: string) => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <Checkbox
                        checked={keyForm.permissions.includes(perm)}
                        onCheckedChange={() => togglePermission(perm)}
                      />
                      <div>
                        <span className="text-sm">{permissionLabels[perm] || perm}</span>
                        <code className="text-[10px] text-muted-foreground mr-2" dir="ltr">{perm}</code>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setKeyForm({ ...keyForm, permissions: [...permissions] })}>
                    تحديد الكل
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setKeyForm({ ...keyForm, permissions: [] })}>
                    إلغاء الكل
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>حد الطلبات / دقيقة</Label>
                  <Input
                    type="number"
                    min="1"
                    value={keyForm.rateLimit}
                    onChange={(e) => setKeyForm({ ...keyForm, rateLimit: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الانتهاء (اختياري)</Label>
                  <Input
                    type="date"
                    value={keyForm.expiresAt}
                    onChange={(e) => setKeyForm({ ...keyForm, expiresAt: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>IP Whitelist (اختياري)</Label>
                <Input
                  placeholder="مثالIP : 192.168.1.1, 10.0.0.1"
                  value={keyForm.ipWhitelist}
                  onChange={(e) => setKeyForm({ ...keyForm, ipWhitelist: e.target.value })}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">اتركه فارغاً للسماح من أي IP. افصل بين العناوين بفاصلة.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setKeyDialog(false)}>إلغاء</Button>
              <Button onClick={handleSaveKey} disabled={!keyForm.name || createKeyMutation.isPending || updateKeyMutation.isPending}>
                {editingKey ? "حفظ" : "إنشاء"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== Webhook Dialog ==================== */}
        <Dialog open={webhookDialog} onOpenChange={setWebhookDialog}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingWebhook ? "تعديل Webhook" : "إنشاء Webhook جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label>اسم Webhook *</Label>
                <Input
                  placeholder="مثال: إشعار المتجر، نظام ERP..."
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>عنوان URL *</Label>
                <Input
                  placeholder="https://example.com/webhook"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label>الأحداث</Label>
                <div className="grid grid-cols-1 gap-2 border rounded-lg p-3">
                  {webhookEvents.map((evt: string) => (
                    <label key={evt} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <Checkbox
                        checked={webhookForm.events.includes(evt)}
                        onCheckedChange={() => toggleEvent(evt)}
                      />
                      <div>
                        <span className="text-sm">{webhookEventLabels[evt] || evt}</span>
                        <code className="text-[10px] text-muted-foreground mr-2" dir="ltr">{evt}</code>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setWebhookForm({ ...webhookForm, events: [...webhookEvents] })}>
                    تحديد الكل
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setWebhookForm({ ...webhookForm, events: [] })}>
                    إلغاء الكل
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Secret (لتوقيع الطلبات)</Label>
                  <Input
                    type="password"
                    placeholder="اختياري"
                    value={webhookForm.secret}
                    onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>أقصى محاولات فشل</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={webhookForm.maxRetries}
                    onChange={(e) => setWebhookForm({ ...webhookForm, maxRetries: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWebhookDialog(false)}>إلغاء</Button>
              <Button onClick={handleSaveWebhook} disabled={!webhookForm.name || !webhookForm.url || createWebhookMutation.isPending || updateWebhookMutation.isPending}>
                {editingWebhook ? "حفظ" : "إنشاء"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== Log Detail Dialog ==================== */}
        <Dialog open={!!logDetailDialog} onOpenChange={() => setLogDetailDialog(null)}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل الطلب</DialogTitle>
            </DialogHeader>
            {logDetailDialog && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge>{logDetailDialog.method}</Badge>
                  <code className="font-mono text-xs" dir="ltr">{logDetailDialog.endpoint}</code>
                  {getStatusBadge(logDetailDialog.statusCode)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">مفتاح API:</span> {logDetailDialog.apiKeyName || "—"}</div>
                  <div><span className="text-muted-foreground">الاستجابة:</span> {logDetailDialog.responseTime}ms</div>
                  <div><span className="text-muted-foreground">IP:</span> {logDetailDialog.ipAddress}</div>
                  <div><span className="text-muted-foreground">التاريخ:</span> {new Date(logDetailDialog.createdAt).toLocaleString("ar-EG")}</div>
                </div>
                {logDetailDialog.userAgent && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">User Agent:</p>
                    <code className="text-[10px] bg-muted p-2 rounded block break-all" dir="ltr">{logDetailDialog.userAgent}</code>
                  </div>
                )}
                {logDetailDialog.requestBody && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Request Body:</p>
                    <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto whitespace-pre" dir="ltr">
                      {JSON.stringify(logDetailDialog.requestBody, null, 2)}
                    </pre>
                  </div>
                )}
                {logDetailDialog.errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-xs">
                    {logDetailDialog.errorMessage}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ==================== Webhook Logs Dialog ==================== */}
        <Dialog open={!!webhookLogsDialog} onOpenChange={() => setWebhookLogsDialog(null)}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>سجلات Webhook</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[500px]">
              {webhookLogsData.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm p-8">لا توجد سجلات</div>
              ) : (
                <div className="divide-y space-y-0">
                  {webhookLogsData.map((log: any) => (
                    <div key={log.id} className="p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {log.success ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                          <Badge variant="outline" className="text-[10px]">{webhookEventLabels[log.event] || log.event}</Badge>
                          {log.responseStatus > 0 && getStatusBadge(log.responseStatus)}
                        </div>
                        <span className="text-muted-foreground">{log.duration}ms</span>
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("ar-EG")}
                      </span>
                      {log.error && <p className="text-red-500 mt-1">{log.error}</p>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
