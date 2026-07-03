import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Plus, Shield, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import EscrowStatusBadge from "@/components/app/EscrowStatusBadge";

export default function EscrowList() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("buying");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/escrow/my-orders"],
  });
  const { data: availableData, isLoading: availLoading } = useQuery<any>({
    queryKey: ["/api/user/escrow/available"],
  });

  const renderOrderCard = (order: any) => (
    <Link key={order.id} href={`/app/escrow/${order.id}`}>
      <div className="bg-white border border-gray-100 rounded-xl p-3 mb-2 flex items-center gap-3 cursor-pointer hover:border-purple-200 transition-colors">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Shield className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{order.productDescription}</p>
          <p className="text-xs text-gray-400">{order.orderNumber}</p>
        </div>
        <div className="text-left flex-shrink-0">
          <p className="font-semibold text-sm">{formatPrice(order.productValue)}</p>
          <p className="text-xs text-gray-400">ج.م</p>
        </div>
        <EscrowStatusBadge status={order.status} />
      </div>
    </Link>
  );

  const emptyState = (msg: string) => (
    <div className="text-center py-12 text-gray-400">
      <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
      <p className="text-sm">{msg}</p>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-lg">الصفقات الآمنة</h1>
          <Button variant="secondary" size="sm" className="gap-1" onClick={() => navigate("/app/escrow/create")}>
            <Plus className="h-4 w-4" /> صفقة جديدة
          </Button>
        </div>
        <p className="text-purple-100 text-sm">توصيل آمن بضمان الأموال</p>
      </div>

      <div className="p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="buying">شراء</TabsTrigger>
            <TabsTrigger value="selling">بيع</TabsTrigger>
            <TabsTrigger value="delivering">توصيل</TabsTrigger>
            <TabsTrigger value="available">متاح</TabsTrigger>
          </TabsList>

          <TabsContent value="buying" className="space-y-2">
            {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />) :
              data?.asBuyer?.length > 0 ? data.asBuyer.map(renderOrderCard) : emptyState("لا توجد صفقات شراء")}
          </TabsContent>

          <TabsContent value="selling" className="space-y-2">
            {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />) :
              data?.asSeller?.length > 0 ? data.asSeller.map(renderOrderCard) : emptyState("لا توجد صفقات بيع")}
          </TabsContent>

          <TabsContent value="delivering" className="space-y-2">
            {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />) :
              data?.asDelivery?.length > 0 ? data.asDelivery.map(renderOrderCard) : emptyState("لا توجد توصيلات")}
          </TabsContent>

          <TabsContent value="available" className="space-y-2">
            {availLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div> :
              availableData?.orders?.length > 0 ? availableData.orders.map(renderOrderCard) : emptyState("لا توجد طلبات متاحة")}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
