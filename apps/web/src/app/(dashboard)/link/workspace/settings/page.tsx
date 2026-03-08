"use client";

import { useState } from "react";
import {
  Palette,
  Layout,
  Settings,
  GripVertical,
  ExternalLink,
  Save,
  Loader2,
  Download,
  GitBranch,
  Package,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";

interface SidebarItemData {
  moduleSlug: string;
  label: string;
  icon: string;
  group: string;
  order: number;
}

export default function PlatformSettingsPage() {
  const { data, isLoading, refetch } = trpc.platform.getLayout.useQuery() as {
    data: {
      hasLayout: boolean;
      workspace: { id: string; status: string; proxyPort: number | null } | null;
      layout: {
        id: string;
        name: string;
        config: {
          theme: { brandName: string; primaryColor: string; logoUrl?: string | null };
          homepage: string;
          sidebar: SidebarItemData[];
          groups: { name: string; order: number }[];
        };
        updatedAt: string;
      } | null;
    } | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const updateThemeMut = trpc.platform.updateTheme.useMutation({
    onSuccess: () => refetch(),
  });
  const reorderMut = trpc.platform.reorderSidebar.useMutation({
    onSuccess: () => refetch(),
  });

  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [editedSidebar, setEditedSidebar] = useState<SidebarItemData[] | null>(null);

  // Sync state from server data
  const layout = data?.layout?.config;
  const currentBrandName = brandName || layout?.theme.brandName || "";
  const currentColor = primaryColor !== "#6366f1" ? primaryColor : layout?.theme.primaryColor || "#6366f1";
  const sidebarItems = editedSidebar || layout?.sidebar || [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.hasLayout) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallback="/link/workspace" label="Back" />
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Settings className="h-7 w-7 text-primary" />
            Platform Settings
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Layout className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No platform layout configured yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the Platform Composer agent to build and configure your platform.
          </p>
          <a
            href="/agents/chat?agent=composer"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Open Composer
          </a>
        </div>
      </div>
    );
  }

  const portalUrl = data.workspace?.proxyPort
    ? `http://localhost:${data.workspace.proxyPort}`
    : null;

  const handleSaveTheme = () => {
    updateThemeMut.mutate({
      brandName: currentBrandName || undefined,
      primaryColor: currentColor,
    });
  };

  const handleSaveSidebar = () => {
    reorderMut.mutate({ sidebar: sidebarItems });
  };

  const moveSidebarItem = (index: number, direction: "up" | "down") => {
    const items = [...sidebarItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const temp = items[index]!;
    items[index] = items[targetIndex]!;
    items[targetIndex] = temp;
    // Recompute order
    items.forEach((item, i) => { item.order = i + 1; });
    setEditedSidebar(items);
  };

  const updateSidebarLabel = (index: number, label: string) => {
    const items = [...sidebarItems];
    const item = items[index];
    if (item) {
      items[index] = { ...item, label };
      setEditedSidebar(items);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton fallback="/link/workspace" label="Back" />
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Settings className="h-7 w-7 text-primary" />
            Platform Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize your unified platform dashboard
          </p>
        </div>
        {portalUrl && (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Platform <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Theme Section */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Theme</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Platform Name</label>
            <input
              type="text"
              value={currentBrandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="My Platform"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border"
              />
              <input
                type="text"
                value={currentColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 rounded-lg border bg-background px-3 py-2 text-sm font-mono"
                placeholder="#6366f1"
              />
            </div>
          </div>
        </div>
        <button
          onClick={handleSaveTheme}
          disabled={updateThemeMut.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {updateThemeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Theme
        </button>
      </div>

      {/* Sidebar Section */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Sidebar Items</h2>
        </div>
        <div className="space-y-2">
          {sidebarItems.map((item, i) => (
            <div key={item.moduleSlug} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
              <span className="text-xs text-muted-foreground font-mono w-6">{i + 1}</span>
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateSidebarLabel(i, e.target.value)}
                className="flex-1 rounded border bg-background px-2 py-1 text-sm"
              />
              <span className="text-xs text-muted-foreground">{item.group}</span>
              <span className="text-xs text-muted-foreground font-mono">{item.icon}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => moveSidebarItem(i, "up")}
                  disabled={i === 0}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  title="Move up"
                >
                  &#x25B2;
                </button>
                <button
                  onClick={() => moveSidebarItem(i, "down")}
                  disabled={i === sidebarItems.length - 1}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  title="Move down"
                >
                  &#x25BC;
                </button>
              </div>
            </div>
          ))}
          {sidebarItems.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No sidebar items configured.</p>
          )}
        </div>
        {editedSidebar && (
          <button
            onClick={handleSaveSidebar}
            disabled={reorderMut.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {reorderMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Sidebar
          </button>
        )}
      </div>

      {/* Export Section */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Export Project</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Download your platform as a portable project with docker-compose, nginx config, dashboard, and scripts. Run it anywhere with <code className="rounded bg-muted px-1 py-0.5 text-xs">docker compose up</code>.
        </p>
        <a
          href="/api/export"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Download className="h-4 w-4" />
          Download ZIP
        </a>
      </div>

      {/* Module Sources Section */}
      <ModuleSourcesSection />

      {/* Info */}
      {data.layout && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(data.layout.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function ModuleSourcesSection() {
  const { data: sources, isLoading } = trpc.export.getModuleSources.useQuery() as {
    data: {
      moduleSlug: string;
      moduleName: string;
      version: string;
      dockerImage: string;
      sourceRepoUrl: string | null;
      documentationUrl: string | null;
      hasSource: boolean;
    }[] | undefined;
    isLoading: boolean;
  };

  if (isLoading || !sources || sources.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Module Sources</h2>
      </div>
      <div className="space-y-3">
        {sources.map((mod) => (
          <div key={mod.moduleSlug} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{mod.moduleName}</p>
              <p className="text-xs text-muted-foreground">
                v{mod.version} &middot; <code className="text-[10px]">{mod.dockerImage}</code>
              </p>
            </div>
            <div className="flex gap-2">
              {mod.sourceRepoUrl && (
                <a
                  href={mod.sourceRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  <GitBranch className="h-3 w-3" /> Source
                </a>
              )}
              {mod.documentationUrl && (
                <a
                  href={mod.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  <ExternalLink className="h-3 w-3" /> Docs
                </a>
              )}
              {!mod.hasSource && (
                <span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                  Pre-built image
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
