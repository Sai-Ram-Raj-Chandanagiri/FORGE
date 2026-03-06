export interface SystemMetrics {
  totalUsers: number;
  totalModules: number;
  publishedModules: number;
  totalDeployments: number;
  runningDeployments: number;
  totalOrganizations: number;
}

export interface ReviewItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  createdAt: string;
  author: { id: string; name: string | null; username: string };
}

export interface ReviewQueueData {
  modules: ReviewItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserItem {
  id: string;
  name: string | null;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  createdAt: string;
}
