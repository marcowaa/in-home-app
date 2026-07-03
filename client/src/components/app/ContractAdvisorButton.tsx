import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Headphones, X, Send, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "support";
  text: string;
  time: string;
}

// Smart contract advisor — guides the user to build a good contract
const advisorFlow: { trigger: string; response: string; next?: string[] }[] = [
  {
    trigger: "start",
    response: "مرحباً! أنا مستشار العقود. سأساعدك تختار النوع والشروط المناسبة.\n\nأولاً: ما نوع الصفقة؟\n1️⃣ شراء منتج\n2️⃣ توصيل طرد\n3️⃣ خدمة (تصميم/صيانة)\n4️⃣ إيجار منتج\n5️⃣ مخصص",
    next: ["1", "2", "3", "4", "5"],
  },
  {
    trigger: "1",
    response: "شراء منتج 👍\n\nما قيمة المنتج بالجنيه؟ (مثال: 5000)",
    next: ["amount"],
  },
  {
    trigger: "2",
    response: "توصيل طرد 📦\n\nما قيمة الطرد بالجنيه؟ (مثال: 200)",
    next: ["amount"],
  },
  {
    trigger: "3",
    response: "خدمة 🔧\n\nما قيمة الخدمة بالجنيه؟ (مثال: 3000)\n\n💡 للخدمات ننصح بتقسيم المبلغ على مراحل.",
    next: ["amount"],
  },
  {
    trigger: "4",
    response: "إيجار 🏠\n\nما قيمة الإيجار بالجنيه؟ (مثال: 1000/يوم)",
    next: ["amount"],
  },
  {
    trigger: "5",
    response: "عقد مخصص 📄\n\nما قيمة العقد بالجنيه؟",
    next: ["amount"],
  },
  {
    trigger: "amount",
    response: "ممتاز! هل أنت:\n1️⃣ طالب خدمة (أريد شراء/طلب)\n2️⃣ مقدم خدمة (أقدم منتج/خدمة)",
    next: ["1", "2"],
  },
  {
    trigger: "role_1",
    response: "طالب خدمة 🛒\n\nأنصحك بطلب ضمان من الطرف الآخر:\n• بدون — للمعارف الموثوقين\n• 25% — لمبالغ صغيرة\n• 50% — لمبالغ متوسطة\n• 100% — لمبالغ كبيرة\n\nاختر: 0 / 25 / 50 / 100",
    next: ["0", "25", "50", "100"],
  },
  {
    trigger: "role_2",
    response: "مقدم خدمة 💼\n\nأنصحك بطلب ضمان من الطرف الآخر لضمان جديته:\n• بدون — لجذب عملاء\n• 25% — لاختبار الجدية\n• 50% — لمبالغ متوسطة\n• 100% — لضمان كامل\n\nاختر: 0 / 25 / 50 / 100",
    next: ["0", "25", "50", "100"],
  },
  {
    trigger: "freeze_0",
    response: "بدون ضمان.\n\nهل تريد نشر العقد للعموم (سوق عام) أم إرساله لشخص محدد؟\n1️⃣ للعموم\n2️⃣ شخص محدد",
    next: ["1", "2"],
  },
  {
    trigger: "freeze_25",
    response: "ضمان 25% — اختيار جيد للمبالغ الصغيرة.\n\nهل تريد:\n1️⃣ نشر للعموم\n2️⃣ شخص محدد",
    next: ["1", "2"],
  },
  {
    trigger: "freeze_50",
    response: "ضمان 50% — اختيار متوازن.\n\nهل تريد:\n1️⃣ نشر للعموم\n2️⃣ شخص محدد",
    next: ["1", "2"],
  },
  {
    trigger: "freeze_100",
    response: "ضمان 100% — أقصى حماية.\n\nهل تريد:\n1️⃣ نشر للعموم\n2️⃣ شخص محدد",
    next: ["1", "2"],
  },
  {
    trigger: "publish_1",
    response: "سأنتشر للعموم 🌐\n\nملخص العقد:\n— اكتب عنواناً واضحاً (مثال: شراء لابتوب ديل XPS)\n— أضف وصفاً مفصلاً بالمواصفات\n— حدد المبلغ بدقة\n\nهل تريد:\n1️⃣ فتح صفحة إنشاء العقد الآن\n2️⃣ إنشاء تذكرة دعم للحصول على مساعدة إضافية",
    next: ["1", "2"],
  },
  {
    trigger: "publish_2",
    response: "سيرسل لشخص محدد 👤\n\nتحتاج رقم هاتفه في التطبيق.\n\n1️⃣ فتح صفحة إنشاء العقد\n2️⃣ إنشاء تذكرة دعم",
    next: ["1", "2"],
  },
];

