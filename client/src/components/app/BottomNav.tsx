import { useLocation, Link } from "wouter";
import { Home, ArrowRightLeft, Shield, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app/home", label: "الرئيسية", icon: Home },
  { href: "/app/transfer", label: "تحويل", icon: ArrowRightLeft },
  { href: "/app/contracts", label: "عقود", icon: Shield },
  { href: "/app/wallet", label: "محفظة", icon: Wallet },
  { href: "/app/profile", label: "حسابي", icon: User },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 safe-area-bottom"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer min-w-[56px]",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center transition-all duration-200",
                    isActive ? "-translate-y-0.5" : ""
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive ? "drop-shadow-sm" : ""
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-all duration-200",
                    isActive ? "opacity-100" : "opacity-70"
                  )}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
