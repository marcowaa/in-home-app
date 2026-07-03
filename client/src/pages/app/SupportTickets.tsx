import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, Plus, Loader2, HeadphonesIcon, ChevronLeft,
  Clock, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const categoryLabels: Record<string, string> = {
  transfer: "تحويل",
  contract: "عقد",
  wallet: "محفظة",
  kyc: "توثيق",
  account: "حساب",
  technical: "تقني",
  other: "أخرى",
};

const categoryColors: Record<string, string> = {
  transfer: "bg-blue-100 text-blue-700",
  contract: "bg-purple-100 text-purple-700",
  wallet: "bg-green-100 text-green-700",
  kyc: "bg-yellow-100 text-yellow-700",
  account: "bg-indigo-100 text-indigo-700",
  technical: "bg-red-100 text-red-700",
  other: "bg-gray-100 text-gray-700",
};

const statusLabels: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  waiting_user: "بانتظار ردك",
  resolved: "محلولة",
  closed: "مغلقة",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  waiting_user: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const priorityLabels: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const priorityDots: Record<string, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export default function SupportTickets() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [createDialog, setCreateDialog] = useState(false);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/support/tickets"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { category: string; subject: string; description: string; priority: string }) =>
      apiRequest("POST", "/api/user/support/tickets", data),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/user/support/tickets"] });
      toast({ title: "تم إنشاء التذكرة", description: `رقم التذكرة: ${result.ticketNumber || result.id}` });
      setCreateDialog(false);
      setCategory(""); setSubject(""); setDescription(""); setPriority("medium");
      if (result.id) navigate(`/app/support/${result.id}`);
    },
    onError: () => toast({ title: "فشل إنشاء التذكرة", variant: "destructive" }),
  });

  const tickets = data?.tickets || [];

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Gradient Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 pt-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/app/home")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5" />
            <h1 className="font-bold text-lg">الدعم الفني</h1>
          </div>
        </div>
        <Button
          className="w-full h-11 bg-white/15 backdrop-blur hover:bg-white/25 text-white border-0"
          onClick={() => setCreateDialog(true)}
        >
          <Plus className="h-4 w-4 ml-2" /> تذكرة جديدة
        </Button>
      </div>

      {/* Tickets List */}
      <div className="p-4 space-y-2">
        {isLoading ? (
          [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
        ) : tickets.length > 0 ? (
          tickets.map((ticket: any, index: number) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/app/support/${ticket.id}`)}
              className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-mono mb-0.5">#{ticket.ticketNumber || ticket.id}</p>
                  <p className="font-semibold text-sm text-gray-900 truncate">{ticket.subject}</p>
                </div>
                <ChevronLeft className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${categoryColors[ticket.category] || categoryColors.other}`}>
                  {categoryLabels[ticket.category] || ticket.category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusColors[ticket.status] || statusColors.open}`}>
                  {statusLabels[ticket.status] || ticket.status}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${priorityColors[ticket.priority] || priorityColors.medium}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityDots[ticket.priority] || priorityDots.medium}`} />
                  {priorityLabels[ticket.priority] || ticket.priority}
                </span>
              </div>

              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{new Date(ticket.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-16 text-gray-400">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <HeadphonesIcon className="h-10 w-10 text-blue-300" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">لا توجد تذاكر دعم</p>
            <p className="text-xs text-gray-400 mb-4">إذا واجهت أي مشكلة، يمكنك إنشاء تذكرة وسيساعدك فريقنا</p>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateDialog(true)}>
              <Plus className="h-4 w-4 ml-2" /> إنشاء تذكرة
            </Button>
          </div>
        )}
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تذكرة دعم جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">التصنيف</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12"><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">تحويل</SelectItem>
                  <SelectItem value="contract">عقد</SelectItem>
                  <SelectItem value="wallet">محفظة</SelectItem>
                  <SelectItem value="kyc">توثيق</SelectItem>
                  <SelectItem value="account">حساب</SelectItem>
                  <SelectItem value="technical">تقني</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الموضوع</label>
              <Input placeholder="اكتب عنوان المشكلة" value={subject} onChange={e => setSubject(e.target.value)} className="h-12" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الوصف</label>
              <Textarea placeholder="اشرح مشكلتك بالتفصيل..." value={description} onChange={e => setDescription(e.target.value)} rows={4} className="resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الأولوية</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {priority === "urgent" && (
              <div className="bg-red-50 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">سيتم معالجة التذاكر العاجلة في أقرب وقت</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>إلغاء</Button>
            <Button
              disabled={!category || !subject || !description || createMutation.isPending}
              onClick={() => createMutation.mutate({ category, subject, description, priority })}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
