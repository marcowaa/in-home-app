import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";

export default function TransferHistory() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/transfer/history"],
  });

  const transfers = data?.transfers || [];

  return (
    <div dir="rtl" className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/home")}><ArrowRight className="h-5 w-5" /></Button>
        <h1 className="font-bold text-gray-900">سجل التحويلات</h1>
      </div>

      <div className="p-4 space-y-2">
        {isLoading ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : transfers.length > 0 ? (
          transfers.map((t: any) => {
            const isSent = true; // We only see our sent transfers
            return (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSent ? "bg-red-50" : "bg-green-50"}`}>
                  {isSent ? <ArrowLeft className="h-5 w-5 text-red-500" /> : <ArrowRight className="h-5 w-5 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{isSent ? t.receiverName : t.senderName}</p>
                  <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString("ar-EG")}</p>
                  <p className="text-xs text-gray-400 font-mono">#{t.referenceNumber}</p>
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${isSent ? "text-red-500" : "text-green-600"}`}>
                    {isSent ? "-" : "+"}{formatPrice(t.amount)}
                  </p>
                  <p className="text-xs text-gray-400">ج.م</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">لا توجد تحويلات بعد</p>
            <Button className="mt-4" onClick={() => navigate("/app/transfer")}>تحويل الآن</Button>
          </div>
        )}
      </div>
    </div>
  );
}
