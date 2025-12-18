"use client";

import { LanguageStat } from "@/types";

interface LanguageChartProps {
  languages: LanguageStat[];
}

export function LanguageChart({ languages }: LanguageChartProps) {
  return (
    <div className="space-y-3">
      {languages.map((lang) => (
        <div key={lang.language} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: lang.color }}
              />
              <span className="font-medium">{lang.language}</span>
            </div>
            <span className="text-muted-foreground">{lang.percentage}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${lang.percentage}%`,
                backgroundColor: lang.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
