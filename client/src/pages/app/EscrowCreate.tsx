import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Check, Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

export default function EscrowCreate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [productDesc, setProductDesc] = useState("");
  const [productValue, setProductValue] = useState("");
  const [deliveryFeeRate, setDeliveryFeeRate] = useState("2");
  const [deadlineHours, setDeadlineHours] = useState(72);
  const [inspectionHours, setInspectionHours] = useState(24);
  const [returnAllowed, setReturnAllowed] = useState(true);
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerData, setSellerData] = useState<any>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<any>(null);

  const { data: walletData } = useQuery<any>({ queryKey: ["/api/user/wallet"] });

  const lookupSeller = useMutation({
    mutationFn: (phone: string) => apiRequest("GET", `/api/user/lookup?phone=${phone}`),
    onSuccess: async (res) => { setSellerData(await res.json()); },
    onError: () => toast({ title: "البائع غير موجود", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/user/escrow/create", data),
    onSuccess: async (res) => { setResult(await res.json()); setStep(5); },
    onError: () => toast({ title: "فشل إنشاء الطلب", variant: "destructive" }),
  });

  const value = parseFloat(productValue) || 0;
  const dFee = value * (parseFloat(deliveryFeeRate) / 100);
  const pFee = value * 0.005;
  const total = value + pFee;

  const handleCreate = () => {
    createMutation.mutate({
      sellerId: sellerData?.id,
      productDescription: productDesc,
      productValue,
      deliveryFeeRate: parseFloat(deliveryFeeRate) / 100,
      pickupAddress, deliveryAddress,
      deadlineHours,
      terms: { deliveryDeadlineHours: deadlineHours, inspectionPeriodHours: inspectionHours, returnAllowed },
    });
  };

  return (
    <div dir="rtl" className="min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        {step > 1 && step < 5 && <button onClick={() => setStep(step - 1)}><ArrowLeft className="h-5 w-5 text-gray-600" /></button>}
        <h1 className="font-bold text-gray-900">صفقة آمنة جديدة</h1>
        <div className="mr-auto flex gap-1">
          {[1,2,3,4].map(s => <div key={s} className={`h-1.5 w-6 rounded-full ${s <= step ? "bg-purple-600" : "bg-gray-200"}`} />)}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Product Details */}
          {step === 1 && (
            <motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <p className="text-sm text-gray-500">صفقتك مؤمنة بالضمان - الأموال لا تُفرج إلا بعد التأكيد</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">وصف المنتج</label>
                <Input placeholder="مثال: لابتوب ديل XPS 15" value={productDesc} onChange={e => setProductDesc(e.target.value)} className="h-12" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">قيمة المنتج (ج.م)</label>
                <Input type="number" placeholder="0" value={productValue} onChange={e => setProductValue(e.target.value)} className="h-12 text-center text-lg" />
              </div>
              <Button className="w-full h-12" disabled={!productDesc || value <= 0} onClick={() => setStep(2)}>متابعة</Button>
            </motion.div>
          )}

          {/* Step 2: Delivery Terms */}
          {step === 2 && (
            <motion.div key="s2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">نسبة رسوم التوصيل</label>
                <div className="grid grid-cols-4 gap-2">
                  {["1","2","3","5"].map(r => (
                    <button key={r} onClick={() => setDeliveryFeeRate(r)} className={`py-3 rounded-lg text-sm font-medium ${deliveryFeeRate === r ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"}`}>{r}%</button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">عمولة المندوب: {formatPrice(String(dFee))} ج.م</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">مهلة التوصيل</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{v:24,l:"24 ساعة"},{v:48,l:"48 ساعة"},{v:72,l:"72 ساعة"}].map(o => (
                    <button key={o.v} onClick={() => setDeadlineHours(o.v)} className={`py-3 rounded-lg text-sm ${deadlineHours === o.v ? "bg-purple-600 text-white" : "bg-gray-100"}`}>{o.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">مدة الفحص</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{v:12,l:"12 ساعة"},{v:24,l:"24 ساعة"},{v:48,l:"48 ساعة"}].map(o => (
                    <button key={o.v} onClick={() => setInspectionHours(o.v)} className={`py-3 rounded-lg text-sm ${inspectionHours === o.v ? "bg-purple-600 text-white" : "bg-gray-100"}`}>{o.l}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <span className="text-sm font-medium">السماح بالإرجاع</span>
                <Switch checked={returnAllowed} onCheckedChange={setReturnAllowed} />
              </div>
              <Button className="w-full h-12" onClick={() => setStep(3)}>متابعة</Button>
            </motion.div>
          )}

          {/* Step 3: Seller Info */}
          {step === 3 && (
            <motion.div key="s3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">رقم هاتف البائع</label>
                <div className="flex gap-2">
                  <Input type="tel" placeholder="01XXXXXXXXX" value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} className="h-12" maxLength={11} />
                  <Button variant="outline" disabled={sellerPhone.length < 10 || lookupSeller.isPending} onClick={() => lookupSeller.mutate(sellerPhone)}>
                    {lookupSeller.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {sellerData && (
                <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">{sellerData.name?.[0]}</div>
                  <div><p className="font-medium text-sm">{sellerData.name}</p><p className="text-xs text-gray-500">{sellerData.phone}</p></div>
                  <Check className="h-5 w-5 text-green-600 mr-auto" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">عنوان الاستلام</label>
                <Input placeholder="عنوان البائع" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} className="h-12" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">عنوان التوصيل</label>
                <Input placeholder="عنوانك" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="h-12" />
              </div>
              <Button className="w-full h-12" disabled={!sellerData} onClick={() => setStep(4)}>متابعة</Button>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <motion.div key="s4" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              <div className="bg-purple-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-purple-100">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <p className="font-semibold text-purple-900">{productDesc}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">قيمة المنتج</span><span className="font-medium">{formatPrice(String(value))} ج.م</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">رسوم التوصيل ({deliveryFeeRate}%)</span><span className="font-medium">{formatPrice(String(dFee))} ج.م</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">رسوم المنصة (0.5%)</span><span className="font-medium">{formatPrice(String(pFee))} ج.م</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t border-purple-100"><span>المبلغ المجمّد</span><span className="text-purple-700">{formatPrice(String(total))} ج.م</span></div>
                </div>
              </div>
              <p className="text-xs text-gray-400">رصيدك المتاح: {formatPrice(String(parseFloat(walletData?.balance || "0") - parseFloat(walletData?.frozenBalance || "0")))} ج.م</p>
              <div>
                <label className="text-sm font-medium mb-2 block">كود PIN</label>
                <div className="flex justify-center">
                  <InputOTP value={pin} onChange={setPin} maxLength={4}>
                    <InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /><InputOTPSlot index={3} /></InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button className="w-full h-12 bg-purple-600 hover:bg-purple-700" disabled={pin.length !== 4 || createMutation.isPending} onClick={handleCreate}>
                {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : `تأكيد - تجميد ${formatPrice(String(total))} ج.م`}
              </Button>
            </motion.div>
          )}

          {/* Step 5: Success */}
          {step === 5 && result && (
            <motion.div key="s5" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="flex flex-col items-center text-center py-8">
              <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.2, type:"spring"}} className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </motion.div>
              <h2 className="text-xl font-bold mb-1">تم إنشاء الصفقة!</h2>
              <p className="text-sm text-gray-500 mb-4">تم تجميد {formatPrice(result.frozenAmount)} ج.م</p>
              <div className="bg-gray-50 rounded-xl p-3 w-full space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">رقم الطلب</span><span className="font-mono font-bold">{result.orderNumber}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">كود التأكيد</span><span className="font-mono font-bold text-purple-600">{result.confirmationCode}</span></div>
              </div>
              <div className="flex gap-3 w-full mt-6">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/app/escrow")}>صفقاتي</Button>
                <Button className="flex-1" onClick={() => navigate(`/app/escrow/${result.orderId}`)}>تتبع الطلب</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
