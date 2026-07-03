import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import {
  ArrowRight, Check, X, Loader2, Play, AlertTriangle,
  Star, MapPin, Clock, FileText, User, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice, cn } from "@/lib/utils";

/* ---- Contract Status Badge ---- */

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "بانتظار القبول", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  accepted: { label: "مقبول", className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "قيد التنفيذ", className: "bg-blue-100 text-blue-700 border-blue-200" },
  delivered: { label: "تم التوصيل", className: "bg-teal-100 text-teal-700 border-teal-200" },
  milestone_review: { label: "مرحلة للمراجعة", className: "bg-orange-100 text-orange-700 border-orange-200" },
  completed: { label: "مكتمل", className: "bg-green-100 text-green-700 border-green-200" },
  disputed: { label: "نزاع", className: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "ملغى", className: "bg-gray-100 text-gray-500 border-gray-200" },
  refunded: { label: "مسترد", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

function ContractStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

/* ---- Milestone Badge ---- */

const milestoneStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "بانتظار التنفيذ", className: "bg-gray-100 text-gray-600 border-gray-200" },
  submitted: { label: "تم التسليم", className: "bg-blue-100 text-blue-700 border-blue-200" },
  approved: { label: "مقبولة", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "مرفوضة", className: "bg-red-100 text-red-700 border-red-200" },
};