export default function ContractAdvisorButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<string>("start");
  const [contractData, setContractData] = useState<any>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && messages.length === 0) {
      const firstMsg = advisorFlow[0];
      setMessages([{
        role: "support",
        text: firstMsg.response,
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const findResponse = (userInput: string): { response: string; nextStep: string } => {
    const current = advisorFlow.find(a => a.trigger === step);
    if (!current) return { response: "كيف أساعدك؟", nextStep: "start" };

    const input = userInput.trim();

    // Handle amount step
    if (step === "amount") {
      const num = parseFloat(input);
      if (!num || num <= 0) {
        return { response: "الرجاء كتابة رقم صحيح (مثال: 5000)", nextStep: "amount" };
      }
      setContractData((prev: any) => ({ ...prev, amount: num }));
      const roleMsg = advisorFlow.find(a => a.trigger === "amount");
      return { response: roleMsg!.response, nextStep: "role" };
    }

    // Handle role step
    if (step === "role") {
      if (input === "1") {
        setContractData((prev: any) => ({ ...prev, role: "seeker" }));
        return { response: advisorFlow.find(a => a.trigger === "role_1")!.response, nextStep: "freeze" };
      } else if (input === "2") {
        setContractData((prev: any) => ({ ...prev, role: "provider" }));
        return { response: advisorFlow.find(a => a.trigger === "role_2")!.response, nextStep: "freeze" };
      }
      return { response: "اختر 1 أو 2", nextStep: "role" };
    }

    // Handle freeze step
    if (step === "freeze") {
      const val = input.replace("%", "").trim();
      if (["0", "25", "50", "100"].includes(val)) {
        setContractData((prev: any) => ({ ...prev, freeze: val }));
        return { response: advisorFlow.find(a => a.trigger === `freeze_${val}`)!.response, nextStep: "publish" };
      }
      return { response: "اختر: 0 / 25 / 50 / 100", nextStep: "freeze" };
    }

    // Handle publish step
    if (step === "publish") {
      if (input === "1") {
        setContractData((prev: any) => ({ ...prev, isPublic: true }));
        return { response: advisorFlow.find(a => a.trigger === "publish_1")!.response, nextStep: "final" };
      } else if (input === "2") {
        setContractData((prev: any) => ({ ...prev, isPublic: false }));
        return { response: advisorFlow.find(a => a.trigger === "publish_2")!.response, nextStep: "final" };
      }
      return { response: "اختر 1 أو 2", nextStep: "publish" };
    }

    // Handle final step
    if (step === "final") {
      if (input === "1") {
        return { response: "✅ افتح صفحة إنشاء العقد الآن. كل البيانات محفوظة.", nextStep: "done" };
      } else if (input === "2") {
        return { response: "✅ سيتم فتح صفحة الدعم. اكتب مشكلتك بالتفصيل.", nextStep: "done" };
      }
      return { response: "اختر 1 أو 2", nextStep: "final" };
    }

    // Default: restart
    return { response: advisorFlow[0].response, nextStep: "start" };
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      role: "user",
      text: input,
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    };

    const { response, nextStep } = findResponse(input);
    const supportMsg: Message = {
      role: "support",
      text: response,
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMsg, supportMsg]);
    setInput("");
    setStep(nextStep);

    // If done, offer to navigate
    if (nextStep === "done" && input === "1") {
      setTimeout(() => {
        setOpen(false);
        window.location.href = "/app/contracts/create";
      }, 1500);
    } else if (nextStep === "done" && input === "2") {
      setTimeout(() => {
        setOpen(false);
        window.location.href = "/app/support";
      }, 1500);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-40 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
        title="مساعدة في إنشاء عقد"
      >
        <Headphones className="h-6 w-6" />
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            style={{ height: "450px" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-l from-indigo-600 to-purple-600 text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-sm">مستشار العقود</p>
                  <p className="text-xs text-indigo-100">مساعدتك في إنشاء عقد جيد</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl p-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-bl-sm"
                        : "bg-white text-gray-800 rounded-br-sm border border-gray-100 shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-indigo-200" : "text-gray-300"}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 border-t border-gray-100 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="اكتب ردك..."
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
