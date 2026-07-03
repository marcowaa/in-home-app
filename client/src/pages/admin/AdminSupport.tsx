import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  MessageSquare, Eye, Loader2, Send, UserCheck, CheckCircle2, XCircle,
  Clock, AlertCircle, Headphones, Mail, ShoppingCart, CreditCard,
  Truck, Package, Settings, Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const ticketCategories: Record<string, { label: string; icon: typeof MessageSquare }> = {
  order: { label: "طلب", icon: ShoppingCart },
  payment: { label: "دفع", icon: CreditCard },
  delivery: { label: "توصيل", icon: Truck },
  product: { label: "منتج", icon: Package },
  account: { label: "حساب", icon: Settings },
  technical: { label: "مشكلة تقنية", icon: Bug },
  other: { label: "أخرى", icon: MessageSquare },
};

const ticketStatuses: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوح", color: "bg-green-500" },
  in_progress: { label: "قيد المعالجة", color: "bg-blue-500" },
  resolved: { label: "تم الحل", color: "bg-gray-500" },
  closed: { label: "مغلق", color: "bg-gray-400" },
};

const ticketPriorities: Record<string, { label: string; color: string }> = {
  low: { label: "منخفض", color: "bg-gray-400" },
  medium: { label: "متوسط", color: "bg-yellow-500" },
  high: { label: "عالي", color: "bg-orange-500" },
  urgent: { label: "عاجل", color: "bg-red-500" },
};

