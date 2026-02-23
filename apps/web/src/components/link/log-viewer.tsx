"use client";

import { ScrollText } from "lucide-react";

interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
}

interface LogViewerProps {
  logs: LogEntry[];
}

const LEVEL_COLORS: Record<string, string> = {
  info: "text-blue-500",
  warn: "text-yellow-500",
  error: "text-red-500",
  debug: "text-muted-foreground",
};

export function LogViewer({ logs }: LogViewerProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
        <ScrollText className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No logs available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-black/95 p-4 font-mono text-xs overflow-auto max-h-96">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 py-0.5 hover:bg-white/5">
          <span className="shrink-0 text-muted-foreground/60">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          <span className={`shrink-0 uppercase w-12 ${LEVEL_COLORS[log.level] || "text-muted-foreground"}`}>
            [{log.level}]
          </span>
          <span className="text-green-400/90 break-all">{log.message}</span>
        </div>
      ))}
    </div>
  );
}
