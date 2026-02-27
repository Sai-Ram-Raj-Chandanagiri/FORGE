import Docker from "dockerode";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ProjectDetector, type ProjectDetection } from "./project-detector";

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  imageTag: string;
  logs: string;
  detection?: ProjectDetection;
  generatedDockerfile?: string;
  error?: string;
}

export interface BuildProgress {
  stage: "cloning" | "detecting" | "building" | "validating" | "done" | "failed";
  message: string;
  logs: string;
}

export class ImageBuilder {
  private docker: Docker;
  private detector: ProjectDetector;

  constructor(socketPath?: string) {
    this.docker = new Docker(socketPath ? { socketPath } : undefined);
    this.detector = new ProjectDetector();
  }

  /**
   * Clones a git repository to a temporary directory (shallow clone).
   */
  async cloneRepo(repoUrl: string, branch: string, destDir: string): Promise<void> {
    // Sanitize inputs to prevent command injection
    const sanitizedUrl = repoUrl.replace(/[;&|`$]/g, "");
    const sanitizedBranch = branch.replace(/[;&|`$]/g, "");

    await execAsync(
      `git clone --depth 1 --branch "${sanitizedBranch}" "${sanitizedUrl}" "${destDir}"`,
      { timeout: 120_000 }, // 2 min timeout for clone
    );
  }

  /**
   * Detects project type and Dockerfile in a cloned repo.
   */
  detectProject(repoPath: string): ProjectDetection {
    return this.detector.detect(repoPath);
  }

  /**
   * Generates a Dockerfile for the given detection. Returns null if unknown project type.
   */
  generateDockerfile(detection: ProjectDetection): string | null {
    return this.detector.generateDockerfile(detection);
  }

