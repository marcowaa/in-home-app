import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, Shield, CheckCircle2, Clock, Loader2,
  User, IdCard, Calendar, Mail, AlertCircle, Upload, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ImageUpload } from "@/components/ui/image-upload";

export default function KYCVerification() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [idFrontImage, setIdFrontImage] = useState("");
  const [idBackImage, setIdBackImage] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/kyc/status"],
  });

  const submitMutation = useMutation({
    mutationFn: (data: {
      fullName: string;
      nationalId: string;
      dateOfBirth: string;
      email: string;
      idFrontImage: string;
      idBackImage: string;
    }) => apiRequest("POST", "/api/user/kyc/submit", data),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/user/kyc/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/auth/check"] });
      toast({ title: "تم إرسال طلب التوثيق", description: "سيتم مراجعة طلبك خلال 24-48 ساعة" });
    },
    onError: () => toast({ title: "فشل إرسال الطلب", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 pt-8 rounded-b-3xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/app/home")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">توثيق الهوية</h1>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-60 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const kycStatus = data?.status || "none";
  const rejectionReason = data?.rejectionReason;

  const isFormMode = kycStatus === "none" || (kycStatus === "none" && !!rejectionReason);

  const handleSubmit = () => {
    if (!fullName.trim()) return toast({ title: "أدخل الاسم الكامل", variant: "destructive" });
    if (nationalId.length < 10) return toast({ title: "رقم البطاقة غير صحيح", variant: "destructive" });
    if (!dateOfBirth) return toast({ title: "أدخل تاريخ الميلاد", variant: "destructive" });
    if (!email.trim() || !email.includes("@")) return toast({ title: "بريد إلكتروني غير صحيح", variant: "destructive" });
    if (!idFrontImage) return toast({ title: "ارفع صورة البطاقة (أمام)", variant: "destructive" });
    if (!idBackImage) return toast({ title: "ارفع صورة البطاقة (خلف)", variant: "destructive" });

    submitMutation.mutate({
      fullName,
      nationalId,
      dateOfBirth,
      email,
      idFrontImage,
      idBackImage,
    });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 pt-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/app/home")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h1 className="font-bold text-lg">توثيق الهوية</h1>
          </div>
        </div>
        <p className="text-blue-100 text-sm">وثّق هويتك لزيادة حدود التحويل وتفعيل جميع المميزات</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Verified State */}
        {kycStatus === "verified" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <BadgeCheck className="h-10 w-10 text-green-600" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">هويتك موثّقة ✓</h2>
            <p className="text-sm text-gray-500 mb-4">تم توثيق هويتك بنجاح</p>
            <div className="bg-green-50 rounded-xl p-4 space-y-2 text-right">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الاسم</span>
                <span className="font-medium text-gray-900">{data?.fullName || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">رقم البطاقة</span>
                <span className="font-medium text-gray-900 font-mono">{data?.nationalId ? `••••••${data.nationalId.slice(-4)}` : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">تاريخ التوثيق</span>
                <span className="font-medium text-gray-900">
                  {data?.verifiedAt ? new Date(data.verifiedAt).toLocaleDateString("ar-EG") : "—"}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pending Review State */}
        {kycStatus === "basic" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm p-6 text-center"
          >
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">قيد المراجعة</h2>
            <p className="text-sm text-gray-500 mb-4">طلبك قيد المراجعة من قبل فريقنا</p>
            <div className="bg-yellow-50 rounded-xl p-4 space-y-2 text-right">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الاسم</span>
                <span className="font-medium text-gray-900">{data?.fullName || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">رقم البطاقة</span>
                <span className="font-medium text-gray-900 font-mono">{data?.nationalId ? `••••••${data.nationalId.slice(-4)}` : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">تاريخ الإرسال</span>
                <span className="font-medium text-gray-900">
                  {data?.submittedAt ? new Date(data.submittedAt).toLocaleDateString("ar-EG") : "—"}
                </span>
              </div>
            </div>
            <div className="mt-4 bg-blue-50 rounded-xl p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-600">سيتم إعلامك فور انتهاء المراجعة (خلال 24-48 ساعة)</p>
            </div>
          </motion.div>
        )}

        {/* Rejection Reason */}
        {isFormMode && rejectionReason && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-100 rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-red-900 mb-1">تم رفض طلب التوثيق</p>
                <p className="text-xs text-red-600">{rejectionReason}</p>
                <p className="text-xs text-red-500 mt-2">يرجى تعديل البيانات وإعادة الإرسال</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* KYC Form */}
        {isFormMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-sm text-gray-900">البيانات الشخصية</h2>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">الاسم الكامل</label>
                <Input
                  placeholder="الاسم كما في البطاقة"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">رقم البطاقة الشخصية</label>
                <div className="relative">
                  <IdCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="رقم البطاقة"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value.replace(/\D/g, ""))}
                    className="pr-10 h-12"
                    maxLength={14}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">تاريخ الميلاد</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="pr-10 h-12"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pr-10 h-12"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* ID Upload Section */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-sm text-gray-900">صور البطاقة</h2>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">صورة البطاقة (الوجه الأمامي)</label>
                <ImageUpload
                  value={idFrontImage}
                  onChange={setIdFrontImage}
                  onRemove={() => setIdFrontImage("")}
                  label="ارفع صورة الوجه الأمامي"
                  uploadUrl="/api/upload"
                  fieldName="image"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">صورة البطاقة (الوجه الخلفي)</label>
                <ImageUpload
                  value={idBackImage}
                  onChange={setIdBackImage}
                  onRemove={() => setIdBackImage("")}
                  label="ارفع صورة الوجه الخلفي"
                  uploadUrl="/api/upload"
                  fieldName="image"
                />
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600">
                بياناتك آمنة ومشفرة. تُستخدم صور البطاقة فقط لأغراض التوثيق ولن تُشارك مع أي طرف ثالث.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base"
              disabled={submitMutation.isPending}
              onClick={handleSubmit}
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "إرسال طلب التوثيق"
              )}
            </Button>
          </motion.div>
        )}

        {/* Benefits Card (always shown) */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-4 space-y-2">
          <h3 className="font-semibold text-sm text-indigo-900 mb-2">مميزات التوثيق</h3>
          {[
            { icon: CheckCircle2, text: "زيادة حدود التحويل اليومية" },
            { icon: CheckCircle2, text: "تفعيل سحب الأموال للحساب البنكي" },
            { icon: CheckCircle2, text: "حماية إضافية للحساب" },
            { icon: CheckCircle2, text: "أولوية في الدعم الفني" },
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-2">
              <benefit.icon className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-xs text-gray-700">{benefit.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
