import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowRight, User, Phone, Shield, LogOut, Copy, Check,
  Gift, Bell, Settings, ChevronLeft, BadgeCheck, LifeBuoy, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import { useState } from "react";

export default function UserProfile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: authData } = useQuery<any>({
    queryKey: ["/api/user/auth/check"],
  });
  const { data: walletData } = useQuery<any>({
    queryKey: ["/api/user/wallet"],
  });

  // Fetch user's public ratings
  const { data: ratingsData } = useQuery<any>({
    queryKey: [`/api/public/users/${authData?.user?.id}/ratings`],
    enabled: !!authData?.user?.id,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/auth/logout"),
    onSuccess: () => {
      window.location.href = "/app";
    },
  });

  const user = authData?.user;

  const copyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      toast({ title: "تم نسخ الكود" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const kycLabels: Record<string, { label: string; color: string }> = {
    none: { label: "غير موثق", color: "bg-gray-100 text-gray-600" },
    basic: { label: "موثق أساسي", color: "bg-yellow-100 text-yellow-700" },
    verified: { label: "موثق", color: "bg-green-100 text-green-700" },
  };
  const kyc = kycLabels[user?.kycStatus || "none"] || kycLabels.none;

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-5 rounded-b-3xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-3">
            <User className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-xl font-bold">{user?.name || "مستخدم"}</h1>
          <p className="text-blue-100 text-sm">{user?.phone}</p>
          <div className="mt-2 flex items-center gap-2 justify-center">
            <span className={`text-xs px-3 py-1 rounded-full ${kyc.color}`}>{kyc.label}</span>
            {ratingsData && ratingsData.totalReviews > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {ratingsData.avgRating} ({ratingsData.totalReviews})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Ratings summary */}
        {ratingsData && ratingsData.totalReviews > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" /> التقييمات
              </h3>
              <span className="text-2xl font-bold text-yellow-600">{ratingsData.avgRating}</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {ratingsData.ratings.slice(0, 3).map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="flex flex-shrink-0">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-gray-500 line-clamp-1">{r.comment || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balance Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">الرصيد</p>
              <p className="font-bold text-lg">{formatPrice(walletData?.balance || "0")}</p>
              <p className="text-xs text-gray-400">ج.م</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">مجمّد</p>
              <p className="font-bold text-lg">{formatPrice(walletData?.frozenBalance || "0")}</p>
              <p className="text-xs text-gray-400">ج.م</p>
            </div>
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-purple-600" />
            <h2 className="font-semibold text-sm">كود الإحالة</h2>
          </div>
          <div className="flex items-center justify-between bg-purple-50 rounded-xl p-3">
            <span className="font-mono font-bold text-purple-700">{user?.referralCode || "—"}</span>
            <Button variant="ghost" size="sm" onClick={copyReferral}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <button onClick={() => navigate("/app/transfer/history")} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50">
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium flex-1 text-right">سجل التحويلات</span>
            <ChevronLeft className="h-4 w-4 text-gray-300" />
          </button>
          <button onClick={() => navigate("/app/beneficiaries")} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50">
            <User className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium flex-1 text-right">المستفيدون</span>
            <ChevronLeft className="h-4 w-4 text-gray-300" />
          </button>
          <button onClick={() => navigate("/app/contracts")} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50">
            <Shield className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium flex-1 text-right">العقود</span>
            <ChevronLeft className="h-4 w-4 text-gray-300" />
          </button>
          <button onClick={() => navigate("/app/kyc")} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50">
            <BadgeCheck className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium flex-1 text-right">توثيق الهوية</span>
            <ChevronLeft className="h-4 w-4 text-gray-300" />
          </button>
          <button onClick={() => navigate("/app/support")} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50">
            <LifeBuoy className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium flex-1 text-right">الدعم الفني</span>
            <ChevronLeft className="h-4 w-4 text-gray-300" />
          </button>
          <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50">
            <Bell className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium flex-1 text-right">الإشعارات</span>
            <ChevronLeft className="h-4 w-4 text-gray-300" />
          </button>
          <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50">
            <Settings className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium flex-1 text-right">الإعدادات</span>
            <ChevronLeft className="h-4 w-4 text-gray-300" />
          </button>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-12 text-red-600 border-red-200"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5 ml-2" /> تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
