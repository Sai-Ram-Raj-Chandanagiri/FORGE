"use client";

import { useState } from "react";
import {
  Palette,
  Layout,
  GripVertical,
  ExternalLink,
  Save,
  Loader2,
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
          <h1 className="text-2xl font-bold">Platform Settings</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Layout className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No platform layout configured yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the <strong>Platform Composer</strong> agent to build and configure your platform.
          </p>
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
          <h1 className="text-2xl font-bold">Platform Settings</h1>
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

      {/* Info */}
      {data.layout && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(data.layout.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
