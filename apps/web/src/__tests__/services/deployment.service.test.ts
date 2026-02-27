import { createMockPrismaClient } from "@forge/db";
import { DeploymentService } from "@/server/services/deployment.service";
import { TRPCError } from "@trpc/server";

// Mock @forge/docker-manager
const mockPullImage = jest.fn().mockResolvedValue(undefined);
const mockCreateContainer = jest.fn().mockResolvedValue("container-abc123");
const mockStartContainer = jest.fn().mockResolvedValue(undefined);
const mockStopContainer = jest.fn().mockResolvedValue(undefined);
const mockRestartContainer = jest.fn().mockResolvedValue(undefined);
const mockRemoveContainer = jest.fn().mockResolvedValue(undefined);
const mockGetContainerLogs = jest.fn().mockResolvedValue("log line 1\nlog line 2");
const mockGetContainerStats = jest.fn().mockResolvedValue({
  cpuPercent: 12.5,
  memoryUsageMb: 128,
  memoryLimitMb: 512,
  memoryPercent: 25,
  networkRxBytes: 1024,
  networkTxBytes: 2048,
  blockReadBytes: 0,
  blockWriteBytes: 0,
});
const mockCheckWithRetries = jest.fn().mockResolvedValue({ healthy: true, responseTime: 50 });
const mockCreateNetwork = jest.fn().mockResolvedValue("network-id");

jest.mock("@forge/docker-manager", () => ({
  ContainerManager: jest.fn().mockImplementation(() => ({
    pullImage: mockPullImage,
    createContainer: mockCreateContainer,
    startContainer: mockStartContainer,
    stopContainer: mockStopContainer,
    restartContainer: mockRestartContainer,
    removeContainer: mockRemoveContainer,
    getContainerLogs: mockGetContainerLogs,
    getContainerStats: mockGetContainerStats,
  })),
  HealthChecker: jest.fn().mockImplementation(() => ({
    checkWithRetries: mockCheckWithRetries,
  })),
  NetworkManager: jest.fn().mockImplementation(() => ({
    createNetwork: mockCreateNetwork,
  })),
}));

