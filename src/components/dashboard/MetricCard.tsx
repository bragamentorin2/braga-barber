import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FinancialMetric } from "@/mocks/dashboardData";
import { usePrivacyStore } from "@/store/usePrivacyStore";

interface MetricCardProps {
  metric: FinancialMetric;
  featured?: boolean;
}

export function MetricCard({ metric, featured = false }: MetricCardProps) {
  const isPositive = metric.trend === 'up';
  const isNegative = metric.trend === 'down';
  const { showValues } = usePrivacyStore();

  return (
    <Card className={cn("overflow-hidden transition-all", featured ? "border-primary/50 shadow-md shadow-primary/10" : "")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold truncate", featured ? "text-primary text-2xl lg:text-3xl" : "text-foreground")}>
          {showValues ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metric.value) : 'R$ •••••'}
        </div>
        {metric.change && (
          <p className={cn(
            "text-xs mt-1",
            isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-muted-foreground"
          )}>
            {metric.change}
          </p>
        )}
        {metric.subtitle && (
          <p className="text-xs mt-1 text-emerald-600/80 dark:text-emerald-500/80">
            {metric.subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
