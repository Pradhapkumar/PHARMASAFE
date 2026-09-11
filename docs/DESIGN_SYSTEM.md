# PharmaSafe Intelligence — Design System Specification

## 1. Design Token Architecture & Philosophy
The PharmaSafe Design System provides a standardized, industrial-grade user interface designed for high-stress compliance and supply chain environments. The core visual language employs **Slate Command Center** styling with high-contrast accessibility and telemetry accents.

### Color Tokens
```css
/* Base Canvas & Surfaces */
--bg-canvas: #020617;        /* slate-950 */
--bg-surface: #0f172a;       /* slate-900 */
--bg-surface-elevated: #1e293b; /* slate-800 */
--bg-surface-glass: rgba(15, 23, 42, 0.85);

/* Border Tokens */
--border-subtle: #1e293b;    /* slate-800 */
--border-default: #334155;   /* slate-700 */
--border-focus: #38bdf8;     /* sky-400 */

/* Semantic Status Accents */
--status-success: #10b981;   /* emerald-500 (Verified / Safe / Minted) */
--status-warning: #f59e0b;   /* amber-500 (Quarantine / Near Expiry) */
--status-danger: #ef4444;    /* red-500 (Dead Batch / Diversion / Recall) */
--status-info: #0ea5e9;      /* sky-500 (In Transit / Active Passport) */
--status-regulator: #8b5cf6; /* violet-500 (EPA / Destruction Certificate) */
```

### Typography Hierarchy
- **Font Stack:** Clean sans-serif (`Inter`, system-ui, -apple-system, sans-serif) for high data density readability.
- **Monospace Stack:** `JetBrains Mono`, `ui-monospace`, `Courier New` for Batch Identifiers, SHA-256 Hashes, and Cryptographic Signatures.
- **Scale:**
  - Display / Hero: `text-2xl font-bold tracking-tight text-white`
  - Section Headings: `text-lg font-semibold text-slate-100`
  - Body Text: `text-sm text-slate-300`
  - Subtext & Captions: `text-xs text-slate-400 font-medium`
  - Micro Badges & Tags: `text-[10px] font-bold uppercase tracking-wider`

---

## 2. Component Catalog

### Layout Components
- **`AppShell` (`src/components/layout/AppShell.tsx`)**: Responsive outer wrapper hosting responsive desktop/mobile sidebar navigation, global topbar, notification drawers, role switcher, and the floating `DemoScenarioGuide`.
- **`Sidebar` (`src/components/layout/Sidebar.tsx`)**: Collapsible navigation bar categorizing 20 views into 8 intuitive modules, featuring active route indicators, role-badge indicators, and quick-collapse toggling.
- **`Topbar` (`src/components/layout/Topbar.tsx`)**: Global header housing role dropdown switcher (6 personas), unread alert count bell, global quick-search modal trigger, and active user session badge.
- **`PageHeader` (`src/components/layout/PageHeader.tsx`)**: Consistent header block with breadcrumbs, page title, contextual subtitle, and primary action buttons.
- **`Breadcrumb` (`src/components/layout/Breadcrumb.tsx`)**: Dynamic breadcrumb trail supporting nested batch and entity routes.

### Core UI Components
- **`StatusBadge` (`src/components/ui/StatusBadge.tsx`)**: High-contrast pill badge with pulsating status dot for:
  - `MANUFACTURED`, `IN_TRANSIT`, `DISTRIBUTED`, `AT_PHARMACY`, `SOLD`
  - `RETURN_REQUESTED`, `RETURN_IN_TRANSIT`, `QUARANTINED`, `DESTROYED`, `RECALLED`
- **`MetricCard` (`src/components/ui/MetricCard.tsx`)**: Glassmorphic KPI widget displaying metric value, icon container, subtitle, and delta badges (positive / neutral / negative).
- **`DataTable` (`src/components/ui/DataTable.tsx`)**: Generic, fully typed table component featuring sorted headers, pagination controls, empty state handling, and click-to-row callback support.
- **`FilterBar` (`src/components/ui/FilterBar.tsx`)**: Standardized filter toolbar with search input, dropdown filters, date pickers, and export action buttons.
- **`Modal` (`src/components/ui/Modal.tsx`)**: Accessible dialog overlay with blur backdrop, keyboard `Escape` dismissal, focus trapping, and animated entry.
- **`Drawer` (`src/components/ui/Drawer.tsx`)**: Slide-out detail drawer for right-side record inspection without navigating away from the current table.
- **`Timeline` (`src/components/ui/Timeline.tsx`)**: Chronological event stepper for chain of custody and batch provenance tracking with status icons and cryptographic metadata.
- **`AlertCard` (`src/components/ui/AlertCard.tsx`)**: Dismissible banner and notification card with severity color schemes (`critical`, `high`, `medium`, `low`).
- **`EmptyState` / `LoadingState` / `ErrorState`**: Standard fallback indicators ensuring seamless UX during network loads or empty queries.

### Chart & Telemetry Visualizations
- **`MetricTrendChart` (`src/components/charts/MetricTrendChart.tsx`)**: Recharts-powered dual-area trendline visualizing monthly returns, disposal volume, and risk mitigation.
- **`LifecycleDonutChart` (`src/components/charts/LifecycleDonutChart.tsx`)**: Semi-hollow donut distribution showing nationwide batch status allocations.
- **`RiskDistributionChart` (`src/components/charts/RiskDistributionChart.tsx`)**: Bar chart breaking down diversion risk index across operational facilities.

### Demo & Presentation Components
- **`DemoScenarioGuide` (`src/components/demo/DemoScenarioGuide.tsx`)**: Floating bottom-right judge control widget allowing 1-click step advancement through the 22-step lifecycle of Batch `B1001`. Features direct page routing, automated persona switching, and highlighted action guides.

---

## 3. Responsive Breakpoints & Device Support
| Breakpoint | Width Range | Layout Adaptation |
|---|---|---|
| **Mobile (`sm`)** | `< 768px` | Collapsed off-canvas drawer navigation, stacked KPI cards, full-width modals, simplified tabular data. |
| **Tablet (`md`)** | `768px - 1024px` | 2-column KPI grid, compact table paddings, collapsible sidebar. |
| **Desktop (`lg`)** | `1024px - 1440px` | Standard fixed sidebar, 4-column KPI cards, split-panel inspection drawers. |
| **Ultra-Wide (`xl`)** | `> 1440px` | Max-width content containers (`max-w-7xl` or `w-full`), expanded charts, side-by-side telemetry. |

---

## 4. Accessibility (a11y) & UX Polish
- **Color Contrast:** All text tokens meet or exceed WCAG 2.1 AA standards (minimum 4.5:1 ratio against slate backgrounds).
- **Interactive States:** Explicit `:hover`, `:focus-visible`, and `:active` rings (`ring-2 ring-sky-500`) on all buttons, inputs, and interactive rows.
- **Reduced Motion Support:** Respects `prefers-reduced-motion` settings for all transition durations.
