import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Loader2, Phone, Image, Truck, Globe, Type, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/ui/image-upload";
import { Textarea } from "@/components/ui/textarea";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AppSettings, InsertAppSettings } from "@shared/schema";

export default function AdminSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertAppSettings>>({});

  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        storeName: settings.storeName || "",
        storeNameEn: settings.storeNameEn || "",
        siteTitle: (settings as any).siteTitle || "",
        siteDescription: (settings as any).siteDescription || "",
        logo: settings.logo || "",
        appIcon: settings.appIcon || "",
        favicon: (settings as any).favicon || "",
        whatsappNumber: settings.whatsappNumber || "",
        primaryColor: settings.primaryColor || "#ec4899",
        currency: settings.currency || "ج.م",
        adminDashboardBackground: settings.adminDashboardBackground || "",
        adminSidebarBackground: settings.adminSidebarBackground || "",
        adminLoginBackground: settings.adminLoginBackground || "",
        driverCommissionBase: settings.driverCommissionBase || "5",
        driverCommissionVerifiedId: settings.driverCommissionVerifiedId || "8",
        driverCommissionVerifiedCriminal: settings.driverCommissionVerifiedCriminal || "12",
        referralBonusAmount: (settings as any).referralBonusAmount || "50",
        supportButtonEnabled: (settings as any).supportButtonEnabled ?? false,
        supportButtonType: (settings as any).supportButtonType || "whatsapp",
        supportButtonValue: (settings as any).supportButtonValue || "",
        supportButtonLabel: (settings as any).supportButtonLabel || "تواصل معنا",
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertAppSettings>) => {
      return apiRequest("PATCH", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في حفظ الإعدادات", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-settings-title">
              إعدادات التطبيق
            </h1>
            <p className="text-muted-foreground">
              إعدادات النظام العامة والمندوبين
            </p>
          </div>
          <Button
            type="submit"
            className="gap-2"
            disabled={updateMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                معلومات النظام
              </CardTitle>
              <CardDescription>
                المعلومات الأساسية للنظام
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">اسم النظام (عربي)</Label>
                  <Input
                    id="storeName"
                    value={formData.storeName}
                    onChange={(e) =>
                      setFormData({ ...formData, storeName: e.target.value })
                    }
                    placeholder="نظام المندوبين"
                    data-testid="input-store-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeNameEn">اسم النظام (إنجليزي)</Label>
                  <Input
                    id="storeNameEn"
                    value={formData.storeNameEn}
                    onChange={(e) =>
                      setFormData({ ...formData, storeNameEn: e.target.value })
                    }
                    placeholder="Driver System"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الشعار (Logo)</Label>
                  <ImageUpload
                    value={formData.logo || ""}
                    onChange={(url) => setFormData({ ...formData, logo: url })}
                    onRemove={() => setFormData({ ...formData, logo: "" })}
                    label="ارفع الشعار"
                    compact
                  />
                </div>
                <div className="space-y-2">
                  <Label>أيقونة التطبيق (512x512)</Label>
                  <ImageUpload
                    value={formData.appIcon || ""}
                    onChange={(url) => setFormData({ ...formData, appIcon: url })}
                    onRemove={() => setFormData({ ...formData, appIcon: "" })}
                    label="ارفع أيقونة التطبيق"
                    compact
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">العملة</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                    placeholder="ج.م"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">اللون الأساسي</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      dir="ltr"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                عنوان وأيقونة المتصفح
              </CardTitle>
              <CardDescription>
                تحكم في النص والأيقونة التي تظهر في تبويب المتصفح
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteTitle">عنوان التبويب (يظهر في تبويب المتصفح)</Label>
                <Input
                  id="siteTitle"
                  value={formData.siteTitle || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, siteTitle: e.target.value })
                  }
                  placeholder="نظام المندوبين - إدارة الشحن والتوصيل"
                />
                <p className="text-xs text-muted-foreground">
                  هذا النص يظهر في عنوان تبويب المتصفح وعند مشاركة الرابط
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">وصف الموقع (SEO)</Label>
                <Textarea
                  id="siteDescription"
                  value={formData.siteDescription || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, siteDescription: e.target.value })
                  }
                  placeholder="نظام متكامل لإدارة المندوبين والشحن والتوصيل - لوحة تحكم إدارية ولوحة المندوب"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  وصف الموقع في محركات البحث
                </p>
              </div>
              <div className="space-y-2">
                <Label>أيقونة التبويب (Favicon)</Label>
                <ImageUpload
                  value={formData.favicon || ""}
                  onChange={(url) => setFormData({ ...formData, favicon: url })}
                  onRemove={() => setFormData({ ...formData, favicon: "" })}
                  label="ارفع أيقونة التبويب"
                  compact
                />
                <p className="text-xs text-muted-foreground">
                  يُفضل صورة مربعة بحجم 32x32 أو 64x64 بصيغة PNG. هذه الأيقونة تظهر بجانب عنوان التبويب في المتصفح
                </p>
              </div>
              {/* Preview */}
              <div className="bg-muted/50 rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">معاينة التبويب</Label>
                <div className="flex items-center gap-2 bg-background rounded-md border px-3 py-2 max-w-sm">
                  {formData.favicon ? (
                    <img src={formData.favicon} alt="favicon" className="w-4 h-4 object-contain rounded-sm" />
                  ) : (
                    <div className="w-4 h-4 bg-muted rounded-sm" />
                  )}
                  <span className="text-sm truncate">
                    {formData.siteTitle || "نظام المندوبين - إدارة الشحن والتوصيل"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                التواصل
              </CardTitle>
              <CardDescription>
                رقم واتساب الإدارة للتواصل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">رقم واتساب الإدارة</Label>
                <Input
                  id="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsappNumber: e.target.value })
                  }
                  placeholder="201XXXXXXXXX"
                  dir="ltr"
                  data-testid="input-whatsapp"
                />
                <p className="text-xs text-muted-foreground">
                  أدخل الرقم بصيغة دولية بدون + (مثال: 201012345678)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                خلفيات لوحة الإدارة
              </CardTitle>
              <CardDescription>
                تخصيص صور الخلفية للوحة التحكم
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>خلفية لوحة التحكم الرئيسية</Label>
                <ImageUpload
                  value={formData.adminDashboardBackground || ""}
                  onChange={(url) => setFormData({ ...formData, adminDashboardBackground: url })}
                  onRemove={() => setFormData({ ...formData, adminDashboardBackground: "" })}
                  label="ارفع صورة الخلفية"
                />
              </div>

              <div className="space-y-2">
                <Label>خلفية القائمة الجانبية</Label>
                <ImageUpload
                  value={formData.adminSidebarBackground || ""}
                  onChange={(url) => setFormData({ ...formData, adminSidebarBackground: url })}
                  onRemove={() => setFormData({ ...formData, adminSidebarBackground: "" })}
                  label="ارفع صورة الخلفية"
                />
              </div>

              <div className="space-y-2">
                <Label>خلفية صفحة تسجيل الدخول</Label>
                <ImageUpload
                  value={formData.adminLoginBackground || ""}
                  onChange={(url) => setFormData({ ...formData, adminLoginBackground: url })}
                  onRemove={() => setFormData({ ...formData, adminLoginBackground: "" })}
                  label="ارفع صورة الخلفية"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ارفع صور الخلفية. يُفضل استخدام صور بحجم 1920x1080 أو أكبر
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                عمولة المندوبين
              </CardTitle>
              <CardDescription>
                نسب العمولة التي يحصل عليها المندوب من قيمة الشحنة. ترتفع العمولة بحسب مستوى التوثيق
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="driverCommissionBase">العمولة الأساسية %</Label>
                  <Input
                    id="driverCommissionBase"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={formData.driverCommissionBase}
                    onChange={(e) => setFormData({ ...formData, driverCommissionBase: e.target.value })}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">للمندوبين بدون توثيق</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverCommissionVerifiedId">عمولة موثق بالهوية %</Label>
                  <Input
                    id="driverCommissionVerifiedId"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={formData.driverCommissionVerifiedId}
                    onChange={(e) => setFormData({ ...formData, driverCommissionVerifiedId: e.target.value })}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">للمندوبين الموثقين بهوية وطنية</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverCommissionVerifiedCriminal">عمولة موثق بفيش جنائي %</Label>
                  <Input
                    id="driverCommissionVerifiedCriminal"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={formData.driverCommissionVerifiedCriminal}
                    onChange={(e) => setFormData({ ...formData, driverCommissionVerifiedCriminal: e.target.value })}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">للمندوبين الموثقين بفيش جنائي نظيف (أعلى عمولة)</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-1">مثال:</p>
                <p>شحنة بقيمة 1000 ج.م → عمولة مندوب عادي: {((parseFloat(formData.driverCommissionBase || "5") / 100) * 1000).toFixed(0)} ج.م | موثق بهوية: {((parseFloat(formData.driverCommissionVerifiedId || "8") / 100) * 1000).toFixed(0)} ج.م | موثق بفيش: {((parseFloat(formData.driverCommissionVerifiedCriminal || "12") / 100) * 1000).toFixed(0)} ج.م</p>
              </div>
            </CardContent>
          </Card>

          {/* Support Button Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headset className="h-5 w-5" />
                زر الدعم
              </CardTitle>
              <CardDescription>
                زر دعم عائم يظهر في جميع الصفحات لكل المستخدمين
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="supportButtonEnabled">تفعيل زر الدعم</Label>
                <input
                  id="supportButtonEnabled"
                  type="checkbox"
                  checked={!!(formData as any).supportButtonEnabled}
                  onChange={(e) => setFormData({ ...formData, supportButtonEnabled: e.target.checked } as any)}
                  className="h-4 w-4 accent-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportButtonType">نوع الدعم</Label>
                <select
                  id="supportButtonType"
                  value={(formData as any).supportButtonType || "whatsapp"}
                  onChange={(e) => setFormData({ ...formData, supportButtonType: e.target.value } as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="whatsapp">واتساب</option>
                  <option value="phone">اتصال هاتفي</option>
                  <option value="link">رابط خارجي</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportButtonValue">
                  {(formData as any).supportButtonType === "whatsapp" ? "رقم واتساب (بصيغة دولية بدون +)" :
                    (formData as any).supportButtonType === "phone" ? "رقم الهاتف" : "الرابط"}
                </Label>
                <Input
                  id="supportButtonValue"
                  value={(formData as any).supportButtonValue || ""}
                  onChange={(e) => setFormData({ ...formData, supportButtonValue: e.target.value } as any)}
                  placeholder={(formData as any).supportButtonType === "link" ? "https://..." : "201XXXXXXXXX"}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportButtonLabel">نص الزر</Label>
                <Input
                  id="supportButtonLabel"
                  value={(formData as any).supportButtonLabel || ""}
                  onChange={(e) => setFormData({ ...formData, supportButtonLabel: e.target.value } as any)}
                  placeholder="تواصل معنا"
                />
              </div>
            </CardContent>
          </Card>

          {/* Referral Bonus Settings */}
          <Card>
            <CardHeader>
              <CardTitle>نظام الإحالة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="referralBonusAmount">مكافأة الإحالة (ج.م)</Label>
                <Input
                  id="referralBonusAmount"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.referralBonusAmount}
                  onChange={(e) => setFormData({ ...formData, referralBonusAmount: e.target.value })}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">المبلغ الذي يحصل عليه المندوب عند إحالة مندوب جديد (يُضاف للمحفظة بعد موافقة الأدمن)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </AdminLayout>
  );
}
