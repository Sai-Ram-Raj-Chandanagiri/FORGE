"use client";

import { Wrench } from "lucide-react";

interface McpToolListProps {
  tools: {
    name: string;
    description: string;
    connectionId: string;
    connectionName: string;
    inputSchema?: Record<string, unknown>;
  }[];
}

export function McpToolList({ tools }: McpToolListProps) {
  if (tools.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
        <Wrench className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        No MCP tools available. Add and connect an MCP server first.
      </div>
    );
  }

  // Group tools by connection
  const grouped = tools.reduce<Record<string, typeof tools>>((acc, tool) => {
    const key = tool.connectionName;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(tool);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([connectionName, connectionTools]) => (
        <div key={connectionName} className="rounded-lg border">
          <div className="border-b bg-muted/50 px-4 py-2">
            <h4 className="text-sm font-medium">{connectionName}</h4>
            <p className="text-xs text-muted-foreground">
              {connectionTools.length} tool{connectionTools.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y">
            {connectionTools.map((tool) => (
              <div key={tool.name} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-mono font-medium">{tool.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-5.5">
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
