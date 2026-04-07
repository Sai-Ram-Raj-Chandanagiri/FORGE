"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  referenceId: string | null;
  createdAt: string;
}

interface CreditTransactionTableProps {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Purchase",
  AGENT_CHAT: "Agent Chat",
  DEPLOYMENT_HOUR: "Deployment",
  SANDBOX_SESSION: "Sandbox",
  CROSS_MODULE_QUERY: "Cross-Module Query",
  MCP_TOOL_CALL: "MCP Tool Call",
  BONUS: "Bonus",
  REFUND: "Refund",
  AUTO_TOP_UP: "Auto Top-Up",
};

export function CreditTransactionTable({
  transactions,
  total,
  page,
  limit,
  onPageChange,
}: CreditTransactionTableProps) {
  const totalPages = Math.ceil(total / limit);

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        No transactions yet
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Date</th>
              <th className="px-4 py-2.5 text-left font-medium">Type</th>
              <th className="px-4 py-2.5 text-left font-medium">Description</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {TYPE_LABELS[tx.type] ?? tx.type}
                  </span>
                </td>
                <td className="px-4 py-2.5 max-w-[300px] truncate">{tx.description}</td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={`inline-flex items-center gap-0.5 font-medium ${
                      tx.amount > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.amount > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(tx.amount)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50 hover:bg-muted"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50 hover:bg-muted"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
