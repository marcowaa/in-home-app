import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  availableBalance: string | number;
  frozenBalance?: string | number;
  className?: string;
}

export default function BalanceCard({ availableBalance, frozenBalance, className }: BalanceCardProps) {
  const available = typeof availableBalance === "string" ? parseFloat(availableBalance) : availableBalance;
  const frozen = frozenBalance !== undefined
    ? (typeof frozenBalance === "string" ? parseFloat(frozenBalance) : frozenBalance)
    : undefined;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">الرصيد المتاح</p>
          <p className="text-3xl font-bold text-primary">{available.toFixed(2)} ج.م</p>
        </div>
        {frozen !== undefined && (
          <div className="mt-3 pt-3 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">الرصيد المجمد</p>
            <p className="text-sm font-medium">{frozen.toFixed(2)} ج.م</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
