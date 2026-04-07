"use client";

import { Database, Globe, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DataPolicy {
  dataCollected: string[];
  dataSentExternally: boolean;
  encryptionAtRest: boolean;
}

interface DataPolicyDisplayProps {
  dataPolicy: DataPolicy | null;
}

export function DataPolicyDisplay({ dataPolicy }: DataPolicyDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!dataPolicy) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        No data policy declared
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          Data & Privacy Policy
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Data Collected
            </h4>
            {dataPolicy.dataCollected.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {dataPolicy.dataCollected.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data collected</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">
                External data sharing:{" "}
                <span
                  className={
                    dataPolicy.dataSentExternally
                      ? "font-medium text-amber-600"
                      : "font-medium text-green-600"
                  }
                >
                  {dataPolicy.dataSentExternally ? "Yes" : "No"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">
                Encryption at rest:{" "}
                <span
                  className={
                    dataPolicy.encryptionAtRest
                      ? "font-medium text-green-600"
                      : "font-medium text-amber-600"
                  }
                >
                  {dataPolicy.encryptionAtRest ? "Yes" : "No"}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
