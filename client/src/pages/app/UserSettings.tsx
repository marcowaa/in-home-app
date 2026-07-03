import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Bell, Shield, Lock, ChevronLeft, KeyRound, Save, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function UserSettings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [fraudCode, setFraudCode] = useState("");
  const [editingCode, setEditingCode] = useState(false);

  // Fetch user's current fraud code
  const { data: authData } = useQuery<any>({
    queryKey: ["/api/user/auth/check"],
  });

  const { data: fraudData } = useQuery<any>({
    queryKey: ["/api/user/fraud-code"],
    enabled: !!authData?.loggedIn,
  });

  // Set fraud code when loaded
  const currentCode = fraudData?.fraudCode || "";

  // Save fraud code
  const saveMutation = useMutation({
    mutationFn: (code: string) => apiRequest("POST", "/api/user/fraud-code", { fraudCode: code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/fraud-code"] });
      toast({ title: "تم حفظ رمز الحماية", description: "ستظهر هذه الرمز في كل رسالة OTP" });
      setEditingCode(false);
    },
    onError: () => toast({ title: "فشل حفظ الرمز", variant: "destructive" }),
  });

  // Generate random code
  const generateRandom = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setFraudCode(code);
  };

  const handleSave = () => {
    if (fraudCode.length !== 4) {
      toast({ title: "الرمز يجب أن يكون 4 خانات", variant: "destructive" });
      return;
    }
    saveMutation.mutate(fraudCode.toUpperCase());
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-5 pt-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/app/profile")} className="p-1">
            <ArrowRight className="h-5 w-5 text-white" />
          </button>
          <h1 className="font-bold text-lg">الإعدادات</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Fraud Protection Code — USER CONTROLLED */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-red-50 p-4 border-b border-red-100">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="h-5 w-5 text-red-600" />
              <h2 className="font-semibold text-sm text-gray-900">رمز الحماية من الاحتيال</h2>
            </div>
            <p className="text-xs text-gray-500">
              أنشئ رمزاً خاصاً بك يظهر في كل رسالة OTP. إذا لم تجده في الرسالة، فهي محاولة احتيال!
            </p>
          </div>

          <div className="p-4 space-y-3">
            {/* Current code display */}
            {!editingCode && currentCode && (
              <div className="flex items-center justify-between bg-green-50 rounded-xl p-3">
                <div>
                  <p className="text-xs text-green-600">رمزك الحالي</p>
                  <p className="font-mono font-bold text-2xl text-green-700 tracking-widest">{currentCode}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setEditingCode(true); setFraudCode(currentCode); }}>
                  تغيير
                </Button>
              </div>
            )}

            {/* No code set */}
            {!editingCode && !currentCode && (
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 mb-2">لم تنشئ رمز حماية بعد</p>
                <Button size="sm" onClick={() => setEditingCode(true)}>إنشاء رمز</Button>
              </div>
            )}

            {/* Edit mode */}
            {editingCode && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">أدخل رمزك (4 خانات)</label>
                  <div className="flex gap-2">
                    <Input
                      value={fraudCode}
                      onChange={(e) => setFraudCode(e.target.value.toUpperCase().slice(0, 4))}
                      placeholder="AB12"
                      maxLength={4}
                      dir="ltr"
                      className="text-center text-2xl font-bold tracking-widest h-14"
                    />
                    <Button variant="outline" size="icon" onClick={generateRandom} title="توليد عشوائي">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">أحرف إنجليزية وأرقام فقط</p>
                </div>

                {/* Preview */}
                {fraudCode.length === 4 && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-600 mb-1">معاينة رسالة OTP:</p>
                    <p className="font-mono text-sm text-gray-700">
                      كود التحقق: 1234 | رمز الحماية: <span className="font-bold text-green-600">{fraudCode}</span>
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={fraudCode.length !== 4 || saveMutation.isPending}
                    onClick={handleSave}
                  >
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}
                    حفظ الرمز
                  </Button>
                  <Button variant="outline" onClick={() => { setEditingCode(false); setFraudCode(""); }}>
                    إلغاء
                  </Button>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                🔒 كيف يعمل؟<br />
                • أنشئ رمزاً من 4 خانات واحفظه في ذاكرتك<br />
                • يظهر هذا الرمز في كل رسالة OTP حقيقية من التطبيق<br />
                • إذا وصلك رسالة OTP بدون رمزك أو برمز مختلف، لا تدخل الكود — إنها محاولة احتيال<br />
                • لا تشارك هذا الرمز مع أحد
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">الإشعارات</p>
              <p className="text-xs text-gray-400">تنبيهات التحويلات والعقود</p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <button onClick={() => navigate("/app/kyc")} className="w-full p-4 flex items-center gap-3 hover:bg-gray-50">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-medium text-sm">توثيق الهوية (KYC)</p>
              <p className="text-xs text-gray-400">زيادة حدود التحويل</p>
            </div>
            <ChevronLeft className="h-4 w-4 text-gray-300" />
          </button>
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Lock className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">المصادقة الثنائية</p>
              <p className="text-xs text-gray-400">حماية إضافية لحسابك</p>
            </div>
            <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
          </div>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="font-semibold text-sm text-gray-900">عن التطبيق</p>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">الإصدار</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">العملة</span>
            <span className="font-medium">ج.م</span>
          </div>
        </div>
      </div>
    </div>
  );
}
