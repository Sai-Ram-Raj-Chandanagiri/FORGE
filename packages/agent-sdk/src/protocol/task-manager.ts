/**
 * Google A2A Protocol — Task Manager
 * Manages the lifecycle of A2A tasks between agents.
 */

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export interface TaskArtifact {
  type: "text" | "json" | "file";
  content: string;
  mimeType?: string;
  name?: string;
}

export interface A2ATask {
  id: string;
  skillId: string;
  input: Record<string, unknown>;
  status: TaskStatus;
  output?: Record<string, unknown>;
  artifacts: TaskArtifact[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export class TaskManager {
  private tasks: Map<string, A2ATask> = new Map();

  createTask(skillId: string, input: Record<string, unknown>): A2ATask {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const task: A2ATask = {
      id,
      skillId,
      input,
      status: "pending",
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    return task;
  }

  getTask(id: string): A2ATask | undefined {
    return this.tasks.get(id);
  }

  updateTaskStatus(
    id: string,
    status: TaskStatus,
    output?: Record<string, unknown>,
    error?: string,
  ): A2ATask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    task.status = status;
    task.updatedAt = new Date();

    if (output) task.output = output;
    if (error) task.error = error;
    if (status === "completed" || status === "failed") {
      task.completedAt = new Date();
    }

    return task;
  }

  addArtifact(id: string, artifact: TaskArtifact): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.artifacts.push(artifact);
    task.updatedAt = new Date();
    return true;
  }

  listTasks(filter?: { status?: TaskStatus; skillId?: string }): A2ATask[] {
    let tasks = Array.from(this.tasks.values());
    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    if (filter?.skillId) {
      tasks = tasks.filter((t) => t.skillId === filter.skillId);
    }
    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  cleanupCompleted(maxAgeMs = 3600000): number {
    const cutoff = Date.now() - maxAgeMs;
    let cleaned = 0;
    for (const [id, task] of this.tasks) {
      if (
        (task.status === "completed" || task.status === "failed") &&
        task.completedAt &&
        task.completedAt.getTime() < cutoff
      ) {
        this.tasks.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }
}