  /**
   * Writes a Dockerfile to the repo directory (used when auto-generated or user-provided).
   */
  writeDockerfile(repoPath: string, content: string, dockerfilePath = "Dockerfile"): void {
    const fullPath = path.join(repoPath, dockerfilePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  /**
   * Builds a Docker image from a directory containing a Dockerfile.
   * Returns the build logs as a string.
   */
  async buildImage(
    repoPath: string,
    imageTag: string,
    dockerfilePath = "Dockerfile",
  ): Promise<string> {
    const resolvedDockerfile = path.resolve(repoPath, dockerfilePath);
    const contextDir = path.resolve(repoPath);

    // Ensure Dockerfile exists
    if (!fs.existsSync(resolvedDockerfile)) {
      throw new Error(`Dockerfile not found at: ${dockerfilePath}`);
    }

    return new Promise<string>((resolve, reject) => {
      this.docker.buildImage(
        {
          context: contextDir,
          src: ["."],
        },
        {
          t: imageTag,
          dockerfile: dockerfilePath,
          rm: true,
          forcerm: true,
        },
        (err, stream) => {
          if (err) return reject(err);
          if (!stream) return reject(new Error("No build stream returned"));

          let logs = "";

          stream.on("data", (chunk: Buffer) => {
            const lines = chunk.toString().split("\n").filter(Boolean);
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line) as { stream?: string; error?: string };
                if (parsed.stream) {
                  logs += parsed.stream;
                }
                if (parsed.error) {
                  logs += `ERROR: ${parsed.error}\n`;
                }
              } catch {
                logs += line + "\n";
              }
            }
          });

          stream.on("end", () => {
            if (logs.includes("ERROR:")) {
              reject(new Error(logs));
            } else {
              resolve(logs);
            }
          });

          stream.on("error", (streamErr: Error) => {
            reject(streamErr);
          });
        },
      );
    });
  }

  /**
   * Validates a built image by running a temporary container and checking
   * that the exposed port responds to an HTTP request.
   */
  async validateImage(
    imageTag: string,
    exposedPort: number,
    healthPath: string,
    timeoutMs = 30_000,
  ): Promise<{ healthy: boolean; logs: string }> {
    const testContainerName = `forge-validate-${Date.now()}`;
    let containerId: string | undefined;
    let logs = "";

    try {
      // Create a test container with a random host port
      const container = await this.docker.createContainer({
        name: testContainerName,
        Image: imageTag,
        ExposedPorts: { [`${exposedPort}/tcp`]: {} },
        HostConfig: {
          PortBindings: {
            [`${exposedPort}/tcp`]: [{ HostPort: "0" }], // Random available port
          },
          NanoCpus: 0.5 * 1e9,
          Memory: 256 * 1024 * 1024,
        },
        Labels: { "forge.validation": "true" },
      });

      containerId = container.id;
      await container.start();
      logs += "Validation container started.\n";

      // Get assigned host port
      const info = await container.inspect();
      const portKey = `${exposedPort}/tcp`;
      const portBindings = info.NetworkSettings.Ports[portKey];
      if (!portBindings || portBindings.length === 0) {
        logs += "No port binding found on validation container.\n";
        return { healthy: false, logs };
      }

      const hostPort = portBindings[0]!.HostPort;
      const healthUrl = `http://localhost:${hostPort}${healthPath}`;
      logs += `Health check URL: ${healthUrl}\n`;

      // Poll the health endpoint
      const startTime = Date.now();
      let healthy = false;

      while (Date.now() - startTime < timeoutMs) {
        try {
          const response = await fetch(healthUrl, {
            signal: AbortSignal.timeout(5000),
          });
          if (response.ok || response.status < 500) {
            logs += `Health check passed: HTTP ${response.status}\n`;
            healthy = true;
            break;
          }
          logs += `Health check returned ${response.status}, retrying...\n`;
        } catch {
          // Server not ready yet
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      if (!healthy) {
        logs += "Health check timed out.\n";
      }

      return { healthy, logs };
    } finally {
      // Clean up validation container
      if (containerId) {
        try {
          const container = this.docker.getContainer(containerId);
          await container.stop({ t: 2 }).catch(() => {});
          await container.remove({ force: true }).catch(() => {});
          logs += "Validation container cleaned up.\n";
        } catch {
          // Best-effort cleanup
        }
      }
    }
  }

  /**
   * Removes a temporary clone directory.
   */
  cleanup(repoPath: string): void {
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  }

  /**
   * Removes a Docker image by tag.
   */
  async removeImage(imageTag: string): Promise<void> {
    try {
      const image = this.docker.getImage(imageTag);
      await image.remove({ force: true });
    } catch {
      // Image may not exist
    }
  }

  /**
   * Full build pipeline: clone → detect → generate Dockerfile if needed → build → validate.
   * Returns BuildResult with all info.
   */
  async fullBuild(
    repoUrl: string,
    branch: string,
    imageTag: string,
    exposedPort: number,
    healthPath: string,
    customDockerfile?: string,
    onProgress?: (progress: BuildProgress) => void,
  ): Promise<BuildResult> {
    const tempDir = path.join(
      process.env.TEMP || process.env.TMPDIR || "/tmp",
      `forge-build-${Date.now()}`,
    );
    let logs = "";

    const report = (stage: BuildProgress["stage"], message: string) => {
      logs += `[${stage}] ${message}\n`;
      onProgress?.({ stage, message, logs });
    };

    try {
      // 1. Clone
      report("cloning", `Cloning ${repoUrl} (branch: ${branch})...`);
      await this.cloneRepo(repoUrl, branch, tempDir);
      report("cloning", "Repository cloned successfully.");

      // 2. Detect
      report("detecting", "Detecting project type...");
      const detection = this.detectProject(tempDir);
      report("detecting", `Detected: ${detection.type}${detection.framework ? ` (${detection.framework})` : ""}`);

      // 3. Handle Dockerfile
      let generatedDockerfile: string | undefined;

      if (customDockerfile) {
        // Developer provided a custom Dockerfile via the wizard editor
        this.writeDockerfile(tempDir, customDockerfile);
        report("detecting", "Using custom Dockerfile provided by developer.");
      } else if (!detection.hasDockerfile) {
        // No Dockerfile found — generate one
        const generated = this.generateDockerfile(detection);
        if (!generated) {
          return {
            success: false,
            imageTag,
            logs,
            detection,
            error: `Could not auto-detect project type. No Dockerfile found in repository and project type "${detection.type}" is not supported for auto-generation.`,
          };
        }
        this.writeDockerfile(tempDir, generated);
        generatedDockerfile = generated;
        report("detecting", "Auto-generated Dockerfile from detected project type.");
      } else {
        report("detecting", `Using existing Dockerfile at: ${detection.dockerfilePath || "Dockerfile"}`);
      }

      // 4. Build
      report("building", `Building image: ${imageTag}...`);
      const dockerfilePath = customDockerfile ? "Dockerfile" : (detection.dockerfilePath || "Dockerfile");
      const buildLogs = await this.buildImage(tempDir, imageTag, dockerfilePath);
      logs += buildLogs;
      report("building", "Image built successfully.");

      // 5. Validate
      report("validating", `Validating image (port: ${exposedPort}, health: ${healthPath})...`);
      const validation = await this.validateImage(imageTag, exposedPort, healthPath);
      logs += validation.logs;

      if (validation.healthy) {
        report("done", "Build and validation complete. Image is healthy.");
      } else {
        report("done", "Build succeeded but health check did not pass. Image may still be usable.");
      }

      return {
        success: true,
        imageTag,
        logs,
        detection,
        generatedDockerfile,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown build error";
      report("failed", errorMessage);

      // Clean up the built image on failure
      await this.removeImage(imageTag).catch(() => {});

      return {
        success: false,
        imageTag,
        logs,
        error: errorMessage,
      };
    } finally {
      this.cleanup(tempDir);
    }
  }
}
