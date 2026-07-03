import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Loader2, ChevronRight,
  Plus, ArrowRight, DollarSign, Clock, CheckCircle2, XCircle,
  CreditCard, Copy, ChevronLeft, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

export default function DriverWallet() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [depositDialog, setDepositDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [depositStep, setDepositStep] = useState(1); // 1=amount, 2=payment method, 3=details+confirm
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);

  const { data: authData, isLoading: authLoading } = useQuery<any>({
    queryKey: ["/api/driver/check"],
    retry: false,
  });

  const { data: walletData, isLoading: walletLoading } = useQuery<any>({
    queryKey: ["/api/driver/wallet"],
    enabled: !!authData?.loggedIn,
  });

  const { data: paymentMethods } = useQuery<any[]>({
    queryKey: ["/api/payment-methods"],
    enabled: depositDialog,
  });

  const depositMutation = useMutation({
    mutationFn: (data: { amount: string; paymentMethodId: string }) =>
      apiRequest("POST", "/api/driver/wallet/deposit", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/check"] });
      toast({ title: "تم إرسال طلب الإيداع", description: "سيتم مراجعته من قبل الإدارة" });
      closeDepositDialog();
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: (amt: string) => apiRequest("POST", "/api/driver/wallet/withdraw", { amount: amt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/wallet"] });
      toast({ title: "تم إرسال طلب السحب", description: "سيتم مراجعته من قبل الإدارة" });
      setWithdrawDialog(false);
      setAmount("");
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const closeDepositDialog = () => {
    setDepositDialog(false);
    setDepositStep(1);
    setAmount("");
    setSelectedPaymentMethod(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  if (authLoading || walletLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const balance = walletData?.balance || "0";
  const totalEarnings = walletData?.totalEarnings || "0";
  const transactions = walletData?.transactions || [];
  const withdrawals = walletData?.withdrawals || [];
  const deposits = walletData?.deposits || [];

  const txTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
    deposit: { label: "إيداع", icon: ArrowDownCircle, color: "text-green-600" },
    withdrawal: { label: "سحب", icon: ArrowUpCircle, color: "text-red-500" },
    commission: { label: "عمولة", icon: DollarSign, color: "text-blue-500" },
    order_hold: { label: "حجز طلب", icon: Clock, color: "text-yellow-500" },
    refund: { label: "استرداد", icon: ArrowDownCircle, color: "text-green-600" },
  };

  const requestStatus: Record<string, { label: string; color: string }> = {
    pending: { label: "قيد المراجعة", color: "bg-yellow-500" },
    approved: { label: "تمت الموافقة", color: "bg-green-500" },
    rejected: { label: "مرفوض", color: "bg-red-500" },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/driver/dashboard")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h1 className="font-bold">المحفظة</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6 pb-6 text-center">
            <Wallet className="h-10 w-10 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground mb-1">الرصيد الحالي</p>
            <p className="text-4xl font-bold text-primary mb-1">{formatPrice(balance, "ج.م")}</p>
            <p className="text-xs text-muted-foreground">إجمالي الأرباح: {formatPrice(totalEarnings, "ج.م")}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-14 gap-2" onClick={() => { setDepositDialog(true); setDepositStep(1); setAmount(""); setSelectedPaymentMethod(null); }}>
            <Plus className="h-5 w-5" /> إيداع مبلغ
          </Button>
          <Button variant="outline" className="h-14 gap-2" onClick={() => { setWithdrawDialog(true); setAmount(""); }}>
            <ArrowUpCircle className="h-5 w-5" /> طلب سحب
          </Button>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <p className="font-medium mb-1">ملاحظة هامة</p>
          <p className="text-xs text-muted-foreground">
            يجب أن يكون رصيدك أعلى من قيمة الشحنة حتى يتم ترشيحك لتوصيل الطلبات.
            تحصل على عمولة 5% من كل طلب (8% للطلبات فوق 500 ج.م).
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">المعاملات</TabsTrigger>
            <TabsTrigger value="deposits">طلبات الإيداع</TabsTrigger>
            <TabsTrigger value="withdrawals">طلبات السحب</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد معاملات بعد</p>
              </div>
            ) : transactions.map((t: any) => {
              const info = txTypeLabels[t.type] || { label: t.type, icon: DollarSign, color: "text-gray-500" };
              const Icon = info.icon;
              const isPositive = ["deposit", "commission", "refund"].includes(t.type);
              return (
                <Card key={t.id}>
                  <CardContent className="pt-3 pb-3 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isPositive ? "bg-green-100" : "bg-red-100"}`}>
                      <Icon className={`h-4 w-4 ${info.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-[10px] text-muted-foreground">{t.createdAt ? new Date(t.createdAt).toLocaleString("ar-EG") : ""}</p>
                    </div>
                    <div className="text-left">
                      <p className={`font-bold text-sm ${isPositive ? "text-green-600" : "text-red-500"}`}>
                        {isPositive ? "+" : "-"}{formatPrice(Math.abs(parseFloat(t.amount)).toString(), "ج.م")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">رصيد: {formatPrice(t.balanceAfter || "0", "ج.م")}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="deposits" className="space-y-2">
            {deposits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowDownCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد طلبات إيداع</p>
              </div>
            ) : deposits.map((d: any) => {
              const st = requestStatus[d.status] || { label: d.status, color: "bg-gray-500" };
              return (
                <Card key={d.id}>
                  <CardContent className="pt-3 pb-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{formatPrice(d.amount, "ج.م")}</p>
                      <p className="text-xs text-muted-foreground">{d.paymentMethodName}</p>
                      <p className="text-[10px] text-muted-foreground">{d.createdAt ? new Date(d.createdAt).toLocaleString("ar-EG") : ""}</p>
                      {d.adminNote && <p className="text-xs text-muted-foreground mt-1">ملاحظة: {d.adminNote}</p>}
                    </div>
                    <Badge className={st.color}>{st.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-2">
            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowUpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد طلبات سحب</p>
              </div>
            ) : withdrawals.map((w: any) => {
              const st = requestStatus[w.status] || { label: w.status, color: "bg-gray-500" };
              return (
                <Card key={w.id}>
                  <CardContent className="pt-3 pb-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{formatPrice(w.amount, "ج.م")}</p>
                      <p className="text-[10px] text-muted-foreground">{w.createdAt ? new Date(w.createdAt).toLocaleString("ar-EG") : ""}</p>
                      {w.adminNote && <p className="text-xs text-muted-foreground mt-1">ملاحظة: {w.adminNote}</p>}
                    </div>
                    <Badge className={st.color}>{st.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* Multi-step Deposit Dialog */}
      <Dialog open={depositDialog} onOpenChange={(open) => { if (!open) closeDepositDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {depositStep > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (depositStep === 3) setDepositStep(2);
                    else if (depositStep === 2) setDepositStep(1);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {depositStep === 1 && "إيداع مبلغ"}
              {depositStep === 2 && "اختر وسيلة الدفع"}
              {depositStep === 3 && "تأكيد الدفع"}
            </DialogTitle>
            <DialogDescription>
              {depositStep === 1 && "أدخل المبلغ المراد إيداعه"}
              {depositStep === 2 && `المبلغ: ${formatPrice(amount, "ج.م")} - اختر وسيلة الدفع`}
              {depositStep === 3 && "قم بتحويل المبلغ ثم اضغط تأكيد"}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === depositStep ? "w-8 bg-primary" : s < depositStep ? "w-2 bg-primary/50" : "w-2 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Enter Amount */}
          {depositStep === 1 && (
            <div className="space-y-4 py-2">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="المبلغ بالجنيه"
                type="number"
                dir="ltr"
                className="text-center text-2xl h-14"
              />
              <div className="flex gap-2 justify-center">
                {["50", "100", "200", "500"].map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(q)}
                    className="flex-1"
                  >
                    {q} ج.م
                  </Button>
                ))}
              </div>
              <Button
                className="w-full h-12"
                disabled={!amount || parseFloat(amount) <= 0}
                onClick={() => setDepositStep(2)}
              >
                التالي <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          )}

          {/* Step 2: Select Payment Method */}
          {depositStep === 2 && (
            <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
              {!paymentMethods || paymentMethods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد وسائل دفع متاحة</p>
                </div>
              ) : (
                paymentMethods.map((pm: any) => (
                  <Card
                    key={pm.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedPaymentMethod?.id === pm.id ? "border-primary ring-2 ring-primary/20" : ""
                    }`}
                    onClick={() => {
                      setSelectedPaymentMethod(pm);
                      setDepositStep(3);
                    }}
                  >
                    <CardContent className="pt-3 pb-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                        {pm.icon || "💳"}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{pm.name}</p>
                        {pm.description && (
                          <p className="text-xs text-muted-foreground">{pm.description}</p>
                        )}
                      </div>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Step 3: Payment Details + Confirm */}
          {depositStep === 3 && selectedPaymentMethod && (
            <div className="space-y-4 py-2">
              {/* Amount summary */}
              <div className="bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">المبلغ المطلوب تحويله</p>
                <p className="text-3xl font-bold text-primary">{formatPrice(amount, "ج.م")}</p>
              </div>

              {/* Payment method info */}
              <Card>
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                      {selectedPaymentMethod.icon || "💳"}
                    </div>
                    <p className="font-bold">{selectedPaymentMethod.name}</p>
                  </div>

                  {selectedPaymentMethod.accountNumber && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">رقم الحساب / المحفظة</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-bold text-lg" dir="ltr">{selectedPaymentMethod.accountNumber}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(selectedPaymentMethod.accountNumber)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedPaymentMethod.instructions && (
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">تعليمات الدفع</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 whitespace-pre-wrap">{selectedPaymentMethod.instructions}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-xs">
                <p className="font-medium text-yellow-700 dark:text-yellow-300">⚠️ ملاحظة</p>
                <p className="text-yellow-600 dark:text-yellow-400 mt-1">
                  بعد تأكيد الدفع سيتم مراجعة طلبك من قبل الإدارة. سيتم إضافة الرصيد بعد التحقق من عملية التحويل.
                </p>
              </div>

              <Button
                className="w-full h-12 text-base"
                onClick={() => depositMutation.mutate({ amount, paymentMethodId: selectedPaymentMethod.id })}
                disabled={depositMutation.isPending}
              >
                {depositMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin ml-2" /> : <CheckCircle2 className="h-5 w-5 ml-2" />}
                تأكيد الدفع وإرسال الطلب
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلب سحب</DialogTitle>
            <DialogDescription>أدخل المبلغ المراد سحبه (الحد الأقصى: {formatPrice(balance, "ج.م")})</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="المبلغ بالجنيه"
              type="number"
              dir="ltr"
              className="text-center text-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialog(false)}>إلغاء</Button>
            <Button
              onClick={() => withdrawMutation.mutate(amount)}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(balance) || withdrawMutation.isPending}
              variant="destructive"
            >
              {withdrawMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              إرسال طلب السحب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
