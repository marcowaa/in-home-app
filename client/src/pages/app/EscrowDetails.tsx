import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import {
  ArrowRight, Shield, Package, Truck, Check, X, Loader2,
  MapPin, Clock, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import EscrowStatusBadge from "@/components/app/EscrowStatusBadge";
import EscrowTimeline from "@/components/app/EscrowTimeline";

export default function EscrowDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/user/escrow/${id}`],
  });

  const confirmMutation = useMutation({
    mutationFn: (code: string) => apiRequest("POST", `/api/user/escrow/${id}/confirm`, { confirmationCode: code }),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: [`/api/user/escrow/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/wallet"] });
      toast({ title: "تم تأكيد الاستلام!", description: `تم إفراج عن ${formatPrice(result.sellerAmount)} ج.م للبائع` });
      setConfirmDialog(false);
    },
    onError: () => toast({ title: "فشل التأكيد", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/escrow/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/escrow/${id}`] });
      toast({ title: "تم رفض الاستلام", description: "سيتم استرداد المبلغ" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/escrow/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/escrow/${id}`] });
      toast({ title: "تم قبول الطلب!" });
    },
  });

  const pickupMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/escrow/${id}/pickup`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/escrow/${id}`] });
      toast({ title: "تم تأكيد الاستلام من البائع" });
    },
  });

  const deliverMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/escrow/${id}/deliver`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/escrow/${id}`] });
      toast({ title: "تم تأكيد التوصيل!" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/escrow/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/escrow/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/wallet"] });
      toast({ title: "تم إلغاء الطلب" });
    },
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>;

  const order = data?.order;
  const tracking = data?.tracking || [];
  if (!order) return <div className="p-4 text-center text-gray-500">الطلب غير موجود</div>;

  const status = order.status;
  const userId = (data as any)?.userId; // We'll infer from session

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-5 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/app/escrow")} className="p-1">
            <ArrowRight className="h-5 w-5 text-white" />
          </button>
          <h1 className="font-bold text-lg">تفاصيل الصفقة</h1>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-xs">{order.orderNumber}</p>
            <p className="font-bold text-lg">{order.productDescription}</p>
          </div>
          <EscrowStatusBadge status={status} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Financial Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <h2 className="font-semibold text-sm text-gray-900 mb-2">التفاصيل المالية</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">قيمة المنتج</span><span className="font-medium">{formatPrice(order.productValue)} ج.م</span></div>
            <div className="flex justify-between"><span className="text-gray-500">رسوم التوصيل</span><span className="font-medium">{formatPrice(order.deliveryFeeAmount)} ج.م</span></div>
            <div className="flex justify-between"><span className="text-gray-500">رسوم المنصة</span><span className="font-medium">{formatPrice(order.platformFeeAmount)} ج.م</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-gray-100"><span>المبلغ المجمّد</span><span className="text-purple-700">{formatPrice(order.frozenAmount)} ج.م</span></div>
          </div>
        </div>

        {/* Parties */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-900">أطراف الصفقة</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">المشتري</span>
            <span className="font-medium">{order.creatorName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">البائع</span>
            <span className="font-medium">{order.sellerName}</span>
          </div>
          {order.deliveryPersonName && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المندوب</span>
              <span className="font-medium">{order.deliveryPersonName}</span>
            </div>
          )}
        </div>

        {/* Addresses */}
        {(order.pickupAddress || order.deliveryAddress) && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">العناوين</h2>
            {order.pickupAddress && <div className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><span className="text-gray-600">استلام: {order.pickupAddress}</span></div>}
            {order.deliveryAddress && <div className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><span className="text-gray-600">توصيل: {order.deliveryAddress}</span></div>}
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-sm text-gray-900 mb-4">تتبع الطلب</h2>
          <EscrowTimeline tracking={tracking} orderStatus={status} />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Buyer actions */}
          {status === "delivered" && (
            <>
              <Button className="w-full h-12 bg-green-600 hover:bg-green-700" onClick={() => setConfirmDialog(true)}>
                <Check className="h-5 w-5 ml-2" /> تأكيد الاستلام
              </Button>
              <Button variant="outline" className="w-full h-12 text-red-600 border-red-200" onClick={() => rejectMutation.mutate()}>
                <X className="h-5 w-5 ml-2" /> رفض الاستلام
              </Button>
            </>
          )}
          {status === "pending" && (
            <Button variant="outline" className="w-full h-12 text-red-600" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "إلغاء الطلب"}
            </Button>
          )}

          {/* Delivery person actions */}
          {status === "pending" && (
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
              {acceptMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "قبول التوصيل"}
            </Button>
          )}
          {status === "accepted" && (
            <Button className="w-full h-12 bg-blue-600" onClick={() => pickupMutation.mutate()} disabled={pickupMutation.isPending}>
              <Package className="h-5 w-5 ml-2" /> تأكيد الاستلام من البائع
            </Button>
          )}
          {status === "picked_up" && (
            <Button className="w-full h-12 bg-blue-600" onClick={() => deliverMutation.mutate()} disabled={deliverMutation.isPending}>
              <Truck className="h-5 w-5 ml-2" /> تأكيد التوصيل للمشتري
            </Button>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد الاستلام</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">أدخل كود التأكيد لاستلام المنتج</p>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-xs text-purple-600">كود التأكيد</p>
            <p className="font-bold text-2xl text-purple-700 font-mono">{order.confirmationCode}</p>
          </div>
          <div className="flex justify-center">
            <InputOTP value={confirmationCode} onChange={setConfirmationCode} maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>إلغاء</Button>
            <Button disabled={confirmationCode.length !== 6 || confirmMutation.isPending} onClick={() => confirmMutation.mutate(confirmationCode)}>
              {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
