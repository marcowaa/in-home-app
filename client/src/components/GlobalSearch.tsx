import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ShoppingCart, Truck, Bell, X, Loader2,
  Package, User, Hash, MapPin, Phone, Clock,
  ArrowLeft, Command,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "admin" | "driver";
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} ي`;
  return new Date(dateStr).toLocaleDateString("ar-EG");
}

function getStatusAr(status: string) {
  switch (status) {
    case "pending": return "معلق";
    case "processing": return "قيد المعالجة";
    case "shipped": return "تم الشحن";
    case "delivered": return "تم التسليم";
    case "cancelled": return "ملغي";
    default: return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-700";
    case "processing": return "bg-blue-100 text-blue-700";
    case "shipped": return "bg-purple-100 text-purple-700";
    case "delivered": return "bg-green-100 text-green-700";
    case "cancelled": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

export function GlobalSearch({ isOpen, onClose, mode }: GlobalSearchProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const apiUrl = mode === "admin" ? "/api/admin/search" : "/api/driver/search";
  const { data: results, isLoading } = useQuery<any>({
    queryKey: [apiUrl, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return null;
      const res = await fetch(`${apiUrl}?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: isOpen && debouncedQuery.length >= 2,
  });

  const handleNavigate = useCallback((path: string) => {
    onClose();
    navigate(path);
  }, [navigate, onClose]);

  if (!isOpen) return null;

  const hasResults = results && (
    (results.orders?.length > 0) ||
    (results.drivers?.length > 0) ||
    (results.notifications?.length > 0) ||
    (results.transactions?.length > 0)
  );

  const showEmpty = debouncedQuery.length >= 2 && !isLoading && !hasResults;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Search Panel */}
      <div className="fixed inset-x-0 top-0 z-[201] flex justify-center pt-[10vh] px-4" dir="rtl">
        <div className="w-full max-w-2xl bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-top-4 duration-200">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={mode === "admin" ? "بحث في الطلبات، المندوبين، الإشعارات..." : "بحث في الطلبات، الإشعارات، المعاملات..."}
              className="flex-1 py-4 bg-transparent outline-none text-lg placeholder:text-muted-foreground/60"
              autoComplete="off"
            />
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Initial state */}
            {(!debouncedQuery || debouncedQuery.length < 2) && !isLoading && (
              <div className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground">اكتب للبحث...</p>
                <p className="text-xs text-muted-foreground mt-1">على الأقل حرفين للبدء</p>
              </div>
            )}

            {/* Empty state */}
            {showEmpty && (
              <div className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground">لا توجد نتائج لـ "{debouncedQuery}"</p>
                <p className="text-xs text-muted-foreground mt-1">جرب كلمات بحث مختلفة</p>
              </div>
            )}

            {/* Orders */}
            {results?.orders?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  الطلبات ({results.orders.length})
                </div>
                {results.orders.map((order: any) => (
                  <button
                    key={order.id}
                    className="w-full text-right px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                    onClick={() => handleNavigate(mode === "admin" ? "/admin/orders" : "/driver/dashboard")}
                  >
                    <div className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">#{order.orderNumber}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                          {getStatusAr(order.status)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.customerName} • {order.customerPhone}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold">{order.total}</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(order.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Drivers (admin only) */}
            {mode === "admin" && results?.drivers?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  المندوبين ({results.drivers.length})
                </div>
                {results.drivers.map((driver: any) => (
                  <button
                    key={driver.id}
                    className="w-full text-right px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                    onClick={() => handleNavigate("/admin/drivers")}
                  >
                    <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                      {driver.profileImage ? (
                        <img src={driver.profileImage} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <User className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{driver.name}</span>
                        {driver.fullyVerified && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">موثق</span>
                        )}
                        {!driver.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">معطل</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {driver.username} {driver.phone ? `• ${driver.phone}` : ""} {driver.governorate ? `• ${driver.governorate}` : ""}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs text-muted-foreground">{driver.completedOrders || 0} طلب</p>
                      {driver.averageRating && Number(driver.averageRating) > 0 && (
                        <p className="text-xs text-yellow-600">★ {Number(driver.averageRating).toFixed(1)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Notifications */}
            {results?.notifications?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" />
                  الإشعارات ({results.notifications.length})
                </div>
                {results.notifications.map((n: any) => (
                  <button
                    key={n.id}
                    className="w-full text-right px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                    onClick={() => handleNavigate(mode === "admin" ? "/admin/notifications" : "/driver/dashboard")}
                  >
                    <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-950 flex items-center justify-center shrink-0">
                      <Bell className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Transactions (driver only) */}
            {mode === "driver" && results?.transactions?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  المعاملات المالية ({results.transactions.length})
                </div>
                {results.transactions.map((t: any) => (
                  <div
                    key={t.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      t.type === "commission" || t.type === "deposit" || t.type === "referral_bonus"
                        ? "bg-green-50 dark:bg-green-950"
                        : "bg-red-50 dark:bg-red-950"
                    }`}>
                      <Hash className={`h-4 w-4 ${
                        t.type === "commission" || t.type === "deposit" || t.type === "referral_bonus"
                          ? "text-green-600"
                          : "text-red-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.type}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className={`text-sm font-bold ${
                        t.type === "commission" || t.type === "deposit" || t.type === "referral_bonus"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {t.type === "commission" || t.type === "deposit" || t.type === "referral_bonus" ? "+" : "-"}{t.amount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(t.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <span>اضغط ESC للإغلاق</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border">K</kbd>
              <span className="mr-1">للفتح</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
