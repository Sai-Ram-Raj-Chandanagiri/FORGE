"use client";

import {
  Plug,
  PlugZap,
  AlertCircle,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from "lucide-react";

interface McpConnectionCardProps {
  connection: {
    id: string;
    name: string;
    serverUrl: string;
    transport: string;
    status: string;
    errorMessage: string | null;
    isActive: boolean;
    lastTestedAt: string | null;
    tools: unknown;
  };
  onTest: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onRemove: (id: string) => void;
  isTesting: boolean;
}

function getStatusDisplay(status: string) {
  switch (status) {
    case "CONNECTED":
      return { icon: PlugZap, color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Connected" };
    case "ERROR":
      return { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Error" };
    default:
      return { icon: Plug, color: "text-muted-foreground", bg: "bg-muted border-border", label: "Disconnected" };
  }
}

export function McpConnectionCard({
  connection,
  onTest,
  onToggle,
  onRemove,
  isTesting,
}: McpConnectionCardProps) {
  const statusDisplay = getStatusDisplay(connection.status);
  const StatusIcon = statusDisplay.icon;
  const tools = (connection.tools ?? []) as { name: string }[];

  return (
    <div className={`rounded-xl border p-5 transition-all ${!connection.isActive ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${statusDisplay.bg}`}>
            <StatusIcon className={`h-4 w-4 ${statusDisplay.color}`} />
          </div>
          <div>
            <h3 className="font-semibold">{connection.name}</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[250px]">
              {connection.serverUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(connection.id, !connection.isActive)}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
            title={connection.isActive ? "Disable" : "Enable"}
          >
            {connection.isActive ? (
              <ToggleRight className="h-5 w-5 text-green-600" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => onTest(connection.id)}
            disabled={isTesting}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
            title="Test connection"
          >
            <RefreshCw className={`h-4 w-4 ${isTesting ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => onRemove(connection.id)}
            className="rounded-md p-1.5 hover:bg-muted text-red-600 transition-colors"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${statusDisplay.bg}`}>
          <StatusIcon className={`h-3 w-3 ${statusDisplay.color}`} />
          {statusDisplay.label}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5">{connection.transport}</span>
        {tools.length > 0 && (
          <span className="flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            {tools.length} tool{tools.length !== 1 ? "s" : ""}
          </span>
        )}
        {connection.lastTestedAt && (
          <span>
            Tested {new Date(connection.lastTestedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {connection.errorMessage && (
        <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {connection.errorMessage}
        </div>
      )}
    </div>
  );
}
