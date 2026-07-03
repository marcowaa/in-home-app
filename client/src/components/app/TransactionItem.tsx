import {
  ArrowDownCircle, ArrowUpCircle, ArrowRight, ArrowLeft,
  Lock, Unlock, RotateCcw, Truck, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  topup: { label: "شحن محفظة", icon: ArrowDownCircle, color: "text-green-600" },
  withdraw: { label: "سحب", icon: ArrowUpCircle, color: "text-red-500" },
  transfer_sent: { label: "تحويل صادر", icon: ArrowLeft, color: "text-red-500" },
  transfer_received: { label: "تحويل وارد", icon: ArrowRight, color: "text-green-600" },
  escrow_freeze: { label: "تجميد رصيد", icon: Lock, color: "text-orange-500" },
  escrow_release: { label: "إفراج عن رصيد", icon: Unlock, color: "text-green-600" },
  escrow_refund: { label: "استرداد", icon: RotateCcw, color: "text-blue-500" },
  escrow_delivery_fee: { label: "عمولة توصيل", icon: Truck, color: "text-purple-500" },
};

export default function TransactionItem({ tx }: { tx: any }) {
  const config = typeConfig[tx.type] || { label: tx.type, icon: DollarSign, color: "text-gray-500" };
  const Icon = config.icon;
  const isPositive = ["topup", "transfer_received", "escrow_release", "escrow_refund", "escrow_delivery_fee"].includes(tx.type);
  const amount = parseFloat(tx.amount || "0");

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className={cn("w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0", config.color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{tx.description || config.label}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {tx.counterpartyName && <span>{tx.counterpartyName}</span>}
          {tx.referenceNumber && <span>• #{tx.referenceNumber}</span>}
        </div>
      </div>
      <div className="text-left flex-shrink-0">
        <p className={cn("font-semibold text-sm", isPositive ? "text-green-600" : "text-red-500")}>
          {isPositive ? "+" : "-"}{amount.toFixed(2)}
        </p>
        <p className="text-xs text-gray-400">ج.م</p>
      </div>
    </div>
  );
}
