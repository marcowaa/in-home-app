import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
  Plus, Inbox, Loader2, ShoppingCart,
  FileText, Wrench, Home, Boxes, Truck, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatPrice, cn } from "@/lib/utils";

const contractStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "بانتظار القبول", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  accepted: { label: "مقبول", className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "قيد التنفيذ", className: "bg-blue-100 text-blue-700 border-blue-200" },
  milestone_review: { label: "مرحلة للمراجعة", className: "bg-orange-100 text-orange-700 border-orange-200" },
  completed: { label: "مكتمل", className: "bg-green-100 text-green-700 border-green-200" },
  disputed: { label: "نزاع", className: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "ملغى", className: "bg-gray-100 text-gray-500 border-gray-200" },
  refunded: { label: "مسترد", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const contractTypeConfig: Record<string, { label: string; icon: typeof FileText }> = {
  delivery: { label: "توصيل", icon: Truck },
  purchase: { label: "شراء", icon: ShoppingCart },
  service: { label: "خدمة", icon: Wrench },
  rental: { label: "إيجار", icon: Home },
  custom: { label: "مخصص", icon: FileText },
  split_cost: { label: "تقاسم", icon: Boxes },
};

// Status group mapping for the status filter dropdown
const statusGroups: Record<string, string[]> = {
  active: ["pending", "accepted", "in_progress", "milestone_review"],
  completed: ["completed"],
  disputed: ["disputed"],
  cancelled: ["cancelled", "expired", "refunded"],
};

function ContractStatusBadge({ status }: { status: string }) {
  const config = contractStatusConfig[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

export default function ContractList() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/contracts"],
  });

  const allContracts: any[] = data?.contracts || [];

  // Stats: active contracts count and total frozen amounts
  const { activeCount, frozenTotal } = useMemo(() => {
    const activeStatuses = statusGroups.active;
    const active = allContracts.filter((c: any) => activeStatuses.includes(c.status));
    const total = active.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
    return { activeCount: active.length, frozenTotal: total };
  }, [allContracts]);

  // Apply client-side filters (type, status, search) on top of a given list
  const applyFilters = (list: any[]) => {
    return list.filter((c: any) => {
      // Type filter
      if (typeFilter !== "all" && c.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== "all") {
        const group = statusGroups[statusFilter];
        if (group && !group.includes(c.status)) return false;
      }

      // Search filter (by contractNumber or title)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesNumber = c.contractNumber?.toLowerCase().includes(q);
        const matchesTitle = c.title?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesTitle) return false;
      }

      return true;
    });
  };

  // Tab-specific lists with filters applied on top
  const filteredAll = applyFilters(allContracts);
  const buying = applyFilters(allContracts.filter((c: any) => c.role === "buyer"));
  const selling = applyFilters(allContracts.filter((c: any) => c.role === "seller"));
  const delivering = applyFilters(allContracts.filter((c: any) => c.role === "delivery"));
  const filteredAvailable = applyFilters(
    allContracts.filter((c: any) => c.status === "pending" && c.role !== "creator")
  );

  const renderContractCard = (contract: any) => {
    const typeConf = contractTypeConfig[contract.type] || { label: contract.type, icon: FileText };
    const Icon = typeConf.icon;
    return (
      <Link key={contract.id} href={`/app/contracts/${contract.id}`}>
        <div className="bg-white border border-gray-100 rounded-xl p-3 mb-2 flex items-center gap-3 cursor-pointer hover:border-purple-200 transition-colors">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{contract.title}</p>
            <p className="text-xs text-gray-400">{contract.contractNumber}</p>
          </div>
          <div className="text-left flex-shrink-0">
            <p className="font-semibold text-sm">{formatPrice(contract.amount)}</p>
            <p className="text-xs text-gray-400">ج.م</p>
          </div>
          <ContractStatusBadge status={contract.status} />
        </div>
      </Link>
    );
  };

  const emptyState = (msg: string) => (
    <div className="text-center py-12 text-gray-400">
      <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
      <p className="text-sm mb-4">{msg}</p>
      <div className="flex gap-2 justify-center">
        <Button variant="secondary" size="sm" className="gap-1" onClick={() => navigate("/app/contracts/create")}>
          <Plus className="h-4 w-4" /> عقد جديد
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-indigo-600 border-indigo-200" onClick={() => navigate("/app/marketplace")}>
          🌐 السوق العام
        </Button>
      </div>
    </div>
  );

  const renderTabContent = (list: any[], msg: string) => {
    if (isLoading) return [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />);
    return list.length > 0 ? list.map(renderContractCard) : emptyState(msg);
  };

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-lg">العقود</h1>
          <Button variant="secondary" size="sm" className="gap-1" onClick={() => navigate("/app/contracts/create")}>
            <Plus className="h-4 w-4" /> عقد جديد
          </Button>
        </div>
        <p className="text-purple-100 text-sm">إدارة العقود والاتفاقيات</p>
      </div>

      <div className="p-4">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{activeCount}</p>
            <p className="text-xs text-gray-500 mt-1">عدد العقود النشطة</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{formatPrice(frozenTotal)}</p>
            <p className="text-xs text-gray-500 mt-1">إجمالي المبالغ المجمّدة (ج.م)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="ابحث برقم العقد أو العنوان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="delivery">توصيل</SelectItem>
                <SelectItem value="purchase">شراء</SelectItem>
                <SelectItem value="service">خدمة</SelectItem>
                <SelectItem value="rental">إيجار</SelectItem>
                <SelectItem value="custom">مخصص</SelectItem>
                <SelectItem value="split_cost">تقاسم</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشطة</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="disputed">نزاعات</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="buying">شراء</TabsTrigger>
            <TabsTrigger value="selling">بيع</TabsTrigger>
            <TabsTrigger value="delivering">توصيل</TabsTrigger>
            <TabsTrigger value="available">متاح</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-2">
            {renderTabContent(filteredAll, "لا توجد عقود")}
          </TabsContent>

          <TabsContent value="buying" className="space-y-2">
            {renderTabContent(buying, "لا توجد عقود شراء")}
          </TabsContent>

          <TabsContent value="selling" className="space-y-2">
            {renderTabContent(selling, "لا توجد عقود بيع")}
          </TabsContent>

          <TabsContent value="delivering" className="space-y-2">
            {renderTabContent(delivering, "لا توجد عقود توصيل")}
          </TabsContent>

          <TabsContent value="available" className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : filteredAvailable.length > 0 ? (
              filteredAvailable.map(renderContractCard)
            ) : (
              emptyState("لا توجد عقود متاحة")
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
