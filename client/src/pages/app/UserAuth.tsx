import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Shield, Loader2, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function UserAuth() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [fraudCode, setFraudCode] = useState("");

  const demoLoginMutation = useMutation({
    mutationFn: (data: { phone?: string; name?: string }) => apiRequest("POST", "/api/user/auth/demo-login", data),
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.needsRegistration) {
        navigate("/app/register");
      } else {
        navigate("/app/home");
      }
      toast({ title: "تم تسجيل الدخول", description: "مرحباً بك في حسابك التجريبي" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل تسجيل الدخول", variant: "destructive" }),
  });

  const sendOtpMutation = useMutation({
    mutationFn: (phone: string) => apiRequest("POST", "/api/user/auth/send-otp", { phone }),
    onSuccess: async (res) => {
      const data = await res.json();
      setDemoOtp(data.otp);
      setOtpMessage(data.message || "");
      setFraudCode(data.fraudCode || "");
      setStep("otp");
      toast({ title: "تم إرسال الكود", description: data.message || `كود التحقق: ${data.otp}` });
    },
    onError: () => toast({ title: "خطأ", description: "فشل إرسال الكود", variant: "destructive" }),
  });

  const verifyMutation = useMutation({
    mutationFn: (data: { phone: string; otp: string }) => apiRequest("POST", "/api/user/auth/verify-otp", data),
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.needsRegistration) {
        navigate("/app/register");
      } else {
        navigate("/app/home");
      }
    },
    onError: () => toast({ title: "خطأ", description: "الكود غير صحيح", variant: "destructive" }),
  });

  const handleVerify = () => {
    verifyMutation.mutate({ phone, otp });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <AnimatePresence mode="wait">
          {step === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-white">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-3xl mb-4">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold">In-Home</h1>
                <p className="text-blue-100 text-sm mt-1">منصة المدفوعات والعقود المرنة</p>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-2xl">
                <h2 className="text-lg font-bold text-gray-900 mb-1">أدخل رقم هاتفك</h2>
                <p className="text-sm text-gray-500 mb-4">سنرسل لك كود تحقق</p>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-right pr-10 text-lg h-14"
                    maxLength={11}
                  />
                </div>
                <Button
                  className="w-full mt-4 h-12 text-base"
                  disabled={!phone || phone.length < 10 || sendOtpMutation.isPending}
                  onClick={() => sendOtpMutation.mutate(phone)}
                >
                  {sendOtpMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "إرسال الكود"}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">أو</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Quick Demo Login */}
                <Button
                  variant="secondary"
                  className="w-full h-12 text-base bg-gradient-to-l from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 border-0"
                  disabled={demoLoginMutation.isPending}
                  onClick={() => demoLoginMutation.mutate({})}
                >
                  {demoLoginMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-5 w-5 ml-2" />
                      دخول سريع تجريبي
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-400 mt-4">
                  بتسجيلك فإنك توافق على الشروط والأحكام
                </p>
              </div>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-3xl p-6 shadow-2xl">
              <button onClick={() => setStep("phone")} className="flex items-center gap-1 text-gray-500 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" /> رجوع
              </button>
              <h2 className="text-lg font-bold text-gray-900 mb-1">أدخل كود التحقق</h2>
              <p className="text-sm text-gray-500 mb-4">تم إرسال الكود إلى {phone}</p>
              <div className="flex justify-center mb-6">
                <InputOTP value={otp} onChange={setOtp} maxLength={4}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {demoOtp && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-center space-y-2">
                  <p className="text-xs text-blue-600">كود تجريبي: <span className="font-bold text-lg">{demoOtp}</span></p>
                  {otpMessage && (
                    <div className="bg-white rounded-lg p-2 text-xs text-gray-600 border border-blue-100">
                      <p className="font-mono">{otpMessage}</p>
                    </div>
                  )}
                  {fraudCode && (
                    <p className="text-[10px] text-green-600">🔒 رمز الحماية: {fraudCode} — تأكد من وجوده في كل رسالة حقيقية</p>
                  )}
                </div>
              )}
              <Button
                className="w-full h-12 text-base"
                disabled={otp.length !== 4 || verifyMutation.isPending}
                onClick={handleVerify}
              >
                {verifyMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "تأكيد"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
