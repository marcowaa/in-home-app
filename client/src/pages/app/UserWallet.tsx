import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Plus, ArrowUp, Loader2, CreditCard, Search, Trash2, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice, cn } from "@/lib/utils";
import TransactionItem from "@/components/app/TransactionItem";

export default function UserWallet() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [topupDialog, setTopupDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [addCardDialog, setAddCardDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [providerId, setProviderId] = useState("");
  const [txSearch, setTxSearch] = useState("");

  // Card form
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardBrand, setCardBrand] = useState("visa");

  const { data: walletData, isLoading } = useQuery<any>({
    queryKey: ["/api/user/wallet"],
  });
  const { data: providersData } = useQuery<any>({
    queryKey: ["/api/user/wallet/providers"],
    enabled: topupDialog || withdrawDialog,
  });
  const { data: cardsData } = useQuery<any>({
    queryKey: ["/api/user/cards"],
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

  const addCardMutation = useMutation({
    mutationFn: (data: { cardName: string; last4: string; brand: string }) => apiRequest("POST", "/api/user/cards", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/cards"] });
      toast({ title: "تم ربط البطاقة" });
      setAddCardDialog(false); setCardName(""); setCardNumber("");
    },
    onError: () => toast({ title: "فشل ربط البطاقة", variant: "destructive" }),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (cardId: string) => apiRequest("POST", `/api/user/cards/${cardId}/primary`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/cards"] });
      toast({ title: "تم تعيين البطاقة الرئيسية" });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => apiRequest("DELETE", `/api/user/cards/${cardId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/cards"] });
      toast({ title: "تم حذف البطاقة" });
    },
  });

  const providers = providersData?.providers || [];
  const allTransactions = walletData?.transactions || [];
  const cards = cardsData?.cards || [];
  const balance = parseFloat(walletData?.balance || "0");
  const frozen = parseFloat(walletData?.frozenBalance || "0");

  const transactions = allTransactions.filter((tx: any) => {
    if (!txSearch) return true;
    const s = txSearch.toLowerCase();
    return (
      (tx.description || "").toLowerCase().includes(s) ||
      (tx.type || "").toLowerCase().includes(s) ||
      (tx.referenceNumber || "").toLowerCase().includes(s) ||
      (tx.counterpartyName || "").toLowerCase().includes(s) ||
      String(tx.amount || "").includes(s)
    );
  });

  const handleAddCard = () => {
    if (!cardName || cardNumber.length < 4) return;
    const last4 = cardNumber.replace(/\s/g, "").slice(-4);
    addCardMutation.mutate({ cardName, last4, brand: cardBrand });
  };

  const cardColors = [
    "from-blue-600 to-purple-700",
    "from-green-600 to-teal-700",
    "from-orange-500 to-red-600",
    "from-gray-700 to-gray-900",
    "from-indigo-600 to-pink-600",
  ];

  return (
    <div dir="rtl" className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/home")}><ArrowRight className="h-5 w-5" /></Button>
        <h1 className="font-bold text-gray-900">محفظتي</h1>
      </div>

      {/* Bank Cards Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 text-sm">بطاقاتي</h2>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setAddCardDialog(true)}>
            <Plus className="h-4 w-4" /> ربط بطاقة
          </Button>
        </div>

        {/* Cards carousel */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          {/* Main wallet card */}
          <div className="snap-start flex-shrink-0 w-[300px] bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <span className="text-sm font-medium">المحفظة</span>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">رئيسية</span>
            </div>
            <p className="text-xs text-blue-100 mb-1">الرصيد المتاح</p>
            <p className="text-2xl font-bold mb-3">{formatPrice(String(balance - frozen))} <span className="text-sm">ج.م</span></p>
            {frozen > 0 && (
              <div className="pt-2 border-t border-white/20 flex justify-between text-xs">
                <span className="text-blue-100">مجمّد</span>
                <span>{formatPrice(String(frozen))} ج.م</span>
              </div>
            )}
            <div className="mt-3 flex gap-1.5">
              <div className="w-8 h-5 bg-yellow-400/80 rounded-sm" />
              <div className="w-8 h-5 bg-red-500/80 rounded-sm" />
            </div>
          </div>

          {/* Linked bank cards */}
          {cards.map((card: any, i: number) => {
            const color = card.color || cardColors[i % cardColors.length];
            return (
              <div key={card.id} className={cn("snap-start flex-shrink-0 w-[300px] bg-gradient-to-br text-white rounded-2xl p-4 shadow-lg relative", color)}>
                {card.is_primary && (
                  <span className="absolute top-3 left-3 text-[10px] bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" /> رئيسية
                  </span>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">{card.card_name}</span>
                  <span className="text-xs uppercase">{card.brand}</span>
                </div>
                <div className="mb-4 mt-6">
                  <p className="text-xs opacity-80 mb-1">الرصيد</p>
                  <p className="text-2xl font-bold">{formatPrice(String(card.balance))} <span className="text-sm">ج.م</span></p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-base tracking-widest">•••• {card.last4}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setPrimaryMutation.mutate(card.id)} className="p-1 hover:bg-white/20 rounded" title="تعيين رئيسية">
                      <Star className={cn("h-4 w-4", card.is_primary ? "fill-yellow-300 text-yellow-300" : "text-white/60")} />
                    </button>
                    <button onClick={() => deleteCardMutation.mutate(card.id)} className="p-1 hover:bg-white/20 rounded" title="حذف">
                      <Trash2 className="h-4 w-4 text-white/60" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <div className="w-8 h-5 bg-yellow-400/60 rounded-sm" />
                  <div className="w-8 h-5 bg-red-500/60 rounded-sm" />
                </div>
              </div>
            );
          })}

          {/* Add card button */}
          <button
            onClick={() => setAddCardDialog(true)}
            className="snap-start flex-shrink-0 w-[300px] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[160px]"
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="text-sm">ربط بطاقة جديدة</span>
          </button>
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
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="ابحث في العمليات... (الوصف، النوع، المبلغ، المرجع)"
            value={txSearch}
            onChange={(e) => setTxSearch(e.target.value)}
            className="h-10 pr-9"
          />
        </div>
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

      {/* Add Card Dialog */}
      <Dialog open={addCardDialog} onOpenChange={setAddCardDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>ربط بطاقة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">اسم البطاقة</label>
              <Input
                placeholder="مثال: فيزا الأهلي"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">رقم البطاقة</label>
              <Input
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                maxLength={19}
                dir="ltr"
                className="h-12 text-center font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">سيتم تخزين آخر 4 أرقام فقط</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">نوع البطاقة</label>
              <Select value={cardBrand} onValueChange={setCardBrand}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="meeza">Meeza</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCardDialog(false)}>إلغاء</Button>
            <Button
              disabled={!cardName || cardNumber.replace(/\s/g, "").length < 4 || addCardMutation.isPending}
              onClick={handleAddCard}
            >
              {addCardMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ربط"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
