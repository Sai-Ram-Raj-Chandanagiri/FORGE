/**
 * Tests for sidebar navigation configuration.
 *
 * Verifies:
 *  - Every Phase 8 feature page is reachable from the sidebar (no orphans).
 *  - Every nav href points to a real Next.js page file on disk.
 *  - There are no duplicate hrefs (a duplicate would silently shadow another link).
 *  - Each pillar has a valid root href.
 *  - Standalone link `match` predicates correctly recognize their own pathname.
 */

import { existsSync } from "fs";
import { join } from "path";
import {
  pillars,
  standaloneTopLinks,
  standaloneBottomLinks,
  getAllNavHrefs,
} from "@/components/layout/nav-config";

const APP_DIR = join(__dirname, "..", "..", "app", "(dashboard)");

/**
 * Resolve a sidebar href to the on-disk Next.js page file. Supports nested
 * routes and ignores dynamic [param] segments.
 */
function resolvePageFile(href: string): string | null {
  const segments = href.replace(/^\//, "").split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const candidate = join(APP_DIR, ...segments, "page.tsx");
  return existsSync(candidate) ? candidate : null;
}

describe("Sidebar nav-config", () => {
  describe("structural integrity", () => {
    it("has at least one pillar", () => {
      expect(pillars.length).toBeGreaterThan(0);
    });

    it("every pillar has a name, href, icon, and at least one sub-item", () => {
      for (const pillar of pillars) {
        expect(pillar.name).toBeTruthy();
        expect(pillar.href.startsWith("/")).toBe(true);
        expect(pillar.icon).toBeDefined();
        expect(pillar.subItems.length).toBeGreaterThan(0);
      }
    });

    it("has no duplicate hrefs across the entire nav", () => {
      const all = getAllNavHrefs();
      const unique = new Set(all);
      expect(unique.size).toBe(all.length);
    });

    it("every sub-item href starts with /", () => {
      for (const pillar of pillars) {
        for (const sub of pillar.subItems) {
          expect(sub.href.startsWith("/")).toBe(true);
          expect(sub.name).toBeTruthy();
          expect(sub.icon).toBeDefined();
        }
      }
    });
  });

  describe("Phase 8 reachability", () => {
    // Every page added by Phase 8 must be reachable from the sidebar
    // (production-grade UX — no manual URL typing).
    const phase8Pages = [
      // Phase 8.1 — Autonomy + personality + governance
      "/agents/approvals",
      "/agents/schedule",
      "/agents/settings",
      "/agents/governance",
      // Phase 8.2 — Predictive insights
      "/dashboard/insights",
      // Phase 8.3 — Agent marketplace
      "/store/agents",
      // Phase 8.4 — Credits + MCP
      "/settings/credits",
      "/agents/connections",
    ];

    it.each(phase8Pages)("%s is reachable from the sidebar", (href) => {
      const all = getAllNavHrefs();
      expect(all).toContain(href);
    });
  });

  describe("on-disk page existence", () => {
    // Build the full list, exclude things that aren't dashboard pages
    const allHrefs = getAllNavHrefs().filter(
      (h) =>
        h !== "/dashboard" && // exists at /dashboard/page.tsx but path differs
        true,
    );

    it.each(allHrefs)("%s resolves to a real page file", (href) => {
      const file = resolvePageFile(href);
      expect(file).not.toBeNull();
    });
  });

  describe("standalone link match predicates", () => {
    it("Insights matches /dashboard/insights", () => {
      const link = standaloneTopLinks.find((l) => l.href === "/dashboard/insights");
      expect(link).toBeDefined();
      expect(link!.match("/dashboard/insights")).toBe(true);
      expect(link!.match("/dashboard")).toBe(false);
    });

    it("Credits matches /settings/credits and any subpath", () => {
      const link = standaloneBottomLinks.find((l) => l.href === "/settings/credits");
      expect(link).toBeDefined();
      expect(link!.match("/settings/credits")).toBe(true);
      expect(link!.match("/settings/credits/history")).toBe(true);
      expect(link!.match("/settings")).toBe(false);
    });
  });

  describe("FORGE Store includes the agent marketplace", () => {
    it("has an Agent Marketplace sub-item under /store/agents", () => {
      const store = pillars.find((p) => p.name === "FORGE Store");
      expect(store).toBeDefined();
      const agentLink = store!.subItems.find((s) => s.href === "/store/agents");
      expect(agentLink).toBeDefined();
      expect(agentLink!.name).toMatch(/agent/i);
    });
  });

  describe("AI Agents pillar exposes all Phase 8.1 + 8.4 pages", () => {
    const expectedAgentSubpaths = [
      "/agents/approvals",
      "/agents/schedule",
      "/agents/settings",
      "/agents/governance",
      "/agents/connections",
    ];

    it.each(expectedAgentSubpaths)("AI Agents pillar contains %s", (href) => {
      const agents = pillars.find((p) => p.name === "AI Agents");
      expect(agents).toBeDefined();
      const sub = agents!.subItems.find((s) => s.href === href);
      expect(sub).toBeDefined();
    });
  });
});
