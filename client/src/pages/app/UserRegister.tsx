import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { User, Lock, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function UserRegister() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const registerMutation = useMutation({
    mutationFn: (data: { name: string; pin: string }) => apiRequest("POST", "/api/user/auth/register", data),
    onSuccess: () => {
      toast({ title: "تم التسجيل!", description: "حصلت على 100 ج.م مكافأة ترحيب" });
      navigate("/app/home");
    },
    onError: () => toast({ title: "خطأ", description: "فشل التسجيل", variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!name.trim()) return toast({ title: "أدخل الاسم", variant: "destructive" });
    if (pin.length !== 4) return toast({ title: "كود PIN يجب أن يكون 4 أرقام", variant: "destructive" });
    if (pin !== confirmPin) return toast({ title: "كود PIN غير متطابق", variant: "destructive" });
    registerMutation.mutate({ name, pin });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white rounded-3xl p-6 shadow-2xl">
        <h1 className="text-xl font-bold text-gray-900 mb-1">إكمال البيانات</h1>
        <p className="text-sm text-gray-500 mb-6">أدخل اسمك وأنشئ كود PIN</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">الاسم</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="اسمك الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pr-10 h-12"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">كود PIN (4 أرقام)</label>
            <div className="flex justify-center">
              <InputOTP value={pin} onChange={setPin} maxLength={4}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">تأكيد كود PIN</label>
            <div className="flex justify-center">
              <InputOTP value={confirmPin} onChange={setConfirmPin} maxLength={4}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700">ستحصل على 100 ج.م مكافأة ترحيب عند التسجيل</p>
          </div>

          <Button
            className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
            disabled={registerMutation.isPending}
            onClick={handleSubmit}
          >
            {registerMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "تأكيد التسجيل"}
          </Button>
        </div>
      </div>
    </div>
  );
}
