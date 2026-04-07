"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface McpConnectionFormProps {
  onSubmit: (data: {
    name: string;
    serverUrl: string;
    transport: "SSE" | "STDIO" | "STREAMABLE_HTTP";
    authToken?: string;
  }) => void;
  onClose: () => void;
  isPending: boolean;
}

export function McpConnectionForm({ onSubmit, onClose, isPending }: McpConnectionFormProps) {
  const [name, setName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [transport, setTransport] = useState<"SSE" | "STDIO" | "STREAMABLE_HTTP">("SSE");
  const [authToken, setAuthToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      serverUrl: serverUrl.trim(),
      transport,
      authToken: authToken.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add MCP Connection</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Connection Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My MCP Server"
              required
              maxLength={100}
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Server URL</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://mcp.example.com"
              required
              maxLength={2048}
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Supported schemes: http://, https://, stdio://
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Transport</label>
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value as typeof transport)}
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="SSE">SSE (Server-Sent Events)</option>
              <option value="STREAMABLE_HTTP">Streamable HTTP</option>
              <option value="STDIO">STDIO</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Auth Token <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Bearer token or API key"
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Stored encrypted. Used for authenticating with the MCP server.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !serverUrl.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Adding..." : "Add Connection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
