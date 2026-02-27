import {
  createVersionSchema,
  buildFromRepoSchema,
  getBuildStatusSchema,
  detectProjectSchema,
} from "@/lib/validators/module";

describe("Build Pipeline Validators", () => {
  describe("createVersionSchema — new build pipeline fields", () => {
    const baseInput = {
      moduleId: "clm123",
      version: "1.0.0",
      dockerImage: "nginx:latest",
    };

    it("should accept input without build pipeline fields (backward compat)", () => {
      const result = createVersionSchema.safeParse(baseInput);
      expect(result.success).toBe(true);
    });

    it("should accept valid sourceRepoUrl", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        sourceRepoUrl: "https://github.com/user/repo",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid sourceRepoUrl", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        sourceRepoUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("should accept empty string sourceRepoUrl", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        sourceRepoUrl: "",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid sourceBranch", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        sourceBranch: "develop",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid exposedPort", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        exposedPort: 3000,
      });
      expect(result.success).toBe(true);
    });

    it("should reject exposedPort out of range", () => {
      const result1 = createVersionSchema.safeParse({ ...baseInput, exposedPort: 0 });
      expect(result1.success).toBe(false);

      const result2 = createVersionSchema.safeParse({ ...baseInput, exposedPort: 70000 });
      expect(result2.success).toBe(false);
    });

    it("should accept valid healthCheckPath starting with /", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        healthCheckPath: "/api/health",
      });
      expect(result.success).toBe(true);
    });

    it("should reject healthCheckPath not starting with /", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        healthCheckPath: "health",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid requiredEnvVars array", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        requiredEnvVars: ["DATABASE_URL", "API_KEY"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept customDockerfile string", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        customDockerfile: "FROM node:20-alpine\nWORKDIR /app\n",
      });
      expect(result.success).toBe(true);
    });

    it("should accept full build pipeline input", () => {
      const result = createVersionSchema.safeParse({
        ...baseInput,
        sourceRepoUrl: "https://github.com/user/repo",
        sourceBranch: "main",
        exposedPort: 3000,
        healthCheckPath: "/health",
        requiredEnvVars: ["DB_URL"],
        customDockerfile: "FROM node:20\n",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("buildFromRepoSchema", () => {
    it("should accept valid versionId", () => {
      const result = buildFromRepoSchema.safeParse({ versionId: "clm_version_123" });
      expect(result.success).toBe(true);
    });

    it("should reject missing versionId", () => {
      const result = buildFromRepoSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("getBuildStatusSchema", () => {
    it("should accept valid versionId", () => {
      const result = getBuildStatusSchema.safeParse({ versionId: "clm_version_123" });
      expect(result.success).toBe(true);
    });
  });

  describe("detectProjectSchema", () => {
    it("should accept valid repoUrl and branch", () => {
      const result = detectProjectSchema.safeParse({
        repoUrl: "https://github.com/user/repo",
        branch: "develop",
      });
      expect(result.success).toBe(true);
    });

    it("should default branch to main", () => {
      const result = detectProjectSchema.safeParse({
        repoUrl: "https://github.com/user/repo",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.branch).toBe("main");
      }
    });

    it("should reject invalid repoUrl", () => {
      const result = detectProjectSchema.safeParse({
        repoUrl: "not-a-url",
        branch: "main",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing repoUrl", () => {
      const result = detectProjectSchema.safeParse({ branch: "main" });
      expect(result.success).toBe(false);
    });
  });
});
