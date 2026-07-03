import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Plus, Trash2, User, Building2, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Beneficiaries() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [addDialog, setAddDialog] = useState(false);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [type, setType] = useState("phone");
  const [bankName, setBankName] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/beneficiaries"],
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/user/beneficiaries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beneficiaries"] });
      toast({ title: "تم إضافة المستفيد" });
      setAddDialog(false); setName(""); setIdentifier(""); setType("phone"); setBankName("");
    },
    onError: () => toast({ title: "فشل الإضافة", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/user/beneficiaries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beneficiaries"] });
      toast({ title: "تم الحذف" });
    },
  });

  const beneficiaries = data?.beneficiaries || [];

  const typeIcons: Record<string, any> = { phone: User, bank: Building2, wallet: Wallet };
  const typeLabels: Record<string, string> = { phone: "هاتف", bank: "بنك", wallet: "محفظة" };

  return (
    <div dir="rtl" className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/home")}><ArrowRight className="h-5 w-5" /></Button>
        <h1 className="font-bold text-gray-900">المستفيدون</h1>
        <Button variant="ghost" size="sm" className="mr-auto" onClick={() => setAddDialog(true)}>
          <Plus className="h-4 w-4" /> إضافة
        </Button>
      </div>

      <div className="p-4 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : beneficiaries.length > 0 ? (
          beneficiaries.map((b: any) => {
            const Icon = typeIcons[b.type] || User;
            return (
              <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{b.name}</p>
                  <p className="text-xs text-gray-400 truncate">{b.identifier} • {typeLabels[b.type] || b.type}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(b.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 text-gray-400">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">لا يوجد مستفيدون</p>
            <Button className="mt-4" onClick={() => setAddDialog(true)}>إضافة مستفيد</Button>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة مستفيد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="الاسم" value={name} onChange={e => setName(e.target.value)} className="h-12" />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">هاتف</SelectItem>
                <SelectItem value="bank">بنك</SelectItem>
                <SelectItem value="wallet">محفظة</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={type === "phone" ? "رقم الهاتف" : type === "bank" ? "رقم الحساب" : "رقم المحفظة"} value={identifier} onChange={e => setIdentifier(e.target.value)} className="h-12" />
            {type === "bank" && <Input placeholder="اسم البنك" value={bankName} onChange={e => setBankName(e.target.value)} className="h-12" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>إلغاء</Button>
            <Button disabled={!name || !identifier || addMutation.isPending} onClick={() => addMutation.mutate({ name, identifier, type, bankName })}>
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
