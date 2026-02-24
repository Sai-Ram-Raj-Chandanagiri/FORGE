/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock for @forge/db used in unit tests.
 * Provides a mockPrisma factory and re-exports Prisma namespace stubs.
 */

// Helper to create a deeply-mocked PrismaClient
export function createMockPrismaClient() {
  const modelMethods = [
    "findUnique",
    "findFirst",
    "findMany",
    "create",
    "update",
    "updateMany",
    "upsert",
    "delete",
    "deleteMany",
    "count",
    "aggregate",
    "groupBy",
  ];

  const modelNames = [
    "user",
    "account",
    "session",
    "verificationToken",
    "module",
    "moduleVersion",
    "moduleCategory",
    "moduleTag",
    "category",
    "tag",
    "screenshot",
    "review",
    "purchase",
    "deployment",
    "deploymentLog",
    "usageRecord",
    "serviceComposition",
    "project",
    "projectTag",
    "projectCollaborator",
    "comment",
    "submission",
    "notification",
    "auditLog",
    "organization",
    "orgMembership",
    "workflowRule",
    "agentConversation",
    "agentAction",
  ];

  const prisma: Record<string, any> = {
    $transaction: jest.fn((fn: any) => {
      if (typeof fn === "function") return fn(prisma);
      return Promise.all(fn);
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  for (const model of modelNames) {
    prisma[model] = {};
    for (const method of modelMethods) {
      prisma[model][method] = jest.fn();
    }
  }

  return prisma as any;
}

// Prisma namespace stubs for types used in services
export const Prisma = {
  Decimal: class Decimal {
    private value: string;
    constructor(value: string | number) {
      this.value = String(value);
    }
    toString() {
      return this.value;
    }
    toNumber() {
      return parseFloat(this.value);
    }
  },
  JsonNull: "DbNull" as any,
  InputJsonValue: undefined as any,
};

export type PrismaClient = ReturnType<typeof createMockPrismaClient>;
