import * as fs from "fs";
import * as path from "path";
import {
  nodejsDockerfile,
  pythonDockerfile,
  goDockerfile,
  javaDockerfile,
  rubyDockerfile,
  phpDockerfile,
} from "./templates";

export interface ProjectDetection {
  type: "nodejs" | "python" | "go" | "java" | "ruby" | "php" | "unknown";
  framework?: string;
  port?: number;
  hasDockerfile: boolean;
  dockerfilePath?: string;
}

export class ProjectDetector {
  /**
   * Scans a cloned repo directory to detect project type, framework, and Dockerfile.
   */
  detect(repoPath: string): ProjectDetection {
    // 1. Check for Dockerfile first
    const dockerfilePath = this.findDockerfile(repoPath);

    // 2. Detect project type
    if (this.fileExists(repoPath, "package.json")) {
      const pkg = this.readJson(repoPath, "package.json");
      const framework = this.detectNodeFramework(pkg);
      const port = this.detectNodePort(framework);
      return {
        type: "nodejs",
        framework,
        port,
        hasDockerfile: !!dockerfilePath,
        dockerfilePath,
      };
    }

    if (
      this.fileExists(repoPath, "requirements.txt") ||
      this.fileExists(repoPath, "pyproject.toml") ||
      this.fileExists(repoPath, "setup.py")
    ) {
      const framework = this.detectPythonFramework(repoPath);
      const port = framework === "django" ? 8000 : framework === "flask" ? 5000 : 8000;
      return {
        type: "python",
        framework,
        port,
        hasDockerfile: !!dockerfilePath,
        dockerfilePath,
      };
    }

    if (this.fileExists(repoPath, "go.mod")) {
      return {
        type: "go",
        port: 8080,
        hasDockerfile: !!dockerfilePath,
        dockerfilePath,
      };
    }

    if (this.fileExists(repoPath, "pom.xml")) {
      return {
        type: "java",
        framework: "maven",
        port: 8080,
        hasDockerfile: !!dockerfilePath,
        dockerfilePath,
      };
    }

    if (this.fileExists(repoPath, "build.gradle") || this.fileExists(repoPath, "build.gradle.kts")) {
      return {
        type: "java",
        framework: "gradle",
        port: 8080,
        hasDockerfile: !!dockerfilePath,
        dockerfilePath,
      };
    }

    if (this.fileExists(repoPath, "Gemfile")) {
      const framework = this.detectRubyFramework(repoPath);
      return {
        type: "ruby",
        framework,
        port: 3000,
        hasDockerfile: !!dockerfilePath,
        dockerfilePath,
      };
    }

    if (this.fileExists(repoPath, "composer.json")) {
      const framework = this.detectPhpFramework(repoPath);
      return {
        type: "php",
        framework,
        port: 8080,
        hasDockerfile: !!dockerfilePath,
        dockerfilePath,
      };
    }

    return {
      type: "unknown",
      hasDockerfile: !!dockerfilePath,
      dockerfilePath,
    };
  }

  /**
   * Generates a Dockerfile string based on the detection result.
   * Returns null if project type is unknown.
   */
  generateDockerfile(detection: ProjectDetection): string | null {
    switch (detection.type) {
      case "nodejs":
        return nodejsDockerfile(detection.framework, detection.port);
      case "python":
        return pythonDockerfile(detection.framework, detection.port);
      case "go":
        return goDockerfile(detection.port);
      case "java":
        return javaDockerfile(detection.framework, detection.port);
      case "ruby":
        return rubyDockerfile(detection.framework, detection.port);
      case "php":
        return phpDockerfile(detection.framework, detection.port);
      default:
        return null;
    }
  }

  // ---- Internal helpers ----

  private findDockerfile(repoPath: string): string | undefined {
    const candidates = [
      "Dockerfile",
      "dockerfile",
      "docker/Dockerfile",
      "Docker/Dockerfile",
      ".docker/Dockerfile",
    ];

    for (const candidate of candidates) {
      const fullPath = path.join(repoPath, candidate);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return candidate;
      }
    }
    return undefined;
  }

  private fileExists(repoPath: string, filename: string): boolean {
    return fs.existsSync(path.join(repoPath, filename));
  }

  private readJson(repoPath: string, filename: string): Record<string, unknown> {
    try {
      const content = fs.readFileSync(path.join(repoPath, filename), "utf-8");
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private readFileContent(repoPath: string, filename: string): string {
    try {
      return fs.readFileSync(path.join(repoPath, filename), "utf-8");
    } catch {
      return "";
    }
  }

  private detectNodeFramework(pkg: Record<string, unknown>): string | undefined {
    const deps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    };

    if (deps["next"]) return "nextjs";
    if (deps["vite"] || deps["@vitejs/plugin-react"]) return "vite";
    if (deps["express"]) return "express";
    if (deps["fastify"]) return "fastify";
    if (deps["koa"]) return "koa";
    if (deps["hapi"] || deps["@hapi/hapi"]) return "hapi";
    return undefined;
  }

  private detectNodePort(framework?: string): number {
    if (framework === "nextjs") return 3000;
    if (framework === "vite") return 80; // Served via nginx in the template
    return 3000;
  }

  private detectPythonFramework(repoPath: string): string | undefined {
    const requirements = this.readFileContent(repoPath, "requirements.txt");
    const pyproject = this.readFileContent(repoPath, "pyproject.toml");
    const combined = requirements + pyproject;

    if (combined.includes("fastapi")) return "fastapi";
    if (combined.includes("django") || combined.includes("Django")) return "django";
    if (combined.includes("flask") || combined.includes("Flask")) return "flask";
    return undefined;
  }

  private detectRubyFramework(repoPath: string): string | undefined {
    const gemfile = this.readFileContent(repoPath, "Gemfile");
    if (gemfile.includes("rails") || this.fileExists(repoPath, "config/routes.rb")) return "rails";
    if (gemfile.includes("sinatra")) return "sinatra";
    return undefined;
  }

  private detectPhpFramework(repoPath: string): string | undefined {
    const composer = this.readJson(repoPath, "composer.json");
    const require = composer.require as Record<string, string> | undefined;
    if (require?.["laravel/framework"]) return "laravel";
    if (require?.["symfony/framework-bundle"]) return "symfony";
    return undefined;
  }
}