describe("DeploymentService", () => {
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let service: DeploymentService;

  const userId = "user-1";
  const moduleId = "module-1";
  const versionId = "version-1";
  const deploymentId = "deployment-1";

  beforeEach(() => {
    prisma = createMockPrismaClient();
    service = new DeploymentService(prisma);
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    const input = {
      moduleId,
      versionId,
      name: "my-deployment",
      configuration: { PORT: "3000" },
      autoRestart: true,
    };

    it("should create a deployment, allocate port, and trigger provisioning", async () => {
      prisma.moduleVersion.findUnique.mockResolvedValue({
        id: versionId,
        version: "1.0.0",
        dockerImage: "nginx:alpine",
        module: { id: moduleId, name: "Test Module", status: "PUBLISHED" },
      });
      prisma.module.findUnique.mockResolvedValue({ authorId: userId });
      // No ports in use
      prisma.deployment.findMany.mockResolvedValue([]);

      const createdDeployment = {
        id: deploymentId,
        userId,
        moduleId,
        versionId,
        name: input.name,
        status: "PENDING",
        configuration: input.configuration,
        autoRestart: true,
        assignedPort: 3001,
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "nginx:alpine" },
      };
      prisma.deployment.create.mockResolvedValue(createdDeployment);
      prisma.deploymentLog.create.mockResolvedValue({});
      prisma.deployment.update.mockResolvedValue({ ...createdDeployment, status: "RUNNING" });

      const result = await service.create(userId, input);

      expect(result).toEqual(createdDeployment);
      expect(prisma.deployment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            moduleId,
            versionId,
            name: input.name,
            status: "PENDING",
            assignedPort: 3001,
          }),
        }),
      );
    });

    it("should throw NOT_FOUND if the module version does not exist", async () => {
      prisma.moduleVersion.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, input)).rejects.toThrow(TRPCError);
      await expect(service.create(userId, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw FORBIDDEN if the user has not purchased and is not the author", async () => {
      prisma.moduleVersion.findUnique.mockResolvedValue({
        id: versionId,
        version: "1.0.0",
        module: { id: moduleId, name: "Test Module", status: "PUBLISHED" },
      });
      prisma.module.findUnique.mockResolvedValue({ authorId: "other-user" });
      prisma.purchase.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, input)).rejects.toThrow(TRPCError);
      await expect(service.create(userId, input)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should allow creation when the user has an active purchase", async () => {
      prisma.moduleVersion.findUnique.mockResolvedValue({
        id: versionId,
        version: "1.0.0",
        dockerImage: "nginx:alpine",
        module: { id: moduleId, name: "Test Module", status: "PUBLISHED" },
      });
      prisma.module.findUnique.mockResolvedValue({ authorId: "other-user" });
      prisma.purchase.findFirst.mockResolvedValue({
        id: "purchase-1",
        userId,
        moduleId,
        status: "ACTIVE",
      });
      prisma.deployment.findMany.mockResolvedValue([]);

      const createdDeployment = {
        id: deploymentId,
        userId,
        moduleId,
        versionId,
        name: input.name,
        status: "PENDING",
        assignedPort: 3001,
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "nginx:alpine" },
      };
      prisma.deployment.create.mockResolvedValue(createdDeployment);
      prisma.deploymentLog.create.mockResolvedValue({});
      prisma.deployment.update.mockResolvedValue(createdDeployment);

      const result = await service.create(userId, input);
      expect(result).toEqual(createdDeployment);
    });

    it("should allocate the next available port when some are in use", async () => {
      prisma.moduleVersion.findUnique.mockResolvedValue({
        id: versionId,
        version: "1.0.0",
        dockerImage: "nginx:alpine",
        module: { id: moduleId, name: "Test Module", status: "PUBLISHED" },
      });
      prisma.module.findUnique.mockResolvedValue({ authorId: userId });
      // Ports 3001 and 3002 are in use
      prisma.deployment.findMany.mockResolvedValue([
        { assignedPort: 3001 },
        { assignedPort: 3002 },
      ]);

      const createdDeployment = {
        id: deploymentId,
        userId,
        name: input.name,
        status: "PENDING",
        assignedPort: 3003,
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "nginx:alpine" },
      };
      prisma.deployment.create.mockResolvedValue(createdDeployment);
      prisma.deploymentLog.create.mockResolvedValue({});
      prisma.deployment.update.mockResolvedValue(createdDeployment);

      const result = await service.create(userId, input);
      expect(result.assignedPort).toBe(3003);
    });
  });

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe("getById", () => {
    it("should return the deployment when found and owned by user", async () => {
      const deployment = {
        id: deploymentId,
        userId,
        moduleId,
        status: "RUNNING",
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null, type: "SINGLE_CONTAINER" },
        version: { id: versionId, version: "1.0.0", dockerImage: "nginx:alpine", configSchema: null, minResources: null },
        logs: [],
      };
      prisma.deployment.findUnique.mockResolvedValue(deployment);

      const result = await service.getById(userId, deploymentId);
      expect(result).toEqual(deployment);
    });

    it("should throw NOT_FOUND if deployment does not exist", async () => {
      prisma.deployment.findUnique.mockResolvedValue(null);

      await expect(service.getById(userId, deploymentId)).rejects.toThrow(TRPCError);
      await expect(service.getById(userId, deploymentId)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw NOT_FOUND if deployment belongs to a different user", async () => {
      prisma.deployment.findUnique.mockResolvedValue({
        id: deploymentId,
        userId: "other-user",
        status: "RUNNING",
      });

      await expect(service.getById(userId, deploymentId)).rejects.toThrow(TRPCError);
      await expect(service.getById(userId, deploymentId)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // start / stop / restart / terminate — now with Docker calls
  // ---------------------------------------------------------------------------
  describe("lifecycle methods", () => {
    beforeEach(() => {
      prisma.deployment.findUnique.mockResolvedValue({
        userId,
        name: "my-deployment",
        containerName: "container-abc123",
        healthEndpoint: "http://localhost:3001",
        status: "STOPPED",
      });
      prisma.deployment.update.mockResolvedValue({
        id: deploymentId,
        userId,
        status: "RUNNING",
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "nginx:alpine" },
      });
      prisma.deploymentLog.create.mockResolvedValue({});
    });

    it("start should call containerManager.startContainer and run health check", async () => {
      await service.start(userId, deploymentId);

      expect(mockStartContainer).toHaveBeenCalledWith("container-abc123");
      expect(mockCheckWithRetries).toHaveBeenCalledWith("http://localhost:3001", 3, 2000, 5000);
      expect(prisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "RUNNING" }),
        }),
      );
    });

    it("stop should call containerManager.stopContainer", async () => {
      prisma.deployment.update.mockResolvedValue({
        id: deploymentId,
        userId,
        status: "STOPPED",
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "nginx:alpine" },
      });

      await service.stop(userId, deploymentId);

      expect(mockStopContainer).toHaveBeenCalledWith("container-abc123");
      expect(prisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "STOPPED" }),
        }),
      );
    });

    it("restart should call containerManager.restartContainer and run health check", async () => {
      await service.restart(userId, deploymentId);

      expect(mockRestartContainer).toHaveBeenCalledWith("container-abc123");
      expect(mockCheckWithRetries).toHaveBeenCalled();
      expect(prisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "RUNNING" }),
        }),
      );
    });

    it("terminate should stop and remove the container", async () => {
      prisma.deployment.update.mockResolvedValue({
        id: deploymentId,
        userId,
        status: "TERMINATED",
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "nginx:alpine" },
      });

      await service.terminate(userId, deploymentId);

      expect(mockStopContainer).toHaveBeenCalledWith("container-abc123");
      expect(mockRemoveContainer).toHaveBeenCalledWith("container-abc123", true);
      expect(prisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "TERMINATED" }),
        }),
      );
    });

    it("should throw BAD_REQUEST for start if no container is associated", async () => {
      prisma.deployment.findUnique.mockResolvedValue({
        userId,
        name: "my-deployment",
        containerName: null,
        healthEndpoint: null,
        status: "PENDING",
      });

      await expect(service.start(userId, deploymentId)).rejects.toThrow(TRPCError);
      await expect(service.start(userId, deploymentId)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("start should set FAILED status when Docker throws an error", async () => {
      mockStartContainer.mockRejectedValueOnce(new Error("Docker daemon not running"));

      prisma.deployment.update
        .mockResolvedValueOnce({ id: deploymentId, status: "FAILED" }) // updateStatus FAILED
        .mockResolvedValueOnce({ id: deploymentId, status: "FAILED" }); // second call in updateStatus

      await service.start(userId, deploymentId);

      expect(prisma.deploymentLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            level: "error",
            message: expect.stringContaining("Docker daemon not running"),
          }),
        }),
      );
    });

    it("should throw NOT_FOUND when acting on non-existent deployment", async () => {
      prisma.deployment.findUnique.mockResolvedValue(null);

      await expect(service.start(userId, deploymentId)).rejects.toThrow(TRPCError);
      await expect(service.start(userId, deploymentId)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getContainerLogs
  // ---------------------------------------------------------------------------
  describe("getContainerLogs", () => {
    it("should return live Docker logs when container exists", async () => {
      prisma.deployment.findUnique.mockResolvedValue({
        userId,
        containerName: "container-abc123",
        status: "RUNNING",
      });

      const result = await service.getContainerLogs(userId, deploymentId, 50);

      expect(mockGetContainerLogs).toHaveBeenCalledWith("container-abc123", {
        tail: 50,
        since: undefined,
        timestamps: true,
      });
      expect(result).toEqual({ logs: "log line 1\nlog line 2", available: true });
    });

    it("should return empty logs when no container is associated", async () => {
      prisma.deployment.findUnique.mockResolvedValue({
        userId,
        containerName: null,
        status: "PENDING",
      });

      const result = await service.getContainerLogs(userId, deploymentId);

      expect(mockGetContainerLogs).not.toHaveBeenCalled();
      expect(result).toEqual({ logs: "", available: false });
    });
  });

  // ---------------------------------------------------------------------------
  // getContainerStats
  // ---------------------------------------------------------------------------
  describe("getContainerStats", () => {
    it("should return live stats for a running container", async () => {
      prisma.deployment.findUnique.mockResolvedValue({
        userId,
        containerName: "container-abc123",
        status: "RUNNING",
      });

      const result = await service.getContainerStats(userId, deploymentId);

      expect(mockGetContainerStats).toHaveBeenCalledWith("container-abc123");
      expect(result).toEqual(
        expect.objectContaining({
          cpuPercent: 12.5,
          memoryUsageMb: 128,
        }),
      );
    });

    it("should return null for a stopped container", async () => {
      prisma.deployment.findUnique.mockResolvedValue({
        userId,
        containerName: "container-abc123",
        status: "STOPPED",
      });

      const result = await service.getContainerStats(userId, deploymentId);

      expect(mockGetContainerStats).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should return null when no container is associated", async () => {
      prisma.deployment.findUnique.mockResolvedValue({
        userId,
        containerName: null,
        status: "RUNNING",
      });

      const result = await service.getContainerStats(userId, deploymentId);
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getStats
  // ---------------------------------------------------------------------------
  describe("getStats", () => {
    it("should return running, stopped, total, and failed counts", async () => {
      prisma.deployment.count
        .mockResolvedValueOnce(5)   // running
        .mockResolvedValueOnce(3)   // stopped
        .mockResolvedValueOnce(10)  // total (excludes TERMINATED)
        .mockResolvedValueOnce(2);  // failed

      const result = await service.getStats(userId);

      expect(result).toEqual({ running: 5, stopped: 3, total: 10, failed: 2 });
      expect(prisma.deployment.count).toHaveBeenCalledTimes(4);
    });
  });
});
