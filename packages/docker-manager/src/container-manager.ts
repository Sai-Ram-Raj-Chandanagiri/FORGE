import Docker from "dockerode";

export interface ContainerConfig {
  name: string;
  image: string;
  env?: Record<string, string>;
  ports?: { container: number; host: number }[];
  volumes?: { host: string; container: string; readonly?: boolean }[];
  network?: string;
  resources?: {
    cpuLimit?: number; // Number of CPUs (e.g., 0.5)
    memoryLimitMb?: number; // Memory limit in MB
  };
  healthCheck?: {
    test: string[];
    interval?: number; // seconds
    timeout?: number;
    retries?: number;
    startPeriod?: number;
  };
  restartPolicy?: "no" | "always" | "unless-stopped" | "on-failure";
  labels?: Record<string, string>;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: "running" | "exited" | "paused" | "restarting" | "dead" | "created" | "removing";
  ports: { container: number; host: number; protocol: string }[];
  createdAt: string;
  startedAt: string | null;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsageMb: number;
  memoryLimitMb: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
}

export class ContainerManager {
  private docker: Docker;

  constructor(socketPath?: string) {
    this.docker = new Docker(
      socketPath ? { socketPath } : undefined,
    );
  }

  async pullImage(image: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        this.docker.modem.followProgress(stream, (err: Error | null) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  async createContainer(config: ContainerConfig): Promise<string> {
    const portBindings: Record<string, { HostPort: string }[]> = {};
    const exposedPorts: Record<string, Record<string, never>> = {};

    if (config.ports) {
      for (const port of config.ports) {
        const key = `${port.container}/tcp`;
        exposedPorts[key] = {};
        portBindings[key] = [{ HostPort: port.host.toString() }];
      }
    }

    const binds = config.volumes?.map(
      (v) => `${v.host}:${v.container}${v.readonly ? ":ro" : ""}`,
    );

    const envArray = config.env
      ? Object.entries(config.env).map(([k, v]) => `${k}=${v}`)
      : [];

    const container = await this.docker.createContainer({
      name: config.name,
      Image: config.image,
      Env: envArray,
      ExposedPorts: exposedPorts,
      Labels: {
        ...config.labels,
        "forge.managed": "true",
      },
      HostConfig: {
        PortBindings: portBindings,
        Binds: binds,
        NetworkMode: config.network,
        RestartPolicy: config.restartPolicy
          ? { Name: config.restartPolicy, MaximumRetryCount: config.restartPolicy === "on-failure" ? 3 : 0 }
          : undefined,
        NanoCpus: config.resources?.cpuLimit
          ? Math.floor(config.resources.cpuLimit * 1e9)
          : undefined,
        Memory: config.resources?.memoryLimitMb
          ? config.resources.memoryLimitMb * 1024 * 1024
          : undefined,
      },
      Healthcheck: config.healthCheck
        ? {
            Test: config.healthCheck.test,
            Interval: (config.healthCheck.interval ?? 30) * 1e9,
            Timeout: (config.healthCheck.timeout ?? 10) * 1e9,
            Retries: config.healthCheck.retries ?? 3,
            StartPeriod: (config.healthCheck.startPeriod ?? 15) * 1e9,
          }
        : undefined,
    });

    return container.id;
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.start();
  }

  async stopContainer(containerId: string, timeoutSeconds = 10): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.stop({ t: timeoutSeconds });
  }

  async restartContainer(containerId: string, timeoutSeconds = 10): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.restart({ t: timeoutSeconds });
  }

  async removeContainer(containerId: string, force = false): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.remove({ force, v: true });
  }

  async getContainerInfo(containerId: string): Promise<ContainerInfo> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();

    const ports = Object.entries(info.NetworkSettings.Ports || {}).flatMap(
      ([key, bindings]) => {
        if (!bindings) return [];
        const [containerPort, protocol] = key.split("/");
        return bindings.map((b) => ({
          container: parseInt(containerPort, 10),
          host: parseInt(b.HostPort, 10),
          protocol: protocol || "tcp",
        }));
      },
    );

    return {
      id: info.Id,
      name: info.Name.replace(/^\//, ""),
      image: info.Config.Image,
      status: info.State.Status,
      state: info.State.Status as ContainerInfo["state"],
      ports,
      createdAt: info.Created,
      startedAt: info.State.StartedAt || null,
    };
  }

  async getContainerStats(containerId: string): Promise<ContainerStats> {
    const container = this.docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });

    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

    const memUsage = stats.memory_stats.usage || 0;
    const memLimit = stats.memory_stats.limit || 1;

    let networkRx = 0;
    let networkTx = 0;
    if (stats.networks) {
      for (const iface of Object.values(stats.networks) as { rx_bytes: number; tx_bytes: number }[]) {
        networkRx += iface.rx_bytes;
        networkTx += iface.tx_bytes;
      }
    }

    let blockRead = 0;
    let blockWrite = 0;
    if (stats.blkio_stats?.io_service_bytes_recursive) {
      for (const entry of stats.blkio_stats.io_service_bytes_recursive) {
        if (entry.op === "read" || entry.op === "Read") blockRead += entry.value;
        if (entry.op === "write" || entry.op === "Write") blockWrite += entry.value;
      }
    }

    return {
      cpuPercent: Math.round(cpuPercent * 100) / 100,
      memoryUsageMb: Math.round(memUsage / (1024 * 1024)),
      memoryLimitMb: Math.round(memLimit / (1024 * 1024)),
      memoryPercent: Math.round((memUsage / memLimit) * 10000) / 100,
      networkRxBytes: networkRx,
      networkTxBytes: networkTx,
      blockReadBytes: blockRead,
      blockWriteBytes: blockWrite,
    };
  }

  async getContainerLogs(
    containerId: string,
    options?: { tail?: number; since?: number; timestamps?: boolean },
  ): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: options?.tail ?? 100,
      since: options?.since,
      timestamps: options?.timestamps ?? true,
    });
    return logs.toString();
  }

  async listForgeContainers(): Promise<ContainerInfo[]> {
    const containers = await this.docker.listContainers({
      all: true,
      filters: { label: ["forge.managed=true"] },
    });

    return containers.map((c) => ({
      id: c.Id,
      name: c.Names[0]?.replace(/^\//, "") || "",
      image: c.Image,
      status: c.Status,
      state: c.State as ContainerInfo["state"],
      ports: c.Ports.map((p) => ({
        container: p.PrivatePort,
        host: p.PublicPort || 0,
        protocol: p.Type,
      })),
      createdAt: new Date(c.Created * 1000).toISOString(),
      startedAt: null,
    }));
  }
}
