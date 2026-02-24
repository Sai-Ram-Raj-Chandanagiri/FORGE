import { createMockPrismaClient } from "@forge/db";
import { DeploymentService } from "@/server/services/deployment.service";
import { TRPCError } from "@trpc/server";

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
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    const input = {
      moduleId,
      versionId,
      name: "My Deployment",
      configuration: { port: 3000 },
      autoRestart: true,
    };

    it("should create a deployment and log the creation", async () => {
      prisma.moduleVersion.findUnique.mockResolvedValue({
        id: versionId,
        version: "1.0.0",
        module: { id: moduleId, name: "Test Module", status: "PUBLISHED" },
      });
      prisma.module.findUnique.mockResolvedValue({ authorId: userId });

      const createdDeployment = {
        id: deploymentId,
        userId,
        moduleId,
        versionId,
        name: input.name,
        status: "PENDING",
        configuration: input.configuration,
        autoRestart: true,
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "img:1.0.0" },
      };
      prisma.deployment.create.mockResolvedValue(createdDeployment);
      prisma.deploymentLog.create.mockResolvedValue({});

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
            configuration: input.configuration,
            autoRestart: true,
          }),
        }),
      );
      expect(prisma.deploymentLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deploymentId,
            level: "info",
            message: expect.stringContaining("Test Module"),
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
        module: { id: moduleId, name: "Test Module", status: "PUBLISHED" },
      });
      prisma.module.findUnique.mockResolvedValue({ authorId: "other-user" });
      prisma.purchase.findFirst.mockResolvedValue({
        id: "purchase-1",
        userId,
        moduleId,
        status: "ACTIVE",
      });

      const createdDeployment = {
        id: deploymentId,
        userId,
        moduleId,
        versionId,
        name: input.name,
        status: "PENDING",
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "img:1.0.0" },
      };
      prisma.deployment.create.mockResolvedValue(createdDeployment);
      prisma.deploymentLog.create.mockResolvedValue({});

      const result = await service.create(userId, input);
      expect(result).toEqual(createdDeployment);
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
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null, type: "SERVICE" },
        version: { id: versionId, version: "1.0.0", dockerImage: "img:1.0.0", configSchema: null, minResources: null },
        logs: [],
      };
      prisma.deployment.findUnique.mockResolvedValue(deployment);

      const result = await service.getById(userId, deploymentId);

      expect(result).toEqual(deployment);
      expect(prisma.deployment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: deploymentId } }),
      );
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
  // start / stop / restart / terminate
  // ---------------------------------------------------------------------------
  describe("status update methods", () => {
    beforeEach(() => {
      prisma.deployment.findUnique.mockResolvedValue({
        userId,
        name: "My Deployment",
      });
      prisma.deployment.update.mockResolvedValue({
        id: deploymentId,
        userId,
        status: "RUNNING",
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "img:1.0.0" },
      });
      prisma.deploymentLog.create.mockResolvedValue({});
    });

    it("start should set status to RUNNING", async () => {
      await service.start(userId, deploymentId);

      expect(prisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: deploymentId },
          data: expect.objectContaining({ status: "RUNNING" }),
        }),
      );
      expect(prisma.deploymentLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deploymentId,
            level: "info",
            message: expect.stringContaining("RUNNING"),
          }),
        }),
      );
    });

    it("stop should set status to STOPPED", async () => {
      prisma.deployment.update.mockResolvedValue({
        id: deploymentId,
        userId,
        status: "STOPPED",
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "img:1.0.0" },
      });

      await service.stop(userId, deploymentId);

      expect(prisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: deploymentId },
          data: expect.objectContaining({ status: "STOPPED" }),
        }),
      );
    });

    it("restart should first stop then start the deployment", async () => {
      await service.restart(userId, deploymentId);

      // restart calls updateStatus twice: STOPPED then RUNNING
      expect(prisma.deployment.update).toHaveBeenCalledTimes(2);
      expect(prisma.deployment.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({ status: "STOPPED" }),
        }),
      );
      expect(prisma.deployment.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({ status: "RUNNING" }),
        }),
      );
    });

    it("terminate should set status to TERMINATED", async () => {
      prisma.deployment.update.mockResolvedValue({
        id: deploymentId,
        userId,
        status: "TERMINATED",
        module: { id: moduleId, name: "Test Module", slug: "test-module", logoUrl: null },
        version: { id: versionId, version: "1.0.0", dockerImage: "img:1.0.0" },
      });

      await service.terminate(userId, deploymentId);

      expect(prisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: deploymentId },
          data: expect.objectContaining({ status: "TERMINATED" }),
        }),
      );
    });

    it("should throw NOT_FOUND when updating status of non-existent deployment", async () => {
      prisma.deployment.findUnique.mockResolvedValue(null);

      await expect(service.start(userId, deploymentId)).rejects.toThrow(TRPCError);
      await expect(service.start(userId, deploymentId)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
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

      // Verify filter criteria for each count call
      expect(prisma.deployment.count).toHaveBeenNthCalledWith(1, {
        where: { userId, status: "RUNNING" },
      });
      expect(prisma.deployment.count).toHaveBeenNthCalledWith(2, {
        where: { userId, status: "STOPPED" },
      });
      expect(prisma.deployment.count).toHaveBeenNthCalledWith(3, {
        where: { userId, status: { notIn: ["TERMINATED"] } },
      });
      expect(prisma.deployment.count).toHaveBeenNthCalledWith(4, {
        where: { userId, status: "FAILED" },
      });
    });
  });
});
