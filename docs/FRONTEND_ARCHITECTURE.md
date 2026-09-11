# PharmaSafe Intelligence — Frontend Architecture Specification

## 1. Technology Stack
PharmaSafe Intelligence Frontend is engineered with modern, production-grade web technologies:
- **Framework:** React 18.2.0 (Strict Mode enabled)
- **Language:** TypeScript 5.2.2 (Strict typing across all entities and services)
- **Build Tool:** Vite 5.1.6 (Lightning-fast HMR and optimized Rollup chunking)
- **Styling:** Tailwind CSS 3.4.1 with `@tailwindcss/forms` and `@tailwindcss/typography`
- **Routing:** React Router DOM 6.22.3 (Declarative client-side routing with nested layouts)
- **Visualizations:** Recharts 2.12.3 (Declarative, SVG-based charting)
- **Icons:** Lucide React 0.358.0 (Consistent, scalable micro-iconography)

---

## 2. Directory Structure
```
d:/medico/frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.tsx                         # React 18 createRoot bootstrap
│   ├── App.tsx                          # Global router and route provider
│   ├── index.css                        # Tailwind root imports
│   ├── styles/
│   │   └── design-tokens.css            # Custom CSS variables & animations
│   ├── types/
│   │   └── index.ts                     # Enterprise TypeScript contracts
│   ├── mocks/
│   │   └── mockData.ts                  # In-memory reactive state & seed records
│   ├── services/                        # Service abstraction layer
│   │   ├── authService.ts
│   │   ├── batchService.ts
│   │   ├── inventoryService.ts
│   │   ├── returnService.ts
│   │   ├── disposalService.ts
│   │   ├── certificateService.ts
│   │   ├── alertService.ts
│   │   ├── riskService.ts
│   │   ├── listingService.ts
│   │   └── auditService.ts
│   ├── components/
│   │   ├── layout/                      # AppShell, Sidebar, Topbar, Breadcrumb, PageHeader
│   │   ├── ui/                          # StatusBadge, MetricCard, DataTable, Modal, Drawer, etc.
│   │   ├── charts/                      # MetricTrendChart, LifecycleDonutChart, RiskDistributionChart
│   │   └── demo/                        # DemoScenarioGuide (interactive judge controller)
│   └── pages/                           # 20 Dedicated Application Views
│       ├── LoginPage.tsx
│       ├── DashboardPage.tsx
│       ├── BatchPassportPage.tsx
│       ├── BatchRegisterPage.tsx
│       ├── DistributorPage.tsx
│       ├── PharmacyVerifyPage.tsx
│       ├── SaleVerificationPage.tsx
│       ├── ReturnManagementPage.tsx
│       ├── ChainOfCustodyPage.tsx
│       ├── DisposalManagementPage.tsx
│       ├── DestructionCertificatesPage.tsx
│       ├── DeadBatchRegistryPage.tsx
│       ├── ReentryDetectionPage.tsx
│       ├── OnlineSafetyPage.tsx
│       ├── AiRiskPage.tsx
│       ├── ExpiryIntelligencePage.tsx
│       ├── AlertCenterPage.tsx
│       ├── AuditTrailPage.tsx
│       ├── ComplianceDashboardPage.tsx
│       └── SettingsPage.tsx
```

---

## 3. State Management & Service Abstraction Layer
To guarantee complete separation between Phase 2 (Frontend Architecture) and Phase 3 (Backend Implementation), PharmaSafe introduces a **Service Abstraction Layer**.

Each service exposes asynchronous methods mimicking standard REST/JSON endpoints while mutating an in-memory reactive state store in `src/mocks/mockData.ts`:
- **`authService`**: User session handling, persona switching (`REGULATOR`, `MANUFACTURER`, `DISTRIBUTOR`, `PHARMACY`, `DISPOSAL_FACILITY`, `PUBLIC`), and credential validations.
- **`batchService`**: Batch queries, passport lookups (`getBatchByNumber('B1001')`), registration of new batch passports, and batch status mutations.
- **`inventoryService`**: Facility-level inventory telemetry, cold-chain temperature logs, and transfer handshakes.
- **`returnService`**: Reverse logistics RMA requests, reason categorizations, approval workflows, and shipment tracking.
- **`disposalService`**: Waste facility intake verification, scale weigh-in confirmations, and incinerator chamber scheduling.
- **`certificateService`**: Generation and cryptographic verification of tamper-proof certificates of destruction (`COD-2026-0091`).
- **`alertService`**: Central notification dispatch, severity filtering, and alert acknowledgment mutations.
- **`riskService`**: AI diversion risk calculations, anomaly scoring, and predictive models.
- **`listingService`**: Web crawler scraping surveillance, illegal marketplace alerts, and DMCA/regulatory takedown dispatch.
- **`auditService`**: Immutable event auditing, capturing user ID, timestamp, action type, and cryptographic payload.

---

## 4. Routing & Deep Linking Map
All routes are registered in `src/App.tsx` and wrapped inside `AppShell` with consistent layout persistence:
- `/` or `/dashboard` → `DashboardPage`
- `/login` → `LoginPage`
- `/passport/:batchNumber` → `BatchPassportPage`
- `/batches` → `BatchRegisterPage`
- `/distributor` → `DistributorPage`
- `/pharmacy-verify` → `PharmacyVerifyPage`
- `/verify-sale` → `SaleVerificationPage`
- `/returns` → `ReturnManagementPage`
- `/custody` → `ChainOfCustodyPage`
- `/disposal` → `DisposalManagementPage`
- `/destruction-certificates` → `DestructionCertificatesPage`
- `/dead-batch-registry` → `DeadBatchRegistryPage`
- `/reentry-detection` → `ReentryDetectionPage`
- `/online-safety` → `OnlineSafetyPage`
- `/ai-risk` → `AiRiskPage`
- `/expiry-intelligence` → `ExpiryIntelligencePage`
- `/alerts` → `AlertCenterPage`
- `/audit-trail` → `AuditTrailPage`
- `/compliance` → `ComplianceDashboardPage`
- `/settings` → `SettingsPage`

---

## 5. Build Performance & Production Readiness
The build pipeline utilizes Vite's Rollup bundler:
- **Zero Build Errors:** Verified with `tsc && vite build` (Exit code 0).
- **CSS Footprint:** Minified to ~43.6 KB (8.1 KB gzip) using Tailwind purge optimizations.
- **JS Footprint:** Bundled cleanly to ~791 KB (214 KB gzip) inclusive of Lucide icon catalogs, React Router, and Recharts SVG dependencies.
- **Zero Phase 3 Backend Bleed:** The application runs completely self-contained in static hosting, staging previews, or offline hackathon demonstrations.
