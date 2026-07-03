import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PaymentMethod, InsertPaymentMethod } from "@shared/schema";

export default function AdminPaymentMethods() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<InsertPaymentMethod>>({
    name: "",
    nameEn: "",
    description: "",
    icon: "",
    instructions: "",
    accountNumber: "",
    isActive: true,
    sortOrder: 0,
  });

  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPaymentMethod) => {
      return apiRequest("POST", "/api/admin/payment-methods", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "تم إضافة وسيلة الدفع بنجاح" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "فشل في إضافة وسيلة الدفع", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPaymentMethod> }) => {
      return apiRequest("PATCH", `/api/admin/payment-methods/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "تم تحديث وسيلة الدفع بنجاح" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "فشل في تحديث وسيلة الدفع", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "تم حذف وسيلة الدفع بنجاح" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "فشل في حذف وسيلة الدفع", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/payment-methods/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "تم تحديث حالة وسيلة الدفع" });
    },
  });

  const openDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        nameEn: method.nameEn || "",
        description: method.description || "",
        icon: method.icon || "",
        instructions: method.instructions || "",
        accountNumber: method.accountNumber || "",
        isActive: method.isActive ?? true,
        sortOrder: method.sortOrder || 0,
      });
    } else {
      setEditingMethod(null);
      setFormData({
        name: "",
        nameEn: "",
        description: "",
        icon: "",
        instructions: "",
        accountNumber: "",
        isActive: true,
        sortOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMethod(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMethod) {
      updateMutation.mutate({ id: editingMethod.id, data: formData });
    } else {
      createMutation.mutate(formData as InsertPaymentMethod);
    }
  };

  const sortedMethods = [...paymentMethods].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-payment-methods-title">
              إدارة وسائل الدفع
            </h1>
            <p className="text-muted-foreground">
              إضافة وتعديل وسائل الدفع المصرية
            </p>
          </div>
          <Button onClick={() => openDialog()} className="gap-2" data-testid="button-add-payment-method">
            <Plus className="h-4 w-4" />
            إضافة وسيلة دفع
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">لا توجد وسائل دفع حالياً</p>
                <Button onClick={() => openDialog()} className="mt-4">
                  إضافة أول وسيلة دفع
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>رقم الحساب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMethods.map((method, index) => (
                    <TableRow key={method.id} data-testid={`row-payment-method-${method.id}`}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{method.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {method.description || "-"}
                      </TableCell>
                      <TableCell dir="ltr">{method.accountNumber || "-"}</TableCell>
                      <TableCell>
                        {method.isActive ? (
                          <Badge className="bg-green-500">مفعل</Badge>
                        ) : (
                          <Badge variant="secondary">متوقف</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              toggleMutation.mutate({
                                id: method.id,
                                isActive: !method.isActive,
                              })
                            }
                          >
                            {method.isActive ? (
                              <PowerOff className="h-4 w-4 text-destructive" />
                            ) : (
                              <Power className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(method)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(method.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? "تعديل وسيلة الدفع" : "إضافة وسيلة دفع جديدة"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم وسيلة الدفع *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: فودافون كاش"
                required
                data-testid="input-payment-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف مختصر لوسيلة الدفع"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">رقم الحساب / المحفظة</Label>
              <Input
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="01XXXXXXXXX"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">تعليمات الدفع</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="التعليمات التي ستظهر للعميل عند اختيار هذه الوسيلة"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">ترتيب الظهور</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-payment-method"
              >
                {editingMethod ? "حفظ التعديلات" : "إضافة وسيلة الدفع"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنتِ متأكدة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف وسيلة الدفع هذه نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
