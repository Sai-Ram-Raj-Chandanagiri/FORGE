/**
 * Dashboard Shell Generator
 * Generates a self-contained HTML/CSS/JS dashboard for the workspace Nginx portal.
 * No React, no framework deps — pure vanilla served by Nginx.
 */

export interface PlatformLayoutConfig {
  theme: {
    brandName: string;
    primaryColor: string;
    logoUrl?: string | null;
  };
  homepage: string;
  sidebar: SidebarItem[];
  groups: SidebarGroup[];
}

export interface SidebarItem {
  moduleSlug: string;
  label: string;
  icon: string;
  group: string;
  order: number;
}

export interface SidebarGroup {
  name: string;
  order: number;
}

const ICON_SVG: Record<string, string> = {
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  "bar-chart": '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  "credit-card": '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
};

function getIconSvg(icon: string): string {
  const paths = ICON_SVG[icon] || ICON_SVG["box"]!;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

export function generateDashboardShell(layout: PlatformLayoutConfig): string {
  const { theme, sidebar, groups } = layout;
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  // Build sidebar HTML
  const sidebarHtml = sortedGroups.map((group) => {
    const items = sidebar
      .filter((s) => s.group === group.name)
      .sort((a, b) => a.order - b.order);
    if (items.length === 0) return "";
    return `
      <div class="sidebar-group">
        <div class="sidebar-group-label">${escapeHtml(group.name)}</div>
        ${items.map((item) => `
          <a class="sidebar-item" data-slug="${escapeHtml(item.moduleSlug)}" href="#/module/${escapeHtml(item.moduleSlug)}">
            <span class="sidebar-icon">${getIconSvg(item.icon)}</span>
            <span class="sidebar-label">${escapeHtml(item.label)}</span>
            <span class="health-dot" data-health="${escapeHtml(item.moduleSlug)}"></span>
          </a>
        `).join("")}
      </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(theme.brandName)}</title>
<style>
:root {
  --primary: ${theme.primaryColor};
  --primary-light: ${theme.primaryColor}22;
  --bg: #ffffff;
  --bg-sidebar: #f8fafc;
  --border: #e2e8f0;
  --text: #1e293b;
  --text-muted: #64748b;
  --text-light: #94a3b8;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a;
    --bg-sidebar: #1e293b;
    --border: #334155;
    --text: #f1f5f9;
    --text-muted: #94a3b8;
    --text-light: #64748b;
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; }
.shell { display: grid; grid-template-rows: 48px 1fr 32px; grid-template-columns: 240px 1fr; height: 100vh; }
.topbar { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; padding: 0 16px; border-bottom: 1px solid var(--border); background: var(--bg); z-index: 10; }
.topbar-brand { font-weight: 700; font-size: 15px; color: var(--primary); }
.topbar-status { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
.topbar-status .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); }
.sidebar { background: var(--bg-sidebar); border-right: 1px solid var(--border); overflow-y: auto; padding: 8px 0; }
.sidebar-home { display: flex; align-items: center; gap: 8px; padding: 8px 16px; margin: 0 8px 4px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text-muted); text-decoration: none; transition: all 0.15s; }
.sidebar-home:hover, .sidebar-home.active { background: var(--primary-light); color: var(--primary); }
.sidebar-group { margin-top: 8px; }
.sidebar-group-label { padding: 6px 16px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-light); }
.sidebar-item { display: flex; align-items: center; gap: 8px; padding: 7px 16px; margin: 1px 8px; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--text-muted); text-decoration: none; transition: all 0.15s; }
.sidebar-item:hover { background: var(--primary-light); color: var(--text); }
.sidebar-item.active { background: var(--primary-light); color: var(--primary); font-weight: 500; }
.sidebar-icon { display: flex; align-items: center; flex-shrink: 0; }
.sidebar-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.health-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-light); flex-shrink: 0; }
.health-dot.running { background: var(--success); }
.health-dot.stopped { background: var(--warning); }
.health-dot.failed { background: var(--danger); }
.content { overflow: hidden; position: relative; background: var(--bg); }
.content iframe { width: 100%; height: 100%; border: none; }
.overview { padding: 32px; overflow-y: auto; height: 100%; }
.overview h2 { font-size: 20px; margin-bottom: 16px; }
.overview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.module-card { border: 1px solid var(--border); border-radius: 12px; padding: 20px; transition: box-shadow 0.15s; }
.module-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.module-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.module-card-header svg { color: var(--primary); }
.module-card-title { font-weight: 600; font-size: 14px; }
.module-card-group { font-size: 11px; color: var(--text-muted); }
.module-card-status { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 11px; padding: 2px 8px; border-radius: 100px; }
.module-card-status.running { background: #dcfce7; color: #166534; }
.module-card-status.stopped { background: #fef3c7; color: #92400e; }
.module-card-status.failed { background: #fee2e2; color: #991b1b; }
.module-card-open { display: inline-block; margin-top: 12px; font-size: 12px; color: var(--primary); text-decoration: none; font-weight: 500; cursor: pointer; }
.module-card-open:hover { text-decoration: underline; }
.footer { grid-column: 1 / -1; display: flex; align-items: center; padding: 0 16px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-muted); background: var(--bg); gap: 16px; }
@media (max-width: 768px) {
  .shell { grid-template-columns: 1fr; }
  .sidebar { display: none; }
}
</style>
</head>
<body>
<div class="shell">
  <div class="topbar">
    <span class="topbar-brand">${escapeHtml(theme.brandName)}</span>
    <div class="topbar-status">
      <span class="dot" id="global-status"></span>
      <span id="status-text">Loading...</span>
    </div>
  </div>
  <div class="sidebar">
    <a class="sidebar-home active" href="#/overview" id="nav-overview">
      <span class="sidebar-icon">${getIconSvg("home")}</span>
      <span class="sidebar-label">Overview</span>
    </a>
    ${sidebarHtml}
  </div>
  <div class="content" id="content">
    <div class="overview" id="overview-page"></div>
  </div>
  <div class="footer">
    <span id="footer-modules">0 modules</span>
    <span id="footer-bridges">0 bridges</span>
    <span id="footer-sync" style="margin-left:auto">Powered by FORGE</span>
  </div>
</div>
<script>
(function() {
  var platformName = ${JSON.stringify(theme.brandName)};
  var currentSlug = null;

  function loadModule(slug) {
    currentSlug = slug;
    var content = document.getElementById('content');
    content.innerHTML = '<iframe src="/apps/' + slug + '/" title="' + slug + '"></iframe>';
    document.querySelectorAll('.sidebar-item, .sidebar-home').forEach(function(el) { el.classList.remove('active'); });
    var item = document.querySelector('.sidebar-item[data-slug="' + slug + '"]');
    if (item) item.classList.add('active');
    window.location.hash = '#/module/' + slug;
    document.title = slug + ' — ' + platformName;
  }

  function showOverview(data) {
    currentSlug = null;
    var content = document.getElementById('content');
    var modules = (data && data.modules) || [];
    var html = '<div class="overview"><h2>Welcome to ' + escapeH(platformName) + '</h2>';
    html += '<p style="color:var(--text-muted);margin-bottom:24px">' + modules.length + ' module' + (modules.length !== 1 ? 's' : '') + ' running</p>';
    html += '<div class="overview-grid">';
    modules.forEach(function(m) {
      var statusClass = (m.status || '').toLowerCase();
      html += '<div class="module-card">';
      html += '<div class="module-card-header"><span class="module-card-title">' + escapeH(m.label || m.slug) + '</span></div>';
      html += '<div class="module-card-group">' + escapeH(m.group || 'Modules') + '</div>';
      html += '<div class="module-card-status ' + statusClass + '">' + escapeH(m.status || 'unknown') + '</div>';
      html += '<a class="module-card-open" onclick="window.__loadModule(\\'' + escapeH(m.slug) + '\\')">Open &rarr;</a>';
      html += '</div>';
    });
    html += '</div></div>';
    content.innerHTML = html;
    document.querySelectorAll('.sidebar-item, .sidebar-home').forEach(function(el) { el.classList.remove('active'); });
    document.getElementById('nav-overview').classList.add('active');
    window.location.hash = '#/overview';
    document.title = platformName;
  }

  function escapeH(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // Expose for inline onclick
  window.__loadModule = loadModule;

  // Sidebar clicks
  document.querySelectorAll('.sidebar-item').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      loadModule(el.dataset.slug);
    });
  });
  document.getElementById('nav-overview').addEventListener('click', function(e) {
    e.preventDefault();
    fetchPlatformData().then(showOverview);
  });

  // Hash routing
  function handleHash() {
    var hash = window.location.hash;
    if (hash.startsWith('#/module/')) {
      loadModule(hash.replace('#/module/', ''));
    } else {
      fetchPlatformData().then(showOverview);
    }
  }
  window.addEventListener('hashchange', handleHash);

  // Fetch platform data
  function fetchPlatformData() {
    return fetch('/api/platform').then(function(r) { return r.json(); }).catch(function() { return { modules: [], bridges: [] }; });
  }

  // Update status from API data
  function updateStatus(data) {
    var modules = (data && data.modules) || [];
    var bridges = (data && data.bridges) || [];
    var running = modules.filter(function(m) { return m.status === 'RUNNING'; }).length;
    document.getElementById('status-text').textContent = running + '/' + modules.length + ' running';
    document.getElementById('footer-modules').textContent = modules.length + ' module' + (modules.length !== 1 ? 's' : '');
    document.getElementById('footer-bridges').textContent = bridges.length + ' bridge' + (bridges.length !== 1 ? 's' : '');

    // Update health dots
    modules.forEach(function(m) {
      var dot = document.querySelector('.health-dot[data-health="' + m.slug + '"]');
      if (dot) {
        dot.className = 'health-dot ' + (m.status === 'RUNNING' ? 'running' : m.status === 'STOPPED' ? 'stopped' : m.status === 'FAILED' ? 'failed' : '');
      }
    });
  }

  // Poll every 30s
  function poll() {
    fetchPlatformData().then(function(data) {
      updateStatus(data);
    });
  }
  setInterval(poll, 30000);

  // postMessage listener for cross-module communication
  window.addEventListener('message', function(event) {
    if (!event.data || typeof event.data !== 'object') return;
    switch (event.data.type) {
      case 'forge:navigate':
        if (event.data.moduleSlug) loadModule(event.data.moduleSlug);
        break;
      case 'forge:title':
        if (event.data.title) document.title = event.data.title + ' — ' + platformName;
        break;
    }
  });

  // Initial load
  fetchPlatformData().then(function(data) {
    updateStatus(data);
    handleHash();
  });
})();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
