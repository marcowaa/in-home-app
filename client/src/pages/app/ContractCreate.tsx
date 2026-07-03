import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, Check, Search, Plus, Trash2,
  ShoppingCart, Wrench, Home, FileText, Boxes,
  Calendar, Shield, User, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SuggestionInput from "@/components/app/SuggestionInput";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

type ContractType = "purchase" | "service" | "rental" | "custom" | "split_cost" | "delivery";

const contractTypes: { key: ContractType; label: string; icon: typeof FileText; color: string; desc: string }[] = [
  { key: "delivery", label: "توصيل", icon: Truck, color: "bg-emerald-500", desc: "صفقة توصيل بين مستخدمين" },
  { key: "purchase", label: "شراء", icon: ShoppingCart, color: "bg-blue-500", desc: "شراء منتج مع ضمان" },
  { key: "service", label: "خدمة", icon: Wrench, color: "bg-indigo-500", desc: "عقد خدمة بمراحل" },
  { key: "rental", label: "إيجار", icon: Home, color: "bg-cyan-500", desc: "تأجير منتج أو عقار" },
  { key: "custom", label: "مخصص", icon: FileText, color: "bg-violet-500", desc: "شروط مخصصة" },
  { key: "split_cost", label: "تقاسم", icon: Boxes, color: "bg-teal-500", desc: "تقاسم تكلفة" },
];

