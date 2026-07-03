import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "بانتظار المندوب", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  accepted: { label: "تم القبول", className: "bg-blue-100 text-blue-700 border-blue-200" },
  picked_up: { label: "تم الاستلام", className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_transit: { label: "في الطريق", className: "bg-blue-100 text-blue-700 border-blue-200" },
  delivered: { label: "بانتظار التأكيد", className: "bg-orange-100 text-orange-700 border-orange-200" },
  released: { label: "مكتمل", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "مرفوض", className: "bg-red-100 text-red-700 border-red-200" },
  refunded: { label: "مسترد", className: "bg-gray-100 text-gray-600 border-gray-200" },
  cancelled: { label: "ملغي", className: "bg-gray-100 text-gray-500 border-gray-200" },
  disputed: { label: "نزاع", className: "bg-red-100 text-red-700 border-red-200" },
  expired: { label: "منتهي", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function EscrowStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
