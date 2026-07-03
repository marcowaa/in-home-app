import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, FileText, Shield, TrendingUp, BadgeCheck, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import BalanceCard from "@/components/app/BalanceCard";
import QuickActions from "@/components/app/QuickActions";
import TransactionItem from "@/components/app/TransactionItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";

export default function AppHome() {
  const { data: authData, isLoading: authLoading } = useQuery<any>({
    queryKey: ["/api/user/auth/check"],
  });
  const { data: walletData, isLoading: walletLoading } = useQuery<any>({
    queryKey: ["/api/user/wallet"],
    enabled: !!authData?.loggedIn,
  });
  const { data: contractsData } = useQuery<any>({
    queryKey: ["/api/user/contracts"],
    enabled: !!authData?.loggedIn,
  });

  const user = authData?.user;
  const transactions = walletData?.transactions?.slice(0, 5) || [];
  const activeContracts = [
    ...(contractsData?.asCreator || []),
    ...(contractsData?.asCounterparty || []),
  ].filter((c: any) => ["pending", "accepted", "in_progress", "milestone_review"].includes(c.status)).slice(0, 3);

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-5 pt-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm">مرحباً</p>
            <p className="font-bold text-lg">{user?.name || "مستخدم"}</p>
          </div>
          <Link href="/app/scan">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center cursor-pointer">
              <Bell className="h-5 w-5" />
            </div>
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
          <p className="text-blue-100 text-xs mb-1">الرصيد المتاح</p>
          {walletLoading ? (
            <Skeleton className="h-8 w-32 bg-white/20" />
          ) : (
            <p className="text-3xl font-bold">{formatPrice(walletData?.balance || "0")} <span className="text-base font-normal">ج.م</span></p>
          )}
          {parseFloat(walletData?.frozenBalance || "0") > 0 && (
            <div className="mt-2 pt-2 border-t border-white/20">
              <p className="text-blue-100 text-xs">رصيد مجمّد: {formatPrice(walletData?.frozenBalance || "0")} ج.م</p>
            </div>
          )}
        </div>

        {/* KYC Alert */}
        {user && user.kycStatus !== "verified" && (
          <Link href="/app/kyc">
            <div className="mt-3 bg-amber-500/20 backdrop-blur border border-amber-300/30 rounded-xl p-3 flex items-center gap-2 cursor-pointer">
              <AlertCircle className="h-4 w-4 text-amber-200 flex-shrink-0" />
              <p className="text-xs text-amber-50">
                {user.kycStatus === "none" ? "وثّق حسابك لزيادة حدود التحويل" : "توثيقك قيد المراجعة"}
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <QuickActions />
        </div>
      </div>

      {/* Active Contracts */}
      {activeContracts.length > 0 && (
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">العقود النشطة</h2>
            <Link href="/app/contracts">
              <Button variant="ghost" size="sm" className="text-blue-600">عرض الكل</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {activeContracts.map((contract: any) => (
              <Link key={contract.id} href={`/app/contracts/${contract.id}`}>
                <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{contract.title}</p>
                    <p className="text-xs text-gray-400">{contract.contractNumber}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm text-gray-900">{formatPrice(contract.totalAmount)}</p>
                    <p className="text-xs text-gray-400">ج.م</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">آخر العمليات</h2>
          <Link href="/app/wallet">
            <Button variant="ghost" size="sm" className="text-blue-600">عرض الكل</Button>
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-2 space-y-1">
          {walletLoading ? (
            [1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)
          ) : transactions.length > 0 ? (
            transactions.map((tx: any) => <TransactionItem key={tx.id} tx={tx} />)
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">لا توجد عمليات بعد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
