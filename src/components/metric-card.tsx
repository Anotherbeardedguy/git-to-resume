"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface MetricCardProps {
  label: string;
  value: number;
  description: string;
  icon?: React.ReactNode;
}

export function MetricCard({
  label,
  value,
  description,
  icon,
}: MetricCardProps) {
  const getColor = (v: number) => {
    if (v >= 70) return "text-green-600";
    if (v >= 40) return "text-amber-600";
    return "text-red-500";
  };

  const getProgressColor = (v: number) => {
    if (v >= 70) return "bg-green-500";
    if (v >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className={`text-4xl font-bold ${getColor(value)}`}>
            {value}
          </span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
        <Progress
          value={value}
          className="h-2 mb-2"
          style={
            {
              "--progress-background": getProgressColor(value),
            } as React.CSSProperties
          }
        />
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
