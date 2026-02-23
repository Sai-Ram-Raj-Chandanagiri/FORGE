"use client";

import { ModuleCard } from "./module-card";

interface ModuleGridProps {
  modules: Parameters<typeof ModuleCard>[0]["module"][];
  emptyMessage?: string;
}

export function ModuleGrid({ modules, emptyMessage = "No modules found" }: ModuleGridProps) {
  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((mod) => (
        <ModuleCard key={mod.id} module={mod} />
      ))}
    </div>
  );
}
