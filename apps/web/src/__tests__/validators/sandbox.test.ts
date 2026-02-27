import {
  startSandboxSchema,
  getSandboxStatusSchema,
  stopSandboxSchema,
  listSandboxesSchema,
} from "@/lib/validators/sandbox";

describe("Sandbox Validators", () => {
  describe("startSandboxSchema", () => {
    it("should accept valid moduleId without versionId", () => {
      const result = startSandboxSchema.safeParse({
        moduleId: "clx123abc",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid moduleId with versionId", () => {
      const result = startSandboxSchema.safeParse({
        moduleId: "clx123abc",
        versionId: "clx456def",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty moduleId", () => {
      const result = startSandboxSchema.safeParse({
        moduleId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing moduleId", () => {
      const result = startSandboxSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject empty versionId when provided", () => {
      const result = startSandboxSchema.safeParse({
        moduleId: "clx123abc",
        versionId: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("getSandboxStatusSchema", () => {
    it("should accept valid sessionId", () => {
      const result = getSandboxStatusSchema.safeParse({
        sessionId: "clx789ghi",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty sessionId", () => {
      const result = getSandboxStatusSchema.safeParse({
        sessionId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing sessionId", () => {
      const result = getSandboxStatusSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("stopSandboxSchema", () => {
    it("should accept valid sessionId", () => {
      const result = stopSandboxSchema.safeParse({
        sessionId: "clx789ghi",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty sessionId", () => {
      const result = stopSandboxSchema.safeParse({
        sessionId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing sessionId", () => {
      const result = stopSandboxSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("listSandboxesSchema", () => {
    it("should accept without status filter", () => {
      const result = listSandboxesSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept valid status: running", () => {
      const result = listSandboxesSchema.safeParse({ status: "running" });
      expect(result.success).toBe(true);
    });

    it("should accept valid status: starting", () => {
      const result = listSandboxesSchema.safeParse({ status: "starting" });
      expect(result.success).toBe(true);
    });

    it("should accept valid status: expired", () => {
      const result = listSandboxesSchema.safeParse({ status: "expired" });
      expect(result.success).toBe(true);
    });

    it("should accept valid status: failed", () => {
      const result = listSandboxesSchema.safeParse({ status: "failed" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid status value", () => {
      const result = listSandboxesSchema.safeParse({ status: "deleted" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid status type", () => {
      const result = listSandboxesSchema.safeParse({ status: 123 });
      expect(result.success).toBe(false);
    });
  });
});
