import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Bell, Globe, Shield, Lock, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function UserSettings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

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
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">رمز الحماية</span>
            <span className="font-mono font-bold text-green-600">AB12</span>
          </div>
          <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-100">
            🔒 رمز الحماية يظهر في كل رسالة OTP. تأكد من وجوده قبل إدخال الكود.
          </p>
        </div>
      </div>
    </div>
  );
}