function MilestoneBadge({ status }: { status: string }) {
  const config = milestoneStatusConfig[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

/* ---- Tracking Timeline ---- */

const trackingSteps = [
  { key: "created", label: "إنشاء العقد", icon: FileText },
  { key: "accepted", label: "قبول العقد", icon: Check },
  { key: "in_progress", label: "بدء التنفيذ", icon: Play },
  { key: "completed", label: "إتمام العقد", icon: Check },
];

function ContractTrackingTimeline({ tracking, orderStatus }: { tracking: any[]; orderStatus: string }) {
  const trackingStatuses = tracking.map((t) => t.status);
  const isCancelled = orderStatus === "cancelled" || orderStatus === "refunded";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
        <X className="h-5 w-5 text-gray-400" />
        <p className="text-sm text-gray-500">تم إلغاء العقد</p>
      </div>
    );
  }

  if (orderStatus === "disputed") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <p className="text-sm text-red-600">العقد في حالة نزاع</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {trackingSteps.map((step, i) => {
        const isDone = trackingStatuses.includes(step.key) ||
          (step.key === "completed" && orderStatus === "completed");
        const isCurrent = !isDone && (
          (step.key === "accepted" && orderStatus === "accepted") ||
          (step.key === "in_progress" && orderStatus === "in_progress")
        );
        const trackingEntry = tracking.find((t) => t.status === step.key);
        const Icon = step.icon;
        const isLast = i === trackingSteps.length - 1;

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                  isDone && "bg-green-100",
                  isCurrent && "bg-blue-100 ring-2 ring-blue-400 animate-pulse",
                  !isDone && !isCurrent && "bg-gray-100"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isDone && "text-green-600",
                    isCurrent && "text-blue-600",
                    !isDone && !isCurrent && "text-gray-300"
                  )}
                />
              </div>
              {!isLast && <div className={cn("w-0.5 h-6", isDone ? "bg-green-200" : "bg-gray-200")} />}
            </div>
            <div className="pt-1.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  isDone && "text-gray-900",
                  isCurrent && "text-blue-600",
                  !isDone && !isCurrent && "text-gray-400"
                )}
              >
                {step.label}
              </p>
              {trackingEntry && (
                <p className="text-xs text-gray-400">
                  {new Date(trackingEntry.createdAt).toLocaleString("ar-EG")}
                </p>
              )}
              {trackingEntry?.notes && (
                <p className="text-xs text-gray-500 mt-0.5">{trackingEntry.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- Main Component ---- */

export default function ContractDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [disputeDialog, setDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitMilestoneDialog, setSubmitMilestoneDialog] = useState(false);
  const [milestoneNotes, setMilestoneNotes] = useState("");
  const [extendDialog, setExtendDialog] = useState(false);
  const [extendHours, setExtendHours] = useState(24);

  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/user/contracts/${id}`],
  });

  const { data: authData } = useQuery<any>({
    queryKey: ["/api/user/auth/check"],
  });

  /* Mutations */

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/contracts/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم قبول العقد!" });
    },
    onError: () => toast({ title: "فشل القبول", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/contracts/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم رفض العقد" });
    },
    onError: () => toast({ title: "فشل الرفض", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/contracts/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/wallet"] });
      toast({ title: "تم إلغاء العقد" });
    },
    onError: () => toast({ title: "فشل الإلغاء", variant: "destructive" }),
  });

  const startMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/contracts/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم بدء التنفيذ!" });
    },
    onError: () => toast({ title: "فشل البدء", variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: (code: string) =>
      apiRequest("POST", `/api/user/contracts/${id}/complete`, { confirmationCode: code }),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/wallet"] });
      toast({ title: "تم إتمام العقد!", description: `تم إفراج عن ${formatPrice(result.releasedAmount || "0")} ج.م` });
      setConfirmDialog(false);
    },
    onError: () => toast({ title: "فشل التأكيد", variant: "destructive" }),
  });

  const disputeMutation = useMutation({
    mutationFn: (reason: string) =>
      apiRequest("POST", `/api/user/contracts/${id}/dispute`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم فتح نزاع", description: "سيتم مراجعة الأمر" });
      setDisputeDialog(false);
      setDisputeReason("");
    },
    onError: () => toast({ title: "فشل فتح النزاع", variant: "destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: (data: { rating: number; comment: string }) =>
      apiRequest("POST", `/api/user/contracts/${id}/review`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم إرسال التقييم!" });
      setReviewDialog(false);
    },
    onError: () => toast({ title: "فشل إرسال التقييم", variant: "destructive" }),
  });

  const submitMilestoneMutation = useMutation({
    mutationFn: (milestoneId: number) =>
      apiRequest("POST", `/api/user/contracts/${id}/milestones/${milestoneId}/submit`, { notes: milestoneNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم تسليم المرحلة!" });
      setSubmitMilestoneDialog(false);
      setMilestoneNotes("");
    },
    onError: () => toast({ title: "فشل تسليم المرحلة", variant: "destructive" }),
  });

  const approveMilestoneMutation = useMutation({
    mutationFn: (milestoneId: number) =>
      apiRequest("POST", `/api/user/contracts/${id}/milestones/${milestoneId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تمت الموافقة على المرحلة!" });
    },
    onError: () => toast({ title: "فشلت الموافقة", variant: "destructive" }),
  });

  const rejectMilestoneMutation = useMutation({
    mutationFn: (milestoneId: number) =>
      apiRequest("POST", `/api/user/contracts/${id}/milestones/${milestoneId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم رفض المرحلة" });
    },
    onError: () => toast({ title: "فشل الرفض", variant: "destructive" }),
  });

  const confirmPickupMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/contracts/${id}/confirm-pickup`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم تأكيد التسليم للمندوب" });
    },
    onError: () => toast({ title: "فشل تأكيد التسليم", variant: "destructive" }),
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/contracts/${id}/confirm-delivery`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم تأكيد التوصيل للمشتري" });
    },
    onError: () => toast({ title: "فشل تأكيد التوصيل", variant: "destructive" }),
  });

  const requestReturnMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/contracts/${id}/request-return`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم طلب الإرجاع" });
    },
    onError: () => toast({ title: "فشل طلب الإرجاع", variant: "destructive" }),
  });

  const extendMutation = useMutation({
    mutationFn: (hours: number) =>
      apiRequest("POST", `/api/user/contracts/${id}/extend`, { hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      toast({ title: "تم طلب التمديد" });
      setExtendDialog(false);
    },
    onError: () => toast({ title: "فشل طلب التمديد", variant: "destructive" }),
  });

  const confirmReturnMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/contracts/${id}/confirm-return`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/contracts/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/wallet"] });
      toast({ title: "تم تأكيد الإرجاع" });
    },
    onError: () => toast({ title: "فشل تأكيد الإرجاع", variant: "destructive" }),
  });

  /* Render */

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );

  const contract = data?.contract;
  const tracking = data?.tracking || [];
  const milestones = contract?.milestones || [];
  const currentUserId = authData?.user?.id;
  const userRole = contract && currentUserId
    ? (contract.creatorId === currentUserId ? "creator"
       : contract.counterpartyId === currentUserId ? "counterparty"
       : contract.deliveryPersonId === currentUserId ? "delivery"
       : data?.userRole)
    : data?.userRole;

  if (!contract) return <div className="p-4 text-center text-gray-500">العقد غير موجود</div>;

  const status = contract.status;

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-5 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/app/contracts")} className="p-1">
            <ArrowRight className="h-5 w-5 text-white" />
          </button>
          <h1 className="font-bold text-lg">تفاصيل العقد</h1>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-xs">{contract.contractNumber}</p>
            <p className="font-bold text-lg">{contract.title}</p>
          </div>
          <ContractStatusBadge status={status} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* User Role Badge */}
        {userRole && (
          <div className="flex justify-center">
            <Badge className={cn("px-4 py-1.5 text-sm font-medium",
              userRole === "creator" ? "bg-purple-100 text-purple-700" :
              userRole === "counterparty" ? "bg-blue-100 text-blue-700" :
              "bg-orange-100 text-orange-700"
            )}>
              {userRole === "creator" ? "أنت المنشئ" :
               userRole === "counterparty" ? "أنت الطرف الآخر" :
               "أنت المندوب"}
            </Badge>
          </div>
        )}

        {/* Contract Info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-purple-600" />
            <h2 className="font-semibold text-sm text-gray-900">معلومات العقد</h2>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">النوع</span>
            <span className="font-medium">{contract.typeLabel || contract.type}</span>
          </div>
          {contract.description && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">الوصف</p>
              <p className="text-sm text-gray-700">{contract.description}</p>
            </div>
          )}
        </div>

        {/* Financial Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <h2 className="font-semibold text-sm text-gray-900 mb-2">التفاصيل المالية</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">المبلغ الإجمالي</span>
              <span className="font-medium">{formatPrice(contract.amount)} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">رسوم المنصة</span>
              <span className="font-medium">{formatPrice(contract.platformFee || "0")} ج.م</span>
            </div>
            {parseFloat(contract.deliveryFee || "0") > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">رسوم التوصيل</span>
                <span className="font-medium">{formatPrice(contract.deliveryFee || "0")} ج.م</span>
              </div>
            )}
            {parseFloat(contract.depositAmount || "0") > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">وديعة التلف</span>
                <span className="font-medium">{formatPrice(contract.depositAmount)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
              <span>المبلغ المجمّد</span>
              <span className="text-purple-700">{formatPrice(contract.frozenAmount || contract.amount)} ج.م</span>
            </div>
            {contract.cancellationFeeApplied && status === "cancelled" && (
              <div className="flex justify-between text-red-600 pt-2 border-t border-gray-100">
                <span>رسوم الإلغاء</span>
                <span className="font-medium">{formatPrice(contract.cancellationFee || "0")} ج.م</span>
              </div>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-900">أطراف العقد</h2>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-gray-500">المنشئ</span>
            <span className="font-medium mr-auto">{contract.creatorName}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-gray-500">الطرف الآخر</span>
            <span className="font-medium mr-auto">{contract.counterpartyName}</span>
          </div>
          {contract.deliveryPersonName && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Truck className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-gray-500">المندوب</span>
              <span className="font-medium mr-auto">{contract.deliveryPersonName}</span>
            </div>
          )}
        </div>

        {/* Addresses (purchase/rental) */}
        {(contract.pickupAddress || contract.deliveryAddress) && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">العناوين</h2>
            {contract.pickupAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-gray-600">استلام: {contract.pickupAddress}</span>
              </div>
            )}
            {contract.deliveryAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-gray-600">توصيل: {contract.deliveryAddress}</span>
              </div>
            )}
          </div>
        )}

        {/* Rental dates */}
        {contract.type === "rental" && (contract.startDate || contract.endDate) && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">فترة الإيجار</h2>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">
                من {contract.startDate ? new Date(contract.startDate).toLocaleDateString("ar-EG") : "-"} إلى{" "}
                {contract.endDate ? new Date(contract.endDate).toLocaleDateString("ar-EG") : "-"}
              </span>
            </div>
          </div>
        )}

        {/* Custom terms */}
        {contract.type === "custom" && contract.customTerms && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">الشروط المخصصة</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{contract.customTerms}</p>
          </div>
        )}

        {/* Milestones (service contracts) */}
        {contract.type === "service" && milestones.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">مراحل الخدمة</h2>
            {milestones.map((m: any, i: number) => (
              <div key={m.id || i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                        m.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : m.status === "submitted"
                            ? "bg-blue-100 text-blue-700"
                            : m.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {i + 1}
                    </div>
                    <span className="font-medium text-sm">{m.title}</span>
                  </div>
                  <MilestoneBadge status={m.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">المبلغ</span>
                  <span className="font-medium">{formatPrice(m.amount)} ج.م</span>
                </div>
                {/* Milestone actions */}
                {m.status === "pending" && userRole === "counterparty" && status === "in_progress" && (
                  <Button
                    size="sm"
                    className="w-full h-9"
                    onClick={() => {
                      setSubmitMilestoneDialog(m.id);
                    }}
                  >
                    تسليم المرحلة
                  </Button>
                )}
                {m.status === "submitted" && userRole === "creator" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-9 bg-green-600 hover:bg-green-700"
                      disabled={approveMilestoneMutation.isPending}
                      onClick={() => approveMilestoneMutation.mutate(m.id)}
                    >
                      <Check className="h-4 w-4 ml-1" /> قبول
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 text-red-600 border-red-200"
                      disabled={rejectMilestoneMutation.isPending}
                      onClick={() => rejectMilestoneMutation.mutate(m.id)}
                    >
                      <X className="h-4 w-4 ml-1" /> رفض
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tracking Timeline */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-sm text-gray-900 mb-4">تتبع العقد</h2>
          <ContractTrackingTimeline tracking={tracking} orderStatus={status} />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* pending - counterparty: accept/reject */}
          {status === "pending" && userRole === "counterparty" && (
            <>
              <Button
                className="w-full h-12 bg-green-600 hover:bg-green-700"
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
              >
                {acceptMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 ml-2" />}
                قبول العقد
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-red-600 border-red-200"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
              >
                <X className="h-5 w-5 ml-2" /> رفض العقد
              </Button>
            </>
          )}

          {/* pending - creator: cancel */}
          {status === "pending" && userRole === "creator" && (
            <Button
              variant="outline"
              className="w-full h-12 text-red-600"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "إلغاء العقد"}
            </Button>
          )}

          {/* accepted: start */}
          {status === "accepted" && (
            <Button
              className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
            >
              {startMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 ml-2" />}
              بدء التنفيذ
            </Button>
          )}

          {/* in_progress/delivered - creator, purchase/delivery: complete with confirmation code */}
          {(status === "in_progress" || status === "delivered") && userRole === "creator" && (contract.type === "purchase" || contract.type === "delivery") && (
            <Button
              className="w-full h-12 bg-green-600 hover:bg-green-700"
              onClick={() => setConfirmDialog(true)}
            >
              <Check className="h-5 w-5 ml-2" /> تأكيد الاستلام
            </Button>
          )}

          {/* accepted/in_progress - counterparty: confirm pickup to delivery person */}
          {(status === "accepted" || status === "in_progress") && userRole === "counterparty" && (
            <Button
              className="w-full h-12 bg-teal-600 hover:bg-teal-700"
              disabled={confirmPickupMutation.isPending}
              onClick={() => confirmPickupMutation.mutate()}
            >
              {confirmPickupMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Truck className="h-5 w-5 ml-2" />}
              تأكيد التسليم للمندوب
            </Button>
          )}

          {/* in_progress - delivery/counterparty: confirm delivery to buyer */}
          {status === "in_progress" && (userRole === "delivery" || userRole === "counterparty") && (
            <Button
              className="w-full h-12 bg-teal-600 hover:bg-teal-700"
              disabled={confirmDeliveryMutation.isPending}
              onClick={() => confirmDeliveryMutation.mutate()}
            >
              {confirmDeliveryMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 ml-2" />}
              تأكيد التوصيل للمشتري
            </Button>
          )}

          {/* rental - in_progress: request return */}
          {contract.type === "rental" && status === "in_progress" && (
            <Button
              variant="outline"
              className="w-full h-12 text-orange-600 border-orange-200"
              disabled={requestReturnMutation.isPending}
              onClick={() => requestReturnMutation.mutate()}
            >
              {requestReturnMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5 ml-2" />}
              طلب إرجاع
            </Button>
          )}

          {/* rental - in_progress: request extension */}
          {contract.type === "rental" && status === "in_progress" && (
            <Button
              variant="outline"
              className="w-full h-12 text-blue-600 border-blue-200"
              onClick={() => setExtendDialog(true)}
            >
              <Clock className="h-5 w-5 ml-2" /> طلب تمديد
            </Button>
          )}

          {/* rental - in_progress, return requested by other party: confirm return */}
          {contract.type === "rental" && status === "in_progress" && contract.returnRequested && (
            <Button
              className="w-full h-12 bg-green-600 hover:bg-green-700"
              disabled={confirmReturnMutation.isPending}
              onClick={() => confirmReturnMutation.mutate()}
            >
              {confirmReturnMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 ml-2" />}
              تأكيد الإرجاع
            </Button>
          )}

          {/* in_progress / disputed: dispute button */}
          {(status === "in_progress" || status === "disputed") && (
            <Button
              variant="outline"
              className="w-full h-12 text-orange-600 border-orange-200"
              onClick={() => setDisputeDialog(true)}
            >
              <AlertTriangle className="h-5 w-5 ml-2" /> فتح نزاع
            </Button>
          )}

          {/* completed: review button */}
          {status === "completed" && (
            <Button
              className="w-full h-12 bg-purple-600 hover:bg-purple-700"
              onClick={() => setReviewDialog(true)}
            >
              <Star className="h-5 w-5 ml-2" /> تقييم
            </Button>
          )}
        </div>
      </div>

      {/* Complete / Confirm Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الاستلام</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">أدخل كود التأكيد لإتمام العقد</p>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-xs text-purple-600">كود التأكيد</p>
            <p className="font-bold text-2xl text-purple-700 font-mono">
              {contract.confirmationCode || "------"}
            </p>
          </div>
          <div className="flex justify-center">
            <InputOTP value={confirmationCode} onChange={setConfirmationCode} maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              إلغاء
            </Button>
            <Button
              disabled={confirmationCode.length !== 6 || completeMutation.isPending}
              onClick={() => completeMutation.mutate(confirmationCode)}
            >
              {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>فتح نزاع</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">اكتب سبب النزاع وسيتم مراجعته</p>
          <Textarea
            placeholder="سبب النزاع..."
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialog(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={!disputeReason.trim() || disputeMutation.isPending}
              onClick={() => disputeMutation.mutate(disputeReason)}
            >
              {disputeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "فتح النزاع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تقييم العقد</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setReviewRating(star)}>
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    star <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="اكتب تعليقك..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              تخطي
            </Button>
            <Button
              disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ rating: reviewRating, comment: reviewText })}
            >
              {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال التقييم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Milestone Dialog */}
      <Dialog open={!!submitMilestoneDialog} onOpenChange={(open) => !open && setSubmitMilestoneDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسليم المرحلة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">أضف ملاحظات حول تسليم المرحلة</p>
          <Textarea
            placeholder="ملاحظات التسليم..."
            value={milestoneNotes}
            onChange={(e) => setMilestoneNotes(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitMilestoneDialog(false)}>
              إلغاء
            </Button>
            <Button
              disabled={submitMilestoneMutation.isPending}
              onClick={() => {
                if (typeof submitMilestoneDialog === "number") {
                  submitMilestoneMutation.mutate(submitMilestoneDialog);
                }
              }}
            >
              {submitMilestoneMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسليم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Rental Dialog */}
      <Dialog open={extendDialog} onOpenChange={setExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلب تمديد الإيجار</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">اختر مدة التمديد</p>
          <div className="flex gap-2 justify-center py-2">
            {[24, 48, 72].map((h) => (
              <Button
                key={h}
                variant={extendHours === h ? "default" : "outline"}
                className={extendHours === h ? "bg-purple-600" : ""}
                onClick={() => setExtendHours(h)}
              >
                {h} ساعة
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog(false)}>
              إلغاء
            </Button>
            <Button
              disabled={extendMutation.isPending}
              onClick={() => extendMutation.mutate(extendHours)}
            >
              {extendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد التمديد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
