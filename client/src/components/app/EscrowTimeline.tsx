import { Check, Clock, Package, Truck, Home, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { key: "created", label: "إنشاء الطلب", icon: Package },
  { key: "accepted", label: "قبول المندوب", icon: Check },
  { key: "picked_up", label: "استلام المنتج", icon: Package },
  { key: "in_transit", label: "في الطريق", icon: Truck },
  { key: "delivered", label: "تم التوصيل", icon: Home },
  { key: "confirmed", label: "تأكيد الاستلام", icon: Check },
];

export default function EscrowTimeline({ tracking, orderStatus }: { tracking: any[]; orderStatus: string }) {
  const trackingStatuses = tracking.map(t => t.status);
  const isRejected = orderStatus === "rejected" || orderStatus === "refunded";
  const isCancelled = orderStatus === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
        <XCircle className="h-5 w-5 text-gray-400" />
        <p className="text-sm text-gray-500">تم إلغاء الطلب</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const isDone = trackingStatuses.includes(step.key) ||
          (step.key === "confirmed" && orderStatus === "released");
        const isCurrent = !isDone && (
          (step.key === "accepted" && orderStatus === "accepted") ||
          (step.key === "picked_up" && orderStatus === "picked_up") ||
          (step.key === "in_transit" && orderStatus === "in_transit") ||
          (step.key === "delivered" && orderStatus === "delivered")
        );
        const trackingEntry = tracking.find(t => t.status === step.key);
        const Icon = step.icon;
        const isLast = i === steps.length - 1;

        if (isRejected && (step.key === "confirmed")) {
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                {!isLast && <div className="w-0.5 h-6 bg-gray-200" />}
              </div>
              <div className="pt-1.5">
                <p className="text-sm font-medium text-red-600">تم الرفض</p>
                {trackingEntry && <p className="text-xs text-gray-400">{new Date(trackingEntry.createdAt).toLocaleString("ar-EG")}</p>}
                {trackingEntry?.notes && <p className="text-xs text-gray-500 mt-0.5">{trackingEntry.notes}</p>}
              </div>
            </div>
          );
        }

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                isDone && "bg-green-100",
                isCurrent && "bg-blue-100 ring-2 ring-blue-400 animate-pulse",
                !isDone && !isCurrent && "bg-gray-100"
              )}>
                <Icon className={cn(
                  "h-5 w-5",
                  isDone && "text-green-600",
                  isCurrent && "text-blue-600",
                  !isDone && !isCurrent && "text-gray-300"
                )} />
              </div>
              {!isLast && <div className={cn("w-0.5 h-6", isDone ? "bg-green-200" : "bg-gray-200")} />}
            </div>
            <div className="pt-1.5">
              <p className={cn(
                "text-sm font-medium",
                isDone && "text-gray-900",
                isCurrent && "text-blue-600",
                !isDone && !isCurrent && "text-gray-400"
              )}>{step.label}</p>
              {trackingEntry && (
                <p className="text-xs text-gray-400">{new Date(trackingEntry.createdAt).toLocaleString("ar-EG")}</p>
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
