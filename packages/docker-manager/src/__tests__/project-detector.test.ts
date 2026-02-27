import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ProjectDetector } from "../project-detector";

describe("ProjectDetector", () => {
  let detector: ProjectDetector;
  let tempDir: string;

  beforeEach(() => {
    detector = new ProjectDetector();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeFile(filename: string, content: string) {
    const filePath = path.join(tempDir, filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  describe("detect()", () => {
    it("should detect Node.js project from package.json", () => {
      writeFile("package.json", JSON.stringify({ dependencies: { express: "^4.0.0" } }));
      const result = detector.detect(tempDir);
      expect(result.type).toBe("nodejs");
      expect(result.framework).toBe("express");
      expect(result.hasDockerfile).toBe(false);
    });

    it("should detect Next.js project", () => {
      writeFile("package.json", JSON.stringify({ dependencies: { next: "^14.0.0", react: "^18" } }));
      const result = detector.detect(tempDir);
      expect(result.type).toBe("nodejs");
      expect(result.framework).toBe("nextjs");
      expect(result.port).toBe(3000);
    });

    it("should detect Python/FastAPI project", () => {
      writeFile("requirements.txt", "fastapi==0.104.1\nuvicorn\n");
      const result = detector.detect(tempDir);
      expect(result.type).toBe("python");
      expect(result.framework).toBe("fastapi");
      expect(result.port).toBe(8000);
    });

    it("should detect Python/Django project", () => {
      writeFile("requirements.txt", "Django==4.2\n");
      const result = detector.detect(tempDir);
      expect(result.type).toBe("python");
      expect(result.framework).toBe("django");
      expect(result.port).toBe(8000);
    });

    it("should detect Python/Flask project", () => {
      writeFile("requirements.txt", "flask==3.0\n");
      const result = detector.detect(tempDir);
      expect(result.type).toBe("python");
      expect(result.framework).toBe("flask");
      expect(result.port).toBe(5000);
    });

    it("should detect Go project", () => {
      writeFile("go.mod", "module example.com/myapp\n\ngo 1.22\n");
      const result = detector.detect(tempDir);
      expect(result.type).toBe("go");
      expect(result.port).toBe(8080);
    });

    it("should detect Java/Maven project", () => {
      writeFile("pom.xml", "<project></project>");
      const result = detector.detect(tempDir);
      expect(result.type).toBe("java");
      expect(result.framework).toBe("maven");
    });

    it("should detect Java/Gradle project", () => {
      writeFile("build.gradle", "plugins { id 'java' }");
      const result = detector.detect(tempDir);
      expect(result.type).toBe("java");
      expect(result.framework).toBe("gradle");
    });

    it("should detect Ruby/Rails project", () => {
      writeFile("Gemfile", 'gem "rails"');
      const result = detector.detect(tempDir);
      expect(result.type).toBe("ruby");
      expect(result.framework).toBe("rails");
    });

    it("should detect PHP/Laravel project", () => {
      writeFile("composer.json", JSON.stringify({ require: { "laravel/framework": "^10" } }));
      const result = detector.detect(tempDir);
      expect(result.type).toBe("php");
      expect(result.framework).toBe("laravel");
    });

    it("should return unknown for empty directory", () => {
      const result = detector.detect(tempDir);
      expect(result.type).toBe("unknown");
      expect(result.hasDockerfile).toBe(false);
    });

    it("should detect existing Dockerfile in root", () => {
      writeFile("Dockerfile", "FROM node:20-alpine\n");
      writeFile("package.json", JSON.stringify({ dependencies: {} }));
      const result = detector.detect(tempDir);
      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfilePath).toBe("Dockerfile");
    });

    it("should detect Dockerfile in docker/ subdirectory", () => {
      writeFile("docker/Dockerfile", "FROM python:3.12\n");
      writeFile("requirements.txt", "flask\n");
      const result = detector.detect(tempDir);
      expect(result.hasDockerfile).toBe(true);
      expect(result.dockerfilePath).toBe("docker/Dockerfile");
    });

    it("should detect Vite project", () => {
      writeFile("package.json", JSON.stringify({ devDependencies: { vite: "^5.0.0" } }));
      const result = detector.detect(tempDir);
      expect(result.type).toBe("nodejs");
      expect(result.framework).toBe("vite");
      expect(result.port).toBe(80); // Served via nginx
    });
  });

  describe("generateDockerfile()", () => {
    it("should generate Dockerfile for Node.js project", () => {
      const result = detector.generateDockerfile({
        type: "nodejs",
        framework: "express",
        port: 3000,
        hasDockerfile: false,
      });
      expect(result).toContain("FROM node:20-alpine");
      expect(result).toContain("EXPOSE 3000");
    });

    it("should generate Dockerfile for Next.js project", () => {
      const result = detector.generateDockerfile({
        type: "nodejs",
        framework: "nextjs",
        port: 3000,
        hasDockerfile: false,
      });
      expect(result).toContain("node:20-alpine");
      expect(result).toContain("EXPOSE 3000");
    });

    it("should generate Dockerfile for Python/FastAPI project", () => {
      const result = detector.generateDockerfile({
        type: "python",
        framework: "fastapi",
        port: 8000,
        hasDockerfile: false,
      });
      expect(result).toContain("FROM python:3.12");
      expect(result).toContain("uvicorn");
      expect(result).toContain("EXPOSE 8000");
    });

    it("should generate Dockerfile for Go project", () => {
      const result = detector.generateDockerfile({
        type: "go",
        port: 8080,
        hasDockerfile: false,
      });
      expect(result).toContain("FROM golang:1.22");
      expect(result).toContain("EXPOSE 8080");
    });

    it("should return null for unknown project type", () => {
      const result = detector.generateDockerfile({
        type: "unknown",
        hasDockerfile: false,
      });
      expect(result).toBeNull();
    });

    it("should generate Dockerfile for Java/Maven project", () => {
      const result = detector.generateDockerfile({
        type: "java",
        framework: "maven",
        port: 8080,
        hasDockerfile: false,
      });
      expect(result).toContain("maven");
      expect(result).toContain("EXPOSE 8080");
    });

    it("should generate Dockerfile for Ruby/Rails project", () => {
      const result = detector.generateDockerfile({
        type: "ruby",
        framework: "rails",
        port: 3000,
        hasDockerfile: false,
      });
      expect(result).toContain("ruby:");
      expect(result).toContain("rails");
    });

    it("should generate Dockerfile for PHP/Laravel project", () => {
      const result = detector.generateDockerfile({
        type: "php",
        framework: "laravel",
        port: 8080,
        hasDockerfile: false,
      });
      expect(result).toContain("php:");
      expect(result).toContain("artisan");
    });
  });
});
