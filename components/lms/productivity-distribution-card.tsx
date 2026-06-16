"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DistributionPieChart } from "@/components/charts/distribution-pie-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductivityDistribution } from "@/server/actions/reports/productivity-distribution";
import type { ProductivityDistribution } from "@/server/actions/reports/productivity-distribution";

interface ProductivityDistributionCardProps {
  scope: {
    type: string;
    cohortId?: string;
    courseIds: string[];
    studentIds: string[];
    organizationId?: string;
  };
}

const LEVEL_COLORS: Record<string, string> = {
  champion: "#22c55e",
  advanced: "#3b82f6",
  practitioner: "#f59e0b",
  beginner: "#ef4444",
};

const LEVEL_LABELS: Record<string, string> = {
  champion: "Чемпион",
  advanced: "Продвинутый",
  practitioner: "Практик",
  beginner: "Начинающий",
};

export function ProductivityDistributionCard({ scope }: ProductivityDistributionCardProps) {
  const [data, setData] = useState<ProductivityDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(false);
        const result = await getProductivityDistribution(scope);
        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [scope]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Распределение Productivity Score</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Skeleton className="w-full h-full rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader><CardTitle>Распределение Productivity Score</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {error ? "Ошибка загрузки данных" : "Нет данных для отображения."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const pieData = data.levels.map((l) => ({
    name: LEVEL_LABELS[l.level] || l.level,
    value: l.count,
    color: LEVEL_COLORS[l.level] || "#6b7280",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Распределение Productivity Score</CardTitle>
        <p className="text-sm text-muted-foreground">
          Средний балл: {data.averageScore} · {data.totalStudents} студентов
        </p>
      </CardHeader>
      <CardContent>
        <DistributionPieChart data={pieData} />
      </CardContent>
    </Card>
  );
}
