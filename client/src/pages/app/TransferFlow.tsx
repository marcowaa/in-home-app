import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Building2, Wallet, QrCode, ArrowLeft, Loader2,
  Search, Check, ChevronLeft, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

type Method = "phone" | "bank" | "wallet" | "qr";

export default function TransferFlow() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<Method>("phone");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientData, setRecipientData] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState("");
  const [estimate, setEstimate] = useState<any>(null);
  const [transferResult, setTransferResult] = useState<any>(null);

  const { data: providers } = useQuery<any>({
    queryKey: ["/api/user/wallet/providers"],
  });
  const { data: walletData } = useQuery<any>({
    queryKey: ["/api/user/wallet"],
  });
  const { data: beneficiaries } = useQuery<any>({
    queryKey: ["/api/user/beneficiaries"],
  });

  const lookupMutation = useMutation({
    mutationFn: (phone: string) => apiRequest("GET", `/api/user/lookup?phone=${phone}`),
    onSuccess: async (res) => {
      const data = await res.json();
      setRecipientData(data);
      setStep(3);
    },
    onError: () => {
      toast({ title: "المستخدم غير موجود", variant: "destructive" });
    },
  });

  const estimateMutation = useMutation({
    mutationFn: (data: { amount: string; method: string }) => apiRequest("POST", "/api/user/transfer/estimate", data),
    onSuccess: async (res) => setEstimate(await res.json()),
  });

  const createTransferMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/user/transfer/create", data),
    onSuccess: async (res) => {
      const result = await res.json();
      setTransferResult(result);
      setStep(5);
    },
    onError: () => toast({ title: "فشل إنشاء التحويل", variant: "destructive" }),
  });

  const confirmTransferMutation = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: string }) => apiRequest("POST", `/api/user/transfer/${id}/confirm`, { pin }),
    onSuccess: async (res) => {
      const result = await res.json();
      setTransferResult({ ...transferResult, ...result });
      setStep(5);
    },
    onError: async (err: any) => {
      toast({ title: "فشل التحويل", description: err.message, variant: "destructive" });
    },
  });

  const methods = [
    { key: "phone" as Method, label: "رقم هاتف", icon: Phone, color: "bg-blue-500" },
    { key: "bank" as Method, label: "حساب بنكي", icon: Building2, color: "bg-green-600" },
    { key: "wallet" as Method, label: "محفظة", icon: Wallet, color: "bg-orange-500" },
    { key: "qr" as Method, label: "مسح QR", icon: QrCode, color: "bg-purple-500" },
  ];

  const quickAmounts = [50, 100, 200, 500, 1000];

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (parseFloat(val) > 0) {
      estimateMutation.mutate({ amount: val, method });
    }
  };

  const handleConfirm = () => {
    if (!transferResult) return;
    confirmTransferMutation.mutate({ id: transferResult.transferId, pin });
  };

  const reset = () => {
    setStep(1); setMethod("phone"); setRecipientPhone(""); setRecipientData(null);
    setAmount(""); setDescription(""); setPin(""); setEstimate(null); setTransferResult(null);
  };

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        {step > 1 && step < 5 && (
          <button onClick={() => setStep(step - 1)} className="p-1">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        {step === 5 ? (
          <button onClick={() => navigate("/app/home")} className="p-1">
            <ChevronLeft className="h-5 w-5 rotate-180 text-gray-600" />
          </button>
        ) : null}
        <h1 className="font-bold text-gray-900">تحويل أموال</h1>
        <div className="mr-auto flex gap-1">
          {[1,2,3,4].map(s => (
            <div key={s} className={`h-1.5 w-6 rounded-full ${s <= step ? "bg-blue-600" : "bg-gray-200"}`} />
          ))}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Method */}
          {step === 1 && (
            <motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <h2 className="font-semibold text-gray-900 mb-4">اختر طريقة التحويل</h2>
              <div className="grid grid-cols-2 gap-3">
                {methods.map(m => {
                  const Icon = m.icon;
                  return (
                    <button key={m.key} onClick={() => {
                      if (m.key === "qr") { navigate("/app/scan"); return; }
                      setMethod(m.key); setStep(2);
                    }} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-blue-400 transition-colors">
                      <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {beneficiaries?.beneficiaries?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">المستفيدون</h3>
                  <div className="space-y-2">
                    {beneficiaries.beneficiaries.slice(0, 4).map((b: any) => (
                      <button key={b.id} onClick={() => {
                        setRecipientPhone(b.identifier);
                        setRecipientData({ name: b.name, id: b.identifier });
                        setMethod(b.type === "bank" ? "bank" : b.type === "wallet" ? "wallet" : "phone");
                        setStep(3);
                      }} className="w-full bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 hover:border-blue-300">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          {b.name[0]}
                        </div>
                        <div className="text-right flex-1">
                          <p className="font-medium text-sm">{b.name}</p>
                          <p className="text-xs text-gray-400">{b.identifier}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Enter Recipient */}
          {step === 2 && (
            <motion.div key="s2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              <h2 className="font-semibold text-gray-900">بيانات المستلم</h2>
              {method === "phone" && (
                <>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input type="tel" placeholder="رقم هاتف المستلم" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className="pr-10 h-12 text-right" maxLength={11} />
                  </div>
                  <Button className="w-full h-12" disabled={recipientPhone.length < 10 || lookupMutation.isPending} onClick={() => lookupMutation.mutate(recipientPhone)}>
                    {lookupMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 ml-2" />} بحث
                  </Button>
                </>
              )}
              {method === "bank" && (
                <>
                  <Select>
                    <SelectTrigger className="h-12"><SelectValue placeholder="اختر البنك" /></SelectTrigger>
                    <SelectContent>
                      {providers?.providers?.filter((p: any) => p.type === "bank").map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="رقم الحساب" className="h-12" />
                  <Input placeholder="اسم المستلم" className="h-12" onChange={e => setRecipientData({ name: e.target.value })} />
                  <Button className="w-full h-12" onClick={() => setStep(3)}>متابعة</Button>
                </>
              )}
              {method === "wallet" && (
                <>
                  <Select>
                    <SelectTrigger className="h-12"><SelectValue placeholder="اختر المحفظة" /></SelectTrigger>
                    <SelectContent>
                      {providers?.providers?.filter((p: any) => p.type === "wallet").map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="tel" placeholder="رقم هاتف المستلم" className="h-12" onChange={e => setRecipientPhone(e.target.value)} />
                  <Button className="w-full h-12" disabled={!recipientPhone} onClick={() => { setRecipientData({ name: "مستخدم محفظة" }); setStep(3); }}>متابعة</Button>
                </>
              )}
            </motion.div>
          )}

          {/* Step 3: Enter Amount */}
          {step === 3 && (
            <motion.div key="s3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              {recipientData && (
                <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {recipientData.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{recipientData.name}</p>
                    <p className="text-xs text-gray-500">{recipientData.phone || recipientPhone}</p>
                  </div>
                </div>
              )}
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-2">المبلغ</p>
                <Input type="number" placeholder="0.00" value={amount} onChange={e => handleAmountChange(e.target.value)} className="text-center text-3xl font-bold h-16 border-0 focus-visible:ring-0" />
                <p className="text-xs text-gray-400 mt-1">ج.م</p>
                <p className="text-xs text-gray-500 mt-2">الرصيد: {formatPrice(walletData?.balance || "0")} ج.م</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {quickAmounts.map(a => (
                  <button key={a} onClick={() => handleAmountChange(String(a))} className="bg-gray-100 hover:bg-blue-100 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors">
                    {a}
                  </button>
                ))}
              </div>
              {estimate && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">المبلغ</span><span>{formatPrice(estimate.amount)} ج.م</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الرسوم</span><span>{formatPrice(estimate.fee)} ج.م</span></div>
                  <div className="flex justify-between font-bold pt-1 border-t border-gray-200"><span>الإجمالي</span><span>{formatPrice(estimate.total)} ج.م</span></div>
                </div>
              )}
              <Button className="w-full h-12" disabled={!amount || parseFloat(amount) <= 0} onClick={() => setStep(4)}>متابعة</Button>
            </motion.div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <motion.div key="s4" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              <h2 className="font-semibold text-gray-900">مراجعة التحويل</h2>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {recipientData?.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{recipientData?.name}</p>
                    <p className="text-xs text-gray-500">{recipientData?.phone || recipientPhone}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">المبلغ</span><span className="font-medium">{formatPrice(amount)} ج.م</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الرسوم</span><span className="font-medium">{formatPrice(estimate?.fee || "0")} ج.م</span></div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200"><span>الإجمالي</span><span>{formatPrice(estimate?.total || amount)} ج.م</span></div>
                </div>
              </div>
              <Input placeholder="وصف (اختياري)" value={description} onChange={e => setDescription(e.target.value)} className="h-12" />
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">كود PIN</label>
                <div className="flex justify-center">
                  <InputOTP value={pin} onChange={setPin} maxLength={4}>
                    <InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /><InputOTPSlot index={3} /></InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              {createTransferMutation.isPending ? null : (
                <Button className="w-full h-12" disabled={pin.length !== 4} onClick={() => {
                  createTransferMutation.mutate({
                    receiverId: recipientData?.id,
                    receiverIdentifier: recipientPhone,
                    receiverName: recipientData?.name,
                    amount, method, description,
                    providerName: "",
                  });
                }}>
                  تأكيد التحويل ({formatPrice(estimate?.total || amount)} ج.م)
                </Button>
              )}
              {createTransferMutation.isPending && (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
              )}
              {transferResult && (
                <>
                  <div className="flex justify-center py-2"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
                  <Button className="w-full h-12" disabled={pin.length !== 4 || confirmTransferMutation.isPending} onClick={handleConfirm}>
                    {confirmTransferMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "تأكيد"}
                  </Button>
                </>
              )}
            </motion.div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <motion.div key="s5" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="flex flex-col items-center text-center py-8">
              <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.2, type:"spring"}} className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </motion.div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">تم التحويل بنجاح!</h2>
              <p className="text-2xl font-bold text-blue-600 my-2">{formatPrice(amount)} ج.م</p>
              <p className="text-sm text-gray-500">تم تحويلها إلى {recipientData?.name}</p>
              <div className="bg-gray-50 rounded-xl p-3 mt-4 w-full">
                <p className="text-xs text-gray-400">رقم المرجع</p>
                <p className="font-mono font-bold text-gray-900">{transferResult?.reference}</p>
              </div>
              <div className="flex gap-3 w-full mt-6">
                <Button variant="outline" className="flex-1" onClick={reset}>تحويل آخر</Button>
                <Button className="flex-1" onClick={() => navigate("/app/home")}>تم</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
