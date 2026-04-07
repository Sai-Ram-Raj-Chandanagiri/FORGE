"use client";

import { Suspense, useState } from "react";
import { Clock, Plus, Trash2, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { ScheduledTaskForm } from "@/components/agents/scheduled-task-form";

interface ScheduledTask {
  id: string;
  name: string;
  description: string | null;
  agentType: string;
  cronExpression: string;
  actionType: string;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date;
  runCount: number;
}

function ScheduleContent() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);

  const { data: tasks, isPending: isLoading } =
    trpc.agent.listScheduledTasks.useQuery() as {
      data: ScheduledTask[] | undefined;
      isPending: boolean;
    };

  const createMutation = trpc.agent.createScheduledTask.useMutation({
    onSuccess: () => {
      void utils.agent.listScheduledTasks.invalidate();
      setShowForm(false);
    },
  });

  const updateMutation = trpc.agent.updateScheduledTask.useMutation({
    onSuccess: () => void utils.agent.listScheduledTasks.invalidate(),
  });

  const deleteMutation = trpc.agent.deleteScheduledTask.useMutation({
    onSuccess: () => void utils.agent.listScheduledTasks.invalidate(),
  });

  const toggleActive = (task: ScheduledTask) => {
    updateMutation.mutate({ id: task.id, isActive: !task.isActive });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Clock className="h-8 w-8 text-primary" />
            Scheduled Tasks
          </h1>
          <p className="mt-1 text-muted-foreground">
            Configure recurring agent tasks with cron schedules.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </button>
      </div>

      <ScheduledTaskForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border bg-card p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">{task.name}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    {task.agentType}
                  </span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                    {task.cronExpression}
                  </code>
                </div>
                {task.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {task.description}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>Action: {task.actionType}</span>
                  <span>Runs: {task.runCount}</span>
                  {task.lastRunAt && (
                    <span>
                      Last: {new Date(task.lastRunAt).toLocaleString()}
                    </span>
                  )}
                  <span>
                    Next: {new Date(task.nextRunAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Active toggle */}
                <button
                  onClick={() => toggleActive(task)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    task.isActive ? "bg-primary" : "bg-muted"
                  }`}
                  title={task.isActive ? "Disable" : "Enable"}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      task.isActive ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>

                <button
                  onClick={() => {
                    if (confirm("Delete this scheduled task?")) {
                      deleteMutation.mutate({ id: task.id });
                    }
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Zap className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">No scheduled tasks</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create recurring agent tasks with cron schedules.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}
