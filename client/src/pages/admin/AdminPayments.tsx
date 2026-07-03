import { useQuery } from "@tanstack/react-query";
import {
  Users, UserCheck, ShieldCheck, Clock, FileText, CheckCircle2,
  AlertTriangle, TrendingUp, DollarSign, Headphones, Loader2,
  ArrowLeftRight, Activity, BarChart3, Wallet,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatPrice } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, color, bg, loading }: StatCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      <CardContent className="p-4 md:p-6 relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold mt-1 tabular-nums">{value}</p>
            )}
          </div>
          <div className={`p-3 rounded-2xl ${bg} transition-transform group-hover:scale-110`}>
            <Icon className={`h-5 w-5 md:h-6 md:w-6 ${color}`} />
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${bg}`} />
      </CardContent>
    </Card>
  );
}

export default function AdminPayments() {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/payments/stats"],
  });

  // Prepare chart data from stats
  const chartData = stats
    ? [
        { name: "المستخدمين", value: stats.totalUsers || 0, fill: "#3b82f6" },
        { name: "نشطين", value: stats.activeUsers || 0, fill: "#22c55e" },
        { name: "موثقين", value: stats.verifiedUsers || 0, fill: "#8b5cf6" },
        { name: "قيد المراجعة", value: stats.pendingKyc || 0, fill: "#eab308" },
      ]
    : [];

  const contractChartData = stats
    ? [
        { name: "إجمالي", value: stats.totalContracts || 0, fill: "#3b82f6" },
        { name: "نشطة", value: stats.activeContracts || 0, fill: "#22c55e" },
        { name: "مكتملة", value: stats.completedContracts || 0, fill: "#06b6d4" },
        { name: "نزاع", value: stats.disputedContracts || 0, fill: "#ef4444" },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border p-6">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold">إحصائيات المدفوعات</h1>
            <p className="text-muted-foreground mt-1">نظرة شاملة على المدفوعات والمستخدمين والعقود</p>
          </div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-[0.07]">
            <BarChart3 className="h-32 w-32" />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        ) : stats ? (
          <>
            {/* Users Section */}
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                إحصائيات المستخدمين
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="إجمالي المستخدمين"
                  value={(stats.totalUsers || 0).toLocaleString("ar-EG")}
                  icon={Users}
                  color="text-blue-500"
                  bg="bg-blue-500/10"
                />
                <StatCard
                  title="مستخدمين نشطين"
                  value={(stats.activeUsers || 0).toLocaleString("ar-EG")}
                  icon={UserCheck}
                  color="text-green-500"
                  bg="bg-green-500/10"
                />
                <StatCard
                  title="مستخدمين موثقين"
                  value={(stats.verifiedUsers || 0).toLocaleString("ar-EG")}
                  icon={ShieldCheck}
                  color="text-purple-500"
                  bg="bg-purple-500/10"
                />
                <StatCard
                  title="قيد التوثيق"
                  value={(stats.pendingKyc || 0).toLocaleString("ar-EG")}
                  icon={Clock}
                  color="text-yellow-500"
                  bg="bg-yellow-500/10"
                />
              </div>
            </div>

            {/* Contracts Section */}
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                إحصائيات العقود
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="إجمالي العقود"
                  value={(stats.totalContracts || 0).toLocaleString("ar-EG")}
                  icon={FileText}
                  color="text-blue-500"
                  bg="bg-blue-500/10"
                />
                <StatCard
                  title="عقود نشطة"
                  value={(stats.activeContracts || 0).toLocaleString("ar-EG")}
                  icon={Activity}
                  color="text-green-500"
                  bg="bg-green-500/10"
                />
                <StatCard
                  title="عقود مكتملة"
                  value={(stats.completedContracts || 0).toLocaleString("ar-EG")}
                  icon={CheckCircle2}
                  color="text-cyan-500"
                  bg="bg-cyan-500/10"
                />
                <StatCard
                  title="عقود بنزاع"
                  value={(stats.disputedContracts || 0).toLocaleString("ar-EG")}
                  icon={AlertTriangle}
                  color="text-red-500"
                  bg="bg-red-500/10"
                />
              </div>
            </div>

            {/* Financial Section */}
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                الإحصائيات المالية
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="overflow-hidden border-green-500/30">
                  <CardContent className="p-6 relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">إجمالي حجم التحويلات</p>
                      <div className="p-2 rounded-xl bg-green-500/10">
                        <ArrowLeftRight className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-green-600">
                      {formatPrice(stats.totalTransferVolume || "0", "ج.م")}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500/30" />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-blue-500/30">
                  <CardContent className="p-6 relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">إجمالي حجم العقود</p>
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-blue-600">
                      {formatPrice(stats.totalContractVolume || "0", "ج.م")}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/30" />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-primary/30">
                  <CardContent className="p-6 relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">إيرادات المنصة</p>
                      <div className="p-2 rounded-xl bg-primary/10">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-primary">
                      {formatPrice(stats.platformRevenue || "0", "ج.م")}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/30" />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Support Section */}
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Headphones className="h-5 w-5 text-purple-500" />
                إحصائيات الدعم
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="إجمالي التذاكر"
                  value={(stats.supportTotal || 0).toLocaleString("ar-EG")}
                  icon={Headphones}
                  color="text-blue-500"
                  bg="bg-blue-500/10"
                />
                <StatCard
                  title="تذاكر مفتوحة"
                  value={(stats.supportOpen || 0).toLocaleString("ar-EG")}
                  icon={AlertTriangle}
                  color="text-green-500"
                  bg="bg-green-500/10"
                />
                <StatCard
                  title="قيد المعالجة"
                  value={(stats.supportInProgress || 0).toLocaleString("ar-EG")}
                  icon={Clock}
                  color="text-yellow-500"
                  bg="bg-yellow-500/10"
                />
                <StatCard
                  title="تم الحل"
                  value={(stats.supportResolved || 0).toLocaleString("ar-EG")}
                  icon={CheckCircle2}
                  color="text-gray-500"
                  bg="bg-gray-500/10"
                />
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Users Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-blue-500" />
                    توزيع المستخدمين
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Contracts Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-orange-500" />
                    توزيع العقود
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={contractChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {contractChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Summary Card */}
            <Card className="bg-gradient-to-l from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">الملخص المالي</h3>
                    <p className="text-sm text-muted-foreground">نظرة سريعة على الأرقام الرئيسية</p>
                  </div>
                </div>
                <Separator className="mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">حجم التحويلات</p>
                    <p className="font-bold text-lg text-green-600">{formatPrice(stats.totalTransferVolume || "0", "ج.م")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">حجم العقود</p>
                    <p className="font-bold text-lg text-blue-600">{formatPrice(stats.totalContractVolume || "0", "ج.م")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">إيرادات المنصة</p>
                    <p className="font-bold text-lg text-primary">{formatPrice(stats.platformRevenue || "0", "ج.م")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
                    <p className="font-bold text-lg">{(stats.totalUsers || 0).toLocaleString("ar-EG")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="p-12 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">تعذر تحميل الإحصائيات</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
