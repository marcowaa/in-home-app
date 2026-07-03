import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Plus, ArrowUp, Loader2, Wallet as WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import TransactionItem from "@/components/app/TransactionItem";

export default function UserWallet() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [topupDialog, setTopupDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [providerId, setProviderId] = useState("");

  const { data: walletData, isLoading } = useQuery<any>({
    queryKey: ["/api/user/wallet"],
  });
  const { data: providersData } = useQuery<any>({
    queryKey: ["/api/user/wallet/providers"],
    enabled: topupDialog || withdrawDialog,
  });

  const topupMutation = useMutation({
    mutationFn: (data: { amount: string; providerId: string }) => apiRequest("POST", "/api/user/wallet/topup", data),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/user/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/auth/check"] });
      toast({ title: "تم الشحن", description: `رصيدك: ${formatPrice(result.newBalance)} ج.م` });
      setTopupDialog(false); setAmount(""); setProviderId("");
    },
    onError: () => toast({ title: "فشل الشحن", variant: "destructive" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: string; providerId: string }) => apiRequest("POST", "/api/user/wallet/withdraw", data),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/user/wallet"] });
      toast({ title: "تم السحب", description: `رصيدك: ${formatPrice(result.newBalance)} ج.م` });
      setWithdrawDialog(false); setAmount(""); setProviderId("");
    },
    onError: () => toast({ title: "فشل السحب", variant: "destructive" }),
  });

  const providers = providersData?.providers || [];
  const transactions = walletData?.transactions || [];
  const balance = parseFloat(walletData?.balance || "0");
  const frozen = parseFloat(walletData?.frozenBalance || "0");

  return (
    <div dir="rtl" className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/home")}><ArrowRight className="h-5 w-5" /></Button>
        <h1 className="font-bold text-gray-900">محفظتي</h1>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-5 m-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <WalletIcon className="h-5 w-5" />
          <p className="text-blue-100 text-sm">الرصيد المتاح</p>
        </div>
        <p className="text-3xl font-bold">{formatPrice(String(balance - frozen))} <span className="text-base font-normal">ج.م</span></p>
        {frozen > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between text-sm">
            <span className="text-blue-100">الرصيد المجمد</span>
            <span className="font-medium">{formatPrice(String(frozen))} ج.م</span>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-white/20 flex justify-between text-sm">
          <span className="text-blue-100">إجمالي الرصيد</span>
          <span className="font-medium">{formatPrice(String(balance))} ج.م</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <Button className="h-12 gap-2" onClick={() => setTopupDialog(true)}>
          <Plus className="h-5 w-5" /> شحن المحفظة
        </Button>
        <Button variant="outline" className="h-12 gap-2" onClick={() => setWithdrawDialog(true)}>
          <ArrowUp className="h-5 w-5" /> سحب
        </Button>
      </div>

      {/* Transactions */}
      <div className="px-4 mt-6">
        <h2 className="font-bold text-gray-900 mb-3">سجل العمليات</h2>
        {isLoading ? (
          [1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full mb-1" />)
        ) : transactions.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-2 space-y-1">
            {transactions.map((tx: any) => <TransactionItem key={tx.id} tx={tx} />)}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">لا توجد عمليات بعد</div>
        )}
      </div>

      {/* Top Up Dialog */}
      <Dialog open={topupDialog} onOpenChange={setTopupDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>شحن المحفظة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger><SelectValue placeholder="اختر طريقة الشحن" /></SelectTrigger>
              <SelectContent>
                {providers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="المبلغ بج.م" value={amount} onChange={e => setAmount(e.target.value)} className="h-12 text-center text-lg" />
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map(a => (
                <button key={a} onClick={() => setAmount(String(a))} className="bg-gray-100 rounded-lg py-2 text-sm">{a}</button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupDialog(false)}>إلغاء</Button>
            <Button disabled={!amount || !providerId || topupMutation.isPending} onClick={() => topupMutation.mutate({ amount, providerId })}>
              {topupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "شحن"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>سحب من المحفظة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger><SelectValue placeholder="اختر طريقة السحب" /></SelectTrigger>
              <SelectContent>
                {providers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="المبلغ بج.م" value={amount} onChange={e => setAmount(e.target.value)} className="h-12 text-center text-lg" />
            <p className="text-xs text-gray-400">الرصيد المتاح: {formatPrice(String(balance - frozen))} ج.م</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialog(false)}>إلغاء</Button>
            <Button disabled={!amount || !providerId || withdrawMutation.isPending} onClick={() => withdrawMutation.mutate({ amount, providerId })}>
              {withdrawMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "سحب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
