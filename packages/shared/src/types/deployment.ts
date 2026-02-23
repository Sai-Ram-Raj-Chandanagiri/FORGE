import type { DeploymentStatus } from "../constants/deployment-states";

/**
 * Deployment information returned by API endpoints.
 * Represents a running (or previously running) instance of a module.
 */
export interface DeploymentInfo {
  /** Unique deployment identifier. */
  id: string;
  /** ID of the user who created the deployment. */
  userId: string;
  /** ID of the organization this deployment belongs to, if any. */
  organizationId: string | null;
  /** ID of the deployed module. */
  moduleId: string;
  /** ID of the specific module version deployed. */
  versionId: string;
  /** Human-readable deployment name. */
  name: string;
  /** Current lifecycle status. */
  status: DeploymentStatus;
  /** Module name (denormalized for display). */
  moduleName: string;
  /** Module version string (denormalized for display). */
  versionString: string;
  /** Docker container name, if provisioned. */
  containerName: string | null;
  /** Docker Compose project name, if applicable. */
  composeProject: string | null;
  /** Network port assigned to this deployment. */
  assignedPort: number | null;
  /** Health check endpoint path (e.g., "/health"). */
  healthEndpoint: string | null;
  /** ISO 8601 timestamp of the last successful health check. */
  lastHealthCheck: string | null;
  /** Error message if the deployment is in a FAILED state. */
  errorMessage: string | null;
  /** Whether the deployment will automatically restart on failure. */
  autoRestart: boolean;
  /** Maximum number of automatic restart attempts. */
  maxRestarts: number;
  /** Current count of automatic restart attempts. */
  restartCount: number;
  /** ISO 8601 timestamp of when the deployment was created. */
  createdAt: string;
  /** ISO 8601 timestamp of the last status update. */
  updatedAt: string;
  /** ISO 8601 timestamp of when the deployment started running. */
  startedAt: string | null;
  /** ISO 8601 timestamp of when the deployment was stopped. */
  stoppedAt: string | null;
}

/**
 * Configuration payload stored with each deployment.
 * This is the user-supplied configuration merged with module defaults.
 */
export interface DeploymentConfig {
  /** Environment variables to inject into the container. */
  envVars?: Record<string, string>;
  /** Resource limits for the container. */
  resources?: {
    /** CPU limit (e.g., "0.5", "1.0"). */
    cpu?: string;
    /** Memory limit (e.g., "256Mi", "1Gi"). */
    memory?: string;
  };
  /** Network configuration. */
  network?: {
    /** Specific port to expose, or null for auto-assignment. */
    exposedPort?: number;
    /** Custom subdomain for the deployment, if supported. */
    subdomain?: string;
  };
  /** Volume mount definitions for persistent storage. */
  volumes?: {
    /** Container-internal mount path. */
    containerPath: string;
    /** Size limit for the volume (e.g., "1Gi"). */
    sizeLimit?: string;
  }[];
}

/**
 * Input payload for creating a new deployment via the API.
 */
export interface CreateDeploymentInput {
  /** ID of the module to deploy. */
  moduleId: string;
  /** ID of the module version to deploy. Defaults to the latest version if omitted. */
  versionId?: string;
  /** Human-readable deployment name. */
  name: string;
  /** ID of the organization to deploy under, if any. */
  organizationId?: string;
  /** Deployment configuration (env vars, resources, network, volumes). */
  configuration: DeploymentConfig;
  /** Whether to enable automatic restarts on failure. Defaults to true. */
  autoRestart?: boolean;
  /** Maximum restart attempts before giving up. Defaults to 3. */
  maxRestarts?: number;
  /** Health check endpoint path (e.g., "/health"). */
  healthEndpoint?: string;
}

/**
 * Runtime metrics snapshot for a deployment, used in monitoring dashboards.
 */
export interface DeploymentMetrics {
  /** ID of the deployment these metrics belong to. */
  deploymentId: string;
  /** CPU usage in fractional cores (e.g., 0.25 = 25% of one core). */
  cpuUsage: number;
  /** Memory usage in megabytes. */
  memoryUsageMb: number;
  /** Memory limit in megabytes. */
  memoryLimitMb: number;
  /** Inbound network traffic in bytes since the last measurement. */
  networkInBytes: number;
  /** Outbound network traffic in bytes since the last measurement. */
  networkOutBytes: number;
  /** Disk usage in bytes. */
  diskUsageBytes: number;
  /** Deployment uptime in seconds since last start. */
  uptimeSeconds: number;
  /** ISO 8601 timestamp of when these metrics were recorded. */
  recordedAt: string;
}
