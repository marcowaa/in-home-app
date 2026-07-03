import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Truck as TruckIcon,
  KeyRound,
  Truck,
  Bell,
  BellRing,
  Plug,
  UserPlus,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GlobalSearch } from "@/components/GlobalSearch";
import type { AppSettings } from "@shared/schema";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart },
  { href: "/admin/drivers", label: "المندوبين", icon: Truck },
  { href: "/admin/notifications", label: "الإشعارات", icon: Bell },
  { href: "/admin/operations-log", label: "سجل العمليات", icon: FileText },
  { href: "/admin/payment-methods", label: "وسائل الدفع", icon: CreditCard },
  { href: "/admin/integrations", label: "التكاملات و API", icon: Plug },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
  { href: "/admin/change-password", label: "تغيير كلمة المرور", icon: KeyRound },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: adminCheck } = useQuery<{ loggedIn: boolean; isPro: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const isPro = adminCheck?.isPro;

  const { data: notifData } = useQuery<{ notifications: any[]; unreadCount: number }>({
    queryKey: ["/api/admin/notifications"],
    refetchInterval: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/notifications/read"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] }),
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await apiRequest("GET", "/api/admin/check");
      } catch {
        navigate("/admin");
      }
    };
    checkAuth();
  }, [navigate]);

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    if (notifOpen || moreOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen, moreOpen]);

  // Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout");
      toast({
        title: "تم تسجيل الخروج",
        description: "تم تسجيل خروجك بنجاح",
      });
      navigate("/admin");
    } catch {
      navigate("/admin");
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "new_order": return <ShoppingCart className="h-4 w-4 text-green-500" />;
      case "driver_registration": return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "deposit_request": return <ArrowDownCircle className="h-4 w-4 text-purple-500" />;
      case "withdrawal_request": return <ArrowUpCircle className="h-4 w-4 text-orange-500" />;
      case "driver_order_rejected": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const NotificationBell = () => (
    <div className="relative" ref={notifRef}>
      <Button
        variant="ghost" size="icon"
        className="relative"
        onClick={() => {
          setNotifOpen(!notifOpen);
          if (!notifOpen && unreadCount > 0) markReadMutation.mutate();
        }}
      >
        {unreadCount > 0 ? <BellRing className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
      {notifOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-background/95 backdrop-blur-xl border rounded-xl shadow-xl z-[100] max-h-96 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150" dir="rtl">
          <div className="p-3 border-b font-bold text-sm flex items-center justify-between">
            <span>الإشعارات</span>
            {unreadCount > 0 && <Badge variant="secondary" className="text-xs shadow-sm">{unreadCount} جديد</Badge>}
          </div>
          <ScrollArea className="max-h-64">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">لا توجد إشعارات</div>
            ) : (
              <div className="divide-y">
                {notifications.slice(0, 8).map((n: any) => {
                  const route = n.type === "new_order" ? "/admin/orders"
                    : n.type === "driver_order_rejected" ? `/admin/orders?reassign=${n.relatedId || ""}`
                      : (n.type === "driver_registration" || n.type === "driver_login_verification" || n.type === "referral") ? "/admin/drivers"
                        : (n.type === "deposit_request" || n.type === "withdrawal_request") ? "/admin/drivers"
                          : "/admin/notifications";
                  return (
                    <div
                      key={n.id}
                      className={`p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors cursor-pointer ${!n.isRead ? "bg-primary/5" : ""}`}
                      onClick={() => { navigate(route); setNotifOpen(false); }}
                    >
                      <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!n.isRead && <div className="h-2 w-2 bg-primary rounded-full mt-1.5 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {notifications.length > 0 && (
            <Link href="/admin/notifications">
              <div
                className="p-2.5 border-t text-center text-xs font-medium text-primary hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setNotifOpen(false)}
              >
                عرض جميع الإشعارات
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );

  // Mobile sidebar content
  const MobileNavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link href="/admin/dashboard">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <TruckIcon className="h-6 w-6" />
            <span>لوحة التحكم</span>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                    }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-4 space-y-2">
        <Link href="/driver">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setIsMobileOpen(false)}
          >
            <TruckIcon className="h-4 w-4" />
            صفحة المندوب
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );

  // Split menu: first 5 items visible, rest in "more" dropdown
  const visibleItems = menuItems.slice(0, 5);
  const moreItems = menuItems.slice(5);

  const navbarStyle = settings?.adminSidebarBackground
    ? {
      backgroundImage: `linear-gradient(to left, hsl(var(--sidebar-background) / 0.9), hsl(var(--sidebar-background) / 0.8)), url(${settings.adminSidebarBackground})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }
    : undefined;

  const mainStyle = settings?.adminDashboardBackground
    ? {
      backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.85)), url(${settings.adminDashboardBackground})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    }
    : undefined;

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      {/* Top Navbar */}
      <header
        className="sticky top-0 z-50 border-b bg-sidebar/80 backdrop-blur-xl shadow-sm"
        style={navbarStyle}
      >
        {/* Upper bar: logo + actions */}
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <MobileNavContent />
              </SheetContent>
            </Sheet>

            <Link href="/admin/dashboard">
              <div className="flex items-center gap-2 text-primary font-bold text-lg hover:opacity-80 transition-opacity">
                <TruckIcon className="h-6 w-6" />
                <span className="hidden sm:inline">نظام المندوبين</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center gap-1.5 text-muted-foreground hover:text-foreground rounded-full"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="text-xs">بحث</span>
              <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded-md border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                Ctrl K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden rounded-full"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            <NotificationBell />

            <Link href="/driver">
              <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1.5 text-xs rounded-full">
                <TruckIcon className="h-4 w-4" />
                صفحة المندوب
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive rounded-full"
              onClick={handleLogout}
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-1 px-4 pb-2 flex-wrap">
          {visibleItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground hover:shadow-sm"
                    }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More dropdown for remaining items */}
          {moreItems.length > 0 && (
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${moreItems.some(i => location === i.href)
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground hover:shadow-sm"
                  }`}
              >
                المزيد
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-background/95 backdrop-blur-xl border rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                  {moreItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <span
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 cursor-pointer ${isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                            }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
      </header>

      {/* Main content */}
      <main
        className="flex-1 p-4 md:p-6 lg:p-8 bg-gradient-to-b from-muted/20 to-muted/40"
        style={mainStyle}
      >
        {children}
      </main>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} mode="admin" />
    </div>
  );
}
