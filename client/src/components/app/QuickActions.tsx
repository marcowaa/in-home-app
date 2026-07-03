import { Link } from "wouter";
import { ArrowRightLeft, Shield, Plus, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { href: "/app/transfer", label: "تحويل", icon: ArrowRightLeft, color: "bg-blue-500" },
  { href: "/app/contracts/create", label: "عقد جديد", icon: Shield, color: "bg-purple-500" },
  { href: "/app/wallet", label: "شحن", icon: Plus, color: "bg-green-500" },
  { href: "/app/wallet", label: "سحب", icon: ArrowUp, color: "bg-orange-500" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link key={a.label} href={a.href}>
            <div className="flex flex-col items-center gap-2 cursor-pointer">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md", a.color)}>
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium text-gray-600">{a.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
