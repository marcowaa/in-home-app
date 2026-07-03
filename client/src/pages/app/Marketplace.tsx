import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Loader2, ShoppingCart, Wrench, Home, FileText, Boxes, Truck, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice, cn } from "@/lib/utils";

const typeConfig: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  delivery: { label: "توصيل", icon: Truck, color: "bg-emerald-500" },
  purchase: { label: "شراء", icon: ShoppingCart, color: "bg-blue-500" },
  service: { label: "خدمة", icon: Wrench, color: "bg-indigo-500" },
  rental: { label: "إيجار", icon: Home, color: "bg-cyan-500" },
  custom: { label: "مخصص", icon: FileText, color: "bg-violet-500" },
  split_cost: { label: "تقاسم", icon: Boxes, color: "bg-teal-500" },
};

export default function Marketplace() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/public/contracts", typeFilter],
    queryFn: async () => {
      const params = typeFilter !== "all" ? `?type=${typeFilter}` : "";
      const res = await apiRequest("GET", `/api/public/contracts${params}`);
      return res.json();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (contractId: string) => apiRequest("POST", `/api/user/contracts/${contractId}/accept`),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/public/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/contracts"] });
      toast({ title: "تم قبول العقد!", description: "يمكنك متابعته من قائمة عقودك" });
      navigate(`/app/contracts/${data.contract?.id}`);
    },
    onError: async (err: any) => {
      const msg = err?.message || "فشل القبول";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const contracts = (data?.contracts || []).filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.title?.toLowerCase().includes(s) || c.contractNumber?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s);
  });

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-5 pt-8 rounded-b-3xl">
        <h1 className="text-xl font-bold mb-1">السوق العام</h1>
        <p className="text-indigo-100 text-sm">تصفح العقود المتاحة واقبل ما يناسبك</p>
      </div>

      {/* Filters */}
      <div className="px-4 mt-4 space-y-3">
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1 h-10">
              <SelectValue placeholder="كل الأنواع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="delivery">توصيل</SelectItem>
              <SelectItem value="purchase">شراء</SelectItem>
              <SelectItem value="service">خدمة</SelectItem>
              <SelectItem value="rental">إيجار</SelectItem>
              <SelectItem value="custom">مخصص</SelectItem>
              <SelectItem value="split_cost">تقاسم</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="ابحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pr-9"
            />
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <div className="px-4 mt-4 space-y-3 pb-20">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-200 rounded" />
            </div>
          ))
        ) : contracts.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
              <Search className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">لا توجد عقود متاحة حالياً</p>
            <Link href="/app/contracts/create">
              <Button variant="outline" className="mt-3 text-indigo-600 border-indigo-200">
                أنشئ عقداً عاماً
              </Button>
            </Link>
          </div>
        ) : (
          contracts.map((c: any) => {
            const tc = typeConfig[c.type] || typeConfig.custom;
            const Icon = tc.icon;
            const reqFreeze = parseFloat(c.requiredFreezeAmount || "0");
            const commission = parseFloat(c.commissionAmount || "0");

            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl ${tc.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-xs">{tc.label}</Badge>
                      {c.creatorRole === "provider" ? (
                        <Badge className="text-xs bg-green-100 text-green-700">مقدم خدمة</Badge>
                      ) : (
                        <Badge className="text-xs bg-blue-100 text-blue-700">طالب خدمة</Badge>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.contractNumber}</p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="font-bold text-lg text-gray-900">{formatPrice(c.totalAmount)}</p>
                    <p className="text-xs text-gray-400">ج.م</p>
                  </div>
                </div>

                {c.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{c.description}</p>
                )}

                {/* Terms summary */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {commission > 0 && (
                    <div className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-lg">
                      عمولة: {formatPrice(String(commission))} ج.م
                    </div>
                  )}
                  {reqFreeze > 0 && (
                    <div className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-lg">
                      تجميد مطلوب: {formatPrice(String(reqFreeze))} ج.م ({(parseFloat(c.requiredFreezeRate) * 100).toFixed(0)}%)
                    </div>
                  )}
                  {reqFreeze === 0 && commission === 0 && (
                    <div className="bg-gray-50 text-gray-500 text-xs px-2 py-1 rounded-lg">
                      بدون تجميد أو عمولة
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/app/contracts/${c.id}`} className="flex-1">
                    <Button variant="outline" className="w-full h-9 text-sm">تفاصيل</Button>
                  </Link>
                  <Button
                    className="flex-1 h-9 text-sm bg-indigo-600 hover:bg-indigo-700"
                    disabled={acceptMutation.isPending}
                    onClick={() => acceptMutation.mutate(c.id)}
                  >
                    {acceptMutation.isPending && acceptMutation.variables === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 ml-1" /> قبول
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
