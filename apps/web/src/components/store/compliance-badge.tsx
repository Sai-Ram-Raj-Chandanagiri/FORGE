"use client";

import { Shield, ShieldCheck, Lock, Server, Heart, Eye, Layers, FileCheck } from "lucide-react";

const BADGE_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  "pinned-base-image": { label: "Pinned Image", icon: Layers, color: "text-blue-600 bg-blue-50 border-blue-200" },
  "official-image": { label: "Official Image", icon: ShieldCheck, color: "text-green-600 bg-green-50 border-green-200" },
  "minimal-base": { label: "Minimal Base", icon: Server, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  "semver-tag": { label: "Semver Tag", icon: FileCheck, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  "no-hardcoded-secrets": { label: "No Secrets", icon: Lock, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  "healthcheck-defined": { label: "Health Check", icon: Heart, color: "text-pink-600 bg-pink-50 border-pink-200" },
  "no-privileged": { label: "Unprivileged", icon: Shield, color: "text-amber-600 bg-amber-50 border-amber-200" },
  "copy-not-add": { label: "COPY Only", icon: FileCheck, color: "text-violet-600 bg-violet-50 border-violet-200" },
  "no-root-user": { label: "Non-Root", icon: Eye, color: "text-teal-600 bg-teal-50 border-teal-200" },
};

interface ComplianceBadgeProps {
  badge: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function ComplianceBadge({ badge, size = "md", showLabel = true }: ComplianceBadgeProps) {
  const config = BADGE_CONFIG[badge];
  const label = config?.label ?? badge.replace(/-/g, " ");
  const Icon = config?.icon ?? Shield;
  const color = config?.color ?? "text-gray-600 bg-gray-50 border-gray-200";

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[10px] font-medium ${color}`}
        title={label}
      >
        <Icon className="h-2.5 w-2.5" />
        {showLabel && <span className="max-w-[60px] truncate">{label}</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {showLabel && label}
    </span>
  );
}