export default function AdminSupport() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/support/tickets"],
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/support/stats"],
  });

  const { data: ticketDetails, isLoading: detailsLoading } = useQuery<any>({
    queryKey: ["/api/admin/support/tickets", selectedTicket?.id],
    queryFn: () => selectedTicket
      ? fetch(`/api/admin/support/tickets/${selectedTicket.id}`, { credentials: "include" }).then((r) => r.json())
      : null,
    enabled: !!selectedTicket,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      return apiRequest("POST", `/api/admin/support/tickets/${id}/messages`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets", selectedTicket?.id] });
      toast({ title: "تم إرسال الرد" });
      setReplyText("");
    },
    onError: () => {
      toast({ title: "فشل في إرسال الرد", variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/support/tickets/${id}/assign`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets", selectedTicket?.id] });
      toast({ title: "تم إسناد التذكرة إليك" });
    },
    onError: () => toast({ title: "فشل في الإسناد", variant: "destructive" }),
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/support/tickets/${id}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets", selectedTicket?.id] });
      toast({ title: "تم حل التذكرة" });
    },
    onError: () => toast({ title: "فشل في حل التذكرة", variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/support/tickets/${id}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets", selectedTicket?.id] });
      toast({ title: "تم إغلاق التذكرة" });
    },
    onError: () => toast({ title: "فشل في إغلاق التذكرة", variant: "destructive" }),
  });

  const getStatusBadge = (status: string) => {
    const s = ticketStatuses[status];
    if (!s) return <Badge variant="outline">{status}</Badge>;
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const p = ticketPriorities[priority];
    if (!p) return <Badge variant="outline">{priority}</Badge>;
    return <Badge className={p.color}>{p.label}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    return ticketCategories[category]?.label || category;
  };

  const filteredTickets = tickets
    .filter((t) => categoryFilter === "all" || t.category === categoryFilter)
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const stats = statsData || { total: tickets.length, open: 0, inProgress: 0, resolved: 0 };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">تذاكر الدعم</h1>
          <p className="text-muted-foreground">إدارة تذاكر دعم العملاء</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Headphones className="h-4 w-4 text-blue-500" />
              <p className="text-2xl font-bold">{stats.total || tickets.length}</p>
            </div>
            <p className="text-xs text-muted-foreground">إجمالي التذاكر</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-green-500" />
              <p className="text-2xl font-bold text-green-500">{stats.open ?? tickets.filter((t) => t.status === "open").length}</p>
            </div>
            <p className="text-xs text-muted-foreground">مفتوحة</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <p className="text-2xl font-bold text-blue-500">{stats.inProgress ?? tickets.filter((t) => t.status === "in_progress").length}</p>
            </div>
            <p className="text-xs text-muted-foreground">قيد المعالجة</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-gray-500" />
              <p className="text-2xl font-bold text-gray-500">{stats.resolved ?? tickets.filter((t) => t.status === "resolved").length}</p>
            </div>
            <p className="text-xs text-muted-foreground">تم الحل</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="جميع التصنيفات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {Object.entries(ticketCategories).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              {Object.entries(ticketStatuses).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="جميع الأولويات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأولويات</SelectItem>
              {Object.entries(ticketPriorities).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tickets Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد تذاكر</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم التذكرة</TableHead>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>الموضوع</TableHead>
                      <TableHead>الأولوية</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>المُسند إلى</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTicket(ticket)}>
                        <TableCell className="font-mono text-sm">{ticket.ticketNumber || ticket.id}</TableCell>
                        <TableCell className="font-medium">{ticket.userName || ticket.user?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const CatIcon = ticketCategories[ticket.category]?.icon || MessageSquare;
                              return <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />;
                            })()}
                            <span>{getCategoryLabel(ticket.category)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                        <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>{ticket.assignedToName || ticket.assignedTo?.name || (
                          <span className="text-xs text-muted-foreground">غير مُسند</span>
                        )}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(ticket.createdAt)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => { setSelectedTicket(null); setReplyText(""); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {selectedTicket.subject}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </DialogTitle>
                <DialogDescription>رقم التذكرة: {selectedTicket.ticketNumber || selectedTicket.id}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Ticket Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">المستخدم</p>
                    <p className="font-medium">{selectedTicket.userName || selectedTicket.user?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">التصنيف</p>
                    <p className="font-medium">{getCategoryLabel(selectedTicket.category)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الأولوية</p>
                    <div>{getPriorityBadge(selectedTicket.priority)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">التاريخ</p>
                    <p className="font-medium text-xs">{formatDate(selectedTicket.createdAt)}</p>
                  </div>
                </div>

                {/* Ticket Description */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">الوصف</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-line">{selectedTicket.description || selectedTicket.message}</p>
                  </CardContent>
                </Card>

                <Separator />

                {/* Messages */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">الرسائل</h4>
                  {detailsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px] rounded-lg border p-3">
                      <div className="space-y-3">
                        {ticketDetails?.messages && ticketDetails.messages.length > 0 ? (
                          ticketDetails.messages.map((msg: any) => (
                            <div key={msg.id} className={`flex flex-col ${msg.isAdmin ? "items-start" : "items-end"}`}>
                              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.isAdmin ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {msg.isAdmin ? "الدعم" : msg.senderName || "المستخدم"}
                                  </span>
                                  {msg.isAdmin && <Badge variant="outline" className="text-[10px] py-0">مشرف</Badge>}
                                </div>
                                <p className="whitespace-pre-line">{msg.message}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(msg.createdAt)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">لا توجد رسائل بعد</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Reply Input */}
                  {selectedTicket.status !== "closed" && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="اكتب ردك هنا..."
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button
                          className="gap-2"
                          onClick={() => replyMutation.mutate({ id: selectedTicket.id, message: replyText })}
                          disabled={!replyText.trim() || replyMutation.isPending}
                        >
                          {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          إرسال الرد
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                {selectedTicket.status !== "closed" && (
                  <div className="flex flex-wrap gap-2">
                    {!selectedTicket.assignedToName && (
                      <Button variant="outline" className="gap-2" onClick={() => assignMutation.mutate(selectedTicket.id)} disabled={assignMutation.isPending}>
                        <UserCheck className="h-4 w-4" />
                        إسناد إلي
                      </Button>
                    )}
                    {selectedTicket.status !== "resolved" && (
                      <Button variant="outline" className="gap-2 text-green-600" onClick={() => resolveMutation.mutate(selectedTicket.id)} disabled={resolveMutation.isPending}>
                        <CheckCircle2 className="h-4 w-4" />
                        حل التذكرة
                      </Button>
                    )}
                    <Button variant="outline" className="gap-2 text-destructive" onClick={() => closeMutation.mutate(selectedTicket.id)} disabled={closeMutation.isPending}>
                      <XCircle className="h-4 w-4" />
                      إغلاق التذكرة
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
