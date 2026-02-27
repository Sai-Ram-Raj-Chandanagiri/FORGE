/**
 * Agent Service Tests
 * Tests LLM integration with mocked orchestrator, graceful fallback, and conversation persistence.
 */

// Mock the agent-sdk module before any imports
const mockChat = jest.fn();
const mockCreateOrchestrator = jest.fn();

jest.mock("@forge/agent-sdk", () => ({
  createOrchestrator: (...args: unknown[]) => mockCreateOrchestrator(...args),
}));

// Mock the ForgeToolExecutor
jest.mock("@/server/services/forge-tool-executor", () => ({
  ForgeToolExecutor: jest.fn().mockImplementation(() => ({ execute: jest.fn() })),
}));

import { AgentService, _resetOrchestrator } from "@/server/services/agent.service";
import { TRPCError } from "@trpc/server";

// Prisma mock factory
function createMockPrisma() {
  return {
    agentConversation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    agentAction: {
      create: jest.fn(),
    },
    workflowRule: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    deployment: {
      count: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  } as unknown as Parameters<typeof AgentService extends new (p: infer P) => unknown ? P : never>[0];
}

const userId = "user-123";

describe("AgentService", () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: AgentService;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetOrchestrator();
    prisma = createMockPrisma();
    service = new AgentService(prisma as never);

    // Default: orchestrator returns a response
    mockCreateOrchestrator.mockReturnValue({ chat: mockChat });
    mockChat.mockResolvedValue({
      response: "LLM response here",
      toolResults: undefined,
    });
  });

  describe("chat — with GEMINI_API_KEY", () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = "test-api-key";
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
    });

    it("creates a new conversation and calls orchestrator.chat()", async () => {
      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-1",
        messages: [],
        userId,
        agentType: "setup",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      const result = await service.chat(userId, {
        agentType: "setup",
        message: "Hello",
      });

      // Verify orchestrator was created with the API key
      expect(mockCreateOrchestrator).toHaveBeenCalledWith(
        "test-api-key",
        expect.any(Object),
      );

      // Verify chat was called with correct agent type and messages
      expect(mockChat).toHaveBeenCalledWith(
        "setup",
        [{ role: "user", content: "Hello" }],
        { userId, conversationId: "conv-1" },
      );

      expect(result.response).toBe("LLM response here");
      expect(result.conversationId).toBe("conv-1");
    });

    it("passes existing conversation messages to orchestrator", async () => {
      const existingMessages = [
        { role: "user", content: "Hi", timestamp: "2024-01-01T00:00:00Z" },
        { role: "assistant", content: "Hello!", timestamp: "2024-01-01T00:00:01Z" },
      ];

      (prisma as any).agentConversation.findFirst.mockResolvedValue({
        id: "conv-existing",
        messages: existingMessages,
        userId,
        agentType: "setup",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      await service.chat(userId, {
        agentType: "setup",
        message: "Follow-up question",
        conversationId: "conv-existing",
      });

      expect(mockChat).toHaveBeenCalledWith(
        "setup",
        [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello!" },
          { role: "user", content: "Follow-up question" },
        ],
        { userId, conversationId: "conv-existing" },
      );
    });

    it("stores tool results in AgentAction when tools are used", async () => {
      const toolResults = [
        { tool: "search_modules", success: true, result: { modules: [], total: 0 } },
      ];
      mockChat.mockResolvedValue({
        response: "I found these modules...",
        toolResults,
      });

      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-tools",
        messages: [],
        userId,
        agentType: "setup",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      await service.chat(userId, {
        agentType: "setup",
        message: "What modules are available?",
      });

      expect((prisma as any).agentAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionType: "chat_with_tools",
          result: expect.objectContaining({
            response: "I found these modules...",
            toolResults,
          }),
        }),
      });
    });

    it("falls back to placeholder on LLM error", async () => {
      mockChat.mockRejectedValue(new Error("API rate limit exceeded"));

      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-fallback",
        messages: [],
        userId,
        agentType: "setup",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      const result = await service.chat(userId, {
        agentType: "setup",
        message: "I'm an NGO with 50 volunteers",
      });

      // Should use placeholder response (contains "CRM")
      expect(result.response).toContain("CRM");
      expect(result.response).not.toBe("LLM response here");
    });
  });

  describe("chat — without GEMINI_API_KEY (fallback)", () => {
    beforeEach(() => {
      delete process.env.GEMINI_API_KEY;
    });

    it("returns placeholder response for setup agent (NGO)", async () => {
      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-ngo",
        messages: [],
        userId,
        agentType: "setup",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      const result = await service.chat(userId, {
        agentType: "setup",
        message: "I'm a nonprofit organization",
      });

      expect(mockCreateOrchestrator).not.toHaveBeenCalled();
      expect(result.response).toContain("CRM");
      expect(result.response).toContain("Donor");
    });

    it("returns placeholder response for workflow agent", async () => {
      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-wf",
        messages: [],
        userId,
        agentType: "workflow",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      const result = await service.chat(userId, {
        agentType: "workflow",
        message: "Help me automate donor onboarding",
      });

      expect(result.response).toContain("Trigger");
    });

    it("returns placeholder response for monitor agent", async () => {
      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-mon",
        messages: [],
        userId,
        agentType: "monitor",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      const result = await service.chat(userId, {
        agentType: "monitor",
        message: "How are my deployments?",
      });

      expect(result.response).toContain("deployment");
    });

    it("returns placeholder response for integration agent", async () => {
      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-int",
        messages: [],
        userId,
        agentType: "integration",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      const result = await service.chat(userId, {
        agentType: "integration",
        message: "Connect my modules",
      });

      expect(result.response).toContain("connect");
    });

    it("includes API key hint in fallback responses", async () => {
      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-hint",
        messages: [],
        userId,
        agentType: "setup",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      const result = await service.chat(userId, {
        agentType: "setup",
        message: "Hello",
      });

      expect(result.response).toContain("Gemini API key");
    });
  });

  describe("chat — conversation management", () => {
    beforeEach(() => {
      delete process.env.GEMINI_API_KEY;
    });

    it("throws NOT_FOUND for invalid conversationId", async () => {
      (prisma as any).agentConversation.findFirst.mockResolvedValue(null);

      await expect(
        service.chat(userId, {
          agentType: "setup",
          message: "Hello",
          conversationId: "nonexistent",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("persists messages to database", async () => {
      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-persist",
        messages: [],
        userId,
        agentType: "setup",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      await service.chat(userId, {
        agentType: "setup",
        message: "Test persistence",
      });

      expect((prisma as any).agentConversation.update).toHaveBeenCalledWith({
        where: { id: "conv-persist" },
        data: {
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "user", content: "Test persistence" }),
            expect.objectContaining({ role: "assistant" }),
          ]),
        },
      });
    });

    it("creates AgentAction record for every chat", async () => {
      (prisma as any).agentConversation.create.mockResolvedValue({
        id: "conv-action",
        messages: [],
        userId,
        agentType: "setup",
      });
      (prisma as any).agentConversation.update.mockResolvedValue({});
      (prisma as any).agentAction.create.mockResolvedValue({});

      await service.chat(userId, {
        agentType: "setup",
        message: "Track this action",
      });

      expect((prisma as any).agentAction.create).toHaveBeenCalledWith({
        data: {
          conversationId: "conv-action",
          actionType: "chat",
          payload: { message: "Track this action" },
          result: expect.objectContaining({ response: expect.any(String) }),
        },
      });
    });
  });

  describe("listConversations", () => {
    it("returns formatted conversation list", async () => {
      (prisma as any).agentConversation.findMany.mockResolvedValue([
        {
          id: "conv-1",
          agentType: "setup",
          status: "active",
          messages: [{ role: "user", content: "Hello", timestamp: "2024-01-01T00:00:00Z" }],
          _count: { actions: 2 },
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-02"),
        },
      ]);

      const result = await service.listConversations(userId, { limit: 20 });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "conv-1",
        agentType: "setup",
        messageCount: 1,
        actionCount: 2,
      });
    });

    it("filters by agentType when provided", async () => {
      (prisma as any).agentConversation.findMany.mockResolvedValue([]);
      await service.listConversations(userId, { agentType: "monitor", limit: 10 });

      expect((prisma as any).agentConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, agentType: "monitor" },
        }),
      );
    });
  });

  describe("getConversation", () => {
    it("returns conversation with actions", async () => {
      (prisma as any).agentConversation.findFirst.mockResolvedValue({
        id: "conv-detail",
        agentType: "setup",
        status: "active",
        messages: [{ role: "user", content: "Hi", timestamp: "2024-01-01T00:00:00Z" }],
        actions: [
          {
            id: "action-1",
            actionType: "chat",
            targetModule: null,
            payload: {},
            result: {},
            executedAt: new Date("2024-01-01"),
          },
        ],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const result = await service.getConversation(userId, "conv-detail");
      expect(result.id).toBe("conv-detail");
      expect(result.actions).toHaveLength(1);
    });

    it("throws NOT_FOUND for missing conversation", async () => {
      (prisma as any).agentConversation.findFirst.mockResolvedValue(null);
      await expect(service.getConversation(userId, "nonexistent")).rejects.toThrow(TRPCError);
    });
  });

  describe("workflows", () => {
    it("creates a workflow", async () => {
      (prisma as any).workflowRule.create.mockResolvedValue({ id: "wf-1" });

      await service.createWorkflow(userId, {
        name: "Test Workflow",
        description: "A test",
        triggerEvent: "deployment.started",
        conditions: {},
        actions: [],
      });

      expect((prisma as any).workflowRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: "Test Workflow", userId }),
      });
    });

    it("toggles workflow active state", async () => {
      (prisma as any).workflowRule.findFirst.mockResolvedValue({ id: "wf-1" });
      (prisma as any).workflowRule.update.mockResolvedValue({});

      await service.toggleWorkflow(userId, { id: "wf-1", isActive: true });

      expect((prisma as any).workflowRule.update).toHaveBeenCalledWith({
        where: { id: "wf-1" },
        data: { isActive: true },
      });
    });

    it("throws NOT_FOUND when toggling nonexistent workflow", async () => {
      (prisma as any).workflowRule.findFirst.mockResolvedValue(null);
      await expect(
        service.toggleWorkflow(userId, { id: "bad-id", isActive: true }),
      ).rejects.toThrow(TRPCError);
    });

    it("deletes a workflow", async () => {
      (prisma as any).workflowRule.findFirst.mockResolvedValue({ id: "wf-del" });
      (prisma as any).workflowRule.delete.mockResolvedValue({});

      const result = await service.deleteWorkflow(userId, "wf-del");
      expect(result).toEqual({ success: true });
    });
  });

  describe("getInsights", () => {
    it("returns aggregated user stats", async () => {
      (prisma as any).deployment.count.mockResolvedValue(3);
      (prisma as any).workflowRule.count.mockResolvedValue(1);
      (prisma as any).agentConversation.count.mockResolvedValue(5);

      const result = await service.getInsights(userId);
      expect(result.activeDeployments).toBe(3);
      expect(result.activeWorkflows).toBe(1);
      expect(result.totalConversations).toBe(5);
      expect(result.insights).toHaveLength(1);
    });
  });
});
