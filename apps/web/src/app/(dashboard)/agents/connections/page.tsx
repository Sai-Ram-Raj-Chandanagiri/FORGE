"use client";

import { Suspense, useState } from "react";
import { Plug, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { McpConnectionCard } from "@/components/agents/mcp-connection-card";
import { McpConnectionForm } from "@/components/agents/mcp-connection-form";
import { McpToolList } from "@/components/agents/mcp-tool-list";

export default function McpConnectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <McpConnectionsContent />
    </Suspense>
  );
}

function McpConnectionsContent() {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"connections" | "tools">("connections");

  const { data: connections, isLoading } = trpc.mcp.listConnections.useQuery();
  const { data: userTools } = trpc.mcp.getUserTools.useQuery();
  const utils = trpc.useUtils();

  const addMutation = trpc.mcp.addConnection.useMutation({
    onSuccess: () => {
      utils.mcp.listConnections.invalidate();
      utils.mcp.getUserTools.invalidate();
      setShowForm(false);
    },
  });

  const testMutation = trpc.mcp.testConnection.useMutation({
    onSuccess: () => {
      utils.mcp.listConnections.invalidate();
      utils.mcp.getUserTools.invalidate();
    },
  });

  const toggleMutation = trpc.mcp.toggleConnection.useMutation({
    onSuccess: () => {
      utils.mcp.listConnections.invalidate();
      utils.mcp.getUserTools.invalidate();
    },
  });

  const removeMutation = trpc.mcp.removeConnection.useMutation({
    onSuccess: () => {
      utils.mcp.listConnections.invalidate();
      utils.mcp.getUserTools.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Plug className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">MCP Connections</h1>
            <p className="text-sm text-muted-foreground">
              Connect external MCP servers to extend your agents with custom tools
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Connection
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        <button
          onClick={() => setActiveTab("connections")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "connections"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
        >
          Connections ({connections?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "tools"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
        >
          Available Tools ({userTools?.length ?? 0})
        </button>
      </div>

      {/* Content */}
      {activeTab === "connections" && (
        <>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted" />
              ))}
            </div>
          ) : !connections || connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
              <Plug className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-lg font-medium text-muted-foreground">No connections yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Add an MCP server to give your agents access to external tools
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Connection
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((conn) => (
                <McpConnectionCard
                  key={conn.id}
                  connection={{
                    ...conn,
                    lastTestedAt: conn.lastTestedAt ? (conn.lastTestedAt instanceof Date ? conn.lastTestedAt.toISOString() : String(conn.lastTestedAt)) : null,
                  }}
                  onTest={(id) => testMutation.mutate({ connectionId: id })}
                  onToggle={(id, isActive) =>
                    toggleMutation.mutate({ connectionId: id, isActive })
                  }
                  onRemove={(id) => removeMutation.mutate({ connectionId: id })}
                  isTesting={testMutation.isPending}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "tools" && (
        <McpToolList tools={userTools ?? []} />
      )}

      {/* Add Connection Modal */}
      {showForm && (
        <McpConnectionForm
          onSubmit={(data) => addMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isPending={addMutation.isPending}
        />
      )}

      {addMutation.isError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {addMutation.error.message}
        </div>
      )}
    </div>
  );
}
