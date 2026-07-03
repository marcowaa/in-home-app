import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Phone, ExternalLink } from "lucide-react";
import type { AppSettings } from "@shared/schema";

export function SupportButton() {
    const { data: settings } = useQuery<AppSettings>({
        queryKey: ["/api/settings"],
        staleTime: 1000 * 60 * 5,
    });

    const enabled = (settings as any)?.supportButtonEnabled;
    const type = (settings as any)?.supportButtonType || "whatsapp";
    const value = (settings as any)?.supportButtonValue;
    const label = (settings as any)?.supportButtonLabel || "تواصل معنا";

    if (!enabled || !value) return null;

    let href = "";
    let Icon = MessageCircle;

    switch (type) {
        case "whatsapp":
            href = `https://wa.me/${value}`;
            Icon = MessageCircle;
            break;
        case "phone":
            href = `tel:${value}`;
            Icon = Phone;
            break;
        case "link":
            href = value;
            Icon = ExternalLink;
            break;
    }

    return (
        <a
            href={href}
            target={type === "link" || type === "whatsapp" ? "_blank" : undefined}
            rel={type === "link" || type === "whatsapp" ? "noopener noreferrer" : undefined}
            className="fixed bottom-6 left-6 z-[9999] flex items-center gap-2 rounded-full bg-green-500 hover:bg-green-600 text-white px-5 py-3 shadow-2xl transition-all duration-300 hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4"
            title={label}
        >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">{label}</span>
        </a>
    );
}