export default function ContractCreate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [contractType, setContractType] = useState<ContractType | "">("");

  // Step 2 fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [deliveryFeeRate, setDeliveryFeeRate] = useState("2");

  // Role + public + required freeze (security deposit from other party)
  const [creatorRole, setCreatorRole] = useState<"seeker" | "provider">("seeker");
  const [isPublic, setIsPublic] = useState(false);
  const [requiredFreezeRate, setRequiredFreezeRate] = useState("0");

  // Step 3 - service: milestones
  const [milestones, setMilestones] = useState<{ title: string; amount: string }[]>([
    { title: "", amount: "" },
  ]);

  // Step 3 - purchase: addresses + inspection
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [inspectionHours, setInspectionHours] = useState(24);

  // Step 3 - rental: dates
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 3 - custom: free text
  const [customTerms, setCustomTerms] = useState("");

  // Step 4: counterparty
  const [counterpartyPhone, setCounterpartyPhone] = useState("");
  const [counterpartyData, setCounterpartyData] = useState<any>(null);

  // Step 5: PIN + result
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<any>(null);

  const { data: walletData } = useQuery<any>({ queryKey: ["/api/user/wallet"] });

  // Fetch contract rules to show platform fee per type
  const { data: rulesData } = useQuery<any>({ queryKey: ["/api/user/contracts/rules"] });
  const contractRules: any[] = rulesData?.rules || [];
  const currentRule = contractRules.find((r: any) => r.contractType === contractType);

  const lookupCounterparty = useMutation({
    mutationFn: (phone: string) => apiRequest("GET", `/api/user/lookup?phone=${phone}`),
    onSuccess: async (res) => {
      setCounterpartyData(await res.json());
    },
    onError: () => toast({ title: "المستخدم غير موجود", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/user/contracts/create", data),
    onSuccess: async (res) => {
      setResult(await res.json());
      setStep(5);
    },
    onError: () => toast({ title: "فشل إنشاء العقد", variant: "destructive" }),
  });

  const numericAmount = parseFloat(amount) || 0;
  const platformFeeRate = currentRule ? parseFloat(currentRule.platformFeeRate) : 0.005;
  const dFee = contractType === "purchase" || contractType === "rental" || contractType === "delivery"
    ? numericAmount * (parseFloat(deliveryFeeRate) / 100)
    : 0;
  const pFee = numericAmount * platformFeeRate;
  const reqFreezeAmount = numericAmount * (parseFloat(requiredFreezeRate) / 100);

  // Seeker: freezes product value + platform fee from their wallet
  // Provider: doesn't freeze (seeker pays when accepting)
  const creatorFreezes = creatorRole === "seeker" ? numericAmount + pFee : pFee;
  const total = creatorFreezes;

  const milestonesTotal = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);

  const handleCreate = () => {
    const payload: any = {
      type: contractType,
      title,
      description,
      amount,
      counterpartyId: counterpartyData?.id,
      pin,
      creatorRole,
      isPublic,
      requiredFreezeRate: parseFloat(requiredFreezeRate) / 100,
    };

    if (contractType === "purchase" || contractType === "delivery") {
      payload.deliveryFeeRate = parseFloat(deliveryFeeRate) / 100;
      payload.pickupAddress = pickupAddress;
      payload.deliveryAddress = deliveryAddress;
      payload.terms = { inspectionPeriodHours: inspectionHours };
    } else if (contractType === "service") {
      payload.milestones = milestones.filter((m) => m.title && m.amount);
    } else if (contractType === "rental") {
      payload.deliveryFeeRate = parseFloat(deliveryFeeRate) / 100;
      payload.startDate = startDate;
      payload.endDate = endDate;
    } else if (contractType === "custom") {
      payload.customTerms = customTerms;
    }

    createMutation.mutate(payload);
  };

  const updateMilestone = (index: number, field: "title" | "amount", value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { title: "", amount: "" }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const canProceedStep2 = title.trim() && numericAmount > 0;
  const canProceedStep3 =
    contractType === "service"
      ? milestones.length > 0 && milestones.every((m) => m.title && parseFloat(m.amount) > 0)
      : contractType === "purchase"
        ? pickupAddress && deliveryAddress
        : contractType === "rental"
          ? startDate && endDate
          : contractType === "custom"
            ? customTerms.trim().length > 0
            : true;
  const canProceedStep4 = isPublic || !!counterpartyData;

  return (
    <div dir="rtl" className="min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        {step > 1 && step < 5 && (
          <button onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <h1 className="font-bold text-gray-900">عقد جديد</h1>
        <div className="mr-auto flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-6 rounded-full ${s <= step ? "bg-blue-600" : "bg-gray-200"}`}
            />
          ))}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Choose Contract Type */}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="font-semibold text-gray-900 mb-1">اختر نوع العقد</h2>
              <p className="text-sm text-gray-500 mb-4">حدد نوع العقد لبدء الإنشاء</p>
              <div className="grid grid-cols-1 gap-3">
                {contractTypes.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        setContractType(t.key);
                        setStep(2);
                      }}
                      className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 hover:border-blue-400 transition-colors text-right"
                    >
                      <div className={`w-12 h-12 rounded-xl ${t.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{t.label}</p>
                          {(() => {
                            const rule = contractRules.find((r: any) => r.contractType === t.key);
                            if (rule) {
                              const rate = parseFloat(rule.platformFeeRate);
                              if (rate === 0) {
                                return <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">مجاناً</span>;
                              }
                              return <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">رسوم {(rate * 100).toFixed(1)}%</span>;
                            }
                            return null;
                          })()}
                        </div>
                        <p className="text-xs text-gray-500">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Contract Details */}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-gray-500">عقدك مؤمن بالضمان - الأموال لا تُفرج إلا بعد التأكيد</p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">دوري في هذا العقد:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCreatorRole("seeker")}
                    className={`py-3 rounded-lg text-sm font-medium flex flex-col items-center gap-1 ${
                      creatorRole === "seeker" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="text-lg">🛒</span>
                    طالب خدمة
                    <span className="text-xs opacity-70">أريد شراء / طلب خدمة</span>
                  </button>
                  <button
                    onClick={() => setCreatorRole("provider")}
                    className={`py-3 rounded-lg text-sm font-medium flex flex-col items-center gap-1 ${
                      creatorRole === "provider" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="text-lg">💼</span>
                    مقدم خدمة
                    <span className="text-xs opacity-70">أقدم منتج / خدمة</span>
                  </button>
                </div>
                {creatorRole === "seeker" && (
                  <p className="text-xs text-blue-500 mt-1">ستدفع قيمة العقد من محفظتك وتُجمّد حتى التأكيد</p>
                )}
                {creatorRole === "provider" && (
                  <p className="text-xs text-green-500 mt-1">الطرف الآخر سيدفع قيمة العقد عند القبول</p>
                )}
              </div>

              {/* Contract Details */}
              <div>
                <label className="text-sm font-medium mb-1 block">عنوان العقد</label>
                <SuggestionInput
                  field="title"
                  contractType={contractType || undefined}
                  value={title}
                  onChange={setTitle}
                  placeholder="مثال: شراء لابتوب ديل XPS 15"
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">الوصف</label>
                <SuggestionInput
                  field="description"
                  contractType={contractType || undefined}
                  value={description}
                  onChange={setDescription}
                  placeholder="تفاصيل العقد والشروط..."
                  multiline
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">قيمة العقد (ج.م)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-center text-lg"
                />
              </div>

              {/* Financial summary */}
              {numericAmount > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">قيمة العقد</span>
                    <span className="font-medium">{formatPrice(String(numericAmount))} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-orange-600">رسوم التطبيق ({(platformFeeRate * 100).toFixed(1)}%)</span>
                    <span className="font-medium text-orange-700">{formatPrice(String(pFee))} ج.م</span>
                  </div>
                  {creatorRole === "seeker" && (
                    <div className="flex items-center justify-between pt-1 border-t border-blue-100">
                      <span className="text-gray-500">سيُجمّد من محفظتك</span>
                      <span className="font-bold text-blue-700">{formatPrice(String(numericAmount + pFee))} ج.م</span>
                    </div>
                  )}
                </div>
              )}

              {/* Public/Private toggle */}
              <div>
                <label className="text-sm font-medium mb-2 block">نشر العقد:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`py-3 rounded-lg text-sm font-medium ${
                      !isPublic ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    لشخص محدد
                  </button>
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`py-3 rounded-lg text-sm font-medium ${
                      isPublic ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    🌐 للعموم
                  </button>
                </div>
                {isPublic && (
                  <p className="text-xs text-indigo-500 mt-1">سيظهر في السوق العام لأي مستخدم قبوله</p>
                )}
              </div>

              {/* Required freeze from other party (security deposit) */}
              {numericAmount > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">ضمان مطلوب من الطرف الآخر</label>
                  <p className="text-xs text-gray-400 mb-2">نسبة تُجمّد من رصيد الطرف الآخر كضمان — تُحرر عند الإكمال أو تُخصم عند النزاع</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { v: "0", l: "بدون" },
                      { v: "25", l: "ربع" },
                      { v: "50", l: "نصف" },
                      { v: "100", l: "كامل" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => setRequiredFreezeRate(opt.v)}
                        className={`py-2 rounded-lg text-xs font-medium ${
                          requiredFreezeRate === opt.v ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {opt.l}
                        {opt.v !== "0" && (
                          <span className="block text-[10px] opacity-70 mt-0.5">
                            {formatPrice(String(reqFreezeAmount))} ج.م
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(contractType === "purchase" || contractType === "rental") && (
                <div>
                  <label className="text-sm font-medium mb-2 block">نسبة رسوم التوصيل</label>
                  <div className="grid grid-cols-4 gap-2">
                    {["1", "2", "3", "5"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setDeliveryFeeRate(r)}
                        className={`py-3 rounded-lg text-sm font-medium ${
                          deliveryFeeRate === r ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">عمولة المندوب: {formatPrice(String(dFee))} ج.م</p>
                </div>
              )}
              <Button
                className="w-full h-12"
                disabled={!canProceedStep2}
                onClick={() => setStep(3)}
              >
                متابعة
              </Button>
            </motion.div>
          )}

          {/* Step 3: Type-specific fields */}
          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Service: Milestones */}
              {contractType === "service" && (
                <>
                  <h2 className="font-semibold text-gray-900">مراحل الخدمة</h2>
                  <p className="text-sm text-gray-500">أضف مراحل العمل ومبلغ كل مرحلة</p>
                  {milestones.map((m, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">مرحلة {i + 1}</span>
                        {milestones.length > 1 && (
                          <button onClick={() => removeMilestone(i)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        )}
                      </div>
                      <SuggestionInput
                        field="milestoneTitle"
                        contractType="service"
                        value={m.title}
                        onChange={(val) => updateMilestone(i, "title", val)}
                        placeholder="عنوان المرحلة"
                        className="h-10"
                      />
                      <Input
                        type="number"
                        placeholder="المبلغ"
                        value={m.amount}
                        onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                        className="h-10 text-center"
                      />
                    </div>
                  ))}
                  <Button variant="outline" className="w-full h-10 gap-1" onClick={addMilestone}>
                    <Plus className="h-4 w-4" /> إضافة مرحلة
                  </Button>
                  <div className="bg-blue-50 rounded-xl p-3 flex justify-between text-sm">
                    <span className="text-blue-600 font-medium">إجمالي المراحل</span>
                    <span className="font-bold text-blue-700">{formatPrice(String(milestonesTotal))} ج.م</span>
                  </div>
                </>
              )}

              {/* Purchase: Addresses + Inspection */}
              {(contractType === "purchase" || contractType === "delivery") && (
                <>
                  <h2 className="font-semibold text-gray-900">العناوين والفحص</h2>
                  <div>
                    <label className="text-sm font-medium mb-1 block">عنوان الاستلام</label>
                    <SuggestionInput
                      field="pickupAddress"
                      contractType={contractType || undefined}
                      value={pickupAddress}
                      onChange={setPickupAddress}
                      placeholder="عنوان البائع"
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">عنوان التوصيل</label>
                    <SuggestionInput
                      field="deliveryAddress"
                      contractType={contractType || undefined}
                      value={deliveryAddress}
                      onChange={setDeliveryAddress}
                      placeholder="عنوانك"
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">مدة الفحص</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v: 12, l: "12 ساعة" },
                        { v: 24, l: "24 ساعة" },
                        { v: 48, l: "48 ساعة" },
                      ].map((o) => (
                        <button
                          key={o.v}
                          onClick={() => setInspectionHours(o.v)}
                          className={`py-3 rounded-lg text-sm ${
                            inspectionHours === o.v ? "bg-blue-600 text-white" : "bg-gray-100"
                          }`}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Rental: Dates */}
              {contractType === "rental" && (
                <>
                  <h2 className="font-semibold text-gray-900">فترة الإيجار</h2>
                  <div>
                    <label className="text-sm font-medium mb-1 block">تاريخ البداية</label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-12 pr-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">تاريخ الانتهاء</label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-12 pr-10"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Custom: Free text */}
              {contractType === "custom" && (
                <>
                  <h2 className="font-semibold text-gray-900">الشروط المخصصة</h2>
                  <p className="text-sm text-gray-500">اكتب شروط العقد بالتفصيل</p>
                  <Textarea
                    placeholder="اكتب الشروط والأحكام..."
                    value={customTerms}
                    onChange={(e) => setCustomTerms(e.target.value)}
                    className="min-h-[200px]"
                  />
                </>
              )}

              {/* Split cost: just info */}
              {contractType === "split_cost" && (
                <>
                  <h2 className="font-semibold text-gray-900">تقاسم التكلفة</h2>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-blue-600">سيتم تقاسم المبلغ على الأطراف</p>
                    <p className="text-2xl font-bold text-blue-700 mt-2">{formatPrice(String(numericAmount / 2))} ج.م</p>
                    <p className="text-xs text-gray-400 mt-1">لكل طرف (طرفين)</p>
                  </div>
                </>
              )}

              <Button className="w-full h-12" disabled={!canProceedStep3} onClick={() => setStep(4)}>
                متابعة
              </Button>
            </motion.div>
          )}

          {/* Step 4: Counterparty Lookup (skip if public) */}
          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {isPublic ? (
                <>
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-3">
                      <span className="text-3xl">🌐</span>
                    </div>
                    <h2 className="font-semibold text-gray-900 mb-1">عقد عام</h2>
                    <p className="text-sm text-gray-500 mb-4">سيتم نشر هذا العقد في السوق العام لأي مستخدم قبوله</p>
                  </div>
                  <Button className="w-full h-12" onClick={() => setStep(5)}>
                    مراجعة وتأكيد
                  </Button>
                </>
              ) : (
                <>
              <h2 className="font-semibold text-gray-900">الطرف الآخر</h2>
              <div>
                <label className="text-sm font-medium mb-1 block">رقم هاتف الطرف الآخر</label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={counterpartyPhone}
                    onChange={(e) => setCounterpartyPhone(e.target.value)}
                    className="h-12"
                    maxLength={11}
                  />
                  <Button
                    variant="outline"
                    disabled={counterpartyPhone.length < 10 || lookupCounterparty.isPending}
                    onClick={() => lookupCounterparty.mutate(counterpartyPhone)}
                  >
                    {lookupCounterparty.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {counterpartyData && (
                <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    {counterpartyData.name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{counterpartyData.name}</p>
                    <p className="text-xs text-gray-500">{counterpartyData.phone}</p>
                  </div>
                  <Check className="h-5 w-5 text-green-600 mr-auto" />
                </div>
              )}
              <Button className="w-full h-12" disabled={!canProceedStep4} onClick={() => setStep(5)}>
                مراجعة وتأكيد
              </Button>
                </>
              )}
            </motion.div>
          )}

          {/* Step 5: Review + PIN */}
          {step === 5 && !result && (
            <motion.div
              key="s5-review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="font-semibold text-gray-900">مراجعة العقد</h2>
              <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <p className="font-semibold text-blue-900">{title}</p>
                </div>
                {description && (
                  <p className="text-sm text-gray-600">{description}</p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">النوع</span>
                    <span className="font-medium">
                      {contractTypes.find((t) => t.key === contractType)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">المبلغ</span>
                    <span className="font-medium">{formatPrice(String(numericAmount))} ج.م</span>
                  </div>
                  {(contractType === "purchase" || contractType === "rental") && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">رسوم التوصيل ({deliveryFeeRate}%)</span>
                      <span className="font-medium">{formatPrice(String(dFee))} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">رسوم التطبيق ({(platformFeeRate * 100).toFixed(1)}%)</span>
                    <span className="font-medium text-orange-600">{formatPrice(String(pFee))} ج.م</span>
                  </div>
                  {reqFreezeAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-purple-600">ضمان الطرف الآخر ({requiredFreezeRate}%)</span>
                      <span className="font-medium text-purple-700">{formatPrice(String(reqFreezeAmount))} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t border-blue-100">
                    <span>المبلغ المجمّد</span>
                    <span className="text-blue-700">{formatPrice(String(total))} ج.م</span>
                  </div>
                </div>
              </div>

              {counterpartyData && (
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{counterpartyData.name}</p>
                    <p className="text-xs text-gray-500">{counterpartyData.phone}</p>
                  </div>
                </div>
              )}

              {contractType === "service" && milestones.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-medium text-gray-500 mb-2">المراحل</p>
                  {milestones.map((m, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{i + 1}. {m.title}</span>
                      <span className="font-medium">{formatPrice(m.amount)} ج.م</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400">
                رصيدك المتاح:{" "}
                {formatPrice(
                  String(parseFloat(walletData?.balance || "0") - parseFloat(walletData?.frozenBalance || "0"))
                )}{" "}
                ج.م
              </p>

              <div>
                <label className="text-sm font-medium mb-2 block">كود PIN</label>
                <div className="flex justify-center">
                  <InputOTP value={pin} onChange={setPin} maxLength={4}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                disabled={pin.length !== 4 || createMutation.isPending}
                onClick={handleCreate}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `تأكيد - تجميد ${formatPrice(String(total))} ج.م`
                )}
              </Button>
            </motion.div>
          )}

          {/* Step 5: Success */}
          {step === 5 && result && (
            <motion.div
              key="s5-success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4"
              >
                <Check className="h-10 w-10 text-green-600" />
              </motion.div>
              <h2 className="text-xl font-bold mb-1">تم إنشاء العقد!</h2>
              <p className="text-sm text-gray-500 mb-4">تم تجميد {formatPrice(result.frozenAmount || String(total))} ج.م</p>
              <div className="bg-gray-50 rounded-xl p-3 w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">رقم العقد</span>
                  <span className="font-mono font-bold">{result.contractNumber}</span>
                </div>
                {result.confirmationCode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">كود التأكيد</span>
                    <span className="font-mono font-bold text-blue-600">{result.confirmationCode}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 w-full mt-6">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/app/contracts")}>
                  عقودي
                </Button>
                <Button className="flex-1" onClick={() => navigate(`/app/contracts/${result.contractId}`)}>
                  عرض العقد
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
