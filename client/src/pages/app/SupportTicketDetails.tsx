import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, Send, Loader2, Star, CheckCircle2, XCircle,
  HeadphonesIcon, AlertCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function SupportTicketDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [closeDialog, setCloseDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [hasRated, setHasRated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/user/support/tickets/${id}`],
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/user/support/tickets/${id}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/support/tickets/${id}`] });
      setMessage("");
    },
    onError: () => toast({ title: "فشل إرسال الرسالة", variant: "destructive" }),
  });

  const rateMutation = useMutation({
    mutationFn: (data: { rating: number; comment?: string }) =>
      apiRequest("POST", `/api/user/support/tickets/${id}/rate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/support/tickets/${id}`] });
      setHasRated(true);
      toast({ title: "شكراً لتقييمك!" });
    },
    onError: () => toast({ title: "فشل إرسال التقييم", variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/support/tickets/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/support/tickets/${id}`] });
      toast({ title: "تم إغلاق التذكرة" });
      setCloseDialog(false);
    },
    onError: () => toast({ title: "فشل الإغلاق", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const ticket = data?.ticket;
  const messages = data?.messages || [];

  if (!ticket) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400">
        <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">التذكرة غير موجودة</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/app/support")}>العودة للدعم</Button>
      </div>
    );
  }

  const isClosed = ticket.status === "resolved" || ticket.status === "closed";
  const displayRating = hoverRating || rating;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 pt-8 rounded-b-3xl flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/app/support")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <p className="text-blue-100 text-xs font-mono">#{ticket.ticketNumber || ticket.id}</p>
            <h1 className="font-bold text-lg truncate">{ticket.subject}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${statusColors[ticket.status] || statusColors.open}`}>
            {statusLabels[ticket.status] || ticket.status}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${categoryColors[ticket.category] || categoryColors.other}`}>
            {categoryLabels[ticket.category] || ticket.category}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${priorityColors[ticket.priority] || priorityColors.medium}`}>
            أولوية: {priorityLabels[ticket.priority] || ticket.priority}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto pb-32">
        {/* Initial ticket description as first message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] shadow-sm">
            <p className="text-xs text-blue-100 mb-1 font-medium">الوصف</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            <p className="text-xs text-blue-200 mt-1 text-left">
              {new Date(ticket.createdAt).toLocaleString("ar-EG")}
            </p>
          </div>
        </motion.div>

        {messages.map((msg: any, index: number) => {
          const isUser = msg.senderType === "user" || msg.senderType === "customer";
          return (
            <motion.div
              key={msg.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] ${isUser ? "order-2" : ""}`}>
                <div className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                      <HeadphonesIcon className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                  )}
                  <span className="text-xs text-gray-400">{isUser ? "أنت" : "فريق الدعم"}</span>
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm whitespace-pre-wrap ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 rounded-tl-sm border border-gray-100"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
                <p className={`text-xs text-gray-400 mt-1 ${isUser ? "text-left" : "text-right"}`}>
                  {new Date(msg.createdAt).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" })}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Rating Section (for resolved/closed tickets) */}
      {isClosed && !hasRated && !ticket.userRating && (
        <div className="bg-white border-t border-gray-100 p-4 mx-4 mb-2 rounded-2xl shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3 text-center">قيّم تجربتك مع الدعم</p>
          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-7 w-7 ${star <= displayRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2"
            >
              <Textarea
                placeholder="تعليق إضافي (اختياري)"
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <Button
                className="w-full"
                disabled={rateMutation.isPending}
                onClick={() => rateMutation.mutate({ rating, comment: ratingComment })}
              >
                {rateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال التقييم"}
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {/* Already Rated Indicator */}
      {(hasRated || ticket.userRating) && (
        <div className="bg-green-50 border border-green-100 p-3 mx-4 mb-2 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700">شكراً لتقييمك</span>
          <div className="flex gap-0.5 mr-auto">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`h-3.5 w-3.5 ${s <= (ticket.userRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
            ))}
          </div>
        </div>
      )}

      {/* Close Ticket Button (only for open tickets) */}
      {!isClosed && (
        <div className="px-4 pb-2">
          <Button
            variant="outline"
            className="w-full h-11 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setCloseDialog(true)}
          >
            <X className="h-4 w-4 ml-2" /> إغلاق التذكرة
          </Button>
        </div>
      )}

      {/* Message Input */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 flex items-end gap-2 max-w-[500px] mx-auto">
          <Textarea
            placeholder="اكتب رسالتك..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={1}
            className="resize-none min-h-[44px] max-h-32 flex-1"
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (message.trim() && !sendMessageMutation.isPending) {
                  sendMessageMutation.mutate(message.trim());
                }
              }
            }}
          />
          <Button
            size="icon"
            className="h-11 w-11 flex-shrink-0 bg-blue-600 hover:bg-blue-700"
            disabled={!message.trim() || sendMessageMutation.isPending}
            onClick={() => sendMessageMutation.mutate(message.trim())}
          >
            {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Close Ticket Dialog */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إغلاق التذكرة</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 py-2">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm text-gray-600">هل أنت متأكد من إغلاق هذه التذكرة؟ لن تتمكن من إرسال المزيد من الرسائل.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>إلغاء</Button>
            <Button
              variant="destructive"
              disabled={closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              {closeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إغلاق التذكرة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
