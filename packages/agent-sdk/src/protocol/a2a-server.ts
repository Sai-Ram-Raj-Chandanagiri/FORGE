/**
 * Google A2A Protocol — Server
 * Handles incoming A2A requests for a module agent sidecar.
 */

import type { AgentCard, AgentSkill } from "./agent-card";
import { createAgentCard } from "./agent-card";
import { TaskManager, type A2ATask, type TaskArtifact } from "./task-manager";

export type SkillHandler = (
  input: Record<string, unknown>,
  task: A2ATask,
) => Promise<{
  output: Record<string, unknown>;
  artifacts?: TaskArtifact[];
}>;

export class A2AServer {
  private card: AgentCard;
  private taskManager: TaskManager;
  private handlers: Map<string, SkillHandler> = new Map();

  constructor(params: {
    name: string;
    description: string;
    url: string;
  }) {
    this.card = createAgentCard({
      ...params,
      skills: [],
    });
    this.taskManager = new TaskManager();
  }

  registerSkill(skill: AgentSkill, handler: SkillHandler): void {
    this.card.skills.push(skill);
    this.handlers.set(skill.id, handler);
  }

  getAgentCard(): AgentCard {
    return this.card;
  }

  async handleTaskRequest(
    skillId: string,
    input: Record<string, unknown>,
  ): Promise<A2ATask> {
    const handler = this.handlers.get(skillId);
    if (!handler) {
      const task = this.taskManager.createTask(skillId, input);
      this.taskManager.updateTaskStatus(
        task.id,
        "failed",
        undefined,
        `No handler registered for skill: ${skillId}`,
      );
      return task;
    }

    const task = this.taskManager.createTask(skillId, input);
    this.taskManager.updateTaskStatus(task.id, "in_progress");

    try {
      const result = await handler(input, task);
      if (result.artifacts) {
        for (const artifact of result.artifacts) {
          this.taskManager.addArtifact(task.id, artifact);
        }
      }
      this.taskManager.updateTaskStatus(task.id, "completed", result.output);
    } catch (err) {
      this.taskManager.updateTaskStatus(
        task.id,
        "failed",
        undefined,
        err instanceof Error ? err.message : "Unknown error",
      );
    }

    return this.taskManager.getTask(task.id)!;
  }

  getTask(taskId: string): A2ATask | undefined {
    return this.taskManager.getTask(taskId);
  }

  listTasks(): A2ATask[] {
    return this.taskManager.listTasks();
  }
}
