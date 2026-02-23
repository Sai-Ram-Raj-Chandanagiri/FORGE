/**
 * Aggregated usage summary for a deployment or organization over a billing period.
 * Used in the billing dashboard to display resource consumption.
 */
export interface UsageSummary {
  /** ID of the deployment this usage is attributed to. */
  deploymentId: string;
  /** Human-readable deployment name (denormalized for display). */
  deploymentName: string;
  /** Module name (denormalized for display). */
  moduleName: string;
  /** Total CPU time consumed in seconds. */
  cpuSeconds: number;
  /** Total memory usage in megabyte-hours. */
  memoryMbHours: number;
  /** Total inbound network traffic in bytes. */
  networkInBytes: number;
  /** Total outbound network traffic in bytes. */
  networkOutBytes: number;
  /** Total disk usage in bytes. */
  diskUsageBytes: number;
  /** ISO 8601 timestamp marking the start of the billing period. */
  periodStart: string;
  /** ISO 8601 timestamp marking the end of the billing period. */
  periodEnd: string;
}

/**
 * Estimated billing information derived from usage summaries
 * and the active pricing model.
 */
export interface BillingEstimate {
  /** Total estimated cost across all deployments. */
  totalAmount: number;
  /** ISO 4217 currency code (e.g., "USD"). */
  currency: string;
  /** Itemized cost breakdown per deployment. */
  lineItems: {
    /** ID of the deployment. */
    deploymentId: string;
    /** Human-readable deployment name. */
    deploymentName: string;
    /** Module name. */
    moduleName: string;
    /** Estimated cost for this deployment in the billing period. */
    amount: number;
    /** Pricing model applied (e.g., "FREE", "SUBSCRIPTION_MONTHLY", "USAGE_BASED"). */
    pricingModel: string;
  }[];
  /** ISO 8601 timestamp marking the start of the billing period. */
  periodStart: string;
  /** ISO 8601 timestamp marking the end of the billing period. */
  periodEnd: string;
  /** ISO 8601 timestamp of when this estimate was generated. */
  generatedAt: string;
}

/**
 * Purchase record as returned by API endpoints.
 * Represents a user's acquisition of a module license.
 */
export interface PurchaseInfo {
  /** Unique purchase identifier. */
  id: string;
  /** ID of the purchasing user. */
  userId: string;
  /** ID of the organization the purchase is attributed to, if any. */
  organizationId: string | null;
  /** ID of the purchased module. */
  moduleId: string;
  /** Module name (denormalized for display). */
  moduleName: string;
  /** Current purchase status. */
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "REFUNDED";
  /** Price paid at time of purchase. */
  pricePaid: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** Stripe payment intent ID, if applicable. */
  stripePaymentId: string | null;
  /** Stripe subscription ID, if applicable. */
  subscriptionId: string | null;
  /** ISO 8601 timestamp of when the purchase/subscription expires. */
  expiresAt: string | null;
  /** ISO 8601 timestamp of when the purchase was made. */
  purchasedAt: string;
}
